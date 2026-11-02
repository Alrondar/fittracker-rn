-- 20261031160000_retire_two_rows_and_rescue_their_children.sql
-- Решение владельца 31.10: снять `119bea03` «Подъем на носки (осёл)» (дубль
-- подтверждённой `80d2ad1e` «Подъем на носки с наклоном вперед (ослик)» — одна и
-- та же папка кадров, совпадают движение, мышцы и сложность) и `051156b4` «Езда на
-- велосипеде (на улице)» (кадры показывают подгонку шлема и седла, педалирования
-- нет; велотренажёр `c4596ad1` с корректным кадром в каталоге уже есть).
--
-- ДОЧЕРНИЕ ЗАПИСИ, которые иначе ушли бы вместе со строками.
--   `051156b4` держала 8 связей relation_type='variation' с пятью кардио-строками
--   (бег по пересечённой, бег на дорожке, ходьба на дорожке, эллипс, имитация
--   конькобежца), а у `c4596ad1` своих связей не было ни одной. ШАГ 2 переставляет
--   эти восемь строк на велотренажёр: кардио-семейство не худеет, а у
--   велотренажёра появляется его вариативная группа. Дублей не возникает —
--   замер 31.10: связей у `c4596ad1` ровно 0.
--   `119bea03` несла единственную строку предупреждения: «поясница (растяжение при
--   наклоне)», уровень caution. У `80d2ad1e` предупреждений нет (замер: 0). ШАГ 3
--   копирует метку на остающуюся строку, иначе снятие молча убрало бы
--   предостережение по пояснице из того же самого движения.
--   `exercise_media` (по одной строке у каждой) и `exercise_equipment` (2 у осла)
--   уходят каскадом: приложение читает `exercises.media_url`, таблицу кадров не
--   использует — проверено по src (упоминания только в генерируемых типах).
--
-- Blast radius. 2 строки `exercises`, 8 строк `exercise_relationships`
-- переставлены, 1 строка `injury_exercise_warnings` добавлена, 1 удалена каскадом,
-- 2 строки `exercise_media` и 2 `exercise_equipment` удалены каскадом.
-- Занятость в программах и тренировках у обеих строк — 0 (замер 31.10), поэтому
-- ни один готовый план не сдвигается.
--
-- СЧЁТЧИКИ ДО (замер 31.10):
--   exercises 822 | exercise_relationships 3501 | injury_exercise_warnings 278
--   exercise_media 800 | exercise_equipment 1113 | injury_exercise_restrictions 0
--   статусы: 119bea03 needs_review, 051156b4 needs_review

-- ШАГ 1. GUARD: обе строки на месте со своими именами, принимающие строки на месте,
-- дочерних записей ровно столько, сколько замерено, занятость нулевая.
do $$
declare
    donkey  constant uuid := '119bea03-e5f4-4070-8b44-e05682090231';
    bike    constant uuid := '051156b4-0410-4266-b75f-68670a1b368d';
    twin    constant uuid := '80d2ad1e-2cd6-464b-b1d8-a1b10ed09821';
    station constant uuid := 'c4596ad1-860f-4f44-9f0d-643b12ecd043';
    n bigint;
begin
    select count(*) into n from public.exercises
      where (id = donkey  and name = 'Подъем на носки (осёл)')
         or (id = bike    and name = 'Езда на велосипеде (на улице)')
         or (id = twin    and name = 'Подъем на носки с наклоном вперед (ослик)')
         or (id = station and name = 'Велотренажер (стационарный)');
    if n <> 4 then
        raise exception 'retire aborted: нужных строк найдено % — ждали 4 (имена изменились?)', n;
    end if;

    select count(*) into n from public.exercise_relationships
     where exercise_id = bike or related_exercise_id = bike;
    if n <> 8 then
        raise exception 'retire aborted: связей у велосипеда % — ждали 8', n;
    end if;

    select count(*) into n from public.exercise_relationships
     where exercise_id = station or related_exercise_id = station;
    if n <> 0 then
        raise exception 'retire aborted: у велотренажёра уже есть связи (%), перенос дал бы дубли', n;
    end if;

    select count(*) into n from public.injury_exercise_warnings where exercise_id = donkey;
    if n <> 1 then
        raise exception 'retire aborted: предупреждений у осла % — ждали 1', n;
    end if;

    select count(*) into n from public.injury_exercise_warnings where exercise_id = twin;
    if n <> 0 then
        raise exception 'retire aborted: у остающейся строки уже % предупреждений, копия не нужна', n;
    end if;

    select count(*) into n from public.program_exercises
     where exercise_id in (donkey, bike);
    if n <> 0 then
        raise exception 'retire aborted: строки заняты в программах, слотов %', n;
    end if;

    select count(*) into n from public.workout_exercises
     where exercise_id in (donkey, bike);
    if n <> 0 then
        raise exception 'retire aborted: строки заняты в тренировках, строк %', n;
    end if;
end
$$;

-- ШАГ 2. Восемь вариативных связей велосипеда переезжают на велотренажёр.
update public.exercise_relationships
   set exercise_id = case when exercise_id = '051156b4-0410-4266-b75f-68670a1b368d'
                          then 'c4596ad1-860f-4f44-9f0d-643b12ecd043' else exercise_id end,
       related_exercise_id = case when related_exercise_id = '051156b4-0410-4266-b75f-68670a1b368d'
                          then 'c4596ad1-860f-4f44-9f0d-643b12ecd043' else related_exercise_id end
 where exercise_id = '051156b4-0410-4266-b75f-68670a1b368d'
    or related_exercise_id = '051156b4-0410-4266-b75f-68670a1b368d';

-- ШАГ 3. Предупреждение по пояснице переезжает на остающуюся строку того же
-- движения (полностью, включая мышцу, тип травмы, уровень и рекомендацию).
insert into public.injury_exercise_warnings
        (body_part, muscle_group, warning_level, recommendation, exercise_id, injury_type, level)
select w.body_part, w.muscle_group, w.warning_level, w.recommendation,
       '80d2ad1e-2cd6-464b-b1d8-a1b10ed09821', w.injury_type, w.level
  from public.injury_exercise_warnings w
 where w.exercise_id = '119bea03-e5f4-4070-8b44-e05682090231';

-- ШАГ 4. Снятие строк. Ссылки на снаряды и строки кадров уходят каскадом.
delete from public.exercises
 where id in ('119bea03-e5f4-4070-8b44-e05682090231', '051156b4-0410-4266-b75f-68670a1b368d');

-- ПОСЛЕ (ждали):
--   exercises 820 | exercise_relationships 3501 | injury_exercise_warnings 278
--   exercise_media 798 | exercise_equipment 1111 | injury_exercise_restrictions 0
--   select left(id::text,8), name, status from public.exercises
--    where id in ('80d2ad1e-2cd6-464b-b1d8-a1b10ed09821','c4596ad1-860f-4f44-9f0d-643b12ecd043');
--   -- у обеих предупреждения/связи на месте: warnings=1 у ослика, links=8 у велотренажёра
--
-- РЕВЕРС (по порядку):
--   1) вернуть восемь связей на велосипед: update … set exercise_id/related_exercise_id
--      = '051156b4-…' там, где сейчас 'c4596ad1-…' и вторая сторона из пяти кардио-строк;
--   2) удалить скопированное предупреждение у '80d2ad1e-…' и вставить его обратно
--      для '119bea03-…' (значения: body_part='back', muscle_group из дампа ниже,
--      injury_type='strain', warning_level и level='caution',
--      recommendation='поясница (растяжение при наклоне)');
--   3) вставить обе снятые строки по дампу (ниже, дословно);
--   4) вернуть ссылки снарядов осла: «Тренажер» и «Партнер»; по одной строке
--      exercise_media с source='legacy' и position=1 для каждой из двух строк.
--
-- ДАМП снятых строк (снимался 31.10 перед записью):
-- {"id":"119bea03-e5f4-4070-8b44-e05682090231","name":"Подъем на носки (осёл)",
--  "name_eng":"Donkey Calf Raise","short_name":"осёл","aliases":["Подъем на носки «Осел»"],
--  "category":"strength","difficulty":"intermediate","primary_muscles":["икроножная"],
--  "secondary_muscles":["камбаловидная"],"tags":["isolation"],"movement_pattern":"calf_raise",
--  "can_be_activation":false,"reps_range":null,
--  "technique":"Наклонитесь вперед и примите устойчивое положение, используя тренажер или опору. Разместите переднюю часть стоп на устойчивой поверхности и опускайте пятки вниз под контролем. Поднимитесь на носки, максимально сокращая икроножные мышцы, затем медленно опуститесь. Дышите равномерно и не выполняйте пружинящих движений.",
--  "settings":"Тренажер или опора. Корпус наклонен вперед, передняя часть стоп устойчиво размещена на опоре.",
--  "risks":"Нагрузка может ощущаться в пояснице при недостаточно стабильном положении корпуса. Резкие движения увеличивают нагрузку на ахиллово сухожилие.",
--  "benefits":"Позволяет выполнять подъемы на носки в положении наклона вперед с большой амплитудой движения.",
--  "status":"needs_review","created_at":"2026-07-03T07:11:49.019226+00:00",
--  "updated_at":"2026-10-25T09:45:41.867851+00:00",
--  "media_url":"https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Donkey_Calf_Raises/0.jpg",
--  "search_text":"подъем на носки (осел) donkey calf raise осел подъем на носки «осел» икроножная камбаловидная партнер тренажер isolation strength"}
-- {"id":"051156b4-0410-4266-b75f-68670a1b368d","name":"Езда на велосипеде (на улице)",
--  "name_eng":"Bicycling","short_name":"езда на велосипеде","aliases":["Езда на велосипеде (на улице)"],
--  "category":"cardio","difficulty":"beginner","primary_muscles":["квадрицепс"],
--  "secondary_muscles":["икроножная","большая ягодичная","бицепс бедра"],"tags":[],
--  "movement_pattern":"gait","can_be_activation":false,"reps_range":null,
--  "technique":"Сядьте на велосипед и установите стопы на педали. Плавно вращайте педали, поддерживая выбранный темп и сохраняя устойчивое положение корпуса. Продолжайте движение в равномерном ритме и регулируйте усилие по рельефу и выбранной интенсивности. Дышите ритмично и сохраняйте контроль над велосипедом.",
--  "settings":"Высота седла должна позволять сохранять лёгкое сгибание колена в нижней точке педалирования. Настройте положение руля и седла под безопасную посадку.",
--  "risks":"Неподходящая высота седла может увеличивать нагрузку на колени. На улице также учитывайте состояние покрытия и необходимость сохранять контроль велосипеда.",
--  "benefits":"Обеспечивает кардионагрузку с относительно низкой ударной нагрузкой по сравнению с бегом. Основная работа приходится на мышцы ног.",
--  "status":"needs_review","created_at":"2026-07-20T06:47:06.724424+00:00",
--  "updated_at":"2026-10-30T07:13:15.806095+00:00",
--  "media_url":"https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Bicycling/0.jpg",
--  "search_text":"езда на велосипеде (на улице) bicycling езда на велосипеде езда на велосипеде (на улице) квадрицепс икроножная большая ягодичная бицепс бедра  cardio"}
--
-- Осиротевшие кадры. Папка `Bicycling` (0.jpg, 1.jpg) после снятия не нужна ни
-- одной строке — в медиа-репозитории её уберём отдельным коммитом вместе со
-- снимками справочника. Папка `Donkey_Calf_Raises` остаётся: на неё ссылается
-- `80d2ad1e`.
--
-- Кеш и офлайн. Снимок справочника держит снятые строки до пересборки
-- (Настройки → «Справочник упражнений» → «Обновить»).
