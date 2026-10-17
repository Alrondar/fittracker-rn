-- ============================================================================
-- F5 (17.10.2026): upsert_workout_logs заменяет только показанный экраном
-- диапазон подходов, а не все подходы упражнения.
--
-- Дефект. Тело делало `DELETE FROM workout_logs WHERE workout_exercise_id = …`
-- и вставляло то, что пришло с экрана. Экран же строил список сетов по
-- `target_sets` (src/hooks/workout/useWorkoutSession.mapper.ts:60-91), поэтому
-- сохранённый подход сверх этого числа — добавленный через «+», чей
-- persist target_sets не доехал, либо видимый только в новой сборке — молча
-- стирался при первом же flush. Это превращало находку Ф2 (усечение сетки) из
-- потери отображения в потерю данных, и особенно больно било по старым
-- сборкам, которые ещё не знают про Ф2.
--
-- Правка: удаляем подходы в диапазоне 1..p_total_sets и вставляем пришедшие.
--   • p_total_sets — сколько сетов сейчас реально показывает экран (клиент
--     передаёт длину массива). Внутри диапазона поведение прежнее: очистил
--     значения подхода 2 из 4 — строка уходит (её нет во вставке), пустой
--     средний подход не воскресает.
--   • Всё, что выше диапазона, остаётся в целости — это и есть защита от
--     усечённого снимка, включая усечённый снимок СТАРОЙ сборки.
--   • p_total_sets = NULL (клиент, который ещё не передаёт аргумент — например
--     установленный release-APK до этого пакета) → потолок берётся из
--     максимального set_number в payload: хуже прежнего не делает.
--
-- Остальное тело не тронуто: колонка workout_id в вставке оставлена (её нет в
-- git-версии 20260913104400 — см. baseline-дамп), RLS-guard по auth.uid(),
-- SECURITY INVOKER, search_path=public, тип p_logs jsonb[], гранты как были
-- (CREATE OR REPLACE сохраняет ACL, PUBLIC и anon не отзывались — доступ
-- держится на guard'e).
--
-- Дамп тела до правки: supabase/baseline/upsert_workout_logs.prod-dump-2026-10-17-pre-fix.sql
--   прод-md5 = 6afb4e21bae5624f612c7a0e456940b8, длина 1595 (CRLF), 2 аргумента.
-- Реверс: применить baseline-дамп (это двухаргументная версия) и заодно удалить
-- трёхаргументную, иначе в базе снова останутся две перегрузки. Третий аргумент
-- с DEFAULT NULL обратим сам по себе: вызов rpc('upsert_workout_logs',
-- {p_workout_exercise_id, p_logs}) резолвится и до правки, и после неё.
--
-- ВАЖНО ПРО ПРИМЕНЕНИЕ (проверено на проде 17.10): `CREATE OR REPLACE FUNCTION`
-- с ДРУГИМ числом аргументов не заменяет функцию, а создаёт перегрузку — после
-- первого прогона в проде висело две `upsert_workout_logs` (uuid,jsonb[] и
-- uuid,jsonb[],integer), и вызов с двумя параметрами стал неоднозначным для
-- PostgREST. Отсюда DROP ниже: старая перегрузка снимается, остаётся одна
-- функция, а вызовы без p_total_sets резолвятся на неё же через DEFAULT NULL.
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_workout_logs(uuid, jsonb[]);

CREATE OR REPLACE FUNCTION public.upsert_workout_logs(
  p_workout_exercise_id uuid,
  p_logs jsonb[],
  p_total_sets integer DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  log_record jsonb;
  v_workout_id uuid;
BEGIN
  -- RLS check: проверяем, что workout_exercise принадлежит текущему пользователю
  SELECT w.id INTO v_workout_id
  FROM workout_exercises we
  JOIN workouts w ON w.id = we.workout_id
  WHERE we.id = p_workout_exercise_id
    AND w.user_id = auth.uid();

  IF v_workout_id IS NULL THEN
    RAISE EXCEPTION 'workout_exercise not found or access denied';
  END IF;

  -- [F5] был безусловный DELETE всех подходов упражнения. Теперь заменяется
  -- только диапазон, который экран действительно показывает.
  DELETE FROM workout_logs wl
  WHERE wl.workout_exercise_id = p_workout_exercise_id
    AND wl.set_number <= coalesce(
      p_total_sets,
      (select coalesce(max((l ->> 'set_number')::int), 0) from unnest(p_logs) as l)
    );

  -- Вставляем новые логи с флагами is_warmup, is_estimated_reps, reps_left, reps_right
  FOREACH log_record IN ARRAY p_logs LOOP
    INSERT INTO workout_logs (
      workout_exercise_id, workout_id, set_number,
      weight_kg, reps, reps_left, reps_right, completed_at, rpe, rir, difficulty, is_warmup, is_estimated_reps
    ) VALUES (
      p_workout_exercise_id,
      v_workout_id,
      (log_record->>'set_number')::int,
      NULLIF(log_record->>'weight_kg', '')::numeric,
      NULLIF(log_record->>'reps', '')::int,
      NULLIF(log_record->>'reps_left', '')::int,
      NULLIF(log_record->>'reps_right', '')::int,
      COALESCE(NULLIF(log_record->>'completed_at', '')::timestamptz, NOW()),
      NULLIF(log_record->>'rpe', '')::smallint,
      NULLIF(log_record->>'rir', '')::smallint,
      NULLIF(log_record->>'difficulty', ''),
      COALESCE((log_record->>'is_warmup')::boolean, false),
      COALESCE((log_record->>'is_estimated_reps')::boolean, false)
    );
  END LOOP;
END;
$function$
;
