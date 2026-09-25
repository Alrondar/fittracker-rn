-- WARMUP-2: запоминание замен упражнений разминки.
-- Разминка генерируется под мышцы тренировки (warmupService) и не является
-- данными программы; выбранный пользователем вариант терялся при следующей
-- генерации. Таблица хранит предпочтения: для origin-упражнения разминки —
-- предпочтительная замена. Валидность замены (в пуле разминки, не противопоказана
-- активными травмами) проверяется на клиенте при подстановке — схема честная,
-- без выдуманных гарантий на уровне БД.
-- Конвенции: user_id без FK (как recommendation_feedback), RLS по auth.uid().

create table if not exists public.warmup_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  origin_exercise_id uuid not null,
  preferred_exercise_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists warmup_preferences_user_origin_idx
  on public.warmup_preferences (user_id, origin_exercise_id);

alter table public.warmup_preferences enable row level security;

create policy "Users can view own warmup preferences"
  on public.warmup_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own warmup preferences"
  on public.warmup_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own warmup preferences"
  on public.warmup_preferences
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own warmup preferences"
  on public.warmup_preferences
  for delete
  using (auth.uid() = user_id);
