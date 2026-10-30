-- 20261029160000_rebuild_stale_search_text.sql
-- Пересобрать `search_text` у 64 строк, где он отстал от содержимого строки.
--
-- Зачем. На `exercises` висят два триггера, и последний по алфавиту
-- (`trg_fill_search_text` → `fill_search_text()`) пишет КОРОТКУЮ формулу: только имя, короткое имя,
-- алиасы и `name_eng`. Мышцы, снаряд, теги, категория и свёртка «ё» → «е» при этом теряются. Каждая
-- прошлая правка `name_eng` или `aliases` (миграции имён 29.10, дубли, переименования) оставляла
-- такую строку с обрезанным поисковым текстом. Замер 30.10: **62 строки** несут ровно эту короткую
-- формулу — среди них почти все позиции, которые мы рисовали, и часть старых; ещё **2 строки**
-- отстали иначе: у «Езды на велосипеде» в тексте лишний «тренажер», у «Румынской тяги с доворотом»
-- не хватает «гантели» — снаряд менялся после последней пересборки.
--
-- Что даёт. Поиск (`search_exercises`) ищет по `search_text`, поэтому эти 64 позиции сейчас не
-- находятся по мышце, снаряду, тегу и категории, а «ё» в них не сворачивается: «приседания» не
-- находит строку, где написано «приседаний с ё» и наоборот. У 758 остальных строк текст полный.
--
-- Формула — та же сид-строка, что у остальных 758: имя, `name_eng`, короткое имя, алиасы, первичные
-- и вторичные мышцы, снаряжение из `exercise_equipment`, теги, категория, всё через `lower` и с
-- заменой «ё» → «е». Она воспроизводит текущий текст 758 строк байт в байт (проверено SELECT'ом
-- 30.10: `search_text = full_formula` ровно у 758, у 62 совпадает с короткой, у 2 — ни с одной).
--
-- МЕХАНИКА. `search_text` нет ни в одном списке колонок обоих триггеров, поэтому UPDATE одного этого
-- поля их не будит и руками поставленное значение устоит. Проверено на телах функций из прода.
--
-- Blast radius. 64 строки `exercises`, поле `search_text` и `updated_at`. Ни `name`, ни `name_eng`,
-- ни `aliases`, ни `status`, ни `media_url` не меняются — кадры и карточки не затрагиваются.
-- Обратное действие восстанавливает прежние значения: 62 строки — короткой формулой (она
-- воспроизводима выражением), 2 строки — дословными литералами, потому что их текст ни одной формуле
-- не соответствует.
--
-- ПРОВЕРКИ до (замер 30.10):
--   with base as (select x.*, <short_f>, <full_f> from public.exercises x)
--   select count(*) filter (where search_text = short_f)                      -- 62
--        , count(*) filter (where search_text <> short_f and search_text = full_f) -- 758
--        , count(*) filter (where search_text <> short_f and search_text <> full_f) -- 2
--        , count(*)                                                          -- 822
--     from base;
--
-- GUARD.
do $$
declare
    n_short   bigint;
    n_full    bigint;
    n_other   bigint;
    n_total   bigint;
begin
    select count(*) filter (where t.st = t.short_f),
           count(*) filter (where t.st <> t.short_f and t.st = t.full_f),
           count(*) filter (where t.st <> t.short_f and t.st <> t.full_f),
           count(*)
      into n_short, n_full, n_other, n_total
      from (
        select x.search_text as st,
               lower(x.name) || ' ' || coalesce(lower(x.short_name), '') || ' ' ||
               lower(array_to_string(x.aliases, ' ')) || ' ' || coalesce(lower(x.name_eng), '') as short_f,
               lower(replace(concat_ws(' ', x.name, x.name_eng, x.short_name,
                     array_to_string(x.aliases, ' '),
                     array_to_string(x.primary_muscles, ' '),
                     array_to_string(x.secondary_muscles, ' '),
                     (select string_agg(e.name, ' ' order by e.name)
                        from public.exercise_equipment ee
                        join public.equipment e on e.id = ee.equipment_id
                       where ee.exercise_id = x.id),
                     array_to_string(x.tags, ' '), x.category), 'ё', 'е')) as full_f
          from public.exercises x
      ) t;

    if n_short <> 62 or n_full <> 758 or n_other <> 2 or n_total <> 822 then
        raise exception
            'rebuild aborted: расклад поискового текста сдвинулся (короткая %, полная %, прочее %, всего %) — ждали 62 / 758 / 2 / 822',
            n_short, n_full, n_other, n_total;
    end if;

    raise notice 'guard ok: 62 коротких, 758 полных, 2 отставших, каталог 822';
end
$$;

-- ШАГ 1. Пересборка: трогаем ровно те строки, где текст не совпадает с полной формулой.
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
 where x.search_text <> lower(replace(concat_ws(' ',
        x.name, x.name_eng, x.short_name,
        array_to_string(x.aliases, ' '),
        array_to_string(x.primary_muscles, ' '),
        array_to_string(x.secondary_muscles, ' '),
        (select string_agg(e.name, ' ' order by e.name)
           from public.exercise_equipment ee
           join public.equipment e on e.id = ee.equipment_id
          where ee.exercise_id = x.id),
        array_to_string(x.tags, ' '),
        x.category), 'ё', 'е'));

-- ПОСЛЕ:
--   with base as (select x.*, <full_f> from public.exercises x)
--   select count(*) from base where search_text <> full_f;      -- 0 из 822
--   -- то есть у всех 822 строк поисковый текст построен одной и той же полной формулой
--   select count(*) from public.exercises;                      -- 822 без изменений
--   -- выборочная проверка смысла, а не только формы:
--   select name_eng from public.exercises
--    where search_text like '%копенгагенские%' and search_text like '%приводящие%';   -- 1
--   select name_eng from public.exercises
--    where search_text like '%гантели%' and name_eng = 'Rotational Romanian Deadlift'; -- 1
--
-- РЕВЕРС (два оператора, потому что прежние значения двух видов):
--
--   -- 1) 62 строки — обратно короткой формулой (она воспроизводима выражением):
--   update public.exercises x
--      set search_text = lower(x.name) || ' ' || coalesce(lower(x.short_name), '') || ' ' ||
--                        lower(array_to_string(x.aliases, ' ')) || ' ' || coalesce(lower(x.name_eng), '')
--    where x.id in (
--      '4dbeb4a6-4c63-4342-93c9-8c007b886d9f',  -- Ab Crunch Machine
--      'd8a63040-8208-40f8-881c-e2c198c6187b',  -- Ab Roller
--      '8a813678-628e-4138-9bed-94da2635e629',  -- Alternating Deltoid Raise
--      'e803671f-e150-4384-9f7f-d0c216c200b0',  -- Alternating Lateral Raise with Pause
--      '3e81b05d-c0e9-41f3-8384-c72dcc5faa46',  -- B-Stance Dumbbell Romanian Deadlift
--      'ace537ec-f0c6-4ae7-b47d-ca3bacd8188e',  -- Barbell Bench Press - Medium Grip
--      '2210f473-552a-4bdd-bf89-25f43aa32ea1',  -- Barbell Hip Thrust
--      'b84d37c1-d58e-470f-857b-fbbb74c12637',  -- Barbell Lunge
--      'fef4cc00-7072-4ae5-8115-e0828a3a1e99',  -- Barbell Step Ups
--      '91598bab-7b17-4c98-8388-f0049164d4e0',  -- Bent-Over T-Raise
--      '10a3fed1-8b3c-4cba-a0af-328d79e9499d',  -- Bodyweight Sissy Squat
--      '237d6d2f-3ad3-4fc9-a83b-c938e82071e2',  -- Cable Glute Kickback On Bench
--      'b2974982-1c90-4190-8a4f-cbc4a82a55ab',  -- Cable Hip Extension at 45 Degrees
--      'd493fde1-7223-4bf9-a121-bfa1f7ebd42b',  -- Cable Incline Triceps Extension
--      '6a28d522-97d1-46b8-889d-09ced2345fce',  -- Clamshell
--      'b419d3b1-73c0-4e71-a670-fd1692c573e1',  -- Copenhagen Adduction
--      'ca48c18f-8614-4a7a-8602-4fb47d625b4d',  -- Crane Single-Leg Glute Hinge
--      '59bc6807-51d8-41e6-9855-1954d01d32c2',  -- Dips - Triceps Version
--      '7e8613d6-2922-4c80-a108-913f77fd33a8',  -- Dumbbell Hip Thrust
--      'e2fa44ff-8ef5-4ab6-bb69-db6abf95c2dd',  -- Dumbbell One-Arm Triceps Extension
--      'b9c92439-d32d-451b-9f84-8798277d444a',  -- Dumbbell Romanian Deadlift
--      'cb315b69-45bf-4e8b-9f98-9dca7bf2be0d',  -- External Rotation
--      '8a3dd8f1-0d0a-485b-a31a-75921af08be9',  -- Front Dumbbell Raise
--      '7e3e802f-b8b5-4e80-a7d5-aab5d4254f29',  -- Glute Kickback
--      'd141a282-3f8b-40aa-91d0-9c89d56d3667',  -- Hammer Curls
--      'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3',  -- High Foot Position Leg Press
--      '8147aad3-248b-4ef0-9fa7-f61efd29c453',  -- Incline Y-Raise
--      '8839d193-0ccd-4c0b-a4f1-583551f47dc4',  -- Incline Y-T-W-L Raise
--      '0a90e00b-0029-4bf3-b40f-0a2ca9cfb753',  -- Leverage Chest Press
--      '2f6cf819-31a7-4225-9da5-f4e5db783c06',  -- Leverage Shoulder Press
--      'f0759799-4dba-4411-81e6-42d9d9f6c6d5',  -- Low Cable Hip Abduction
--      '3e3c5ca0-096c-47cb-815d-106284238424',  -- Low-to-High Cable Crossover
--      '2ddedfdd-7ccf-4334-a0c6-600dd7fb9ef3',  -- Lying Cable Curl
--      '1a9becb4-a26e-4a84-b7b0-d0a2a8fbc9e5',  -- Lying Close-Grip Barbell Triceps Extension Behind The Head
--      'b3db5d1a-cf06-4a53-8697-baa0f1582cf8',  -- Machine Hip Thrust
--      '4da58d0e-c766-422c-b96f-4259b75e8fcb',  -- One-Arm Cable Lateral Raise
--      'c0e0e17f-0a8a-499f-b7ea-c1730624ef35',  -- Push-Ups - Close Triceps Position
--      '216243c9-dd00-43ec-908f-d3729638b854',  -- Rendl Barbell Row
--      'b9ff1347-c093-44f5-a9df-576b28b3c468',  -- Reverse Crunch
--      '85dd4a2c-1d51-4e21-a237-95c843f54d5a',  -- Reverse Machine Flyes
--      'c557b192-3494-42b7-a703-f1f7ac86b6fb',  -- Reverse-Grip Barbell Lying Triceps Extension
--      'be4f02cc-6958-4592-8728-820569b8710d',  -- Romanian Deadlift
--      'aefdc8dc-bd06-4270-b2f2-3efa4f5360e8',  -- Seated Barbell Overhead Triceps Extension
--      '2d072094-7f50-4a4f-bae2-a3b0b004d9ee',  -- Seated Cable Row
--      '8463c79f-a972-4a8d-9eca-b864a0761af9',  -- Single Leg Glute Bridge
--      '7dd17819-4f79-4405-bbe8-5ea03bad7ebe',  -- Single-Leg Hip Thrust
--      '1d20086e-c63d-4c7b-a6fc-1f4a6dc15380',  -- Smith Machine Bulgarian Split Squat
--      '3b4eaa28-7ff0-4a02-8172-c1a68a884cdc',  -- Smith Machine Hip Thrust
--      'cb22b47b-717a-455b-9937-9662aad61606',  -- Smith Machine Lunge
--      '17c88780-5e54-4ee0-92da-67e0968a5a8f',  -- Smith Machine Overhead Shoulder Press
--      '7348da65-09c6-4acc-84d3-6b63845bff98',  -- Smith Machine Squat
--      'c28b458a-7382-44ba-a638-0432ad19bfda',  -- Split Squat with Dumbbells
--      'a673a68c-3b75-46c8-8fcb-da8962a14a80',  -- Standing Barbell Military Press
--      'c7053107-e075-4644-ac3e-7be97f1e242e',  -- Standing Cable Wood Chop
--      'c7180f08-97da-4252-b316-dd3984a6259d',  -- Standing Calf Raises
--      'a6889080-f234-4d8f-a779-ab953b98de26',  -- Standing One-Arm Cable Curl
--      '822f7bec-bd5e-4cce-83bc-8fb0a4537864',  -- Thigh Abductor
--      '24a1cd79-3e3d-48ac-8341-c6e1b02f8548',  -- Triceps Overhead Extension with Rope
--      'bb1fbbb4-36df-4bff-b800-d82be5e1cda9',  -- Triceps Pushdown - Straight Bar
--      '668309c4-7be6-41e9-a2be-a9d8ba81d547',  -- Underhand-Grip Dumbbell Bench Press
--      '94209616-aebb-4a69-a6d4-dd36c0fd60f9',  -- Wide-Grip Barbell Upright Row
--      'e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4'   -- Wide-Grip Pull-Up
--    );
--
--   -- 2) две строки, у которых прежний текст ни одной формуле не соответствовал:
--   update public.exercises
--      set search_text = 'езда на велосипеде (на улице) bicycling езда на велосипеде езда на велосипеде (на улице) квадрицепс икроножная большая ягодичная бицепс бедра тренажер  cardio'
--    where id = '051156b4-0410-4266-b75f-68670a1b368d';
--   update public.exercises
--      set search_text = 'румынская тяга с гантелью и доворотом корпуса rotational romanian deadlift румынка с доворотом румынка с поворотом спиральная румынка rotational rdl тяга с доворотом бицепс бедра большая ягодичная косые мышцы живота разгибатели спины средняя ягодичная unilateral compound rotation strength'
--    where id = 'b011f314-687a-492e-8d1a-c70a129fe285';
--
-- Кеш и офлайн. Поиск идёт по `search_text` прямо в базе, поэтому эффект виден сразу; снимок
-- справочника (`src/lib/exerciseSnapshot.ts`) держит копию строк — там текст обновится после
-- пересборки снимка (Настройки → «Справочник упражнений» → «Обновить»).
