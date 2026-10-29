-- Удаление позиции-призрака: «Пуловер в Смите» (f24044ec-1a34-4def-bcc7-e3383ccb5520)
--
-- Вердикт владельца 23.10: «кажется упражнение физически невозможно… упражнение надо удалить».
--
-- Почему позиция невыполнима как описана. Текст обещает дугу: «удерживайте руки над грудью…
-- по дуге опустите гриф за голову». Плечо — шарнир, кисть идёт по дуге радиусом ~0,65 м:
-- от вертикали до ~140° это +0,42 м назад и −0,50 м вниз. Гриф в Смите зажат в каретках и имеет
-- одну степень свободы — вертикаль по рельсам; 0,42 м горизонтального смещения машина не даёт
-- ни при какой расстановке скамьи. Если придвинуть скамью так, чтобы линия рельсов оказалась за
-- головой, дуги нет: плечо стартово в конце амплитуды, «повтор» сводится к сгибанию локтей.
--
-- Проверка внешних источников 23.10:
--   free-exercise-db (876 позиций): «Smith Machine Pullover» отсутствует, папки с кадрами нет
--     (…/exercises/Smith_Machine_Pullover/0.jpg → HTTP 404). Pullover'ов там пять, все реальные.
--   exrx.net / muscleandstrength.com / bodybuilding.com / strengthlog.com по запросу
--     «smith machine pullover» — ноль результатов. В ExRx есть Lever Pullover (рычажный тренажёр,
--     где дугу даёт конструкция), Barbell Pullover, Cable Bent-over Pullover.
--   Название встречается только в одном блоге-подборке и в подписях к тренировкам; в списках
--     оборудования «Smith Machine, Pullover» — две позиции через запятую (Смит и отдельный
--     тренажёр-пуловер), а не одна.
--   Строка пришла из импорта 03.07 без картинки источника: media_url был притянут к
--     Decline_Smith_Press/0.jpg, то есть к жиму на наклонной — другое движение.
--
-- Радиус (счётчики до, сняты 23.10 тем же прогоном, что и дамп для реверса):
--   program_exercises = 0, workout_exercises = 0  → ни одна программа и ни один протокол
--     тренировки на строку не смотрят, пользовательских данных не затрагивает.
--   Сателлиты, которые уйдут каскадом (ON DELETE CASCADE; у program_exercises политика SET NULL,
--   но строк там нет): exercise_equipment 2, exercise_media 1, exercise_relationships 19
--     (10, где строка — субъект, и 9, где на неё ссылаются другие упражнения),
--     injury_exercise_warnings 2. Итого 24.
--   exercises: 826 → 825.
--   Расхождений «папка кадра ↔ name_eng» (счётчик audits 23.10): 28 → 27 — эта строка была
--     среди них, её кадр ссылался на чужое движение.
--   Кадры на нашем хосте не меняются: 56 → 56 (строка смотрела в апстрим), upstream 765 → 765.
--
-- Ссылкой на id в коде позиция не используется: grep по «f24044ec» даёт только документы,
-- страницы приёмки и снапшоты каталога (STATUS.md, spark-output/export/*).

-- Гейд: если с момента сверки строку успели поставить в программу или в протокол — не удаляем.
DO $$
DECLARE
    n_prog  integer;
    n_work  integer;
BEGIN
    SELECT count(*) INTO n_prog  FROM program_exercises  WHERE exercise_id = 'f24044ec-1a34-4def-bcc7-e3383ccb5520';
    SELECT count(*) INTO n_work  FROM workout_exercises  WHERE exercise_id = 'f24044ec-1a34-4def-bcc7-e3383ccb5520';
    IF n_prog > 0 OR n_work > 0 THEN
        RAISE EXCEPTION 'пуловер в Смите используется: program_exercises=%, workout_exercises=% — удаление остановлено', n_prog, n_work;
    END IF;
END $$;

DELETE FROM exercises WHERE id = 'f24044ec-1a34-4def-bcc7-e3383ccb5520';

DO $$
BEGIN
    RAISE NOTICE 'после удаления: exercises=%, ссылок на строку=%',
        (SELECT count(*) FROM exercises),
        (SELECT count(*) FROM exercises WHERE id = 'f24044ec-1a34-4def-bcc7-e3383ccb5520');
END $$;

-- РЕВЕРС — раскомментировать и выполнить блоки по порядку (сначала exercises, затем сателлиты).
-- Данные сняты to_jsonb()/json_agg() из прода 23.10 перед удалением, перенесены дословно.
--
-- BEGIN;
--
-- INSERT INTO exercises
-- SELECT (jsonb_populate_record(NULL::exercises, j)).*
-- FROM (SELECT '[{"id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","name":"Пуловер в Смите","tags":["isolation"],"risks":"Слишком глубокое опускание может перегрузить плечевой сустав. Потеря контроля грифа опасна из-за его фиксированной траектории.","status":"approved","aliases":["Пуловер в Смите"],"benefits":"Фиксированная траектория облегчает контроль движения по сравнению со свободным грифом. Основная нагрузка приходится на широчайшие с участием грудных мышц.","category":"strength","name_eng":"Smith Machine Pullover","settings":"Скамья располагается под тренажером Смита. Ограничители устанавливаются так, чтобы исключить опасное опускание грифа.","media_url":"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Smith_Press/0.jpg","technique":"Лягте на скамью под грифом тренажера Смита и возьмите гриф хватом, позволяющим свободно двигать плечами. Снимите гриф и удерживайте руки над грудью с небольшим сгибанием локтей. По дуге опустите гриф за голову до контролируемой амплитуды, затем верните его над грудь. Дышите равномерно и не допускайте рывков в нижней точке.","created_at":"2026-07-03T07:11:49.019226+00:00","difficulty":"intermediate","reps_range":null,"short_name":"пуловер в Смите","updated_at":"2026-08-13T09:46:59.371443+00:00","search_text":"пуловер в смите smith machine pullover пуловер в смите пуловер в смите широчайшие большая грудная зубчатые трицепс скамья тренажер смита isolation strength","primary_muscles":["широчайшие"],"movement_pattern":"pull_vertical","can_be_activation":false,"secondary_muscles":["большая грудная","зубчатые","трицепс"]}]'::jsonb) AS arr,
--      jsonb_array_elements(arr.arr) AS j;
--
-- INSERT INTO exercise_equipment
-- SELECT (jsonb_populate_record(NULL::exercise_equipment, j)).*
-- FROM jsonb_array_elements('[{"exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","equipment_id":"8c8ca43e-d081-44e8-8882-ae5b5bf7164c"},{"exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","equipment_id":"e35fb4e3-f3fa-4da1-b9c4-9c79b5f26645"}]'::jsonb) AS j;
--
-- INSERT INTO exercise_media
-- SELECT (jsonb_populate_record(NULL::exercise_media, j)).*
-- FROM jsonb_array_elements('[{"id":"7435b0eb-a527-4e7d-a416-bcbde1d705ce","url":"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Smith_Press/0.jpg","source":"legacy","license":null,"position":1,"created_at":"2026-08-08T18:07:02.776973+00:00","media_type":"image","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"}]'::jsonb) AS j;
--
-- INSERT INTO exercise_relationships
-- SELECT (jsonb_populate_record(NULL::exercise_relationships, j)).*
-- FROM jsonb_array_elements('[{"id":"1a7bca50-6318-4844-9dc4-056cb6edd81c","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"06bc27b8-e79f-4120-aecf-db385c1e97a6","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"94249dcb-2ac9-4469-bf26-1896a218755b","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"d9be80b7-aa96-4458-ba51-c2a09082e641","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"0e1642d7-12c7-4093-a4aa-6218cb144f0f","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"regression","related_exercise_id":"8820ed15-08d7-49dd-8bf9-b2955ca7199c"},{"id":"1472d6da-bf81-4079-a7f9-8f7dfdfe728f","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"regression","related_exercise_id":"d214102c-043c-4aa0-b198-96d9069803ef"},{"id":"c981881f-12fb-4e70-8ba5-be181318bcaf","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"regression","related_exercise_id":"f215b8e8-5edc-4496-8c63-529b04549be4"},{"id":"1b722acf-8a81-46f4-a379-12f8b48ec423","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"progression","related_exercise_id":"c08327bf-6e19-495f-b6ab-f505762e13e6"},{"id":"b444c94d-d583-4c31-8e25-1b4dfd1538b6","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"alternative","related_exercise_id":"ea80a6de-03b3-4f39-af20-8f4771c008be"},{"id":"93878493-65e9-413d-aab6-c68c14f67eaa","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"alternative","related_exercise_id":"0719d4a4-b699-41df-8d90-9d553046efbd"},{"id":"23084c92-57ef-4d31-942a-4539eeeb9554","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"alternative","related_exercise_id":"a4e1a02f-a7df-436c-8653-16d379ba0cf9"},{"id":"870ac57a-e90f-4165-86d5-f50cc8c94482","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"variation","related_exercise_id":"06bc27b8-e79f-4120-aecf-db385c1e97a6"},{"id":"92decbe0-4da4-40dd-bb77-289f47b6a184","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"variation","related_exercise_id":"d9be80b7-aa96-4458-ba51-c2a09082e641"},{"id":"c636e7b7-f260-4cb0-b604-b2cf161bc8ec","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","relation_type":"variation","related_exercise_id":"c59d12ab-94c6-4d4f-9489-3cee3b21bf7e"},{"id":"313164a6-c344-4276-905a-69067dbc6bcb","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"ea80a6de-03b3-4f39-af20-8f4771c008be","relation_type":"alternative","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"ea797872-de6d-43e0-8711-e51e0edcc737","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"0719d4a4-b699-41df-8d90-9d553046efbd","relation_type":"alternative","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"9d71e07f-fab2-49f0-99ba-14bda571de4f","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.154533+00:00","exercise_id":"a4e1a02f-a7df-436c-8653-16d379ba0cf9","relation_type":"alternative","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"ce7a960a-ad19-4c18-9d78-f3cb4ebd131b","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.760844+00:00","exercise_id":"c59d12ab-94c6-4d4f-9489-3cee3b21bf7e","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"9f2017b1-4f1d-4361-a708-a36a126a60bc","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.760844+00:00","exercise_id":"7ce20e42-9c02-4d57-a460-601b4de1333c","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"6453dfa8-a686-461b-8962-c9324fb0d672","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.760844+00:00","exercise_id":"b452aafa-1276-4212-93ec-8a3997f22bbd","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"},{"id":"0543da2d-158c-40b0-94b3-83a15a9bd479","status":"suggested","confidence":"high","created_at":"2026-08-13T09:10:03.910937+00:00","exercise_id":"c08327bf-6e19-495f-b6ab-f505762e13e6","relation_type":"variation","related_exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520"}]'::jsonb) AS j;
--
-- INSERT INTO injury_exercise_warnings
-- SELECT (jsonb_populate_record(NULL::injury_exercise_warnings, j)).*
-- FROM jsonb_array_elements('[{"id":"40a70593-2145-4d56-bcfe-c21811ba14b8","level":"avoid","body_part":"elbow","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","injury_type":"strain","muscle_group":"","warning_level":"caution","recommendation":"локтевой сустав (растяжение)"},{"id":"3f49c3fd-3ae2-4d0c-b66e-345e80c4c33f","level":"avoid","body_part":"shoulder","exercise_id":"f24044ec-1a34-4def-bcc7-e3383ccb5520","injury_type":"strain","muscle_group":"","warning_level":"caution","recommendation":"плечевой сустав (переразгибание, растяжение капсулы)"}]'::jsonb) AS j;
--
-- -- проверка восстановления: exercises=826, строка на месте, сателлиты 2/1/19/2
-- COMMIT;
