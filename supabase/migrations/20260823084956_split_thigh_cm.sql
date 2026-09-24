-- Разделить thigh_cm на thigh_left_cm и thigh_right_cm для консистентности
-- с другими конечностями (biceps_left/right, forearm_left/right, calf_left/right)
-- thigh_cm остаётся как legacy-колонка (по аналогии с arm_cm)

-- 1. Добавить новые колонки
ALTER TABLE body_metrics 
ADD COLUMN IF NOT EXISTS thigh_left_cm numeric,
ADD COLUMN IF NOT EXISTS thigh_right_cm numeric;

-- 2. Мигрировать существующие данные: копируем thigh_cm в обе новые колонки
-- (предполагаем, что если замер был сделан, то оба бедра примерно одинаковые)
UPDATE body_metrics 
SET 
  thigh_left_cm = thigh_cm,
  thigh_right_cm = thigh_cm
WHERE thigh_cm IS NOT NULL 
  AND thigh_left_cm IS NULL 
  AND thigh_right_cm IS NULL;

-- 3. Добавить комментарий к legacy-колонке
COMMENT ON COLUMN body_metrics.thigh_cm IS 'legacy: единое бедро; в новых записях используются thigh_left_cm и thigh_right_cm';
