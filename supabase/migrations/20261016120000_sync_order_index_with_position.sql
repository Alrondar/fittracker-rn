-- ============================================================================
-- ORDER-SYNC (16.10.2026): синхронизация перестановки в программе догоняет
-- порядок тренировок, а не только позиции.
--
-- Дефект: в UPDATE workout_exercises стояло `position = pe.position`, но не
-- `order_index`. Экран тренировки сортирует карточки по order_index (его читает
-- useWorkoutSession.mapper), поэтому перестановка упражнений в редакторе
-- программы меняла `position` у будущих тренировок, а их порядок на экране
-- оставался прежним. В INSERT-ветке этой же функции order_index уже пишется
-- (`position, position`), то есть расхождение было только на пути обновления.
--
-- Живой след в проде на 16.10: тренировка 22949d83 («Shoulders & Abs», день 4
-- личной программы 7f3c1a90-…0002) — order_index 1,2,2,3,4,5 при position
-- 1,2,3,4,5,6 (дубль order_index = плавающий порядок двух карточек).
-- Из 78 не начатых тренировок личных программ расхождение порядка сейчас 0 —
-- правка профилактическая: с неё перестанет накапливаться новый дрейф.
--
-- Дамп тела до правки:
--   supabase/baseline/sync_program_changes_to_workouts.prod-dump-2026-10-16-pre-fix.sql
--   md5 прод-тела = 991be2b8dd105b20cc06c58ccac69b2b, длина 5294 (с CRLF)
-- Единственное отличие от дампа: строка `order_index = pe.position` в SET этого
-- UPDATE (тело иначе не тронуто; переносы строк в теле — LF вместо прод-CRLF,
-- на поведение не влияет).
-- Свойства сохранены: SECURITY DEFINER, search_path=public, владелец postgres,
--   аргумент p_program_id text, гранты authenticated/service_role (anon — нет),
--   guard v_user_id != auth.uid(), область `started_at IS NULL AND finished_at
--   IS NULL` (начатые и завершённые тренировки не переписываются).
-- Откат: CREATE OR REPLACE с телом из дампа pre-fix (убрать строку
--   `order_index = pe.position`). Данные откатывать не нужно: order_index
--   становится тем же значением, что position, обратного ущерба нет.
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

  WITH future_workouts AS (
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
    LEFT JOIN program_phases pp
      ON pp.program_id = p_program_id
     AND pp.phase_number = fw.phase_number
    LEFT JOIN program_days pd
      ON pd.phase_id = pp.id
     AND pd.week_number = fw.week_number
     AND pd.day_number = fw.day_index
    WHERE pd.id IS NULL
  )
  DELETE FROM workouts
  WHERE id IN (
    SELECT id FROM orphaned
  );

  GET DIAGNOSTICS v_deleted_workouts = ROW_COUNT;

  UPDATE workouts w
  SET name = pd.name
  FROM program_phases pp
  JOIN program_days pd
    ON pd.phase_id = pp.id
  WHERE w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL
    AND pp.program_id = p_program_id
    AND pp.phase_number = w.phase_number
    AND pd.week_number = w.week_number
    AND pd.day_number = w.day_index
    AND w.name IS DISTINCT FROM pd.name;

  GET DIAGNOSTICS v_updated_workouts = ROW_COUNT;

  WITH future_workout_exercises AS (
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
    LEFT JOIN program_phases pp
      ON pp.program_id = p_program_id
     AND pp.phase_number = fwe.phase_number
    LEFT JOIN program_days pd
      ON pd.phase_id = pp.id
     AND pd.week_number = fwe.week_number
     AND pd.day_number = fwe.day_index
    LEFT JOIN program_exercises pe
      ON pe.program_day_id = pd.id
     AND pe.exercise_id = fwe.exercise_id
    WHERE pe.id IS NULL
  )
  DELETE FROM workout_exercises
  WHERE id IN (
    SELECT workout_exercise_id FROM orphaned_exercises
  );

  GET DIAGNOSTICS v_deleted_exercises = ROW_COUNT;

  UPDATE workout_exercises AS we
  SET
    sets = pe.sets,
    target_reps_range = pe.reps_range,
    rest_seconds = pe.rest_seconds,
    intensity = pe.intensity,
    position = pe.position,
    order_index = pe.position
  FROM workouts AS w
  JOIN program_phases AS pp
    ON pp.program_id = w.program_id
   AND pp.phase_number = w.phase_number
  JOIN program_days AS pd
    ON pd.phase_id = pp.id
   AND pd.week_number = w.week_number
   AND pd.day_number = w.day_index
  JOIN program_exercises AS pe
    ON pe.program_day_id = pd.id
  WHERE we.workout_id = w.id
    AND pe.exercise_id = we.exercise_id
    AND w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL;

  GET DIAGNOSTICS v_updated_exercises = ROW_COUNT;

  WITH target_workouts AS (
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
      pe.position
    FROM target_workouts tw
    JOIN program_phases pp
      ON pp.program_id = p_program_id
     AND pp.phase_number = tw.phase_number
    JOIN program_days pd
      ON pd.phase_id = pp.id
     AND pd.week_number = tw.week_number
     AND pd.day_number = tw.day_index
    JOIN program_exercises pe
      ON pe.program_day_id = pd.id
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
    target_reps_range,
    rest_seconds,
    intensity,
    position,
    order_index
  )
  SELECT
    workout_id,
    exercise_id,
    sets,
    reps_range,
    rest_seconds,
    intensity,
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
$function$
;
