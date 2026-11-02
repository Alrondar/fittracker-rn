-- 20261101130000_name_the_floor_fly_row_by_its_frames.sql
-- «Разводка гантелей лёжа на полу» (726e06e3) — дать строке её собственные кадры и её
-- английское имя. Русское имя, описание и исходное положение трогать не нужно: они верные.
--
-- Зачем. Разбор 31.10, класс C: кадр нарисован не под своё имя при уникальном движении.
-- Строка ссылалась на `exercises/Dumbbell_Flyes/0.jpg` — там горизонтальная скамья и полная
-- дуга ниже уровня подушки, то есть движение соседней строки `9564b145` «Разводка гантелей
-- лежа» (её принятая пара — `Dumbbell_Fly/00f.jpg`, `01f.jpg`).
--
-- Проверено 01.11 по источникам (Motra, PureGym, Rep Fitness): вариант называется
-- «Dumbbell Floor Fly» — lie flat on the back, knees bent, feet planted, slight elbow bend
-- kept fixed, lower until the UPPER ARMS touch the floor; пол и есть ограничитель амплитуды.
-- Наш `technique` описывает ровно это («разведите руки в стороны до момента, когда плечи
-- мягко коснутся пола»), `settings` — тоже, снаряд только «Гантели». Неверны только кадр и
-- `name_eng` = «Dumbbell Flyes», то есть обычная разводка — имя соседней строки.
--
-- Кадры лежат в медиа-репозитории в НОВОЙ папке `Dumbbell_Floor_Fly`
-- (`00f/01f/00m/01m.jpg`, 850×567, по 47–55 КБ). Папка свободна: в медиа такой не было,
-- строки с таким `name_eng` в каталоге нет — по выборке `%floor%` заняты
-- `Dumbbell_Floor_Press`, `Floor_Press`, `One_Arm_Floor_Press`, `Alternating_Floor_Press`,
-- `Extended_Range_One-Arm_Kettlebell_Floor_Press`, `Leg-Over_Floor_Press`,
-- `Floor_Glute-Ham_Raise`, `Seated_Floor_Hamstring_Stretch`,
-- `Oblique_Crunches_-_On_The_Floor`. Прежняя папка `Dumbbell_Flyes` остаётся на хосте:
-- после выкладки на неё не смотрит ни одна строка, удаление — отдельным коммитом.
--
-- Ракурс взят из семьи принятой пары `Dumbbell_Fly` (головной конец, поворот к её правой
-- стороне), но ниже и дальше: с близкой камеры разведённые в стороны руки не влезают в кадр.
--
-- Blast radius. ОДНА строка `exercises`: поля `name_eng`, `media_url`, `search_text`
-- (пересборка по полной формуле — `name_eng` кормит `trg_fill_search_text`, который на
-- UPDATE этой колонки пишет УКОРЧЕННУЮ формулу) и `updated_at`. Русские `name`,
-- `short_name`, `aliases`, `technique`, `settings`, `status`, мышцы и снаряды не меняются.
-- В программах 0 слотов `program_exercises`, в тренировках 0 строк `workout_exercises`.
-- При строке 8 связей `exercise_relationships`, предупреждений и ограничений по травме 0.
--
-- Счётчики: каталог 820, на нашем хосте 820, без кадра 0, подтверждённых 451 —
-- НЕ ДВИГАЮТСЯ. Двигается только число строк на старой папке `Dumbbell_Flyes`: было 1,
-- станет 0.
--
-- Побочная находка, в эту миграцию НЕ положена: у строки пуст `secondary_muscles`, хотя
-- источники кладут в подсобные переднюю дельту и трицепс. Это правка мышц, а не кадров, —
-- отдельное решение владельца.
--
-- ПРОВЕРКИ до (замер 01.11):
--   select id, status, name, name_eng, media_url from public.exercises
--    where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';
--   -- needs_review, 'Разводка гантелей лежа на полу', 'Dumbbell Flyes',
--   -- '…/exercises/Dumbbell_Flyes/0.jpg'
--   select count(*) from public.exercises where name_eng = 'Dumbbell Floor Fly';            -- 0
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Dumbbell_Floor_Fly/%';                               -- 0
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Dumbbell_Flyes/%';                                   -- 1
--   select count(*) from public.exercises;                                                  -- 820

-- GUARD.
do $$
declare
    n_row      bigint;
    n_new_name bigint;
    n_new_url  bigint;
    n_on_old   bigint;
    n_repo     bigint;
    n_upstream bigint;
    n_noframe  bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c'
       and name = 'Разводка гантелей лежа на полу'
       and name_eng = 'Dumbbell Flyes'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Dumbbell_Flyes/0.jpg'
       and technique like '%Лягте на пол%';

    if n_row <> 1 then
        raise exception
            'floor fly aborted: ожидалась одна строка 726e06e3 с name_eng "Dumbbell Flyes", ссылкой на Dumbbell_Flyes/0.jpg и текстом про пол, найдено %',
            n_row;
    end if;

    select count(*) into n_new_name
      from public.exercises
     where name_eng = 'Dumbbell Floor Fly';

    select count(*) into n_new_url
      from public.exercises
     where media_url like '%/exercises/Dumbbell_Floor_Fly/%';

    if n_new_name <> 0 or n_new_url <> 0 then
        raise exception
            'floor fly aborted: имя "Dumbbell Floor Fly" занято % раз(а), ссылка на новую папку — % раз(а); миграция применена дважды?',
            n_new_name, n_new_url;
    end if;

    select count(*) into n_on_old
      from public.exercises
     where media_url like '%/exercises/Dumbbell_Flyes/%';

    if n_on_old <> 1 then
        raise exception
            'floor fly aborted: на папку Dumbbell_Flyes смотрит % строк — ждали 1, перечитать',
            n_on_old;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null or media_url = ''),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 820 or n_upstream <> 0 or n_noframe <> 0 or n_repo <> 820 then
        raise exception
            'floor fly aborted: кадровые счётчики не те (наш хост %, апстрим %, без кадра %, каталог %) — ждали 820 / 0 / 0 / 820',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка на чужом кадре, новое имя и папка свободны, на старой папке одна строка, каталог 820 и все с кадром';
end
$$;

-- ШАГ 1. Английское имя по нарисованному движению + ссылка на свою папку.
update public.exercises
   set name_eng  = 'Dumbbell Floor Fly',
       media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Dumbbell_Floor_Fly/00f.jpg'
 where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';

-- ШАГ 2. Пересборка `search_text` полной формулой: триггер на `name_eng` пишет укороченную.
update public.exercises x
   set search_text = lower(replace(concat_ws(' ',
        x.name, x.name_eng, x.short_name,
        array_to_string(x.aliases, ' '),
        array_to_string(x.primary_muscles, ' '),
        array_to_string(x.secondary_muscles, ' '),
        (select string_agg(e.name, ' ' order by e.name)
           from public.exercise_equipment ee
           join public.equipment e on e.id = ee.equipment_id
          where ee.exercise_id = x.id),
        array_to_string(x.tags, ' '),
        x.category), 'ё', 'е'))
 where x.id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';

-- ПОСЛЕ:
--   select id, name_eng, media_url, left(search_text, 120) from public.exercises
--    where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';
--   -- 'Dumbbell Floor Fly', ссылка кончается на /Dumbbell_Floor_Fly/00f.jpg — гендерная пара
--   -- включается, search_text начинается с 'разводка гантелей лежа на полу dumbbell floor fly'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Dumbbell_Flyes/%';                        -- 0
--   select count(*) from public.exercises;                                       -- 820
--   select count(*) from public.exercises where media_url is null or media_url = '';  -- 0
--   select count(*) from public.exercises where status = 'approved';              -- 451 — не меняется
--
-- ПОСЛЕ ВЫКЛАДКИ: папка `Dumbbell_Flyes` с двумя фото-кадрами становится осиротевшей —
-- удаление отдельным коммитом в медиа-репозитории.
--
-- РЕВЕРС:
--   update public.exercises
--      set name_eng  = 'Dumbbell Flyes',
--          media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Dumbbell_Flyes/0.jpg'
--    where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';
--   -- затем ШАГ 2 ещё раз: search_text соберётся из прежних значений
--   -- Дамп прежних значений (замер 01.11):
--   --   select jsonb_agg(to_jsonb(x)) from public.exercises x
--   --    where id = '726e06e3-4b97-43fa-a9a4-4f0dab18575c';
--   -- прежний search_text (снят 01.11, двойной пробел там, где пуст список подсобных мышц):
--   --   'разводка гантелей лежа на полу dumbbell flyes разводка на полу разводка гантелей
--   --    лежа на полу большая грудная  гантели isolation strength'
--   -- прежнее updated_at: 2026-10-25T09:45:41.867851+00:00
--
-- Кеш и офлайн. Снимок справочника держит старую ссылку до пересборки (Настройки →
-- «Справочник упражнений» → «Обновить»).
