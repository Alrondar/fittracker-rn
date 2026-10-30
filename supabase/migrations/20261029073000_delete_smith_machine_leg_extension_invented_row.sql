-- 20261029073000_delete_smith_machine_leg_extension_invented_row.sql
-- Строка «Разгибание ног в Смите (с адаптером)» (9a77e5f5) удалена по вердикту владельца 29.10:
-- «удалить упражнение. нам не нужны какие-то придуманные упражнения».
--
-- Зачем. Движение не подтвернено ни одним внешним описанием, а его снаряд в тексте строки собран
-- из двух разных вещей. Проверка 29.10:
--   * гид по 16 упражнениям в Смите (Major Fitness, 29.07.2026) — разгибания ног нет вовсе;
--   * карточки «как делать разгибание ног» (Rep Fitness, Bay Area, e3rehab) — только блочный
--     тренажёр, и установочная фраза там ровно та, что живёт в наших `settings`: «ось вращения
--     тренажёра должна совпадать с осью коленного сустава»;
--   * ролики про квадрицепс в Смите — присед в Смите, жим ногами в Смите, икры; seated knee
--     extension с грифом у голеней нет нигде;
--   * в апстримном зеркале папки `Smith_Machine_Leg_Extension` нет: `…/Smith_Machine_Leg_Extension/0.jpg`
--     и `…/Leg_Extension/0.jpg` отдают 404 (curl 29.10).
-- То есть `settings` строки — пересказ инструкции к машинному разгибанию, а не описание работы
-- в Смите. Реально существующий «адаптер» (рычаг с осью у колена и валиком у голени, который
-- bolt-ится к СТОЙКАМ рамы и грузится блинами: Bells of Steel, Rep Fitness, Made-in-China LEA-1000)
-- — это навес на раму, а не гриф на рельсах; движение под него совпадает с уже существующей
-- строкой «Разгибание ног в тренажере» (`2b2f46fb`, approved) по целевой мышце, оси и амплитуде.
--
-- Отдельно про мою ошибку. Я предложил конфигурацию «подушка на грифе + манжеты на голенях,
-- разгибание колен тянет гриф вверх по рельсам», не найдя её внешне, и собрал под неё промпты.
-- Владелец остановил до приёмки. Урок в `illustration-style-lock.md §2.1`: перед генерацией
-- проверять не только что движение физически существует, но и что снаряд из `settings` существует
-- в описанной комбинации; если `settings` совпадает дословно с инструкцией к другой машине —
-- это признак дубля, а не новой позиции.
--
-- Blast radius (замер продом 29.10 до удаления):
--   program_exercises 0, workout_exercises 0 — ни одна программа и ни один протокол на строку не
--     смотрели, история тренировок не затрагивается;
--   каскадом (ON DELETE CASCADE) уходят 16 сателлитов: exercise_equipment 3 (Адаптер
--     2192e885, Тренажер Смита e35fb4e3, Скамья 8c8ca43e), exercise_media 1 (1290e43e, легаси-URL
--     на Smith_Machine_Leg_Press/0.jpg), exercise_relationships 10 — ВСЕ десять идут от этой строки
--     как от exercise_id (regression 3, progression 1, alternative 3, variation 3), чужих ссылок
--     на неё никто не держал, injury_exercise_warnings 2 (голеностоп и колено, level avoid),
--     injury_exercise_restrictions 0.
--   папка кадра не осиротеет: на `Smith_Machine_Leg_Press` указывает ещё c31b0925 «Жим ногами в
--     тренажёре Смита» (needs_review) — ссылка останется;
--   движение остаётся покрытым реальными строками: `2b2f46fb` «Разгибание ног в тренажере»
--     (approved, кадр Leg_Extensions) и `5ebd7e5e` «Разгибание ноги в тренажере одной ногой».
--   Каталог 824 → 823; кадр на нашем хосте 820 → 819; строк без кадра 4 без изменений;
--   `search_exercises` по «разгибание ног в смите» после удаления ничего не найдёт — этого
--   запроса в программах нет (занятость 0), так что ни один снимок не осиротеет.

-- ПРОВЕРКИ до:
--   select id, name, name_eng, status, media_url from public.exercises
--    where id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
--   select count(*) from public.program_exercises where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
--   select count(*) from public.workout_exercises  where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
--   select count(*) from public.exercises;   -- 824

-- GUARD. Удаление не проходит, если строка занята, если её статус или имя ушли с замера 29.10,
-- если сателлиты не совпадают с посчитанными или если кто-то всё-таки ссылается на неё из чужих
-- связей. Проверки идут до первого изменения; исключение откатывает транзакцию целиком.
do $$
declare
    n_row   bigint;
    n_pe    bigint;
    n_we    bigint;
    n_eq    bigint;
    n_media bigint;
    n_rel   bigint;
    n_rel_in bigint;
    n_warn  bigint;
    n_restr bigint;
    n_total bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97'
       and status = 'needs_review'
       and name_eng = 'Smith Machine Leg Extension'
       and media_url like '%/exercises/Smith_Machine_Leg_Press/0.jpg';

    if n_row <> 1 then
        raise exception
            'delete aborted: ожидалась одна needs_review-строка "Smith Machine Leg Extension" с кадром жима ногами в Смите, найдено %',
            n_row;
    end if;

    select count(*) into n_pe    from public.program_exercises    where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_we    from public.workout_exercises     where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_eq    from public.exercise_equipment    where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_media from public.exercise_media        where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_rel   from public.exercise_relationships
                                  where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_rel_in from public.exercise_relationships
                                  where related_exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_warn  from public.injury_exercise_warnings     where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_restr from public.injury_exercise_restrictions where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';
    select count(*) into n_total from public.exercises;

    if n_pe <> 0 or n_we <> 0 then
        raise exception 'delete aborted: строка занята (program_exercises %, workout_exercises %)', n_pe, n_we;
    end if;
    if n_eq <> 3 or n_media <> 1 or n_rel <> 10 or n_rel_in <> 0 or n_warn <> 2 or n_restr <> 0 then
        raise exception
            'delete aborted: сателлиты не совпадают с замером 29.10 (eq %, media %, rel_out %, rel_in %, warn %, restr %)',
            n_eq, n_media, n_rel, n_rel_in, n_warn, n_restr;
    end if;
    if n_total <> 824 then
        raise exception 'delete aborted: каталог % строк, а не 824 — сверку 29.10 перечитать', n_total;
    end if;

    raise notice 'delete guard ok: строка пуста по занятости, сателлиты 3/1/10/0/2/0, каталог 824';
end
$$;

delete from public.exercises where id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';

-- ПОСЛЕ:
--   select count(*) from public.exercises;                                                    -- 823
--   select count(*) from public.exercises where id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97'; -- 0
--   select count(*) from public.exercise_relationships
--    where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97'
--       or related_exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';                     -- 0
--   select count(*) from public.exercise_equipment
--    where exercise_id = '9a77e5f5-f1b9-4294-9ef2-ad552ef61c97';                             -- 0
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;                                                                 -- 819 / 4 / 823
--   select count(*) from public.exercises where media_url like '%/Smith_Machine_Leg_Press/%';  -- 1 (c31b0925)
--   select id, name, status from public.exercises where name_eng ilike '%leg extension%';
--   -- остаются две реальные строки: 2b2f46fb approved, 5ebd7e5e needs_review
--
-- РЕВЕРС (полный). Данные сняты `to_jsonb`/`json_agg` из прода 29.10 перед удалением, перенесены
-- дословно. Порядок прямой: сначала exercises, затем сателлиты. После вставки пересобирать
-- `search_text` не нужно — дампы содержат его исходное значение, а правки `aliases` здесь нет.
--
-- BEGIN;
--
-- INSERT INTO public.exercises
-- SELECT (jsonb_populate_record(NULL::public.exercises, j)).*
-- FROM jsonb_array_elements(
-- '[{"id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","name":"Разгибание ног в Смите (с адаптером)","tags":["isolation"],"risks":"Неудобная фиксация стоп или неправильное положение оси может увеличить нагрузку на колени и голеностоп. Не используйте вес, который мешает контролировать движение.","status":"needs_review","aliases":["Разгибание ног в Смите (с адаптером)"],"benefits":"Позволяет изолированно нагрузить квадрицепс с использованием фиксированной траектории тренажера Смита. Является вариантом разгибания ног при наличии подходящего адаптера.","category":"strength","name_eng":"Smith Machine Leg Extension","settings":"Скамья установлена в тренажере Смита. Используются адаптер и положение, при котором ось движения совпадает с коленным суставом.","media_url":"https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Leg_Press/0.jpg","technique":"Сядьте на скамью в тренажере Смита и установите адаптер так, чтобы сопротивление передавалось на стопы. Расположите ноги в исходном положении с коленями согнутыми. Разогните ноги в коленных суставах до контролируемого положения, затем медленно верните их назад. Дышите равномерно и не допускайте рывка в конечной точке.","created_at":"2026-07-03T07:11:49.019226+00:00","difficulty":"intermediate","reps_range":null,"short_name":"разгибание ног в Смите","updated_at":"2026-10-25T09:45:41.867851+00:00","search_text":"разгибание ног в смите (с адаптером) разгибание ног в смите разгибание ног в смите (с адаптером) smith machine leg extension","primary_muscles":["квадрицепс"],"movement_pattern":"squat","can_be_activation":false,"secondary_muscles":["прямая мышца бедра"]}]'::jsonb) AS j;
--
-- INSERT INTO public.exercise_equipment
-- SELECT (jsonb_populate_record(NULL::public.exercise_equipment, j)).*
-- FROM jsonb_array_elements(
-- '[{"exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","equipment_id":"2192e885-3bf4-4a67-9856-a7672c43e33e"},{"exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","equipment_id":"e35fb4e3-f3fa-4da1-b9c4-9c79b5f26645"},{"exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","equipment_id":"8c8ca43e-d081-44e8-8882-ae5b5bf7164c"}]'::jsonb) AS j;
--
-- INSERT INTO public.exercise_media
-- SELECT (jsonb_populate_record(NULL::public.exercise_media, j)).*
-- FROM jsonb_array_elements(
-- '[{"id":"1290e43e-bc04-4b3e-af16-de70b76e7dc8","url":"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Smith_Machine_Leg_Press/0.jpg","source":"legacy","license":null,"position":1,"created_at":"2026-08-08T18:07:02.776973+00:00","media_type":"image","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97"}]'::jsonb) AS j;
--
-- INSERT INTO public.exercise_relationships
-- SELECT (jsonb_populate_record(NULL::public.exercise_relationships, j)).*
-- FROM jsonb_array_elements(
-- '[{"id":"f54ebe9a-bf13-48e6-8f06-74f3fcbaafbe","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"regression","related_exercise_id":"bed06e42-a97a-4897-a3a1-02146c313080"},{"id":"68373f08-f3b5-4031-8592-3f0fb4ef46ab","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"regression","related_exercise_id":"622844b0-ec29-4550-9549-5ca46f892c14"},{"id":"cb264cb5-8dda-47a2-bae9-7bae19a326f0","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"regression","related_exercise_id":"7e564b9c-5348-498b-a61d-dea7e6c7c8a6"},{"id":"150a990a-b3f3-4073-8dda-906f4be0afac","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"progression","related_exercise_id":"906bc1e4-ca95-4c18-a266-8600176ced59"},{"id":"908d4c47-b0b8-455a-b87a-86d083fc2d2b","status":"suggested","confidence":"medium","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"alternative","related_exercise_id":"80dbbc6e-7c6f-492e-a79a-f16ab4b40878"},{"id":"a43e1986-7d47-413b-bd4d-0e2dd5f101a8","status":"suggested","confidence":"medium","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"alternative","related_exercise_id":"256af2e1-9e2a-4f65-8570-7e09f9726abe"},{"id":"38a55226-512c-4363-8fe0-b6e110d84b16","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"alternative","related_exercise_id":"4a404501-e59b-475f-accc-a64fa7890dbf"},{"id":"f13c757a-e849-4fd2-850b-091ce14511e7","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"variation","related_exercise_id":"0cac699a-e5cd-4175-a95a-279cf9d46da2"},{"id":"717a4de3-5289-49c9-a751-1a8c162fab7a","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"variation","related_exercise_id":"0d7f121e-be39-407b-89c2-39cc85c6e7e3"},{"id":"609ac284-9638-41e5-8b07-3f27c980a09c","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.316223+00:00","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","relation_type":"variation","related_exercise_id":"c31b0925-6c10-4c5e-9112-9800bd458f86"}]'::jsonb) AS j;
--
-- INSERT INTO public.injury_exercise_warnings
-- SELECT (jsonb_populate_record(NULL::public.injury_exercise_warnings, j)).*
-- FROM jsonb_array_elements(
-- '[{"id":"d8b63bd3-7ceb-4289-8c31-1796af74e095","level":"avoid","body_part":"ankle","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","injury_type":"strain","muscle_group":"","warning_level":"caution","recommendation":"голеностоп (растяжение)"},{"id":"4a0df4bf-12a2-4fa4-8a9c-f9c4bf93dd34","level":"avoid","body_part":"knee","exercise_id":"9a77e5f5-f1b9-4294-9ef2-ad552ef61c97","injury_type":"strain","muscle_group":"","warning_level":"caution","recommendation":"колено (растяжение связок)"}]'::jsonb) AS j;
--
-- COMMIT;
--
-- Проверка реверса перед применением: 1 + 3 + 1 + 10 + 2 = 17 литералов, счётчик каталога
-- возвращается к 824, кадр на нашем хосте — к 820.
