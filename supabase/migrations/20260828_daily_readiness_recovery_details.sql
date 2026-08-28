-- P0: Сон/Стресс детали для auto-readiness (Вариант B)
-- Все колонки nullable — не ломает существующие данные
-- Readiness остаётся optional signal (PRODUCT.md §7)

ALTER TABLE daily_readiness
ADD COLUMN IF NOT EXISTS sleep_hours numeric(3,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
ADD COLUMN IF NOT EXISTS sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS stress_level smallint CHECK (stress_level BETWEEN 1 AND 5);

-- Индекс для L3 трендов (последние 7 дней)
CREATE INDEX IF NOT EXISTS idx_daily_readiness_user_date
ON daily_readiness(user_id, date DESC);

-- RLS уже есть на daily_readiness (auth.uid() = user_id) — не дублируем