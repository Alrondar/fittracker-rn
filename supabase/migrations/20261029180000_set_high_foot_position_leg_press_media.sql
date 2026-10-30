-- 20261029180000_set_high_foot_position_leg_press_media.sql
-- «Жим ногами с высокой постановкой стоп» (b9c957fd, name_eng "High Foot Position Leg Press") —
-- перевести ссылку с чужого кадра на нашу пару.
--
-- Зачем. Строка смотрела на `exercises/Leg_Press/0.jpg`, где стопы стоят в СЕРЕДИНЕ платформы: это
-- обычный жим ногами соседней строки, а высокое положение стоп — единственное, ради чего эта строка
-- заведена. Класс C разбора 53 расхождений (`legacy-frame-audit.md`, раздел «53 расхождения…»).
--
-- Кадры лежат в медиа-репозитории: `exercises/High_Foot_Position_Leg_Press/{00f,01f,00m,01m}.jpg`,
-- 850×567, коммит `538baea`. Папка НОВАЯ: `Leg_Press` не тронута — в ней наша пара строки «Жим ногами
-- в тренажёре» (0d7f121e смотрит на Leg_Press/00f.jpg и остаётся как есть).
--
-- На кадре: та же машина под 45°, что и в принятой паре Leg_Press, стопы в верхней трети платформы
-- носками у верхней кромки, носки чуть наружу; светятся ягодицы и задний край бедра — обе мышцы
-- из `primary_muscles` строки. Первый прогон светил квадрицепс и владельцем не принимался.
--
-- ПРЕДПОСЫЛКА: кадры запушены, все четыре адреса отвечают 200 (проверено 30.10):
--   curl -s -o /dev/null -w "%{http_code}" \
--     https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/High_Foot_Position_Leg_Press/00f.jpg
--
-- Счётчики от этой правки НЕ ДВИГАЮТСЯ: строка и раньше была на нашем хосте (822 из 822, без кадра 0).
--
-- Blast radius. ОДНА строка `exercises`, поля `media_url` и `updated_at`. В программах строка занимает
-- 2 слота `program_exercises`, в тренировках — 16 строк `workout_exercises`; там `exercise_name` —
-- снимок, история не меняется, но в уже созданных тренировках карточка начнёт показывать новый кадр.
-- `status`, `name`, `name_eng`, `short_name`, `aliases` не меняются; триггеры поиска правку одного
-- `media_url` не ловят.
--
-- ПРОВЕРКИ до (замер 30.10):
--   select id, status, name_eng, media_url from public.exercises
--    where id = 'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3';
--   -- approved, 'High Foot Position Leg Press', '…/exercises/Leg_Press/0.jpg'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/High_Foot_Position_Leg_Press/%';          -- 0
--   select count(*) from public.exercises where media_url like '%/exercises/Leg_Press/0.jpg'; -- 1
--   select count(*) from public.exercises;                                       -- 822

-- GUARD.
do $$
declare
    n_row      bigint;
    n_dup_url  bigint;
    n_on_old   bigint;
    n_repo     bigint;
    n_upstream bigint;
    n_noframe  bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = 'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3'
       and status = 'approved'
       and name_eng = 'High Foot Position Leg Press'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Leg_Press/0.jpg';

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "High Foot Position Leg Press" со ссылкой на Leg_Press/0.jpg, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/High_Foot_Position_Leg_Press/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку High_Foot_Position_Leg_Press уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) into n_on_old
      from public.exercises
     where media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Leg_Press/0.jpg';

    if n_on_old <> 1 then
        raise exception
            'set media aborted: на Leg_Press/0.jpg смотрит % строк — прежнее значение ссылки сдвинулось, перечитать',
            n_on_old;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 822 or n_upstream <> 0 or n_noframe <> 0 or n_repo <> 822 then
        raise exception
            'set media aborted: кадровые счётчики не те (наш хост %, апстрим %, без кадра %, каталог %) — ждали 822 / 0 / 0 / 822',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка смотрит на Leg_Press/0.jpg, папка свободна, каталог 822 и все с кадром';
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/High_Foot_Position_Leg_Press/00f.jpg'
 where id = 'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3';

-- ПОСЛЕ:
--   select id, media_url from public.exercises where id = 'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3';
--   -- ссылка кончается на /High_Foot_Position_Leg_Press/00f.jpg — гендерная пара включается
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null) as no_frame, count(*) as total
--     from public.exercises;                              -- 822 / 0 / 822 — не меняется
--   select count(*) from public.exercises where media_url like '%/exercises/Leg_Press/0.jpg'; -- 0
--   -- на Leg_Press остаётся только наша пара соседней строки: 0d7f121e → Leg_Press/00f.jpg
--
-- РЕВЕРС:
--   update public.exercises
--      set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Leg_Press/0.jpg'
--    where id = 'b9c957fd-a7c9-4d76-a7ed-4d19ba2524d3';
--   -- строка снова показывает кадр обычного жима ногами; папка остаётся в медиа-репозитории.
--
-- Кеш и офлайн. Снимок справочника держит старую ссылку до пересборки (Настройки → «Справочник
-- упражнений» → «Обновить»); `src/lib/queryPersistence.ts` — до истечения кэша.
