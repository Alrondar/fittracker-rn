-- COACH-3: acceptance/rejection feedback для рекомендаций прогрессии.
-- Детерминированный сбор сигналов без LLM (ROADMAP C2).
-- Upsert по (user_id, workout_id, exercise_id, set_number) — последнее решение
-- по сету побеждает (сет можно очистить и решение повторится).

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workout_id uuid not null,
  exercise_id uuid not null,
  set_number int not null,
  decision text not null check (decision in ('accepted', 'rejected', 'changed')),
  user_reason_code text,
  engine_action text not null,
  engine_reason_code text not null,
  suggested_weight numeric,
  suggested_reps int,
  applied_weight numeric,
  created_at timestamptz not null default now()
);

-- Индекс для быстрого поиска по (user, workout, exercise, set) — upsert conflict
create unique index if not exists recommendation_feedback_unique_idx
  on public.recommendation_feedback (user_id, workout_id, exercise_id, set_number);

-- RLS: только свои строки (зеркалит pain_events / daily_readiness)
alter table public.recommendation_feedback enable row level security;

create policy "Users can view own recommendation feedback"
  on public.recommendation_feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own recommendation feedback"
  on public.recommendation_feedback
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recommendation feedback"
  on public.recommendation_feedback
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own recommendation feedback"
  on public.recommendation_feedback
  for delete
  using (auth.uid() = user_id);
