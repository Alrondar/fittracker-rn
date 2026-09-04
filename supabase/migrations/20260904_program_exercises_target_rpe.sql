-- Добавляет целевой RPE для упражнений в программе (Фича 2: RPE-based Autoregulation)
-- Позволяет продвинутым пользователям ставить цели по субъективной сложности (например, 3x8 @ RPE 8)
-- Движок прогрессии будет учитывать это при расчёте рекомендаций.

ALTER TABLE public.program_exercises
ADD COLUMN IF NOT EXISTS target_rpe smallint CHECK (target_rpe >= 1 AND target_rpe <= 10);

COMMENT ON COLUMN public.program_exercises.target_rpe IS 'Целевой RPE (1-10) для упражнения. Если null, прогрессия считается только по повторениям.';