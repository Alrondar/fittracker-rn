-- 20261029170000_set_underhand_grip_dumbbell_bench_press_media.sql
-- «Жим гантелей лежа обратным хватом» (668309c4, name_eng "Underhand-Grip Dumbbell Bench Press") —
-- перевести ссылку с чужого кадра на нашу пару.
--
-- Зачем. Строка смотрела на `exercises/Close-Grip_Dumbbell_Press/0.jpg`, а в том кадре гантели сведены
-- и ладони повёрнуты друг к другу: это нейтральный узкий хват соседней строки, супинации «ладонями к
-- лицу» в нём нет. Из-за этого позиция попала в класс C разбора 53 расхождений (аудит
-- `legacy-frame-audit.md`, раздел «53 расхождения…»).
--
-- Кадры лежат в медиа-репозитории: `exercises/Underhand-Grip_Dumbbell_Bench_Press/{00f,01f,00m,01m}.jpg`,
-- 850×567, коммит `d60ac8d` (первая съёмка была в `538baea`, мужские кадры заменены: ближняя рука
-- читалась как левая). Папка НОВАЯ: `Close-Grip_Dumbbell_Press` не тронута.
--
-- ПРЕДПОСЫЛКА: кадры запушены, все четыре адреса отвечают 200 (проверено 30.10):
--   curl -s -o /dev/null -w "%{http_code}" \
--     https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Underhand-Grip_Dumbbell_Bench_Press/00f.jpg
--
-- Счётчики от этой правки НЕ ДВИГАЮТСЯ: строка и раньше была на нашем хосте (822 из 822, без кадра 0).
-- Меняется только адрес папки у одной строки, поэтому guard сверяет точное прежнее значение ссылки и
-- то, что на новую папку не смотрит никто другой.
--
-- Blast radius. ОДНА строка `exercises`, поля `media_url` и `updated_at`. Занятость — 0 слотов в
-- `program_exercises` и 0 строк в `workout_exercises` (замер 30.10). `status`, `name`, `name_eng`,
-- `short_name`, `aliases` не меняются; триггеры поиска правку одного `media_url` не ловят.
--
-- ПРОВЕРКИ до (замер 30.10):
--   select id, status, name_eng, media_url from public.exercises
--    where id = '668309c4-7be6-41e9-a2be-a9d8ba81d547';
--   -- approved, 'Underhand-Grip Dumbbell Bench Press', '…/exercises/Close-Grip_Dumbbell_Press/0.jpg'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Underhand-Grip_Dumbbell_Bench_Press/%';   -- 0
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
     where id = '668309c4-7be6-41e9-a2be-a9d8ba81d547'
       and status = 'approved'
       and name_eng = 'Underhand-Grip Dumbbell Bench Press'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Close-Grip_Dumbbell_Press/0.jpg';

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Underhand-Grip Dumbbell Bench Press" со ссылкой на Close-Grip_Dumbbell_Press/0.jpg, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Underhand-Grip_Dumbbell_Bench_Press/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Underhand-Grip_Dumbbell_Bench_Press уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) into n_on_old
      from public.exercises
     where media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Close-Grip_Dumbbell_Press/0.jpg';

    if n_on_old <> 1 then
        raise exception
            'set media aborted: на Close-Grip_Dumbbell_Press/0.jpg смотрит % строк — прежнее значение ссылки сдвинулось, перечитать',
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

    raise notice 'guard ok: строка смотрит на Close-Grip_Dumbbell_Press/0.jpg, папка свободна, каталог 822 и все с кадром';
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Underhand-Grip_Dumbbell_Bench_Press/00f.jpg'
 where id = '668309c4-7be6-41e9-a2be-a9d8ba81d547';

-- ПОСЛЕ:
--   select id, media_url from public.exercises where id = '668309c4-7be6-41e9-a2be-a9d8ba81d547';
--   -- ссылка кончается на /Underhand-Grip_Dumbbell_Bench_Press/00f.jpg — гендерная пара включается
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null) as no_frame, count(*) as total
--     from public.exercises;                              -- 822 / 0 / 822 — не меняется
--
-- РЕВЕРС:
--   update public.exercises
--      set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Close-Grip_Dumbbell_Press/0.jpg'
--    where id = '668309c4-7be6-41e9-a2be-a9d8ba81d547';
--   -- строка снова показывает кадр узкого нейтрального хвата; папка остаётся в медиа-репозитории.
--
-- Кеш и офлайн. Снимок справочника держит старую ссылку до пересборки (Настройки → «Справочник
-- упражнений» → «Обновить»); `src/lib/queryPersistence.ts` — до истечения кэша.
