-- 20261014090000_repoint_six_legacy_frames.sql
-- Шесть перерисованных позиций легаси: перевести media_url на нашу папку.
--
-- Зачем. Кадры нарисованы, приняты владельцем и лежат на хосте (коммит 7b97727 от 13.10,
-- двадцать четыре файла), но в строках по-прежнему стоит ссылка на чужую папку апстрима,
-- и приложение показывает старый кадр про другое движение. Из шести особенно видно:
-- «Тяга в тренажере (Row)» рисуется как жим от плеч, «Отведение ноги в сторону с резинкой» —
-- как приседание с резинкой.
--
-- Переключатель — сам media_url (src/utils/mediaScheme.ts:5-16): ссылка на `00f.jpg`
-- включает гендерную пару, ссылка на `0.jpg` — легаси. Откат строки возвращает легаси
-- без правки кода и без удаления файлов.
--
-- Инвариант схемы. Переводим строку только когда в папке лежат ОБЕ пары (женская и
-- мужская), иначе профиль «мужчина» упирается в 404. Замерено 14.10: у всех шести папок
-- есть 00f/01f/00m/01m, curl по всем 24 файлам отдал 200/200.
--
-- Blast radius. ШЕСТЬ строк exercises, поля media_url (путь апстрима → наш путь),
-- status (только у двух: needs_review → approved), updated_at. Ни одна другая строка
-- не затронута: name / name_eng / search_exercises не меняются, program_exercises хранит
-- снимок exercise_name, поэтому слоты программ не пересобираются — у них просто меняется
-- картинка.
--
-- Слоты в программах (замерено 14.10):
--   aefdc8dc Французский жим сидя                 16 слотов, 6 дней, 3 программы
--   bb1fbbb4 Разгибание рук на верхнем блоке       12 слотов, 5 дней, 5 программ
--   437b6328 Отведение ноги в сторону с резинкой    6 слотов, 2 дня, 2 программы
--   7a3ccbdf Тяга в тренажере (Row)                 4 слота, 1 день, 1 программа
--   1d20086e Болгарские выпады в Смите              0 слотов (только справочник)
--   8839d193 Подъёмы Y-T-W-L на наклонной скамье    0 слотов (только справочник)
--   всего 38 слотов в 10 программах
--
-- ПРОВЕРКИ до (ожидается: ровно шесть строк, все шесть media_url на yuhonas/free-exercise-db,
-- status = needs_review у aefdc8dc и 8839d193):
--   select id, name, status, media_url from public.exercises
--    where id in ('aefdc8dc-bd06-4270-b2f2-3efa4f5360e8','bb1fbbb4-36df-4bff-b800-d82be5e1cda9',
--                 '437b6328-899f-4eae-8d99-cd6cad70dc70','1d20086e-c63d-4c7b-a6fc-1f4a6dc15380',
--                 '8839d193-0ccd-4c0b-a4f1-583551f47dc4','7a3ccbdf-8711-4532-a2b4-b841edd4cb90');
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- замерено 14.10 до правки: our_host 43, upstream 778, no_media 5, total 826
--
-- РЕВЕРС (полный: возвращаем и старый путь, и старый статус, и старый updated_at):
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension/0.jpg', status = 'needs_review', updated_at = '2026-10-09 04:32:53.165963+00' where id = 'aefdc8dc-bd06-4270-b2f2-3efa4f5360e8';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_V-Bar_Attachment/0.jpg',                                    status = 'approved',     updated_at = '2026-10-09 04:32:53.165963+00' where id = 'bb1fbbb4-36df-4bff-b800-d82be5e1cda9';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Hip_Adductions/0.jpg',                                                   status = 'approved',     updated_at = '2026-08-19 07:53:46.79256+00'  where id = '437b6328-899f-4eae-8d99-cd6cad70dc70';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Pistol_Squat/0.jpg',                                           status = 'approved',     updated_at = '2026-10-09 04:32:53.165963+00' where id = '1d20086e-c63d-4c7b-a6fc-1f4a6dc15380';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Alternating_Cable_Shoulder_Press/0.jpg',                                     status = 'needs_review', updated_at = '2026-10-09 04:32:53.165963+00' where id = '8839d193-0ccd-4c0b-a4f1-583551f47dc4';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Shoulder_Military_Press/0.jpg',                                       status = 'approved',     updated_at = '2026-08-13 09:46:59.371443+00' where id = '7a3ccbdf-8711-4532-a2b4-b841edd4cb90';

-- 1. Французский жим сидя (Seated Barbell Overhead Triceps Extension)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Seated_Barbell_Overhead_Triceps_Extension/00f.jpg',
       status = 'approved',
       updated_at = now()
 where id = 'aefdc8dc-bd06-4270-b2f2-3efa4f5360e8';

-- 2. Разгибание рук на верхнем блоке (прямая рукоять) (Triceps Pushdown - Straight Bar)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Triceps_Pushdown_-_Straight_Bar/00f.jpg',
       updated_at = now()
 where id = 'bb1fbbb4-36df-4bff-b800-d82be5e1cda9';

-- 3. Отведение ноги в сторону с резинкой (Band Hip Abduction)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Band_Hip_Abduction/00f.jpg',
       updated_at = now()
 where id = '437b6328-899f-4eae-8d99-cd6cad70dc70';

-- 4. Болгарские выпады в Смите (Smith Machine Bulgarian Split Squat)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Smith_Machine_Bulgarian_Split_Squat/00f.jpg',
       updated_at = now()
 where id = '1d20086e-c63d-4c7b-a6fc-1f4a6dc15380';

-- 5. Подъёмы Y-T-W-L на наклонной скамье (Incline Y-T-W-L Raise)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Incline_Y-T-W-L_Raise/00f.jpg',
       status = 'approved',
       updated_at = now()
 where id = '8839d193-0ccd-4c0b-a4f1-583551f47dc4';

-- 6. Тяга в тренажере (Row) (Machine Row)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Machine_Row/00f.jpg',
       updated_at = now()
 where id = '7a3ccbdf-8711-4532-a2b4-b841edd4cb90';

-- ПОСЛЕ (ожидается: шесть новых путей, our_host 49, upstream 772, no_media 5, total 826,
-- needs_review в этих шести — 0):
--   select id, name, status, media_url from public.exercises
--    where media_url like '%Alrondar/fittracker-rn/main/data/exercises/Seated_Barbell%'
--       or media_url like '%/Triceps_Pushdown_-_Straight_Bar/%'
--       or media_url like '%/Band_Hip_Abduction/%'
--       or media_url like '%/Smith_Machine_Bulgarian_Split_Squat/%'
--       or media_url like '%/Incline_Y-T-W-L_Raise/%'
--       or media_url like '%/Machine_Row/%';
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- счётчики до/после: our_host 43 → 49, upstream 778 → 772, no_media 5 → 5
--
-- Клиентский кеш (src/lib/queryPersistence.ts) держит старый ответ, поэтому в приложении
-- и на вебе новый кадр появится после свежего прогона, а не мгновенно.
