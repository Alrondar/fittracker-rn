-- ============================================================================
-- SYNC-1: правки объёма доезжают до будущих тренировок
--
-- Дефект: `sync_program_changes_to_workouts` обновлял в снимках занятия колонку
-- `sets`, а экран занятия читает `target_sets` (`useWorkoutSession.mapper.ts:65`,
-- `workoutService.ts:251`). `target_rpe` и `progression_policy` не обновлялись
-- вообще. Поэтому редактор программы отвечал «обновлено N упражнений», а календарь
-- показывал старое число подходов, старый целевой RPE и старую политику прогрессии.
-- Тот же набор терялся и при вставке нового упражнения в день: строка попадала в
-- снимок без `target_sets`, и занятие рисовало дефолтные 3 подхода.
--
-- Что делает: добавляет `target_sets`, `target_rpe` и `progression_policy` в
-- `UPDATE` и в `INSERT` внутри функции. Набор колонок теперь ровно тот же, что
-- пишет генерация снимка `create_workouts_for_program` — инвариант «синк даёт тот
-- же снимок, что Перезапуск». Колонку `sets` функция продолжает писать: клиент
-- сам копирует в неё план (`workoutService.ts:190`, `:258`) и читает её как
-- источник числа подходов при старте занятия из программы (`workoutService.ts:183`).
--
-- Зависимости: `program_effective_days` (миграция
-- `20261023070000_pointer_first_unclosed_day.sql`). Тело этой функции до 27.10
-- жило только на проде — файл `20260731122543_sync_program_changes.sql` пуст,
-- поэтому ниже полный канон, а не патч-дельта.
--
-- Кроме тела функции в файле одноразовый выравнивающий запрос: он догоняет уже
-- отставшие снимки, потому что функция сама ничего не пересчитывает, пока
-- программу не сохранят.
--
-- Состояние прода на 27.10 (до правки, снято `program_effective_days`-предикатом,
-- только `started_at IS NULL AND finished_at IS NULL`):
--   2731 строка снимка в не начатых занятиях, из них 1708 матчатся программе;
--   расхождение по target_sets — 2 строки, по target_rpe — 2, по политике — 0;
--   расхождения по reps/rest/intensity — 0; фан-аута (дубль упражнения в дне,
--   дубль номера фазы) — 0, строк программы без exercise_id — 0;
--   оставшиеся 1023 строки принадлежат 208 висячим занятиям (program_id указывает
--   на удалённую программу) — этот предикат правка не трогает.
--
-- Границы: изменённые колонки пишутся только в строки не начатых и не завершённых
-- занятий того же пользователя и той же программы. Начатые и завершённые не
-- задеваются (предикаты `started_at IS NULL AND finished_at IS NULL` не менялись),
-- история занятий не переписывается. Удаляющая часть функции (осиротевшие дни и
-- упражнения) остаётся прежней.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_program_changes_to_workouts(p_program_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_deleted_workouts int := 0;
  v_updated_workouts int := 0;
  v_deleted_exercises int := 0;
  v_updated_exercises int := 0;
  v_inserted_exercises int := 0;
BEGIN
  SELECT created_by::uuid
  INTO v_user_id
  FROM programs
  WHERE id = p_program_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  future_workouts AS (
    SELECT
      w.id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workouts w
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  orphaned AS (
    SELECT fw.id
    FROM future_workouts fw
    -- [SYNC-WK] был LEFT JOIN program_phases + program_days по строгой тройке.
    LEFT JOIN eff e
      ON e.phase_number = fw.phase_number
     AND e.week_number = fw.week_number
     AND e.day_number = fw.day_index
    WHERE e.program_day_id IS NULL
      -- [SYNC-WK] строки без номера дня не удаляем: раньше они проваливались
      -- в сироты из-за NULL в join'е, ad-hoc тренировки это не потеря шаблона.
      AND fw.day_index IS NOT NULL
  )
  DELETE FROM workouts
  WHERE id IN (
    SELECT id FROM orphaned
  );

  GET DIAGNOSTICS v_deleted_workouts = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  )
  UPDATE workouts w
  SET name = e.day_name
  FROM eff e
  WHERE w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL
    AND e.phase_number = w.phase_number
    AND e.week_number = w.week_number
    AND e.day_number = w.day_index
    AND w.name IS DISTINCT FROM e.day_name;

  GET DIAGNOSTICS v_updated_workouts = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  future_workout_exercises AS (
    SELECT
      we.id AS workout_exercise_id,
      we.workout_id,
      we.exercise_id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workout_exercises we
    JOIN workouts w
      ON w.id = we.workout_id
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  orphaned_exercises AS (
    SELECT fwe.workout_exercise_id
    FROM future_workout_exercises fwe
    -- [SYNC-WK] цепочка pp -> pd заменена на eff -> pe.
    LEFT JOIN eff e
      ON e.phase_number = fwe.phase_number
     AND e.week_number = fwe.week_number
     AND e.day_number = fwe.day_index
    LEFT JOIN program_exercises pe
      ON pe.program_day_id = e.program_day_id
     AND pe.exercise_id = fwe.exercise_id
    WHERE pe.id IS NULL
      AND fwe.day_index IS NOT NULL
  )
  DELETE FROM workout_exercises
  WHERE id IN (
    SELECT workout_exercise_id FROM orphaned_exercises
  );

  GET DIAGNOSTICS v_deleted_exercises = ROW_COUNT;

  -- [SYNC-1] здесь добавлены target_sets, target_rpe и progression_policy.
  -- Привязка строки снимка к строке программы — по exercise_id (не по позиции):
  -- дублей упражнения внутри одного дня и дублей номера фазы в проде нет
  -- (замерено 27.10), поэтому join остаётся 1:1.
  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  )
  UPDATE workout_exercises AS we
  SET
    sets = pe.sets,
    target_sets = pe.sets,
    target_reps_range = pe.reps_range,
    rest_seconds = pe.rest_seconds,
    intensity = pe.intensity,
    target_rpe = pe.target_rpe,
    progression_policy = pe.progression_policy,
    position = pe.position,
    order_index = pe.position
  FROM workouts AS w
  JOIN eff AS e
    ON e.phase_number = w.phase_number
   AND e.week_number = w.week_number
   AND e.day_number = w.day_index
  JOIN program_exercises AS pe
    ON pe.program_day_id = e.program_day_id
  WHERE we.workout_id = w.id
    AND pe.exercise_id = we.exercise_id
    AND w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL;

  GET DIAGNOSTICS v_updated_exercises = ROW_COUNT;

  -- [SYNC-1] вставка нового упражнения дня тоже обязана нести план подходов,
  -- целевой RPE и политику — иначе занятие рисует дефолтные 3 подхода.
  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  target_workouts AS (
    SELECT
      w.id AS workout_id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workouts w
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  missing_exercises AS (
    SELECT
      tw.workout_id,
      pe.exercise_id,
      pe.sets,
      pe.reps_range,
      pe.rest_seconds,
      pe.intensity,
      pe.target_rpe,
      pe.progression_policy,
      pe.position
    FROM target_workouts tw
    JOIN eff e
      ON e.phase_number = tw.phase_number
     AND e.week_number = tw.week_number
     AND e.day_number = tw.day_index
    JOIN program_exercises pe
      ON pe.program_day_id = e.program_day_id
    LEFT JOIN workout_exercises we
      ON we.workout_id = tw.workout_id
     AND we.exercise_id = pe.exercise_id
    WHERE we.id IS NULL
      AND pe.exercise_id IS NOT NULL
  )
  INSERT INTO workout_exercises (
    workout_id,
    exercise_id,
    sets,
    target_sets,
    target_reps_range,
    rest_seconds,
    intensity,
    target_rpe,
    progression_policy,
    position,
    order_index
  )
  SELECT
    workout_id,
    exercise_id,
    sets,
    sets,
    reps_range,
    rest_seconds,
    intensity,
    target_rpe,
    progression_policy,
    position,
    position
  FROM missing_exercises;

  GET DIAGNOSTICS v_inserted_exercises = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_workouts', v_deleted_workouts,
    'updated_workouts', v_updated_workouts,
    'deleted_exercises', v_deleted_exercises,
    'updated_exercises', v_updated_exercises,
    'inserted_exercises', v_inserted_exercises
  );
END;
$function$;

-- ============================================================================
-- Одноразовое выравнивание отставших снимков (вариант 2, по слову владельца).
--
-- Функция ничего не пересчитывает сама: снимок догоняется только когда программа
-- сохраняется. Этот блок догоняет все уже отставшие строки, чтобы правку не
-- надо было «вызывать» ручным сохранением программы.
--
-- Трогает ровно три колонки — те, которые раньше терялись. `sets` не трогает:
-- в подправленных строках она уже равна плану из программы (её синк писал и
-- раньше), поэтому после выравнивания `sets` и `target_sets` совпадают.
-- Предикат матчинга и границы — те же, что внутри функции: не начатое и не
-- завершённое занятие того же пользователя и той же программы, привязка по
-- упражнению. Идемпотентно: повторный прогон не находит расхождений и не
-- пишет ни строки.
-- ============================================================================

WITH up AS (
  SELECT DISTINCT user_id, program_id
  FROM workouts
  WHERE started_at IS NULL
    AND finished_at IS NULL
    AND program_id IS NOT NULL
),
eff AS (
  SELECT up.user_id, up.program_id,
         e.phase_number, e.week_number, e.day_number, e.program_day_id
  FROM up
  CROSS JOIN LATERAL program_effective_days(up.program_id, up.user_id) e
),
want AS (
  SELECT we.id AS workout_exercise_id,
         pe.sets,
         pe.target_rpe,
         pe.progression_policy
  FROM workouts w
  JOIN workout_exercises we
    ON we.workout_id = w.id
  JOIN eff e
    ON e.user_id = w.user_id
   AND e.program_id = w.program_id
   AND e.phase_number = w.phase_number
   AND e.week_number = w.week_number
   AND e.day_number = w.day_index
  JOIN program_exercises pe
    ON pe.program_day_id = e.program_day_id
   AND pe.exercise_id = we.exercise_id
  WHERE w.started_at IS NULL
    AND w.finished_at IS NULL
    AND (   we.target_sets         IS DISTINCT FROM pe.sets
         OR we.target_rpe          IS DISTINCT FROM pe.target_rpe
         OR we.progression_policy  IS DISTINCT FROM pe.progression_policy)
)
UPDATE workout_exercises AS we
   SET target_sets        = x.sets,
       target_rpe         = x.target_rpe,
       progression_policy = x.progression_policy
  FROM want x
 WHERE we.id = x.workout_exercise_id;

-- ============================================================================
-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ
--   1) тело функции содержит три новые колонки — ожидаем 3 вхождения:
--        select (pg_get_functiondef(p.oid) like '%target_sets = pe.sets%')::int
--             + (pg_get_functiondef(p.oid) like '%target_rpe = pe.target_rpe%')::int
--             + (pg_get_functiondef(p.oid) like '%progression_policy = pe.progression_policy%')::int
--        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--        where n.nspname = 'public' and p.proname = 'sync_program_changes_to_workouts';
--   2) расхождение снимка с программой по семи полям в не начатых занятиях — 0 строк
--      (запрос «drift» ниже);
--   3) ни одной строки снимка с target_sets IS NULL в не начатом занятии — 0;
--   4) `sets` и `target_sets` расходятся на 767 строках — это И НЕ должно стать
--      нулём: генерация снимка колонку `sets` не пишет, там остаётся DEFAULT 3,
--      а экран читает `target_sets`. Правка эти 767 строк не касается намеренно;
--   5) начатых и завершённых занятий, а также количества строк в них — столько же,
--      сколько до применения, и контрольная сумма значений в них не меняется.
--
-- ФАКТ ПОСЛЕ ПРИМЕНЕНИЯ 27.10: тело функции содержит все три колонки (3/3);
-- matched_rows 1708 (было 1708); drift_sets 0 (было 2), drift_rpe 0 (было 2),
-- drift_pol 0, null_target_sets 0 (было 2); sets_vs_target_sets 767 (без изменений);
-- занятий не начато 582 / начато-завершено 76 (обе цифры без изменений);
-- строк снимка 2868 в не начатых + 499 в начатых-завершённых = 3367 всего (без
-- изменений, правка ничего не удалила и не вставила); workout_logs 1085;
-- контрольная сумма значений в начатых и завершённых 0b4f651f1ea1299a77869816db146c76
-- — identical до и после. Целевые строки PPLUL (`1efe5667-…`, пользователь
-- `6416429a`, день «Lower», позиция 5): фаза 2 → 4 подхода и целевой RPE 8,
-- фаза 3 → 2 подхода и целевой RPE 6; до правки обе имели target_sets IS NULL и
-- target_rpe IS NULL, то есть экран рисовал 3 подхода.
--
-- Штатная проверка живьём (то, что раньше не доезжало): в «Моих программах» открыть
-- свою программу → редактор → у упражнения в дне поменять подходы (например 4→5) →
-- сохранить → экран «Тренировки» → это же не начатое занятие должно показать 5.
-- Отдельно проверить программу с weeks_count > 1: менять объём во второй неделе,
-- занятие именно этой недели должно обновиться (ветка fallback недели на 1 не
-- должна подменять дни второй недели).
--
-- ОТКАТ: повторить этот же файл с прежним списком колонок (полное тело прежней
-- версии сохранено в истории: UPDATE без target_sets/target_rpe/progression_policy,
-- INSERT без них же). Данные после отката не поедут обратно — правка уже записала
-- план в target_sets; возвращать значения придётся патчем вида 20261026130000.
-- ============================================================================

-- Контрольный запрос «drift» (частей DDL не содержит, безопасен для прогона):
--   with up as (select distinct user_id, program_id from workouts
--                where started_at is null and finished_at is null and program_id is not null),
--        eff as (select up.user_id, up.program_id, e.phase_number, e.week_number,
--                       e.day_number, e.program_day_id
--                from up cross join lateral program_effective_days(up.program_id, up.user_id) e)
--   select count(*) filter (where we.target_sets is distinct from pe.sets)          as drift_sets,
--          count(*) filter (where we.target_rpe is distinct from pe.target_rpe)     as drift_rpe,
--          count(*) filter (where we.progression_policy is distinct from pe.progression_policy) as drift_pol,
--          count(*) filter (where we.target_sets is null)                            as null_target_sets,
--          count(*) filter (where we.sets is distinct from we.target_sets)           as sets_vs_target_sets,
--          count(*)                                                                  as matched_rows
--   from workouts w
--   join workout_exercises we on we.workout_id = w.id
--   join eff e on e.user_id = w.user_id and e.program_id = w.program_id
--             and e.phase_number = w.phase_number and e.week_number = w.week_number
--             and e.day_number = w.day_index
--   join program_exercises pe on pe.program_day_id = e.program_day_id
--                            and pe.exercise_id = we.exercise_id
--   where w.started_at is null and w.finished_at is null;
--   (до правки: drift_sets=2, drift_rpe=2, drift_pol=0, null_target_sets=2, matched_rows=1708)
