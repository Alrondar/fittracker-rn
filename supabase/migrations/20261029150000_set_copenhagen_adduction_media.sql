-- 20261029150000_set_copenhagen_adduction_media.sql
-- «Копенгагенские приведения» (b419d3b1, name_eng "Copenhagen Adduction") — перевести ссылку
-- с чужого кадра на нашу пару.
--
-- Зачем. Строка смотрела на `exercises/Plank/0.jpg`, а в том кадре человек стоит на одном колене со
-- сложенными руками: ни боковой опоры, ни приведения. Это тот самый битый легаси-кадр планки, из-за
-- которого позиция попала в класс C разбора 53 расхождений имени папки с `name_eng` (аудит
-- `legacy-frame-audit.md`, раздел «53 расхождения…»). Пара нарисована 30.10 и принята владельцем
-- покадровой приёмкой: три версии с коротким рычагом (колено на скамье) не взялись, владелец выбрал
-- вариант Б — ДЛИННЫЙ РЫЧАГ, и кадр совпал с тем, что уже написано в `settings` строки («верхняя нога
-- располагается на скамье примерно на уровне голени»). То есть текст править не нужно.
--
-- Кадры лежат в медиа-репозитории: `exercises/Copenhagen_Adduction/{00f,01f,00m,01m}.jpg`, 850×567,
-- средняя разница пикселей против исходников 1.23–1.33 — полоса шума перекодировки всей серии.
-- Папка НОВАЯ: `Plank` не тронута, в ней лежит наша пара строки «Планка на локтях» (Plank/00f.jpg).
--
-- ПРЕДПОСЫЛКА: кадры должны быть запушены в медиа-репозиторий ДО записи, иначе четыре адреса отдают
-- 404 и карточка из «чужого кадра» станет битой. Проверка после пуша (ожидаем 200):
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Copenhagen_Adduction/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Copenhagen_Adduction/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Copenhagen_Adduction/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Copenhagen_Adduction/01m.jpg
--
-- ЧЕМ ЭТА ЗАПИСЬ ОТЛИЧАЕТСЯ ОТ ЧЕТЫРЁХ ПРЕДЫДУЩИХ. Там строка была без кадра вовсе и переходила из
-- «без кадра» в «наш хост». Здесь кадр уже был — хоть и чужой, — поэтому счётчики НЕ ДВИГАЮТСЯ:
-- кадр на нашем хосте 822 остаётся 822, строк без кадра 0 остаётся 0. Меняется только адрес папки
-- у одной строки. Guard поэтому сверяет не сдвиг счётчиков, а точное прежнее значение ссылки и то,
-- что на новую папку не смотрит никто другой.
--
-- Blast radius. ОДНА строка `exercises`, поля `media_url` и `updated_at`. Занятость — 0 слотов в
-- `program_exercises` и 0 строк в `workout_exercises` (замер продом 30.10). `status`, `name`,
-- `name_eng`, `short_name`, `aliases` не меняются; триггеры поиска висят как `BEFORE UPDATE OF name,
-- name_eng, short_name, aliases, …`, поэтому на правку одного `media_url` не срабатывают.
-- Побочный эффект: `Plank/0.jpg` остаётся без ссылок, но папка `Plank` по-прежнему занята нашей
-- парой планки — файлы не удаляем, они часть зеркала.
--
-- Отдельная находка, в эту миграцию НЕ входит: `search_text` этой строки лежит короткой формулой
-- (`fill_search_text`: имя + короткое имя + алиасы + `name_eng`, без мышц, снаряда, тегов и категории,
-- без свёртки «ё»). Таких строк в каталоге 62 — считается отдельным запросом и лечится отдельной
-- миграцией, чтобы не смешивать две вещи в одной записи.
--
-- ПРОВЕРКИ до (замер 30.10):
--   select id, status, name_eng, media_url, updated_at from public.exercises
--    where id = 'b419d3b1-73c0-4e71-a670-fd1692c573e1';
--   -- ожидается: approved, name_eng 'Copenhagen Adduction',
--   -- media_url = '…/exercises/Plank/0.jpg', updated_at = '2026-10-25 09:45:41.867851+00'
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Copenhagen_Adduction/%';      -- 0
--   select count(*) from public.exercises;                            -- 822
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null) as no_frame
--     from public.exercises;                                          -- 822 / 0

-- GUARD.
do $$
declare
    n_row      bigint;
    n_dup_url  bigint;
    n_on_plank bigint;
    n_repo     bigint;
    n_upstream bigint;
    n_noframe  bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = 'b419d3b1-73c0-4e71-a670-fd1692c573e1'
       and status = 'approved'
       and name_eng = 'Copenhagen Adduction'
       and media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Plank/0.jpg';

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Copenhagen Adduction" со ссылкой на Plank/0.jpg, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Copenhagen_Adduction/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Copenhagen_Adduction уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) into n_on_plank
      from public.exercises
     where media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Plank/0.jpg';

    if n_on_plank <> 1 then
        raise exception
            'set media aborted: на Plank/0.jpg смотрит % строк — прежнее значение ссылки сдвинулось, перечитать',
            n_on_plank;
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

    raise notice 'guard ok: строка смотрит на Plank/0.jpg, папка свободна, каталог 822 и все с кадром';
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Copenhagen_Adduction/00f.jpg'
 where id = 'b419d3b1-73c0-4e71-a670-fd1692c573e1';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = 'b419d3b1-73c0-4e71-a670-fd1692c573e1';
--   -- ссылка кончается на /Copenhagen_Adduction/00f.jpg — гендерная пара включается
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url is null) as no_frame,
--          count(*) as total
--     from public.exercises;
--   -- 822 / 0 / 822 — не меняется: строка и раньше была на нашем хосте
--   select count(*) from public.exercises
--    where media_url like '%/exercises/Plank/%';        -- 1 — осталась только наша планка (00f)
--
-- РЕВЕРС:
--   update public.exercises
--      set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Plank/0.jpg',
--          updated_at = '2026-10-25 09:45:41.867851+00'
--    where id = 'b419d3b1-73c0-4e71-a670-fd1692c573e1';
--   -- строка снова показывает чужой кадр планки; папка Copenhagen_Adduction остаётся в репозитории
--   -- и никому не мешает.
--
-- Кеш и офлайн. Снимок справочника держит старую ссылку до пересборки (Настройки → «Справочник
-- упражнений» → «Обновить»); `src/lib/queryPersistence.ts` — до истечения кэша.
