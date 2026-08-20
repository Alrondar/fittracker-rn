-- Откат экспериментальных таблиц сессий, которые не используются в коде и не содержат данных.
-- Аудит от 20.08.2026 подтвердил: workout_logs является единственным source of truth для подходов.
-- CASCADE автоматически и безопасно удалит связанные RLS policies, индексы и foreign key constraints.

DROP TABLE IF EXISTS public.session_sets CASCADE;
DROP TABLE IF EXISTS public.workout_sessions CASCADE;
