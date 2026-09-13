-- P1.1: Добавление поддержки политик прогрессии для упражнений в программах
-- Безопасно: nullable + default 'linear', старые записи получают 'linear'.

ALTER TABLE program_exercises 
  ADD COLUMN IF NOT EXISTS progression_policy TEXT DEFAULT 'linear';

COMMENT ON COLUMN program_exercises.progression_policy IS 'Политика прогрессии: linear, double_progression, greyskull, time_based';