-- 20261101090000_point_lying_press_row_to_its_own_frames.sql
-- «Жим в кроссовере с нижних блоков лёжа» (fd16fd41) — снять с чужого кадра и переименовать
-- по-английски так, чтобы имя описывало то, что нарисовано.
--
-- Зачем. Строка делила папку `exercises/Low_Cable_Crossover` с соседней `3e3c5ca0` «Сведение рук
-- в кроссовере снизу вверх»: на тех кадрах стоящая фигура с прямыми руками сводит рукояти снизу
-- вверх по дуге — это сведение, а не жим, скамьи в кадре нет. Разбор 31.10, класс C-1: настоящие
-- дубли по кадру и движению. Вердикт владельца — не снимать строку, а перерисовать: жим с нижних
-- блоков лёжа на скамье движение реальное, просто к тем кадрам отношения не имеет.
--
-- Кадры лежат в медиа-репозитории: `exercises/Lying_Low_Cable_Chest_Press/{00f,01f,00m,01m}.jpg`,
-- 850×567, четыре кадра одной плоской скамьи без спинки, два низких блока по бокам от подушки на
-- линии плеч, ролики ниже уровня подушки. Папка НОВАЯ, `Low_Cable_Crossover` не тронута — в ней
-- остаётся `3e3c5ca0`, которой она и принадлежит.
--
-- Тексты строки (`technique`, `settings`) править НЕ нужно: там уже лежит «лягте на горизонтальную
-- скамью между нижними блоками… выжмите рукояти вверх» — ровно то, что нарисовано. Снаряды тоже
-- верные: «Кроссовер (Нижний Блок)» + «Скамья». Меняется только `name_eng` — прежнее английское
-- имя было именем соседнего сведения, и `aliases` — из них убрано то же английское имя.
--
-- ПРЕДПОСЫЛКА (на момент сборки файла НЕ закрыта): кадры закоммичены и запушены в медиа-репозиторий,
-- и все четыре адреса отвечают 200:
--   for f in 00f 01f 00m 01m; do
--     curl -s -o /dev/null -w "%{http_code}\n" \
--       https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Lying_Low_Cable_Chest_Press/$f.jpg
--   done
-- Пока кадры не лежат на хосте, миграцию НЕ применять: ссылка уйдёт в несуществующие файлы.
--
-- Blast radius. ОДНА строка `exercises`, поля `name_eng`, `media_url`, `aliases`, `search_text`
-- (пересборка по полной формуле — `name_eng` и `aliases` кормят `trg_fill_search_text`, который
-- на UPDATE этих колонок пишет УКОРЧЕННУЮ формулу, поэтому ШАГ 3 обязателен) и `updated_at`.
-- Русское `name`, `short_name`, `technique`, `settings`, `status`, мышцы и снаряды не меняются.
-- В программах строка занимает 0 слотов `program_exercises`, в тренировках — 0 строк
-- `workout_exercises`: история не задевается. При строке 11 связей `exercise_relationships` и
-- 2 предупреждения `injury_exercise_warnings` — их правка не трогает.
--
-- Счётчики от этой правки НЕ ДВИГАЮТСЯ: каталог 820, на нашем хосте 820, без кадра 0, approved 451.
-- Двигается только то, сколько строк смотрит в `Low_Cable_Crossover`: было 2, станет 1.
--
-- ПРОВЕРКИ до (замер 01.11):
--   select id, status, name, name_eng, aliases, media_url from public.exercises
--    where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';
--   -- approved, 'Жим в кроссовере с нижних блоков лёжа', 'Low Cable Crossover',
--   -- aliases {Жим на грудь в кроссовере с нижних блоков лежа, Low Cable Crossover},
--   -- media_url '…/exercises/Low_Cable_Crossover/0.jpg'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Low_Cable_Crossover/%';                    -- 2
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Lying_Low_Cable_Chest_Press/%';            -- 0
--   select count(*) from public.exercises where name_eng = 'Lying Low Cable Chest Press';  -- 0
--   select count(*) from public.exercises;                                       -- 820

-- GUARD.
do $$
declare
    n_row      bigint;
    n_new_name bigint;
    n_new_url  bigint;
    n_on_old   bigint;
    n_twin     bigint;
    n_repo     bigint;
    n_upstream bigint;
    n_noframe  bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47'
       and status = 'approved'
       and name = 'Жим в кроссовере с нижних блоков лёжа'
       and name_eng = 'Low Cable Crossover'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Low_Cable_Crossover/0.jpg';

    if n_row <> 1 then
        raise exception
            'retarget aborted: ожидалась одна approved-строка fd16fd41 с name_eng "Low Cable Crossover" и ссылкой на Low_Cable_Crossover/0.jpg, найдено %',
            n_row;
    end if;

    select count(*) into n_new_name
      from public.exercises
     where name_eng = 'Lying Low Cable Chest Press';

    select count(*) into n_new_url
      from public.exercises
     where media_url like '%/exercises/Lying_Low_Cable_Chest_Press/%';

    if n_new_name <> 0 or n_new_url <> 0 then
        raise exception
            'retarget aborted: имя "Lying Low Cable Chest Press" занято % раз(а), ссылка на новую папку — % раз(а); миграция применена дважды?',
            n_new_name, n_new_url;
    end if;

    select count(*) into n_on_old
      from public.exercises
     where media_url like '%/exercises/Low_Cable_Crossover/%';

    select count(*) into n_twin
      from public.exercises
     where id = '3e3c5ca0-096c-47cb-815d-106284238424'
       and media_url like '%/exercises/Low_Cable_Crossover/%';

    if n_on_old <> 2 or n_twin <> 1 then
        raise exception
            'retarget aborted: в папку Low_Cable_Crossover смотрит % строк (ждали 2), соседка 3e3c5ca0 — % (ждали 1); перечитать',
            n_on_old, n_twin;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null or media_url = ''),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 820 or n_upstream <> 0 or n_noframe <> 0 or n_repo <> 820 then
        raise exception
            'retarget aborted: кадровые счётчики не те (наш хост %, апстрим %, без кадра %, каталог %) — ждали 820 / 0 / 0 / 820',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка на старом кадре, новое имя и папка свободны, соседка остаётся, каталог 820 и все с кадром';
end
$$;

-- ШАГ 1. Английское имя по нарисованному движению + ссылка на свою папку + чистка алиаса.
update public.exercises
   set name_eng  = 'Lying Low Cable Chest Press',
       media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Lying_Low_Cable_Chest_Press/00f.jpg',
       aliases   = array_remove(aliases, 'Low Cable Crossover')
 where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';

-- ШАГ 2. Пересборка `search_text` полной формулой: триггер на `name_eng`/`aliases` пишет укороченную.
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
 where x.id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';

-- ПОСЛЕ:
--   select id, name_eng, aliases, media_url from public.exercises
--    where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';
--   -- 'Lying Low Cable Chest Press', aliases из одного русского имени, ссылка на /00f.jpg
--   select search_text from public.exercises
--    where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';
--   -- начинается с 'жим в кроссовере с нижних блоков лежа lying low cable chest press',
--   -- содержит 'lying low cable chest press' и НЕ содержит 'low cable crossover' отдельно
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Low_Cable_Crossover/%';                    -- 1 (только 3e3c5ca0)
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null or media_url = '') as no_frame,
--          count(*) as total
--     from public.exercises;                              -- 820 / 0 / 820 — не меняется
--   select count(*) from public.exercises where status = 'approved';              -- 451

-- РЕВЕРС:
--   update public.exercises
--      set name_eng  = 'Low Cable Crossover',
--          media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Low_Cable_Crossover/0.jpg',
--          aliases   = array['Жим на грудь в кроссовере с нижних блоков лежа','Low Cable Crossover']
--    where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';
--   -- затем ШАГ 2 ещё раз: search_text соберётся из прежних значений
--   -- Дамп прежних значений (замер 01.11):
--   --   select jsonb_agg(to_jsonb(x)) from public.exercises x
--   --    where id = 'fd16fd41-e661-48ee-87be-a27fe7b0ad47';
--   -- прежний search_text:
--   --   'жим в кроссовере с нижних блоков лежа low cable crossover жим в кроссовере
--   --    жим на грудь в кроссовере с нижних блоков лежа low cable crossover большая
--   --    грудная передняя дельта трицепс кроссовер (нижний блок) скамья bilateral compound strength'
--   -- прежнее updated_at: 2026-10-25T09:45:41.867851+00:00
--
-- Кеш и офлайн. Снимок справочника держит старую ссылку до пересборки (Настройки → «Справочник
-- упражнений» → «Обновить»); `src/lib/queryPersistence.ts` — до истечения кэша.
