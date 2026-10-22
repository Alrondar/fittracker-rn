-- 20261021120000_repoint_three_accepted_frames.sql
-- Три перерисованные позиции легаси: перевести media_url на нашу папку.
--
-- Зачем. Кадры нарисованы, приняты владельцем покадровой приёмкой 15.10 и лежат на хосте
-- (коммит 1ee3f12, двенадцать файлов), но в строках по-прежнему стоит ссылка на чужую папку
-- апстрима, и приложение показывает старый кадр про другое движение:
--   «Тяга Рынделя»   рисуется как наклонная тяга стоя (Риндель тянется лёжа грудью на скамье),
--   «Махи … (задняя дельта)» — как тяга длинной штанги в наклоне,
--   «Подъем на носки в гакк-тренажере» — как гакк-присед, где носки не работают.
--
-- Переключатель — сам media_url (src/utils/mediaScheme.ts:5-16): ссылка на `00f.jpg`
-- включает гендерную пару, ссылка на `0.jpg` — легаси. Откат строки возвращает легаси
-- без правки кода и без удаления файлов.
--
-- Инвариант схемы. Переводим строку только когда в папке лежат ОБЕ пары (женская и мужская),
-- иначе профиль «мужчина» упирается в 404. Замерено 21.10: curl по всем 12 файлам трёх папок
-- отдал 200/200 (00f, 01f, 00m, 01m в каждой).
--
-- Blast radius. ТРИ строки exercises, поле media_url (путь апстрима → наш путь) и updated_at.
-- status не трогаем: все три уже approved. Ни одна другая строка не затронута — name / name_eng
-- / search_exercises не меняются, program_exercises хранит снимок exercise_name, поэтому слоты
-- программ не пересобираются.
--
-- Занятость (замерено продом 21.10): у всех трёх 0 слотов во все программы (каталожные и
-- личные) и 0 строк workout_exercises — то есть кадр меняется только в справочнике и в выдаче
-- поиска, в чужих тренировках ничего не перерисовывается.
--
-- Про осиротевшие копии. После переключения у каждой из трёх апстримных папок не останется
-- ссылок: хозяев в каталоге нет (проверено 21.10 — по одной строке на папку). Файлы на
-- апстриме мы не трогаем. Важный нюанс: `Bent_Over_Barbell_Row` существует и на НАШЕМ хосте —
-- там её держит строка «Тяга штанги в наклоне» (efa318ff, ссылка на .../data/exercises/
-- Bent_Over_Barbell_Row/00f.jpg). Осиротевшей считается только копия на yuhonas/free-exercise-db.
--
-- ПРОВЕРКИ до (ожидается: ровно три строки, все media_url на yuhonas/free-exercise-db,
-- status = у всех approved):
--   select id, name, status, media_url, updated_at from public.exercises
--    where id in ('216243c9-dd00-43ec-908f-d3729638b854',
--                 '026fe9a4-76f9-4db2-8b1d-5ee19579e9cb',
--                 'a8a977d2-a594-4528-8c4e-c13faca1df25');
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- замерено 21.10 до правки: our_host 49, upstream 772, no_media 5, total 826
--
-- РЕВЕРС (полный: возвращаем старый путь и старый updated_at; status не менялся):
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg', updated_at = '2026-10-09 04:32:53.165963+00' where id = '216243c9-dd00-43ec-908f-d3729638b854';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_One-Arm_Long_Bar_Row/0.jpg', updated_at = '2026-08-19 07:53:46.79256+00' where id = '026fe9a4-76f9-4db2-8b1d-5ee19579e9cb';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Narrow_Stance_Hack_Squats/0.jpg', updated_at = '2026-08-19 07:53:46.79256+00' where id = 'a8a977d2-a594-4528-8c4e-c13faca1df25';

-- 1. Тяга Рынделя (Rendl Barbell Row)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Rendl_Barbell_Row/00f.jpg',
       updated_at = now()
 where id = '216243c9-dd00-43ec-908f-d3729638b854';

-- 2. Махи в кроссовере одной рукой с наклоном (задняя дельта) (Bent-Over One-Arm Cable Rear Delt Raise)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Bent-Over_One-Arm_Cable_Rear_Delt_Raise/00f.jpg',
       updated_at = now()
 where id = '026fe9a4-76f9-4db2-8b1d-5ee19579e9cb';

-- 3. Подъем на носки в гакк-тренажере (Hack Squat Machine Calf Raise)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Hack_Squat_Machine_Calf_Raise/00f.jpg',
       updated_at = now()
 where id = 'a8a977d2-a594-4528-8c4e-c13faca1df25';

-- ПОСЛЕ (ожидается: три новых пути на нашем хосте, our_host 52, upstream 769, no_media 5,
-- total 826):
--   select id, name, status, media_url from public.exercises
--    where media_url like '%/Rendl_Barbell_Row/%'
--       or media_url like '%/Bent-Over_One-Arm_Cable_Rear_Delt_Raise/%'
--       or media_url like '%/Hack_Squat_Machine_Calf_Raise/%';
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                          as no_media,
--          count(*)                                                           as total
--     from public.exercises;
--   -- счётчики до/после: our_host 49 → 52, upstream 772 → 769, no_media 5 → 5
--   -- механический матчинг имени папки с name_eng (только легаси-ссылки): 34 → 31
--
-- Клиентский кеш (src/lib/queryPersistence.ts) держит старый ответ, поэтому в приложении
-- и на вебе новый кадр появится после свежего прогона, а не мгновенно.
