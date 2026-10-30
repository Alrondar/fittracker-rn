-- 20261029100000_name_and_approve_three_rows_without_name_eng.sql
-- Три строки справочника без `name_eng`: завести английские имена, перевести в `approved`
-- и пересобрать `search_text` полным сид-выражением.
--
--   f70c9ee3  «Удержание штанги»          → name_eng 'Barbell Hold'          (already approved)
--   62adbf83  «Шраги в Смите»             → name_eng 'Smith Machine Shrug'   (needs_review → approved)
--   3f168d4a  «Скандинавские сгибания»    → name_eng 'Nordic Hamstring Curl' (needs_review → approved)
--
-- Зачем. Без `name_eng` у строки нельзя ни папка с кадрами (имя папки выводится из `name_eng` —
-- `illustration-style-lock.md §3`), ни ссылка на кадр, ни англоязычный поиск; чекер имён
-- `check-media-names.py` держит их тремя предупреждениями «кадра нет ни по name_eng, ни по URL».
-- Все три движения существующие, проверены внешними источниками 29.10: «Barbell Hold» — grip-упражнение
-- с прямым хватом и удержанием нагруженного грифа на время (bodybuilding-wizard, библиотека STHENO);
-- «Smith Machine Shrug» — подъём плеч в тренажёре Смита для верха трапеции; «Nordic Hamstring Curl» —
-- эксцентрическое сгибание коленей на коленях с фиксацией стоп (форма уже лежит у строки в `aliases`).
-- Статусы переведены в `approved` по отдельному решению владельца на каждую строку.
--
-- МЕХАНИКА ТРИГГЕРОВ (почему операторов два, а не один). На таблице висит два триггера
-- `BEFORE … UPDATE OF name, name_eng, short_name, aliases, …`: `trg_exercise_search_text` зовёт
-- `set_exercise_search_text()` (средняя формула: мышцы, теги и категория есть, снаряжения и
-- фолдинга «ё» → «е» нет), `trg_fill_search_text` зовёт `fill_search_text()` (короткая: только
-- имя, короткое имя, алиасы и `name_eng`). При правке одного `name_eng` срабатывают оба, порядок
-- — по алфавиту имён триггеров, поэтому последним отработает `trg_fill_search_text` и запишет
-- КОРОТКИЙ текст: из `search_text` выживут мышцы, снаряд, теги и категория, а «ё» перестанет
-- сворачиваться. Тот же эффект уже чинился вручную в
-- `20261024141000_merge_calf_press_duplicate_into_main.sql`. Поэтому: сначала правим `name_eng` и
-- `status`, затем ОТДЕЛЬНЫМ оператором пересобираем `search_text` — в списки колонок обоих
-- триггеров `search_text` не входит, так что второй оператор их не будит.
--
-- Формула — та же сид-строка, что и у остальных 820 позиций; её совпадение с текущими значениями
-- проверено SELECT'ом на проде (колонка `stored_equals_formula` — true для всех трёх строк), то
-- есть пересборка добавляет ровно одно слово — английское имя.
--
-- Blast radius. ТРИ строки `exercises`, поля `name_eng` (был NULL), `status` (у двух), `search_text`
-- и `updated_at`. Занятость: 0 слотов в `program_exercises` и 0 строк в `workout_exercises` у всех
-- трёх (замер продом 29.10) — ни одна программа и ни один протокол тренировки на них не смотрят,
-- снимки пересобирать не нужно. В `exercise_media` у всех трёх 0 строк, связей `exercise_relationships`
-- 0, ограничений по травмам 0; предупреждения `injury_exercise_warnings` (2 + 2 + 1) не трогаем —
-- они висят по `exercise_id` и от имени не зависят. `name`, `short_name`, `aliases`, мышцы, теги и
-- категория не меняются. Кадры никуда не переключаются: `media_url` остаётся NULL у всех трёх,
-- поэтому счётчики кадров (наш хост / без кадра) эта миграция НЕ двигает и порядок её применения
-- относительно `20261029090000_set_side_to_side_chins_media.sql` не важен.

-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, status, name_eng, media_url, updated_at from public.exercises
--    where id in ('f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5',
--                 '62adbf83-2e5c-473b-b9f6-ef6ddce0334e',
--                 '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3');
--   -- ожидается три строки: name_eng IS NULL, media_url IS NULL,
--   -- status: approved / needs_review / needs_review,
--   -- updated_at у всех трёх = '2026-08-19 07:53:46.79256+00'
--   select count(*) from public.exercises;              -- 823
--   select count(*) from public.exercises
--    where name_eng is null or btrim(name_eng) = '';    -- 3
--   select count(*) from public.exercises where status = 'approved';   -- 450

-- GUARD. Все три строки находятся ровно в том виде, в котором замерены, ни одна другая строка
-- не носит предлагаемые имена и ни одна ссылка кадра не ведёт в будущие папки.
do $$
declare
    n_row      bigint;
    n_named    bigint;
    n_taken    bigint;
    n_folder   bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where (id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5'
            and name = 'Удержание штанги'
            and status = 'approved'
            and name_eng is null
            and media_url is null)
        or (id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e'
            and name = 'Шраги в Смите'
            and status = 'needs_review'
            and name_eng is null
            and media_url is null)
        or (id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3'
            and name = 'Скандинавские сгибания'
            and status = 'needs_review'
            and name_eng is null
            and media_url is null);

    if n_row <> 3 then
        raise exception
            'name three rows aborted: ожидалось три замеренные строки без name_eng, найдено %',
            n_row;
    end if;

    select count(*) into n_named
      from public.exercises
     where name_eng is null or btrim(name_eng) = '';

    if n_named <> 3 then
        raise exception
            'name three rows aborted: строк без name_eng в каталоге % , а не три — список сверить заново',
            n_named;
    end if;

    select count(*) into n_taken
      from public.exercises
     where lower(name_eng) in ('barbell hold', 'smith machine shrug', 'nordic hamstring curl');

    if n_taken <> 0 then
        raise exception
            'name three rows aborted: одно из имён уже занято другой строкой (% совпадений) — миграция применена дважды?',
            n_taken;
    end if;

    select count(*) into n_folder
      from public.exercises
     where media_url ~ '/exercises/(Barbell_Hold|Smith_Machine_Shrug|Nordic_Hamstring_Curl)/';

    if n_folder <> 0 then
        raise exception
            'name three rows aborted: на будущие папки уже ссылается % строк(а)',
            n_folder;
    end if;

    select count(*) into n_total from public.exercises;

    if n_total <> 823 then
        raise exception
            'name three rows aborted: каталог % строк, а не 823 — перечитать перед записью',
            n_total;
    end if;

    raise notice 'guard ok: три строки без имени, имена свободны, каталог 823';
end
$$;

-- ШАГ 1. Имена и статусы. После этого оператора `search_text` у всех трёх строк лежит короткая
-- формула (работает `trg_fill_search_text`) — так и задумано, шаг 2 её перезатирает.
update public.exercises
   set name_eng = 'Barbell Hold',
       status = 'approved'
 where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';

update public.exercises
   set name_eng = 'Smith Machine Shrug',
       status = 'approved'
 where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';

update public.exercises
   set name_eng = 'Nordic Hamstring Curl',
       status = 'approved'
 where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';

-- ШАГ 2. Полная пересборка `search_text` сид-формулой (имя, английское имя, короткое имя, алиасы,
-- мышцы, вторичные мышцы, снаряжение из `exercise_equipment`, теги, категория) со сворачиванием
-- «ё» → «е». Триггеров не будит: `search_text` нет ни в одном списке колонок.
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
 where x.id in ('f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5',
                '62adbf83-2e5c-473b-b9f6-ef6ddce0334e',
                '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3');

-- ПОСЛЕ:
--   select id, name_eng, status, search_text from public.exercises
--    where id in ('f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5',
--                 '62adbf83-2e5c-473b-b9f6-ef6ddce0334e',
--                 '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3');
--   -- ожидаемые `search_text` (замерены SELECT'ом с той же формулой до записи):
--   --   удержание штанги barbell hold удержание штанги удержание штанги мышцы предплечья
--   --     бицепс трапеция штанга isometric bilateral strength
--   --   шраги в смите smith machine shrug шраги в смите шраги в смите верхняя трапеция
--   --     мышцы поднимающие лопатку тренажер смита bilateral isolation strength
--   --   скандинавские сгибания nordic hamstring curl нордические сгибания скандинавские сгибания
--   --     (nordic hamstring curl) nordic hamstring curl бицепс бедра икроножная разгибатели спины
--   --     коврик партнер тренажер nordic bilateral isolation posterior_chain rehabilitation strength
--   select count(*) from public.exercises
--    where name_eng is null or btrim(name_eng) = '';   -- 3 → 0
--   select count(*) from public.exercises where status = 'approved';
--                                                        -- 450 → 452 (вырос на две строки)
--   select count(*) filter (where status = 'approved') as approved,
--          count(*)                                    as total
--     from public.exercises;                           -- total 823 без изменений, approved 452
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null) as no_frame
--     from public.exercises;                           -- НЕ двигаются: кадры не трогаем
--
-- Что появится после: три позиции встанут в очередь генерации как рисованные (папки
-- `Barbell_Hold`, `Smith_Machine_Shrug`, `Nordic_Hamstring_Curl`), предупреждения чекера
-- «<нет name_eng>» уйдут. `check-media-names.py` и манифест после выкладки — перечитать.
--
-- РЕВЕРС (двумя операторами на строку, в обратном порядке: сначала имя и статус — триггеры
-- перетирают `search_text`, — затем дословный `search_text` и `updated_at`):
--   update public.exercises set name_eng = null, status = 'approved'
--     where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--   update public.exercises set search_text =
--     'удержание штанги удержание штанги удержание штанги мышцы предплечья бицепс трапеция штанга isometric bilateral strength',
--     updated_at = '2026-08-19 07:53:46.79256+00'
--     where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--
--   update public.exercises set name_eng = null, status = 'needs_review'
--     where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--   update public.exercises set search_text =
--     'шраги в смите шраги в смите шраги в смите верхняя трапеция мышцы поднимающие лопатку тренажер смита bilateral isolation strength',
--     updated_at = '2026-08-19 07:53:46.79256+00'
--     where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--
--   update public.exercises set name_eng = null, status = 'needs_review'
--     where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--   update public.exercises set search_text =
--     'скандинавские сгибания нордические сгибания скандинавские сгибания (nordic hamstring curl) nordic hamstring curl бицепс бедра икроножная разгибатели спины коврик партнер тренажер nordic bilateral isolation posterior_chain rehabilitation strength',
--     updated_at = '2026-08-19 07:53:46.79256+00'
--     where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--
--   -- проверка реверса: name_eng IS NULL у трёх, статусы approved / needs_review / needs_review,
--   -- search_text дословно совпадают с замером 29.10, updated_at прежний (его правим последним,
--   -- потому что `trg_exercises_updated_at` — BEFORE UPDATE и на любой оператор ставит now())
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` и снимок справочника держат старые строки: поиск по
-- английскому имени и статус появятся у пользователя только после пересборки снимка (фоновая раз в
-- трое суток, принудительная — Настройки → «Справочник упражнений» → «Обновить»).
