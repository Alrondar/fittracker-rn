-- Добавляет целевой RPE в workout_exercises (Фича 2: RPE-based Autoregulation)
-- Копируется из program_exercises при создании тренировки
-- Позволяет движку прогрессии учитывать целевой RPE для каждого упражнения в тренировке

ALTER TABLE public.workout_exercises
ADD COLUMN IF NOT EXISTS target_rpe smallint CHECK (target_rpe >= 1 AND target_rpe <= 10);

COMMENT ON COLUMN public.workout_exercises.target_rpe IS 'Целевой RPE (1-10) для упражнения в тренировке. Копируется из program_exercises при создании тренировки.';
