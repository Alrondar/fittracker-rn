-- 20261025200000_repoint_upstream_frames_to_media_repo.sql
-- Легаси-кадры справочника переезжают на наш хост: все 758 строк, что вели на
-- yuhonas/free-exercise-db, начинают отдаваться из Alrondar/fittracker-exercise-media.
-- После этого в каталоге не остаётся ни одной ссылки на чужой репозиторий.
--
-- Почему это вообще возможно: зеркало кадров апстрима лежало у нас в репозитории
-- медиа с момента переезда (§15.11) — те же имена папок, те же байты. Проверено
-- 25.10 полным прогоном, а не выборкой: 758 строк × 2 кадра, которые запросит
-- клиент (0.jpg + 1.jpg, разборка как в src/utils/mediaScheme.ts) = 1516 адресов,
-- из них на нашем хосте не нашлось 8.
--
-- Эти 8 адресов — четыре строки с потерянным дефисом в пути (в базе
-- `Back_Flyes_-With_Bands`, а в репозитории `Back_Flyes_-_With_Bands`): они были
-- битыми и на апстриме, то есть четыре карточки не показывали кадр ДО переезда.
-- Правильно именованные папки есть в нашем зеркале, каждый кандидату проверен
-- HEAD-ом (200). Для них шаг 2 ставит адрес целиком, а не replace'ом.
--
-- Счётчики ДО (пробегать перед применением, прод 25.10):
--   select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%') as ours,
--          count(*) filter (where media_url like '%yuhonas/free-exercise-db%')          as upstream,
--          count(*) filter (where media_url is null or media_url = '')                  as no_frame,
--          count(*)                                                                     as total
--     from exercises;
--   -- ожидаем: ours 61 · upstream 758 · no_frame 5 · total 824
-- Счётчики ПОСЛЕ: ours 819 · upstream 0 · no_frame 5 · total 824.
--
-- Blast radius. 758 строк `exercises`, поле `media_url` (+ `updated_at` ставит
-- триггер trg_exercises_updated_at). Ни name, ни name_eng, ни search_text, ни
-- status не меняются: триггеры search_text висят на правке name/name_eng/
-- short_name/aliases/muscles/tags/category, на media_url не срабатывают — проверено
-- на предыдущих двух переездах адресов. program_exercises хранит снимок
-- exercise_name, поэтому слоты программ не пересобираются; история тренировок к
-- кадрам не обращается.
--
-- Что это меняет на устройствах. Старый адрес продолжает отдавать байты — апстрим
-- мы не трогаем и ничего у него не забираем, поэтому устройства с сохранённым
-- снимком справочника не падают в 404: переезд здесь мягче предыдущего и версия
-- снимка (src/lib/exerciseSnapshot.ts) НЕ поднимается. Меняется только ключ кэша:
-- наше хранилище кадров и кэш браузера ключуются полному адресу, так что при
-- следующем обновлении снимка кадры докачаются с нового адреса (потолок 25 МБ и
-- вытеснение по давности ограничивают объём, вес нужных кадров в зеркале — 81,71 МБ).
--
-- Ответственность. С этого момента рисовку апстрима раздаём мы: если они обновят
-- картинку, наше зеркало об этом не узнает. Порядок обновления зеркала — в скилле
-- exercise-catalog (секция «Медиа»); сверяется скриптом
-- spark-output/export/check-upstream-mirror.py.
--
-- Реверс — точечный: дамп строк до правки лежит в
-- spark-output/export/pre-repoint-upstream-dump.json (758 записей id/name/status/
-- media_url, снято 25.10 через PostgREST, 212 КБ). Обратный replace того же
-- префикса возвращает 754 строки, четыре восстанавливаются из дампа по id.

-- Шаг 0. Guard: пока каталог не совпал с замером, ни одна строка не тронута.
do $$
declare
    ours     bigint;
    upstream bigint;
    no_frame bigint;
    total    bigint;
begin
    select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%'),
           count(*) filter (where media_url like '%yuhonas/free-exercise-db%'),
           count(*) filter (where media_url is null or media_url = ''),
           count(*)
      into ours, upstream, no_frame, total
      from public.exercises;

    if ours <> 61 or upstream <> 758 or no_frame <> 5 or total <> 824 then
        raise exception
            'переезд легаси aborted: ours %, upstream %, no_frame %, total % (ожидалось 61 / 758 / 5 / 824)',
            ours, upstream, no_frame, total;
    end if;

    if exists (select 1 from public.exercises
                where media_url like '%yuhonas/free-exercise-db%' and media_url like '%?v=%') then
        raise exception 'переезд легаси aborted: на апстримных строках появился хвост версии — replace его не сохранит, перечитать';
    end if;
end $$;

-- Шаг 1. Переезд префикса. Касается всех строк на чужом хосте, включая четыре с
--битым именем папки — для них адрес всё равно станет 404, его правит шаг 2.
update public.exercises
   set media_url = replace(
         media_url,
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/'
       )
 where media_url like 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/%';

-- Шаг 2. Четыре строки с потерянным дефисом: адрес ставится целиком, по папке,
-- которая реально лежит в зеркале и проверена HEAD-ом 25.10.
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Isometric_Neck_Exercise_-_Front_And_Back/0.jpg'
 where id = 'd5024a09-e75a-40f0-a815-38215edb3a1d';

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Back_Flyes_-_With_Bands/0.jpg'
 where id = '3d0a4d8e-154a-4ede-8030-3195fd35e49c';

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Hang_Snatch_-_Below_Knees/0.jpg'
 where id = 'd569a72d-750e-4488-8f89-071ed891f5c4';

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Crunch_-_Hands_Overhead/0.jpg'
 where id = '6ed84398-3750-416d-ba09-c1c558495e4f';

-- Шаг 3. Самопроверка в той же транзакции: чужих ссылок не осталось, счётчики
-- сошлись с ожиданием, и четыре исправленные строки смотрят ровно на те адреса,
-- которые проверены HEAD-ом.
do $$
declare
    ours      bigint;
    upstream  bigint;
    no_frame  bigint;
    total     bigint;
    fixed     bigint;
begin
    select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%'),
           count(*) filter (where media_url like '%yuhonas/free-exercise-db%'),
           count(*) filter (where media_url is null or media_url = ''),
           count(*)
      into ours, upstream, no_frame, total
      from public.exercises;

    if ours <> 819 or upstream <> 0 or no_frame <> 5 or total <> 824 then
        raise exception
            'переезд легаси не сошёлся: ours %, upstream %, no_frame %, total % (ожидалось 819 / 0 / 5 / 824)',
            ours, upstream, no_frame, total;
    end if;

    select count(*) into fixed
      from public.exercises
     where (id, media_url) in (
        ('d5024a09-e75a-40f0-a815-38215edb3a1d',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Isometric_Neck_Exercise_-_Front_And_Back/0.jpg'),
        ('3d0a4d8e-154a-4ede-8030-3195fd35e49c',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Back_Flyes_-_With_Bands/0.jpg'),
        ('d569a72d-750e-4488-8f89-071ed891f5c4',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Hang_Snatch_-_Below_Knees/0.jpg'),
        ('6ed84398-3750-416d-ba09-c1c558495e4f',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Crunch_-_Hands_Overhead/0.jpg'));

    if fixed <> 4 then
        raise exception 'переезд легаси не сошёлся: исправленных строк с дефисом %, ожидалось 4', fixed;
    end if;
end $$;

-- Проверка после применения (живьём, HEAD по каждому кадру каждой строки):
--   python spark-output/export/check-media-names.py --http
-- плюс полный прогон доступности — он обязан вернуть ноль битых адресов.
--
-- Реверс одной операцией (754 строки) плюс четыре по дампу:
--   update public.exercises
--      set media_url = replace(
--            media_url,
--            'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/',
--            'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
--          )
--    where media_url like 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/%'
--      and id not in ('d5024a09-e75a-40f0-a815-38215edb3a1d',
--                     '3d0a4d8e-154a-4ede-8030-3195fd35e49c',
--                     'd569a72d-750e-4488-8f89-071ed891f5c4',
--                     '6ed84398-3750-416d-ba09-c1c558495e4f');
