-- ENG-13: флаг разминочного подхода для per-set рекомендаций
-- Пользователь может пометить любой сет в основной сетке как разминочный.
-- Разминочные сеты исключаются из расчёта прогрессии (volume/e1RM/PR).
-- Existing logs (вся история) считаются рабочими по умолчанию (default false).

-- 1. Добавляем колонку
ALTER TABLE workout_logs 
  ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false;

-- 2. Индекс для быстрого фильтра рабочих сетов (volume/e1RM/PR расчёты)
CREATE INDEX IF NOT EXISTS idx_workout_logs_is_warmup 
  ON workout_logs(workout_exercise_id, is_warmup);

-- 3. Обновляем RPC upsert_workout_logs — принимаем is_warmup в p_logs
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
  
  -- Вставляем новые логи с флагом is_warmup
  FOREACH log_record IN ARRAY p_logs LOOP
    INSERT INTO workout_logs (
      workout_exercise_id, workout_id, set_number, 
      weight_kg, reps, completed_at, rpe, rir, difficulty, is_warmup
    ) VALUES (
      p_workout_exercise_id,
      v_workout_id,
      (log_record->>'set_number')::int,
      NULLIF(log_record->>'weight_kg', '')::numeric,
      NULLIF(log_record->>'reps', '')::int,
      COALESCE(NULLIF(log_record->>'completed_at', '')::timestamptz, NOW()),
      NULLIF(log_record->>'rpe', '')::smallint,
      NULLIF(log_record->>'rir', '')::smallint,
      NULLIF(log_record->>'difficulty', ''),
      COALESCE((log_record->>'is_warmup')::boolean, false)
    );
  END LOOP;
END;
$$;
