-- P1: Менструальный цикл (Balanced)
-- Таблица событий цикла (отдельная от daily_readiness для гибкости)
-- Все колонки nullable/опциональны — не ломает существующие данные
-- Readiness остаётся optional signal (PRODUCT.md §7)

CREATE TABLE cycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'menstruation_start', 
    'menstruation_end', 
    'ovulation_start', 
    'ovulation_end'
  )),
  event_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_type, event_date)
);

-- Таблица настроек цикла
CREATE TABLE cycle_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  luteal_length_days smallint NOT NULL DEFAULT 14 CHECK (luteal_length_days BETWEEN 10 AND 21),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS для cycle_events
ALTER TABLE cycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cycle events"
  ON cycle_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle events"
  ON cycle_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle events"
  ON cycle_events FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cycle events"
  ON cycle_events FOR DELETE
  USING (auth.uid() = user_id);

-- RLS для cycle_settings
ALTER TABLE cycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cycle settings"
  ON cycle_settings FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle settings"
  ON cycle_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle settings"
  ON cycle_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Индексы для быстрого поиска
CREATE INDEX idx_cycle_events_user_date 
  ON cycle_events(user_id, event_date DESC);