-- 20261023120000_repoint_four_batch3_frames.sql
-- Партия 3 (21.10): четыре перерисованные позиции легаси — перевести media_url на нашу папку.
--
-- Зачем. Кадры нарисованы, приняты владельцем покадровой приёмкой 21.10 и лежат на хосте
-- (коммит c2bede8, шестнадцать файлов), но в строках по-прежнему стоит ссылка на чужую
-- апстримную папку, и приложение показывает старый кадр про другое движение:
--   «Выпады в Смите»   рисуются как обычный присед в Смите (ног врозь нет),
--   «Мёртвый жук»      — как исходная поза (колени 90°, обе руки в потолок) вместо вытяжения
--                        разноимённых руки и ноги, ради которого движение и делают,
--   «Махи в кроссовере на среднюю дельту» — как мах на заднюю дельту сидя,
--   «Сисси-приседания» — как вариант с отягощением у груди, которого в тексте нет.
--
-- Переключатель — сам media_url (src/utils/mediaScheme.ts:5-16): ссылка на `00f.jpg`
-- включает гендерную пару, ссылка на `0.jpg` — легаси. Откат строки возвращает легаси
-- без правки кода и без удаления файлов.
--
-- Инвариант схемы. Переводим строку только когда в папке лежат ОБЕ пары (женская и мужская),
-- иначе профиль «мужчина» упирается в 404. Замерено 23.10: curl по всем 28 файлам семи папок
-- (этих четырёх и трёх из 20261021120000) отдал 200/200.
--
-- Порядок. Эта миграция ложится ВТОРОЙ, после 20261021120000 (три позиции 15.10): счётчики
-- идут 49 → 52 → 56, апстрим 772 → 769 → 765.
--
-- Blast radius. ЧЕТЫРЕ строки exercises, поле media_url (путь апстрима → наш путь) и
-- updated_at. status не трогаем: все четыре уже approved. Ни одна другая строка не затронута
-- — name / name_eng / search_exercises не меняются, program_exercises хранит снимок
-- exercise_name, поэтому слоты программ не пересобираются.
--
-- Занятость (замерено продом 23.10, слоты — во все программы, hist — строки workout_exercises):
--   «Мёртвый жук»      37 слотов (17 каталожных) и 57 строк истории — самый горячий пункт,
--                      кадр увидят все, кто это движение уже делает;
--   «Махи … (средняя дельта)» 2 / 5;
--   «Выпады в Смите»   0 / 0;
--   «Сисси-приседания» 0 / 0.
--
-- Про осиротевшие копии (замерено 23.10 по числу ссылок на апстримную папку):
--   Dead_Bug                  1 ссылка → осиротеет на апстриме (хозяев в каталоге нет);
--   Cable_Seated_Lateral_Raise 1 ссылка → осиротеет;
--   Smith_Machine_Squat       2 ссылки → останется 1 у «Приседаний в Смите», НЕ осиротевает;
--   Weighted_Sissy_Squat      2 ссылки → останется 1 у «Сисси-приседаний с отягощением».
-- Файлы на апстриме мы не трогаем; локальные зеркала легаси-кадров в data/exercises тоже
-- (у Dead_Bug рядом лежат 0.jpg/1.jpg прежнего импорта — они инертны, клиент читает media_url).
--
-- ПРОВЕРКИ до (ожидается: ровно четыре строки, все media_url на yuhonas/free-exercise-db,
-- status у всех approved):
--   select id, name, status, media_url, updated_at from public.exercises
--    where id in ('cb22b47b-717a-455b-9937-9662aad61606',
--                 '47e3f7b4-062c-4e0c-922c-050e6be282e5',
--                 '4e36cf74-041c-4e06-bcda-1ec02f826b05',
--                 '10a3fed1-8b3c-4cba-a0af-328d79e9499d');
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- после первой миграции ожидается our_host 52, upstream 769, no_media 5, total 826
--
-- РЕВЕРС (полный: возвращаем старый путь и старый updated_at; status не менялся):
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Squat/0.jpg', updated_at = '2026-10-09 04:32:53.165963+00' where id = 'cb22b47b-717a-455b-9937-9662aad61606';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg', updated_at = '2026-08-13 09:46:59.371443+00' where id = '47e3f7b4-062c-4e0c-922c-050e6be282e5';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg', updated_at = '2026-08-19 07:53:46.79256+00' where id = '4e36cf74-041c-4e06-bcda-1ec02f826b05';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/0.jpg', updated_at = '2026-10-09 04:32:53.165963+00' where id = '10a3fed1-8b3c-4cba-a0af-328d79e9499d';

-- 1. Выпады в Смите (Smith Machine Lunge)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Smith_Machine_Lunge/00f.jpg',
       updated_at = now()
 where id = 'cb22b47b-717a-455b-9937-9662aad61606';

-- 2. Мёртвый жук (Dead Bug)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dead_Bug/00f.jpg',
       updated_at = now()
 where id = '47e3f7b4-062c-4e0c-922c-050e6be282e5';

-- 3. Махи в кроссовере на среднюю дельту (Cable Lateral Raise)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cable_Lateral_Raise/00f.jpg',
       updated_at = now()
 where id = '4e36cf74-041c-4e06-bcda-1ec02f826b05';

-- 4. Сисси-приседания (Bodyweight Sissy Squat)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Bodyweight_Sissy_Squat/00f.jpg',
       updated_at = now()
 where id = '10a3fed1-8b3c-4cba-a0af-328d79e9499d';

-- ПОСЛЕ (ожидается: четыре новых пути на нашем хосте, our_host 56, upstream 765, no_media 5,
-- total 826 без изменений):
--   select id, name, status, media_url from public.exercises
--    where media_url like '%/Smith_Machine_Lunge/%'
--       or media_url like '%Alrondar/fittracker-rn/main/data/exercises/Dead_Bug/%'
--       or media_url like '%/Cable_Lateral_Raise/%'
--       or media_url like '%/Bodyweight_Sissy_Squat/%';
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- счётчики до/после: our_host 52 → 56, upstream 769 → 765, no_media 5 → 5, total 826
--   -- механический матчинг имени папки с name_eng (только легаси-ссылки): 34 → 31 → 28
--
-- Клиентский кеш (src/lib/queryPersistence.ts) держит старый ответ, поэтому в приложении
-- и на вебе новый кадр появится после свежего прогона, а не мгновенно.
