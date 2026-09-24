-- P1: Добавление поля sex в таблицу profiles для условного рендеринга функционала цикла
-- Safe default: 'prefer_not_to_say', чтобы не ломать существующие данные и не показывать цикл по умолчанию.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sex text DEFAULT 'prefer_not_to_say' CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Комментарий для документации схемы
COMMENT ON COLUMN profiles.sex IS 'Пол пользователя для адаптации функционала (например, трекер цикла). Default: prefer_not_to_say';