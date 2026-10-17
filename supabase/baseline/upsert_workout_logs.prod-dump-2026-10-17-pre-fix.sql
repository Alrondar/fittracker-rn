-- Тело public.upsert_workout_logs на проде ДО правки Ф5 (17.10.2026).
-- Снято через pg_get_functiondef. md5(replace(prosrc, CRLF, LF)) = 6afb4e21bae5624f612c7a0e456940b8,
-- длина prosrc = 1595 (переносы в проде — CRLF), prosecdef = false (INVOKER),
-- search_path = public, аргументы (p_workout_exercise_id uuid, p_logs jsonb[]),
-- проacl = =X/postgres | postgres | anon | authenticated | service_role
-- (PUBLIC и anon не отзывались — доступ держится на guard w.user_id = auth.uid()).
--
-- ДРЕЙФ, найденный при съёмке: прод-тело вставляет ещё и workout_logs.workout_id,
-- а git-файл supabase/migrations/20260913104400_fix_upsert_workout_logs_reps.sql
-- этой строки не содержит (версия 20260827180609 её имела). То есть файл в репо
-- ≠ задеплоенное тело. В новом теле workout_id сохранён; типы
-- src/types/database.types.ts колонку workout_logs.workout_id тоже не знают.
--
-- Откат Ф5 = применить это тело (и удалить третий аргумент не нужно: DEFAULT NULL
-- обратимо вместе с ним).

CREATE OR REPLACE FUNCTION public.upsert_workout_logs(p_workout_exercise_id uuid, p_logs jsonb[])
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

  -- Удаляем существующие логи для этого workout_exercise
  DELETE FROM workout_logs WHERE workout_exercise_id = p_workout_exercise_id;

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
