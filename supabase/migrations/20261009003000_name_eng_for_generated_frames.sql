-- ============================================================================
-- ILL-Q3 / §3 плана: английские имена позициям, которым кадр генерируется своими.
--
-- Имя берётся из названия и `technique`, а НЕ из папки текущего кадра: по вердикту
-- владельца описание — источник истины, а кадр, который ему противоречит, будет
-- перегенерирован (12 позиций показывали чужое движение, 4 — имели свободное, но
-- не совпадающее по смыслу имя из папки).
--
-- Список строит spark-output/report/catalog-dedupe-and-names-plan-2026-10-08.md §3
-- (15 позиций; «Жим гантелей перед собой» из него убрана — по описанию это третий
--  дубль махов перед собой, она уходит в дедупликацию).
--
-- Проверено до записи: все 15 имён свободны (нет коллизий с текущими name_eng и
-- повторов внутри списка). name_eng в UI не рендерится (только src/types/…),
-- видимый эффект один — позиции начинают находиться по-английски (CAT-Q7).
--
-- Реверс: UPDATE public.exercises SET name_eng = NULL WHERE id = ANY(ARRAY[...]);
-- Снимок «до»: у всех 15 name_eng IS NULL.
-- ============================================================================

UPDATE public.exercises e
SET name_eng = v.name_eng
FROM (VALUES
  ('cb22b47b-717a-455b-9937-9662aad61606'::uuid, 'Smith Machine Lunge'),
  ('1d20086e-c63d-4c7b-a6fc-1f4a6dc15380', 'Smith Machine Bulgarian Split Squat'),
  ('9a77e5f5-f1b9-4294-9ef2-ad552ef61c97', 'Smith Machine Leg Extension'),
  ('a673a68c-3b75-46c8-8fcb-da8962a14a80', 'Standing Barbell Military Press'),
  ('b419d3b1-73c0-4e71-a670-fd1692c573e1', 'Copenhagen Adduction'),
  ('e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4', 'Wide-Grip Pull-Up'),
  ('3e3c5ca0-096c-47cb-815d-106284238424', 'Low-to-High Cable Crossover'),
  ('c557b192-3494-42b7-a703-f1f7ac86b6fb', 'Reverse-Grip Barbell Lying Triceps Extension'),
  ('b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3', 'High Foot Position Leg Press'),
  ('10a3fed1-8b3c-4cba-a0af-328d79e9499d', 'Bodyweight Sissy Squat'),
  ('216243c9-dd00-43ec-908f-d3729638b854', 'Rendl Barbell Row'),
  ('8839d193-0ccd-4c0b-a4f1-583551f47dc4', 'Incline Y-T-W-L Raise'),
  ('bb1fbbb4-36df-4bff-b800-d82be5e1cda9', 'Triceps Pushdown - Straight Bar'),
  ('aefdc8dc-bd06-4270-b2f2-3efa4f5360e8', 'Seated Barbell Overhead Triceps Extension'),
  ('668309c4-7be6-41e9-a2be-a9d8ba81d547', 'Underhand-Grip Dumbbell Bench Press')
) AS v(id, name_eng)
WHERE e.id = v.id
  AND e.name_eng IS NULL;          -- идемпотентность

-- Пост-проверка 1 (ждём 15):
--   SELECT count(*) FROM public.exercises WHERE name_eng IS NULL;   -- было 35, станет 20
-- Пост-проверка 2 (коллизий не стало больше — было 2, CAT-Q2):
--   SELECT name_eng, count(*) FROM public.exercises
--   WHERE name_eng IS NOT NULL GROUP BY name_eng HAVING count(*) > 1;
