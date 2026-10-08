-- ============================================================================
-- CAT-1b: простановка media_url для 16 позиций CAT-1.
--
-- Источник картинок — свой репозиторий (решение владельца 08.10): кадры лежат в
-- data/exercises/<Id>/0.jpg и 1.jpg, репозиторий публичный (проверено:
-- raw.githubusercontent.com/Alrondar/fittracker-rn/main/app.json → 200).
-- Паттерн совпадает с тем, по которому приложение грузит все 821 существующий кадр,
-- поэтому код не меняется.
--
-- В БД хранится ОДНА ссылка на 0.jpg: parseMediaUrls (TechniqueMediaSlider.tsx:51-55)
-- сам достраивает 1.jpg из 0.jpg. Записывать обе рамки строкой через запятую не нужно.
--
-- Имя папки выводится из name_eng механически (пробелы → '_', дефис сохраняется),
-- поэтому переименование позиции в каталоге ломает картинку. Проверка соответствия
-- перед применением: git ls-files data/exercises | grep "<Id>".
--
-- Порядок: применять ПОСЛЕ push — до пуша URL отдают 404, и карточки покажут пустой
-- бокс вместо картинки (тот же класс, что MEDIA-1 с 404-ным Crunch_-Hands_Overhead).
--
-- Реверс:
--   UPDATE public.exercises SET media_url = NULL WHERE name_eng = ANY(ARRAY[<те же 16>]);
-- ============================================================================

UPDATE public.exercises
SET media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/'
             || replace(name_eng, ' ', '_') || '/0.jpg'
WHERE name_eng = ANY(ARRAY[
  'Smith Machine Hip Thrust','Dumbbell Hip Thrust','Single-Leg Hip Thrust','Machine Hip Thrust',
  'Low Cable Hip Abduction','High Cable Hip Abduction','Cable Hip Extension at 45 Degrees','Clamshell',
  'Dumbbell Romanian Deadlift','B-Stance Dumbbell Romanian Deadlift','Rotational Romanian Deadlift',
  'Wide-Grip Barbell Upright Row','One-Arm Cable Lateral Raise','Alternating Lateral Raise with Pause',
  'Incline Y-Raise','Bent-Over T-Raise'
])
AND media_url IS NULL;

-- Пост-проверка (отдельным запросом, ожидаем 16/16 и ноль вбитых папок):
--   SELECT count(*) FROM exercises
--   WHERE name_eng = ANY(ARRAY[...]) AND media_url LIKE 'https://raw.githubusercontent.com/Alrondar/%';
