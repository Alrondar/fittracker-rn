-- 20261013100000_set_crane_media_url.sql
-- «Журавлик»: записать media_url и поднять статус.
--
-- Зачем. Строка ca48c18f-8614-4a7a-8602-4fb47d625b4d заведена 11.10 (миграция
-- 20261011180000_add_crane_single_leg_glute_hinge.sql) с media_url IS NULL: кадров ещё не
-- было. Кадры нарисованы, приняты и лежат на хосте, но URL в строке так и не появился,
-- поэтому карточка в приложении рисуется без иллюстрации.
--
-- Имя папки. 13.10 папка переименована под name_eng: коммит 0056dce,
-- data/exercises/Crane_Single-Leg_Glute_Hinge/ (дефис, как в «Crane Single-Leg Glute Hinge»).
-- До переименования написание с дефисом отдавало 404, без дефиса — 200; теперь 200 должно
-- отдавать написание с дефисом. Проверить перед применением (см. ПРОВЕРКИ ниже).
--
-- Blast radius. ОДНА строка exercises. Поля: media_url (NULL → путь), status
-- (needs_review → approved), updated_at. Ни одна другая строка не затронута, search_exercises
-- не меняется, name_eng не меняется. program_exercises хранит снимок exercise_name, поэтому
-- 8 слотов в двух программах («Два дня: передняя + жимы / задняя + тяги», «Три дня: передняя
-- цепь / верх / ягодицы») не пересобираются — у них просто появится картинка.
--
-- ПРОВЕРКИ до (ожидается: ровно одна строка, media_url IS NULL, status needs_review,
-- 8 слотов в 2 программах):
--   select id, name, name_eng, status, media_url from public.exercises
--    where id = 'ca48c18f-8614-4a7a-8602-4fb47d625b4d';
--   select count(*) as slots, count(distinct pd.program_id) as programs
--     from public.program_exercises pe
--     join public.program_days pd on pd.id = pe.program_day_id
--    where pe.exercise_id = 'ca48c18f-8614-4a7a-8602-4fb47d625b4d';
--   и curl -o /dev/null -w '%{http_code}\n' по всем четырём файлам новой папки — должно быть 200.
--
-- РЕВЕРС (полный, тривиален):
--   update public.exercises
--      set media_url = null, status = 'needs_review',
--          updated_at = '2026-10-11 14:31:45.108192+00'
--    where id = 'ca48c18f-8614-4a7a-8602-4fb47d625b4d';
--   -- плюс, если понадобится вернуть и имя строки-папки: git revert 0056dce.

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Crane_Single-Leg_Glute_Hinge/00f.jpg',
       status = 'approved',
       updated_at = now()
 where id = 'ca48c18f-8614-4a7a-8602-4fb47d625b4d';

-- ПОСЛЕ (ожидается: ровно одна строка с новым путём и approved; счётчики не изменились):
--   select id, name, status, media_url from public.exercises
--    where id = 'ca48c18f-8614-4a7a-8602-4fb47d625b4d';
--   select count(*) filter (where media_url is null) as rows_without_media
--     from public.exercises;
--   -- замерено 13.10 до правки: 6 из 826 (это «Журавлик» + 5 легаси-строк без кадра),
--   -- после правки ожидается 5.
