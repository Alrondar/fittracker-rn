-- 20261024141000_merge_calf_press_duplicate_into_main.sql
-- Дубль каталога: «Жим носками в тренажёре» (5059defe, name_eng "Calf Press") — та же позиция,
-- что «Подъем на носки в тренажере для жима ногами» (19f4f807). Слить в основную строку, дубль
-- удалить; картинку для дубля не рисовать.
--
-- Зачем. Две строки одного движения в одном снаряде дают в приложении два одинаковых пункта
-- каталога и два разных кадра про одно и то же. У дубля к тому же кадр — апстримный Calf_Press/0.jpg,
-- а нарисованная 24.10 пара лежит в папке основной строки.
--
-- Почему слияние, а не правка. По правилу каталога строку нельзя переименовывать и нельзя
-- склеивать с другой, если у них разная целевая мышца; здесь целевая одна — икроножная,
-- снаряд один — «Тренажер Для Жима Ногами» (f7f79e97, у обеих строк он же, так что снаряжение
-- переносить нечего). Отличается только формулировка: дубль назван «жим носками». Значит
-- имя дубля уходит в aliases основной строки, а сама строка удаляется.
--
-- Blast radius (замер продом 24.10):
--   дубль 5059defe: program_exercises 0, workout_exercises 0 — ни одна программа и ни один
--     протокол на него не смотрят; каскадом уйдут 2 сателлита: exercise_equipment 1 (тот же
--     снаряд, что уже висит на основной строке отдельной ссылкой — у основной ссылка остаётся),
--     exercise_media 1 (5cd42f69, апстримный Calf_Press/0.jpg). exercise_relationships 0,
--     injury_exercise_restrictions 0, injury_exercise_warnings 0.
--   основная 19f4f807: занятость 23 слота и 26 строк истории, status approved — её не трогаем;
--     меняются aliases и search_text.
--   Каталог 825 → 824; upstream-ссылок 759 → 758 (после 20261024140000), папка Calf_Press на
--     апстриме осиротеет — файлов не удаляем, они чужие.
--
-- Про search_text, отдельно. На exercises висят два before-update триггера:
--   trg_exercise_search_text  BEFORE UPDATE OF name, name_eng, short_name, aliases,
--                             primary_muscles, secondary_muscles, tags, category
--   trg_fill_search_text      BEFORE UPDATE OF name, short_name, aliases, name_eng
-- Оба срабатывают на правку aliases, идут по алфавиту и последним выигрывает trg_fill_search_text,
-- который пишет короткую формулу (name + short_name + aliases + name_eng) и теряет мышцы,
-- снаряд, теги и категорию. Проверено dry-run'ом 24.10. Поэтому search_text пересобирается
-- ВРУЧНУЮ вторым шагом — полным сид-выражением (в нём ещё и фолдинг «ё» → «е», иначе строка
-- перестаёт находиться по «жим носками в тренажере»). UPDATE поля search_text ни в один список
-- колонок триггеров не входит, то есть руками поставленное значение триггером не сбивается.
--
-- ПРОВЕРКИ до:
--   select id, name, name_eng, status, aliases, search_text from public.exercises
--    where id in ('19f4f807-e47c-4741-98bd-f940dfd30b92','5059defe-47a5-48be-8342-253f8fe56cf1');
--   select count(*) from public.program_exercises where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
--   select count(*) from public.workout_exercises where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
--   select count(*) from public.exercises;   -- 825

-- GUARD. Дубль удаляется только если он пуст по занятости и сателлиты совпадают с замером 24.10,
-- основная строка на месте и её aliases ещё не дополнялись. Любой непроход — исключение до
-- первого изменения.
do $$
declare
    t_found  boolean;
    d_found  boolean;
    n_pe     bigint;
    n_we     bigint;
    n_eq     bigint;
    n_media  bigint;
    n_rel    bigint;
    n_restr  bigint;
    n_warn   bigint;
    n_eq_t   bigint;
    n_alias  bigint;
begin
    select exists (select 1 from public.exercises where id = '19f4f807-e47c-4741-98bd-f940dfd30b92'
                                                    and status = 'approved'
                                                    and aliases = array['Подъем на носки в тренажере для жима ногами']::text[]) into t_found;
    select exists (select 1 from public.exercises where id = '5059defe-47a5-48be-8342-253f8fe56cf1'
                                                    and status = 'needs_review') into d_found;
    if not t_found or not d_found then
        raise exception 'merge aborted: основная approved / дубль needs_review не найдены (t=%, d=%)', t_found, d_found;
    end if;

    select count(*) into n_pe    from public.program_exercises   where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_we    from public.workout_exercises    where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_eq    from public.exercise_equipment   where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_media from public.exercise_media       where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_rel   from public.exercise_relationships
                                  where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1'
                                     or related_exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_restr from public.injury_exercise_restrictions where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_warn  from public.injury_exercise_warnings     where exercise_id = '5059defe-47a5-48be-8342-253f8fe56cf1';
    select count(*) into n_eq_t  from public.exercise_equipment   where exercise_id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
    select count(*) into n_alias from public.exercises
                                  where id = '19f4f807-e47c-4741-98bd-f940dfd30b92'
                                    and 'Жим носками в тренажёре' = any (aliases);

    if n_pe <> 0 or n_we <> 0 then
        raise exception 'merge aborted: дубль занят (program_exercises %, workout_exercises %)', n_pe, n_we;
    end if;
    if n_eq <> 1 or n_media <> 1 or n_rel <> 0 or n_restr <> 0 or n_warn <> 0 or n_eq_t <> 1 then
        raise exception 'merge aborted: сателлиты не совпадают с замером 24.10 (eq %, media %, rel %, restr %, warn %, eq_target %)',
            n_eq, n_media, n_rel, n_restr, n_warn, n_eq_t;
    end if;
    if n_alias <> 0 then
        raise exception 'merge aborted: alias дубля уже в основной строке — миграция применена дважды?';
    end if;

    raise notice 'merge guard ok: дубль пуст, сателлиты 1/1/0/0/0, снаряд у основной на месте';
end
$$;

-- Шаг 1. Имя дубля и все формы, по которым он находился, уходят в aliases основной.
-- «Жим носками в тренажёре» — как в name, «Жим носками в тренажере» — е-вариант (каталог
-- смешанный по ё/е, поиск по одной форме вторую не находит), «жим носками» — short_name дубля,
-- «Calf Press» — его name_eng.
update public.exercises
   set aliases = aliases || array['Жим носками в тренажёре',
                                  'Жим носками в тренажере',
                                  'жим носками',
                                  'Calf Press']::text[]
 where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';

-- Шаг 2. Пересобрать search_text полным сид-выражением: trg_fill_search_text на шаге 1 стёр
-- из него мышцы, снаряд, теги и категорию. Порядок токенов и фолдинг «ё» → «е» — как у строк,
-- собранных импортёром (проверено сравнением с текущим значением этой же строки до правки).
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
 where x.id = '19f4f807-e47c-4741-98bd-f940dfd30b92';

-- Шаг 3. Дубль удаляем; его снаряжение и media уходят каскадом (ON DELETE CASCADE),
-- снаряд основной строки это не трогает — ссылка отдельная.
delete from public.exercises where id = '5059defe-47a5-48be-8342-253f8fe56cf1';

-- ПОСЛЕ:
--   select count(*) from public.exercises;                                     -- 824
--   select count(*) from public.exercises where id = '5059defe-47a5-48be-8342-253f8fe56cf1';  -- 0
--   select count(*) from public.exercise_equipment where exercise_id = '19f4f807-e47c-4741-98bd-f940dfd30b92';  -- 1
--   select count(*) from public.exercise_media     where exercise_id = '19f4f807-e47c-4741-98bd-f940dfd30b92';  -- 1
--   select aliases, search_text from public.exercises where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
--   -- в search_text обязаны остаться «жим носками», «calf press», «икроножная», «камбаловидная»,
--   -- «тренажер для жима ногами», «isolation», «strength» — иначе поиск по дублю умер
--   select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*)                                                           as total
--     from public.exercises;                                                   -- 61 / 758 / 824
--
-- РЕВЕРС (полный). Порядок обратный: сначала возвращаем дубль и его сателлиты, потом — aliases и
-- search_text основной строки. Два подводных камня: (1) trg_fill_search_text срабатывает и на
-- INSERT, поэтому вставленный дословный дамп он перетирает короткой формулой — search_text дубля
-- ставим отдельным обновлением после вставки; (2) правка aliases основной строки тоже дёргает
-- триггеры, поэтому её search_text возвращается последним обновлением (search_text не входит в
-- списки колонок триггеров и на этот раз устоит).
--
--   INSERT INTO public.exercises
--   SELECT (jsonb_populate_record(NULL::public.exercises, j)).*
--   FROM jsonb_array_elements(
--     '[{"id":"5059defe-47a5-48be-8342-253f8fe56cf1","name":"Жим носками в тренажёре","tags":["bilateral","isolation"],"risks":"Резкие движения в нижней точке могут перегружать ахиллово сухожилие. Не блокируйте колени и не используйте инерцию.","status":"needs_review","aliases":["Жим носками в тренажере","Calf Press"],"benefits":"Изолированно нагружает икроножную мышцу через разгибание голеностопа. Фиксированная траектория позволяет сосредоточиться на движении стоп.","category":"strength","name_eng":"Calf Press","settings":"Передняя часть стопы размещена на нижней части платформы, пятки свободно выходят за её край. Колени слегка согнуты.","media_url":"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press/0.jpg","technique":"Сядьте в тренажёр для жима ногами и разместите переднюю часть стоп на платформе, оставив пятки свободными. Разогните голеностоп, отталкивая платформу носками и поднимая пятки. Плавно опустите пятки ниже исходного положения в пределах контролируемой амплитуды и повторите движение. Дышите равномерно, не выполняя резких пружинящих движений.","created_at":"2026-07-20T06:47:06.724424+00:00","difficulty":"beginner","reps_range":null,"short_name":"жим носками","updated_at":"2026-08-19T07:53:46.79256+00:00","search_text":"жим носками в тренажере calf press жим носками жим носками в тренажере calf press икроножная  тренажер для жима ногами bilateral isolation strength","primary_muscles":["икроножная"],"movement_pattern":"calf_raise","can_be_activation":false,"secondary_muscles":[]}]'::jsonb) AS j;
--
--   update public.exercises
--      set search_text = 'жим носками в тренажере calf press жим носками жим носками в тренажере calf press икроножная  тренажер для жима ногами bilateral isolation strength',
--          updated_at  = '2026-08-19 07:53:46.79256+00'
--    where id = '5059defe-47a5-48be-8342-253f8fe56cf1';   -- вставку перетёр trg_fill_search_text
--
--   insert into public.exercise_equipment (exercise_id, equipment_id)
--        values ('5059defe-47a5-48be-8342-253f8fe56cf1', 'f7f79e97-c453-4fe9-9730-ff04692e3c94');
--
--   insert into public.exercise_media (id, exercise_id, url, media_type, position, source, license, created_at)
--        values ('5cd42f69-5626-4736-bea7-1d0dd7333068',
--                '5059defe-47a5-48be-8342-253f8fe56cf1',
--                'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press/0.jpg',
--                'image', 1, 'legacy', null, '2026-08-08 18:07:02.776973+00');
--
--   update public.exercises set aliases = array['Подъем на носки в тренажере для жима ногами']
--    where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
--   update public.exercises
--      set search_text = 'подъем на носки в тренажере для жима ногами calf press on the leg press machine икры в жиме ногами подъем на носки в тренажере для жима ногами икроножная камбаловидная тренажер для жима ногами isolation strength',
--          updated_at  = '2026-08-19 07:53:46.79256+00'
--    where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
