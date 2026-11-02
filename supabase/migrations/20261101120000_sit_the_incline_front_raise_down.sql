-- 20261101120000_sit_the_incline_front_raise_down.sql
-- «Подъём гантелей перед собой … на наклонной скамье» (813c576c) — посадить фигуру,
-- переписать текст под сидячую позу и перевести строку на свои кадры.
--
-- Зачем. Разбор 31.10, класс C: кадр нарисован не под своё имя при уникальном движении.
-- Кадры строки — фото из апстрима: спиной к подушке, ЛОКТИ СОГНУТЫ, гантели уходят над
-- головой; читается как жим гантелей на наклонной (`a4b05d2e`), чьи кадры почти совпадают.
-- При этом наш `technique` обещал третье: «лягте ГРУДЬЮ на наклонную скамью».
--
-- Веб-проверка 01.11 по четырём источникам (g1v.me, ElevareFit, MasterClass, GMLYFT):
-- упражнение делают СИДЯ на наклонной 30–60°, спиной к подушке, руки прямые, подъём
-- перед собой до уровня плеч; опора корпуса и есть смысл варианта — она снимает читинг,
-- которым стоит мах стоя. Вердикт владельца 01.11 по этой тройке расхождений: рисовать
-- канон, то есть сидя спиной. Значит неверны были и кадр, и текст, и «лёжа» в имени.
--
-- Кадры лежат в медиа-репозитории в ТОЙ ЖЕ папке `Front_Incline_Dumbbell_Raise`
-- (на неё смотрит одна строка — эта): добавлены `00f/01f/00m/01m.jpg`, 850×567, по
-- 48–54 КБ. Два прежних фото-кадра `0.jpg` и `1.jpg` при этом НЕ удаляются: до выкладки
-- этой миграции живая карточка всё ещё показывает `0.jpg`. Удаление — отдельным коммитом
-- после применения.
--
-- `name_eng` остаётся «Front Incline Dumbbell Raise» — источники называют ровно так же,
-- и папка по этому имени уже своя.
--
-- Blast radius. ОДНА строка `exercises`: поля `name`, `aliases`, `media_url`, `technique`,
-- `settings`, `search_text` (пересборка по полной формуле — `name` и `aliases` кормят
-- `trg_fill_search_text`, который на UPDATE этих колонок пишет УКОРЧЕННУЮ формулу) и
-- `updated_at`. Прежнее имя остаётся в `aliases`, так что старый запрос не теряет строку.
-- В программах 0 слотов `program_exercises`, в тренировках 0 строк `workout_exercises` —
-- снимки имени в готовых планах менять не нужно. При строке 11 связей
-- `exercise_relationships`, предупреждений и ограничений по травме 0 — правка их не трогает.
-- Снаряды («Гантели», «Наклонная Скамья») остаются: скамья в сидячем варианте нужна.
--
-- Счётчики: каталог 820, на нашем хосте 820, без кадра 0, подтверждённых 451, на проверке
-- 369 — НЕ ДВИГАЮТСЯ. Строка остаётся `needs_review`: перевод в `approved` по этой позиции
-- владельцем не решён (решён по пуловеру), он в отдельном шаге ниже не стоит.
--
-- ПРОВЕРКИ до (замер 01.11):
--   select id, status, name, name_eng, aliases, media_url from public.exercises
--    where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';
--   -- needs_review, 'Подъем гантелей перед собой лежа на наклонной скамье',
--   -- 'Front Incline Dumbbell Raise', aliases {Подъем гантелей перед собой лежа на
--   -- наклонной скамье}, '…/exercises/Front_Incline_Dumbbell_Raise/0.jpg'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Front_Incline_Dumbbell_Raise/00f.jpg';           -- 0
--   select count(*) from public.exercises where name = 'Подъем гантелей перед собой сидя на наклонной скамье';  -- 0
--   select count(*) from public.exercises;                                              -- 820

-- GUARD.
do $$
declare
    n_row     bigint;
    n_new_url bigint;
    n_name    bigint;
    n_repo    bigint;
    n_upstream bigint;
    n_noframe bigint;
    n_total   bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7'
       and name = 'Подъем гантелей перед собой лежа на наклонной скамье'
       and name_eng = 'Front Incline Dumbbell Raise'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Front_Incline_Dumbbell_Raise/0.jpg'
       and technique like '%Лягте грудью на наклонную скамью%';

    if n_row <> 1 then
        raise exception
            'incline front raise aborted: ожидалась одна строка 813c576c с «лёжа», ссылкой на 0.jpg и текстом про грудь на подушке, найдено %',
            n_row;
    end if;

    select count(*) into n_new_url
      from public.exercises
     where media_url like '%/exercises/Front_Incline_Dumbbell_Raise/00f.jpg';

    select count(*) into n_name
      from public.exercises
     where name = 'Подъем гантелей перед собой сидя на наклонной скамье';

    if n_new_url <> 0 or n_name <> 0 then
        raise exception
            'incline front raise aborted: ссылка на 00f.jpg уже занята % раз(а), новое имя — % раз(а); миграция применена дважды?',
            n_new_url, n_name;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null or media_url = ''),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 820 or n_upstream <> 0 or n_noframe <> 0 or n_repo <> 820 then
        raise exception
            'incline front raise aborted: кадровые счётчики не те (наш хост %, апстрим %, без кадра %, каталог %) — ждали 820 / 0 / 0 / 820',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка лежит текстом и ссылкой, новое имя и ссылка свободны, каталог 820 и все с кадром';
end
$$;

-- ШАГ 1. Имя по канону, прежнее — в алиасы, чтобы старый поиск не потерял строку.
update public.exercises
   set name    = 'Подъем гантелей перед собой сидя на наклонной скамье',
       aliases = array['Подъем гантелей перед собой лежа на наклонной скамье'],
       media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Front_Incline_Dumbbell_Raise/00f.jpg'
 where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';

-- ШАГ 2. Описание и исходное положение под сидячую позу: спина и затылок в подушке,
-- руки прямые на всей амплитуде — именно это отличает кадр от жима на наклонной.
update public.exercises
   set technique = 'Сядьте в наклонную скамью со спинкой, поставленную примерно под 45°, прижмите к подушке спину и затылок, стопы поставьте на пол. Гантели в опущенных прямых руках перед бедрами, ладони смотрят вниз. Не сгибая локтей, поднимите гантели перед собой чуть выше уровня плеч, задержитесь на секунду и так же медленно опустите. Корпус, голова и стопы неподвижны всё движение — работают только плечевые суставы. Дышите ровно: выдох на подъёме, вдох при опускании.',
       settings  = 'Наклонная скамья со спинкой под 30–60°, обычно около 45°. Спина и затылок прижаты к подушке, стопы на полу. Руки прямые, локти не сгибаются на всей амплитуде.'
 where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';

-- ШАГ 3. Пересборка `search_text` полной формулой: триггер на `name` и `aliases` пишет укороченную.
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
 where x.id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';

-- ПОСЛЕ:
--   select id, status, name, aliases, media_url, left(search_text, 140) from public.exercises
--    where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';
--   -- 'Подъем гантелей перед собой сидя на наклонной скамье', aliases с прежним именем,
--   -- ссылка кончается на /Front_Incline_Dumbbell_Raise/00f.jpg — гендерная пара включается
--   select position('Лягте грудью' in technique) from public.exercises
--    where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';                          -- 0
--   select count(*) from public.exercises;                                        -- 820
--   select count(*) filter (where status='approved'),
--          count(*) filter (where status='needs_review') from public.exercises;   -- 451 / 369 — не меняется
--   select count(*) from public.exercises where media_url is null or media_url = '';  -- 0
--
-- ПОСЛЕ ВЫКЛАДКИ: удалить из медиа-репозитория прежние фото-кадры
-- `exercises/Front_Incline_Dumbbell_Raise/0.jpg` и `1.jpg` отдельным коммитом — до
-- выкладки живая карточка на них ещё смотрит.
--
-- РЕВЕРС:
--   update public.exercises
--      set name = 'Подъем гантелей перед собой лежа на наклонной скамье',
--          aliases = array['Подъем гантелей перед собой лежа на наклонной скамье'],
--          media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Front_Incline_Dumbbell_Raise/0.jpg',
--          technique = 'Лягте грудью на наклонную скамью и удерживайте гантели в опущенных руках. Поднимайте гантели перед собой до уровня плеч, сохраняя грудь и корпус стабильными. Медленно опустите гантели в исходное положение. Дышите равномерно и не отрывайте корпус от скамьи.',
--          settings  = 'Наклонная скамья. Грудь опирается на подушку, руки свободно свисают вниз.'
--    where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';
--   -- затем ШАГ 3 ещё раз: search_text соберётся из прежних значений
--   -- Дамп прежних значений (замер 01.11):
--   --   select jsonb_agg(to_jsonb(x)) from public.exercises x
--   --    where id = '813c576c-b688-4699-8c1a-e24d5a76d6e7';
--   -- прежний search_text (снят 01.11, двойной пробел там, где пуст список подсобных мышц):
--   --   'подъем гантелей перед собой лежа на наклонной скамье front incline dumbbell raise
--   --    подъемы на наклонной подъем гантелей перед собой лежа на наклонной скамье
--   --    передняя дельта  гантели наклонная скамья isolation strength'
--   -- прежнее updated_at: 2026-10-25T09:45:41.867851+00:00
--
-- Кеш и офлайн. Снимок справочника держит старое имя, старый текст и старый кадр до
-- пересборки (Настройки → «Справочник упражнений» → «Обновить»).
