-- 20261101110000_give_pullover_row_its_own_frames.sql
-- «Пуловер со штангой на спину» (a4e1a02f) — перевести строку на её собственные кадры
-- и снять вилку «прямые или слегка согнутые руки», из-за которой её нельзя
-- отличить от соседнего согнутого пуловера.
--
-- Зачем. Строка делила папку `exercises/Bent-Arm_Barbell_Pullover` с соседней
-- `0719d4a4` «Пуловер со штангой лежа (согнутые руки)»: на тех кадрах человек лежит на
-- скамье вдоль, локти сложены примерно под прямым углом, гриф уходит за голову к полу —
-- это согнутый вариант, кадр принадлежит соседу. Разбор 31.10, класс C: строка без своего
-- кадра, своей папки в медиа не было вовсе. Вердикт владельца — рисовать прямые руки.
--
-- Кадры лежат в медиа-репозитории: `exercises/Straight-Arm_Barbell_Pullover/{00f,01f,00m,01m}.jpg`,
-- 850×567, коммит `a81d22b`, все четыре адреса отвечают 200 (проверено 01.11). Ракурс —
-- головный конец скамьи с поворотом на ~35° вправо: только там скамья уходит в глубину и
-- гриф читается лежащим поперёк неё, а не вдоль.
--
-- Что меняется в текстах. В `technique` стояло «удерживайте штангу над грудью прямыми ИЛИ
-- слегка согнутыми руками» — эта вилка и делала две строки неразличимыми, потому что
-- соседний согнутый пуловер описан теми же словами. Кадр нарисован по прямые руки (вердикт
-- владельца), значит вилку снимаем. В `settings` добавлен хват: он намного шире плеч и есть
-- второй отличительный признак, которого в прежнем тексте не было.
--
-- `name_eng` был «Barbell Pullover» — общее имя, занятое по смыслу чужой папкой. По паре
-- имён, которая уже есть в каталоге («Bent-Arm Dumbbell Pullover» и
-- `Straight-Arm_Dumbbell_Pullover`), правильное имя этой строки «Straight-Arm Barbell
-- Pullover». Русское имя, `short_name` и `aliases` не меняются.
--
-- МЕНЯЕТСЯ ТАКЖЕ `status`: было `needs_review`, станет `approved` (вердикт владельца
-- 01.11). Пометка стояла из-за чужого кадра — теперь кадр свой, тексты под него сведены.
-- Это ЕДИНСТВЕННЫЙ сдвиг общекаталожного счётчика в этой миграции: подтверждённых
-- 451 → 452.
--
-- Blast radius. ОДНА строка `exercises`: поля `name_eng`, `media_url`, `technique`,
-- `settings`, `search_text` (пересборка по полной формуле — `name_eng` кормит
-- `trg_fill_search_text`, который на UPDATE этой колонки пишет УКОРЧЕННУЮ формулу),
-- `status` и `updated_at`. В программах 0 слотов `program_exercises`, в тренировках 0
-- строк `workout_exercises` — история не задевается. При строке 11 связей
-- `exercise_relationships`, правка их не трогает.
--
-- Счётчики: каталог 820, на нашем хосте 820, без кадра 0 — НЕ ДВИГАЮТСЯ. Двигается только
-- число строк на старую папку `Bent-Arm_Barbell_Pullover`: было 2, станет 1.
--
-- ПРОВЕРКИ до (замер 01.11):
--   select id, status, name, name_eng, media_url from public.exercises
--    where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';
--   -- needs_review, 'Пуловер со штангой на спину', 'Barbell Pullover',
--   -- '…/exercises/Bent-Arm_Barbell_Pullover/0.jpg'
--   select count(*) from public.exercises where name_eng = 'Straight-Arm Barbell Pullover';   -- 0
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Straight-Arm_Barbell_Pullover/%';                      -- 0
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Bent-Arm_Barbell_Pullover/%';                          -- 2
--   select count(*) from public.exercises;                                                    -- 820
--   select count(*) filter (where status='approved'),
--          count(*) filter (where status='needs_review') from public.exercises;               -- 451 / 369

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
     where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9'
       and status = 'needs_review'
       and name = 'Пуловер со штангой на спину'
       and name_eng = 'Barbell Pullover'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Bent-Arm_Barbell_Pullover/0.jpg'
       and technique like '%прямыми или слегка согнутыми руками%';

    if n_row <> 1 then
        raise exception
            'pullover retarget aborted: ожидалась одна строка a4e1a02f с name_eng "Barbell Pullover", ссылкой на чужую папку и вилкой про согнутые руки в тексте, найдено %',
            n_row;
    end if;

    select count(*) into n_new_name
      from public.exercises
     where name_eng = 'Straight-Arm Barbell Pullover';

    select count(*) into n_new_url
      from public.exercises
     where media_url like '%/exercises/Straight-Arm_Barbell_Pullover/%';

    if n_new_name <> 0 or n_new_url <> 0 then
        raise exception
            'pullover retarget aborted: имя "Straight-Arm Barbell Pullover" занято % раз(а), ссылка на новую папку — % раз(а); миграция применена дважды?',
            n_new_name, n_new_url;
    end if;

    select count(*) into n_on_old
      from public.exercises
     where media_url like '%/exercises/Bent-Arm_Barbell_Pullover/%';

    select count(*) into n_twin
      from public.exercises
     where id = '0719d4a4-b699-41df-8d90-9d553046efbd'
       and media_url like '%/exercises/Bent-Arm_Barbell_Pullover/%';

    if n_on_old <> 2 or n_twin <> 1 then
        raise exception
            'pullover retarget aborted: в папку Bent-Arm_Barbell_Pullover смотрит % строк (ждали 2), соседка 0719d4a4 — % (ждали 1); перечитать',
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
            'pullover retarget aborted: кадровые счётчики не те (наш хост %, апстрим %, без кадра %, каталог %) — ждали 820 / 0 / 0 / 820',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка на чужом кадре с вилкой в тексте, новое имя и папка свободны, соседка остаётся, каталог 820 и все с кадром';
end
$$;

-- ШАГ 1. Кадры + английское имя по нарисованному движению + снятие пометки «на проверке».
update public.exercises
   set name_eng  = 'Straight-Arm Barbell Pullover',
       media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Straight-Arm_Barbell_Pullover/00f.jpg',
       status    = 'approved'
 where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';

-- ШАГ 2. Описание: снять вилку «или слегка согнутыми» и добавить хват.
update public.exercises
   set technique = 'Лягте на горизонтальную скамью, возьмитесь за штангу хватом сверху прямыми руками намного шире плеч и держите её над грудью. Не сгибая локтей, за счёт движения в плечевых суставах опустите штангу по дуге за голову до ощущения растяжения широчайших. Так же прямыми руками верните штангу над грудью. Лопатки и таз не отрывайте от подушки, в пояснице остаётся естественный лёгкий прогиб. Дышите ровно: вдох при опускании штанги, выдох при подъёме.',
       settings  = 'Горизонтальная скамья без спинки. Хват намного шире плеч: между кистью и плечом остаётся свободный участок грифа шириной с голову. Локти прямые на всей амплитуде, угол в локте не меняется.'
 where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';

-- ШАГ 3. Пересборка `search_text` полной формулой: триггер на `name_eng` пишет укороченную.
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
 where x.id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';

-- ПОСЛЕ:
--   select id, status, name_eng, media_url, left(search_text, 120) from public.exercises
--    where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';
--   -- 'Straight-Arm Barbell Pullover', ссылка кончается на /Straight-Arm_Barbell_Pullover/00f.jpg,
--   -- search_text начинается с 'пуловер со штангой на спину straight-arm barbell pullover'
--   select position('или слегка согнутыми' in technique) from public.exercises
--    where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';                    -- 0, вилки больше нет
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Bent-Arm_Barbell_Pullover/%';       -- 1 (только 0719d4a4)
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null or media_url = '') as no_frame,
--          count(*) as total
--     from public.exercises;                              -- 820 / 0 / 820 — не меняется
--   select count(*) from public.exercises where status = 'approved';        -- 452 (было 451)
--   select count(*) from public.exercises where status = 'needs_review';    -- 368 (было 369)
--
-- РЕВЕРС:
--   update public.exercises
--      set name_eng  = 'Barbell Pullover',
--          status    = 'needs_review',
--          media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Bent-Arm_Barbell_Pullover/0.jpg',
--          technique = 'Лягте на скамью и удерживайте штангу над грудью прямыми или слегка согнутыми руками. Стабилизируйте лопатки и медленно опустите штангу за голову по дуге. Потяните штангу обратно над грудь за счёт движения плеч и широчайших. Дышите плавно и сохраняйте контроль грифа на всей амплитуде.',
--          settings  = 'Скамья горизонтальная. Штанга удерживается над грудью, амплитуда ограничивается индивидуально контролируемым диапазоном.'
--    where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';
--   -- затем ШАГ 3 ещё раз: search_text соберётся из прежних значений
--   -- Дамп прежних значений (замер 01.11):
--   --   select jsonb_agg(to_jsonb(x)) from public.exercises x
--   --    where id = 'a4e1a02f-a7df-436c-8653-16d379ba0cf9';
--   -- прежний search_text (снят 01.11):
--   --   'пуловер со штангой на спину barbell pullover пуловер на спину пуловер со штангой
--   --    на спину широчайшие большая круглая зубчатые скамья штанга isolation strength'
--   -- прежний technique:
--   --   'Лягте на скамью и удерживайте штангу над грудью прямыми или слегка согнутыми
--   --    руками. Стабилизируйте лопатки и медленно опустите штангу за голову по дуге.
--   --    Потяните штангу обратно над грудь за счёт движения плеч и широчайших. Дышите
--   --    плавно и сохраняйте контроль грифа на всей амплитуде.'
--   -- прежний settings:
--   --   'Скамья горизонтальная. Штанга удерживается над грудью, амплитуда ограничивается
--   --    индивидуально контролируемым диапазоном.'
--   -- прежние снаряды: «Скамья», «Штанга» — не меняются
--   -- прежнее updated_at: 2026-10-25T09:45:41.867851+00
--
-- Кеш и офлайн. Снимок справочника держит старый кадр и старый текст до пересборки
-- (Настройки → «Справочник упражнений» → «Обновить»); `src/lib/queryPersistence.ts` — до
-- истечения кэша.
