-- 20261029110000_merge_smith_hang_power_clean_duplicate.sql
-- Коллизия каталога: две approved-строки на одно и то же движение и один и тот же кадр —
-- «Взятие штанги на грудь с виса в СИЛОВОМ СТИЛЕ в тренажере Смита» (902871f2) и
-- «Взятие штанги на грудь с виса в тренажере Смита» (fcab6afd). Обе носят один name_eng
-- "Smith Machine Hang Power Clean" и один media_url на папку Smith_Machine_Hang_Power_Clean.
-- Решение владельца 29.10: оставить fcab6afd, дубль 902871f2 слить и удалить.
--
-- Почему это дубль, а не две позиции (замер продом 29.10, ДО записи):
--   связи   — исходящих 9 у обеих, общих 9, уникальных 0; входящих 23 у обеих, общих 23,
--             уникальных 0; друг на друга не ссылаются;
--   снаряд  — exercise_equipment 1 у обеих, один и тот же equipment_id 8c8ca43e (Тренажер Смита);
--   кадр    — exercise_media 1 у обеих, один и тот же url и одна и та же отметка создания
--             2026-08-08 18:07:02.776973 (то есть импорт завёл обе строки из одной записи);
--   данные  — мышцы, вторичные мышцы, теги, movement_pattern hinge, category strength,
--             difficulty advanced — слово в слово;
--   занятость — 0 слотов в program_exercises и 0 строк в workout_exercises у обеих;
--   созданы — 20.07.2026 06:47:07.782208 и 20.07.2026 06:47:09.234575, разница 1,45 секунды.
-- Отличаются только тексты: имя, короткое имя, settings, technique, risks, benefits, search_text.
--
-- Оговорка по смыслу, которая записана, чтобы её не потерять. «Power clean» — неполный подсед,
-- приём на прямые ноги; «hang clean» — с подседом. В технике удаляемой строки написано «быстро
-- подсядьте под него», то есть текст обещает подсед, которого силовой вариант не предполагает;
-- в оставляемой строке про подсед не сказано вовсе. По этому признаку выбрать оставляемую было
-- нельзя, поэтому решал владелец, а не текст. Английское имя у оставляемой строки уже
-- "Smith Machine Hang Power Clean", и русская форма удалённой («в силовом стиле») уходит в
-- aliases — то есть поиск продолжит находить позицию по обоим названиям, под тем же кадром.
--
-- Blast radius (замер продом 29.10):
--   дубль 902871f2: program_exercises 0, workout_exercises 0 — ни одна программа и ни один
--     протокол на него не смотрят. Каскадом уходят 34 сателлита: exercise_equipment 1,
--     exercise_media 1 (50b46c94, апстримный Smith_Machine_Hang_Power_Clean/0.jpg),
--     exercise_relationships 32 (9 исходящих + 23 входящие) — все 32 имеют точного двойника на
--     оставляемой строке, поэтому перепривязка не нужна и ничего не теряется;
--     injury_exercise_warnings 0, injury_exercise_restrictions 0.
--   основная fcab6afd: занятость 0 / 0, меняются aliases, search_text и updated_at; кадр
--     (media_url на 0.jpg той же папки) остаётся — папка не осиротеет, файлы не трогаем.
--   Счётчики: каталог 823 → 822; кадр на нашем хосте 819 → 818; строк без кадра 4 без изменений;
--     approved 452 → 451. Коллизия name_eng закрывается: различных name_eng было 822 при 823
--     именованных строках, станет 822 при 822 — дублей не останется.
--
-- Про search_text, отдельно. Правка aliases будит оба триггера (trg_exercise_search_text и
-- trg_fill_search_text); они идут по алфавиту имён, поэтому последним выигрывает короткий
-- fill_search_text и теряет мышцы, снаряд, теги, категорию и фолдинг «ё» → «е». Проверено
-- телами функций из прода. Поэтому search_text пересобирается ВТОРЫМ шагом полным сид-выражением —
-- поле search_text не входит ни в один список колонок триггеров, так что руками поставленное
-- значение устоит. Тот же приём уже применён в
-- 20261024141000_merge_calf_press_duplicate_into_main.sql.
--
-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, name_eng, status, aliases, media_url from public.exercises
--    where id in ('902871f2-40e4-4c40-bb1d-41962903b474','fcab6afd-59c5-49c8-9ad6-930efb517a7b');
--   -- ожидается: обе approved, name_eng "Smith Machine Hang Power Clean",
--   -- у fcab6afd aliases = ['Взятие штанги на грудь с виса в тренажере Смита']
--   select count(*) from public.exercises;                        -- 823
--   select count(*) from public.exercises where status='approved';-- 452

-- GUARD. Удаляем только если дубль пуст по занятости, наборы связей совпадают полностью,
-- снаряд и кадр те же, а основная строка ещё не дополнялась алиасом.
do $$
declare
    n_dup      bigint;
    n_main     bigint;
    n_alias    bigint;
    n_pe       bigint;
    n_we       bigint;
    n_eq       bigint;
    n_media    bigint;
    n_out      bigint;
    n_in       bigint;
    n_out_only bigint;
    n_in_only  bigint;
    n_total    bigint;
    n_appr     bigint;
begin
    select count(*) into n_dup
      from public.exercises
     where id = '902871f2-40e4-4c40-bb1d-41962903b474'
       and name = 'Взятие штанги на грудь с виса в силовом стиле в тренажере Смита'
       and name_eng = 'Smith Machine Hang Power Clean'
       and status = 'approved';

    if n_dup <> 1 then
        raise exception
            'merge aborted: дубль 902871f2 в ожидаемом виде не найден (%) — сверку перечитать', n_dup;
    end if;

    select count(*), count(*) filter (where aliases = array['Взятие штанги на грудь с виса в тренажере Смита'])
      into n_main, n_alias
      from public.exercises
     where id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b'
       and name_eng = 'Smith Machine Hang Power Clean'
       and status = 'approved'
       and media_url is not null;

    if n_main <> 1 or n_alias <> 1 then
        raise exception
            'merge aborted: основная строка не найдена или её aliases уже менялись (main %, alias %)',
            n_main, n_alias;
    end if;

    select (select count(*) from public.program_exercises where exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474'),
           (select count(*) from public.workout_exercises where exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474')
      into n_pe, n_we;

    if n_pe <> 0 or n_we <> 0 then
        raise exception
            'merge aborted: дубль занят (program_exercises %, workout_exercises %) — слияние через перепривязку, не удаление',
            n_pe, n_we;
    end if;

    select count(*) into n_eq
      from public.exercise_equipment a
      join public.exercise_equipment b on b.equipment_id = a.equipment_id
     where a.exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474'
       and b.exercise_id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';

    select count(*) into n_media
      from public.exercise_media a
      join public.exercise_media b on b.url = a.url
     where a.exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474'
       and b.exercise_id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';

    if n_eq <> 1 or n_media <> 1 then
        raise exception
            'merge aborted: снаряд или кадр не совпадают (equipment %, media %) — это не дубль',
            n_eq, n_media;
    end if;

    select count(*) into n_out
      from public.exercise_relationships
     where exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474';

    select count(*) into n_in
      from public.exercise_relationships
     where related_exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474';

    select count(*) into n_out_only
      from public.exercise_relationships a
     where a.exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474'
       and not exists (select 1 from public.exercise_relationships b
                        where b.exercise_id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b'
                          and b.related_exercise_id = a.related_exercise_id);

    select count(*) into n_in_only
      from public.exercise_relationships a
     where a.related_exercise_id = '902871f2-40e4-4c40-bb1d-41962903b474'
       and not exists (select 1 from public.exercise_relationships b
                        where b.related_exercise_id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b'
                          and b.exercise_id = a.exercise_id);

    if n_out <> 9 or n_in <> 23 or n_out_only <> 0 or n_in_only <> 0 then
        raise exception
            'merge aborted: наборы связей разошлись (out %, in %, уникальных исходящих %, входящих %) — каскад потеряет связи',
            n_out, n_in, n_out_only, n_in_only;
    end if;

    select count(*), count(*) filter (where status = 'approved')
      into n_total, n_appr
      from public.exercises;

    if n_total <> 823 or n_appr <> 452 then
        raise exception
            'merge aborted: счётчики каталога сдвинулись (total %, approved %), сверку 823 / 452 перечитать',
            n_total, n_appr;
    end if;

    raise notice 'guard ok: дубль пуст, связи совпадают (9 / 23), каталог 823, approved 452';
end
$$;

-- ШАГ 1. Русское имя дубля уходит в aliases основной строки.
update public.exercises
   set aliases = array['Взятие штанги на грудь с виса в тренажере Смита',
                       'Взятие штанги на грудь с виса в силовом стиле в тренажере Смита']
 where id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';

-- ШАГ 2. Полная пересборка search_text сид-формулой (шаг 1 её перетёр короткой формулой).
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
 where x.id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';

-- ШАГ 3. Удаление дубля; 34 сателлита уходят каскадом (все они — точные двойники связей
-- основной строки, поэтому ничего не теряется).
delete from public.exercises
 where id = '902871f2-40e4-4c40-bb1d-41962903b474';

-- ПОСЛЕ:
--   select id, name, name_eng, aliases, search_text, media_url from public.exercises
--    where id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';
--   -- ожидаемый search_text (посчитан той же формулой до записи):
--   --   взятие штанги на грудь с виса в тренажере смита smith machine hang power clean
--   --   взятие с виса в смите взятие штанги на грудь с виса в тренажере смита
--   --   взятие штанги на грудь с виса в силовом стиле в тренажере смита бицепс бедра
--   --   большая ягодичная разгибатели спины квадрицепс дельтовидные трапеция тренажер смита
--   --   bilateral compound explosive strength
--   select count(*) from public.exercises where id = '902871f2-40e4-4c40-bb1d-41962903b474';  -- 0
--   select count(*) from public.exercises;                          -- 823 → 822
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null) as no_frame,
--          count(*) filter (where status='approved') as approved
--     from public.exercises;                                        -- 819 → 818 · 4 · 452 → 451
--   select count(*) from public.exercise_relationships
--    where exercise_id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';    -- 9, не изменилось
--   select distinct name_eng from public.exercises
--    where name_eng = 'Smith Machine Hang Power Clean';              -- одна строка
--
-- РЕВЕРС (полный). Порядок: сначала возвращаем дубль и его сателлиты, потом — aliases и
-- search_text основной строки. Триггер fill_search_text срабатывает и на INSERT, поэтому
-- дословный дамп перетирается короткой формулой — search_text дубля ставим отдельным обновлением
-- после вставки; у основной строки то же самое после правки aliases.
--
--   INSERT INTO public.exercises
--   SELECT (jsonb_populate_record(NULL::public.exercises, j)).*
--   FROM jsonb_array_elements(
--     '[{"id":"902871f2-40e4-4c40-bb1d-41962903b474","name":"Взятие штанги на грудь с виса в силовом стиле в тренажере Смита","tags":["bilateral","compound","explosive"],"risks":"При неправильном подседе может возрастать нагрузка на колени и плечевой пояс. Не сгибайте руки преждевременно и не увеличивайте вес при потере контроля.","status":"approved","aliases":["Взятие штанги на грудь с виса в силовом стиле в тренажере Смита"],"benefits":"Развивает взрывную силу и координацию движения при направленной траектории грифа. Вариант из положения виса исключает старт с пола.","category":"strength","name_eng":"Smith Machine Hang Power Clean","settings":"Используйте тренажер Смита с грифом на высоте виса. Спина нейтральна, таз отведен назад, перед приемом грифа корпус стабилен.","media_url":"https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Hang_Power_Clean/0.jpg","technique":"Встаньте под гриф тренажера Смита и расположите его на уровне бедер или немного выше. Отведите таз назад, затем мощно разогните таз и колени, ускоряя гриф вверх. Быстро подсядьте под него и примите штангу на плечи, после чего стабилизируйте стойку. Дышите ритмично и сохраняйте контроль положения коленей и корпуса.","created_at":"2026-07-20T06:47:07.782208+00:00","difficulty":"advanced","reps_range":null,"short_name":"пауэр клин в Смите","updated_at":"2026-10-25T09:45:41.867851+00:00","search_text":"взятие штанги на грудь с виса в силовом стиле в тренажере смита smith machine hang power clean пауэр клин в смите взятие штанги на грудь с виса в силовом стиле в тренажере смита бицепс бедра большая ягодичная разгибатели спины квадрицепс дельтовидные трапеция тренажер смита bilateral compound explosive strength","primary_muscles":["бицепс бедра"],"movement_pattern":"hinge","can_be_activation":false,"secondary_muscles":["большая ягодичная","разгибатели спины","квадрицепс","дельтовидные","трапеция"]}]'::jsonb) AS j;
--
--   update public.exercises
--      set search_text = 'взятие штанги на грудь с виса в силовом стиле в тренажере смита smith machine hang power clean пауэр клин в смите взятие штанги на грудь с виса в силовом стиле в тренажере смита бицепс бедра большая ягодичная разгибатели спины квадрицепс дельтовидные трапеция тренажер смита bilateral compound explosive strength',
--          updated_at  = '2026-10-25 09:45:41.867851+00'
--    where id = '902871f2-40e4-4c40-bb1d-41962903b474';   -- вставку перетёр trg_fill_search_text
--
--   insert into public.exercise_equipment (exercise_id, equipment_id)
--        values ('902871f2-40e4-4c40-bb1d-41962903b474', '8c8ca43e-d081-44e8-8882-ae5b5bf7164c');
--
--   insert into public.exercise_media (id, exercise_id, url, media_type, position, source, license, created_at)
--        values ('50b46c94-55cb-43de-90a4-e5604356678b',
--                '902871f2-40e4-4c40-bb1d-41962903b474',
--                'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Hang_Power_Clean/0.jpg',
--                'image', 1, 'legacy', null, '2026-08-08 18:07:02.776973+00');
--
--   -- 32 ребра: 23 входящих и 9 исходящих (дамп продом 29.10, порядок по exercise_id/related_exercise_id)
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('8ffd4361-7a0e-426c-90ff-75643e90915a', '09f12000-623b-430b-baec-995a4845a7e3', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('69b765f6-85a6-4a7a-b5a0-451f11a84ac1', '1ec64c99-27c2-4448-a504-8e3cd1884123', '902871f2-40e4-4c40-bb1d-41962903b474', 'variation', 'suggested', 'high', '2026-08-13 09:10:02.862792+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('de1f660c-c894-4719-ad1e-7ba91ebc24bc', '37624227-76a7-4458-81d4-97f1e402349d', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('5f2a488a-be41-406e-8014-a9f3c1d31329', '46040d82-332a-492f-ab70-d712c3276429', '902871f2-40e4-4c40-bb1d-41962903b474', 'variation', 'suggested', 'high', '2026-08-13 09:10:03.6141+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('d4ce4975-29b6-4589-b5b3-c670a28f7cad', '58cfeb6a-7755-437d-a124-33802d4cee9b', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('5d8af5c2-0837-43ea-8576-0dd038a91f83', '62970bb6-8761-4322-9777-2faa5132b98f', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('dfbcb724-b245-4d87-98d8-4577cf5d5f1a', '6d1ab063-1c74-4d4b-8f95-94966c649dcd', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.469195+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('ee967ea6-b6db-465a-b4d6-84ca5e6f7ea7', '83b6e390-aadd-4327-936c-6f0920860e7c', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.862792+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('0dd5ee09-8f38-4182-a168-4955b4c3be58', '902871f2-40e4-4c40-bb1d-41962903b474', '09f12000-623b-430b-baec-995a4845a7e3', 'progression', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('3be66691-2f73-4dd6-abf9-c99b1e0608c5', '902871f2-40e4-4c40-bb1d-41962903b474', '1ec64c99-27c2-4448-a504-8e3cd1884123', 'variation', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('d72cdaa7-91c9-43f4-ac50-4ac6815b7682', '902871f2-40e4-4c40-bb1d-41962903b474', '37624227-76a7-4458-81d4-97f1e402349d', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('b35c5459-ba4c-4290-b569-9ac16b395f4b', '902871f2-40e4-4c40-bb1d-41962903b474', '46040d82-332a-492f-ab70-d712c3276429', 'variation', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('0bc34602-725d-42ca-b04d-b6b5beb63ab5', '902871f2-40e4-4c40-bb1d-41962903b474', 'add5483d-7840-4053-bc2b-409b4f83f9aa', 'progression', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('a6fcba49-7ffc-476a-908c-3d87180b6f22', '902871f2-40e4-4c40-bb1d-41962903b474', 'b064dd5f-6f2e-49e3-bcdb-282aaca17dc7', 'variation', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('08abd726-22e8-408f-a511-25a162a65b80', '902871f2-40e4-4c40-bb1d-41962903b474', 'b9f53e78-d1e1-4d56-ae25-1353ec41abb5', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('72001727-5b9d-402b-bd2f-d5f6076c8332', '902871f2-40e4-4c40-bb1d-41962903b474', 'c5e23980-edb1-4766-8ea7-b493c0b40d0b', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('46b3b0bf-b9a6-4a1e-811f-7900aacdefae', '902871f2-40e4-4c40-bb1d-41962903b474', 'cc010aa7-5df3-4ed3-8a79-9218531ee861', 'progression', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('e024bd00-6986-4b38-864b-fd48983afda2', '9639590a-6b8c-4fd0-88df-0c901b43a3e0', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.910937+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('9bc79329-e7f6-43d6-a179-a9ea5c8a1bac', 'a66b11db-c1be-4434-8740-11f64356fe91', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('5e076fc0-bdaf-4543-837b-f3539aafd790', 'add5483d-7840-4053-bc2b-409b4f83f9aa', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('497764d3-8a72-4fa0-91e3-95feaacfda5d', 'aed9204e-b765-44a7-ac7e-51f2f0ead967', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('6cb01ab4-d37c-49b0-8e23-900e205efbe9', 'b064dd5f-6f2e-49e3-bcdb-282aaca17dc7', '902871f2-40e4-4c40-bb1d-41962903b474', 'variation', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('399a3313-d481-49f0-ac62-9264a7972104', 'b9f53e78-d1e1-4d56-ae25-1353ec41abb5', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('e35d3e0d-0791-4541-8ee1-7930091b9ca2', 'be4f02cc-6958-4592-8728-820569b8710d', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.469195+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('de26774c-93f0-474b-8858-e501b4bd3d0d', 'c0c2a6c3-0718-4ffd-9927-6716d4793af9', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('cdb6ee44-e957-40a7-9c48-8aa6edeb118a', 'c5e23980-edb1-4766-8ea7-b493c0b40d0b', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:01.621487+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('dc2d2e09-2f2c-4a33-90e1-9afef8db9335', 'cc010aa7-5df3-4ed3-8a79-9218531ee861', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('b3aa82bb-4ec7-4c10-bbb5-2ab880301d75', 'daa82b69-5743-4173-93d0-9f1f940b9923', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.6141+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('77b00aa9-7a11-4f16-9ac6-88f1ef0aac67', 'e4250b1e-0f7b-42f9-bd42-c8039b5b5702', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.862792+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('c572e990-3a1e-4069-9a37-595b85f0ca91', 'e61b233a-2533-4a32-8a71-e3257ab79ce0', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.6141+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('7c67ed08-1f05-4284-9367-933acd7ca252', 'e821fba4-d9ed-4aa9-91a6-5cc25fd0e2b6', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:02.388314+00');
--   insert into public.exercise_relationships (id, exercise_id, related_exercise_id, relation_type, status, confidence, created_at) values ('91cd60e6-7d60-47a4-9bff-46f755baf01c', 'f337d88f-cce7-472f-9046-c4347b6d1612', '902871f2-40e4-4c40-bb1d-41962903b474', 'alternative', 'suggested', 'high', '2026-08-13 09:10:03.6141+00');
--
--   update public.exercises
--      set aliases = array['Взятие штанги на грудь с виса в тренажере Смита']
--    where id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';
--   update public.exercises
--      set search_text = 'взятие штанги на грудь с виса в тренажере смита smith machine hang power clean взятие с виса в смите взятие штанги на грудь с виса в тренажере смита бицепс бедра большая ягодичная разгибатели спины квадрицепс дельтовидные трапеция тренажер смита bilateral compound explosive strength',
--          updated_at  = '2026-10-25 09:45:41.867851+00'
--    where id = 'fcab6afd-59c5-49c8-9ad6-930efb517a7b';
--
-- Кеш и офлайн. Снимок справочника держит обе строки до пересборки: у пользователя в каталоге
-- будет на один пункт больше и оба названия найдутся, пока снимок не пересобран (фоновая раз в
-- трое суток, принудительная — Настройки → «Справочник упражнений» → «Обновить»).
