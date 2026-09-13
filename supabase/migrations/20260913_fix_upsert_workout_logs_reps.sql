-- FIX: Добавить сохранение reps_left и reps_right в upsert_workout_logs
-- Предыдущая версия игнорировала эти поля, из-за чего подходы для unilateral-упражнений не сохранялись в БД.

CREATE OR REPLACE FUNCTION upsert_workout_logs(
  p_workout_exercise_id uuid,
  p_logs jsonb[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
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
  -- Примечание: workout_id не сохраняется в workout_logs, связь идет через workout_exercise_id
  FOREACH log_record IN ARRAY p_logs LOOP
    INSERT INTO workout_logs (
      workout_exercise_id, set_number, 
      weight_kg, reps, reps_left, reps_right, completed_at, rpe, rir, difficulty, is_warmup, is_estimated_reps
    ) VALUES (
      p_workout_exercise_id,
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
$$;