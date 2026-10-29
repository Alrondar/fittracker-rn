-- 20261029070000_set_barbell_wrist_extension_media.sql
-- «Разгибание запястий со штангой» (aa06dcd2, name_eng "Barbell Wrist Extension") — поставить
-- media_url на нашу нарисованную пару.
--
-- Зачем. Строка живёт со статусом `approved` и вовсе без ссылки на кадр: карточка в приложении
-- открывается пустой, что выглядит как брак, а не как отсутствие картинки. Пара нарисована 29.10,
-- принята владельцем покадровой приёмкой (сначала женская, затем мужская тем же текстом) и
-- разложена в соседний репозиторий медиа: `exercises/Barbell_Wrist_Extension/{00f,01f,00m,01m}.jpg`,
-- 850×567, средний средняя разница пикселей против исходников 1.22–1.28 — та же полоса шума
-- перекодировки, что у четырёх позиций партии 23–24.10.
--
-- Хост. С 25.10 кадры справочника отдаёт `Alrondar/fittracker-exercise-media`, а не
-- `Alrondar/fittracker-rn/main/data/exercises` (переезд — `20261025180000_repoint_frames_to_media_repo.sql`,
-- зеркало апстрима — `20261025200000_repoint_upstream_frames_to_media_repo.sql`). Новый путь
-- обязан быть на новом префиксе, иначе ссылка уедет в удалённую из проекта папку.
--
-- ПРЕДПОСЫЛКА. Применять миграцию только после пуша медиа-репозитория: до пуша все четыре адреса
-- отдают 404, и карточка из пустой превратится в битую. Проверка после пуша (ожидаем 200 на всех
-- четырёх рамках):
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Wrist_Extension/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Wrist_Extension/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Wrist_Extension/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Wrist_Extension/01m.jpg
--
-- Blast radius. ОДНА строка `exercises`, поле `media_url` (был NULL) и `updated_at`. Занятость
-- строки — 0 слотов в `program_exercises` и 0 строк в `workout_exercises` (замер продом 29.10),
-- то есть ни одна программа и ни один протокол на неё не смотрят: пересобирать снимки названий не
-- нужно. `status`, `name`, `name_eng`, `aliases` и `search_text` не меняются; триггеры
-- `trg_exercise_search_text` и `trg_fill_search_text` висят как `BEFORE UPDATE OF name, name_eng,
-- short_name, aliases, …`, поэтому на правку одного `media_url` не срабатывают и поисковый текст
-- остаётся прежним (тот же вывод, что зафиксирован для пяти позиций партии 23–24.10).
--
-- Профиль «мужчина» закрыт: в папке лежат обе пары, `00m/01m` на месте, инвариант схемы
-- (переключать строку только когда готовы оба пола) выполнен.

-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, status, media_url, updated_at from public.exercises
--    where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a';
--   -- ожидается: approved, media_url IS NULL, updated_at = '2026-08-19 07:53:46.79256+00'
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url like '%free-exercise-db%')           as upstream,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo 819 · upstream 0 · no_frame 5 · total 824

-- GUARD. Строка переключается только если она пуста по кадру, статус и имя совпадают, счётчики
-- каталога не ушли с замера 29.10 и ни одна другая строка на нашу новую папку ещё не ссылается.
do $$
declare
    n_row      bigint;
    n_dup_url  bigint;
    n_repo     bigint;
    n_upstream bigint;
    n_noframe  bigint;
    n_total    bigint;
begin
    select count(*) into n_row
      from public.exercises
     where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a'
       and status = 'approved'
       and name_eng = 'Barbell Wrist Extension'
       and media_url is null;

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Barbell Wrist Extension" без кадра, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Barbell_Wrist_Extension/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Barbell_Wrist_Extension уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_repo <> 819 or n_upstream <> 0 or n_noframe <> 5 or n_total <> 824 then
        raise exception
            'set media aborted: счётчики сдвинулись (media_repo %, upstream %, no_frame %, total %), сверку 29.10 819/0/5/824 перечитать',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка без кадра, счётчики 819 / 0 / 5 / 824';
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Wrist_Extension/00f.jpg'
 where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a';
--   -- ссылка кончается на /00f.jpg — это включает гендерную пару в src/utils/mediaScheme.ts
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- до/после: media_repo 819 → 820, no_frame 5 → 4, total 824 без изменений
--   select search_text from public.exercises where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a';
--   -- обязан остаться прежним: «разгибание запястий со штангой barbell wrist extension …»
--
-- РЕВЕРС (полный: возвращаем и отсутствие кадра, и прежний updated_at):
--   update public.exercises
--      set media_url = null, updated_at = '2026-08-19 07:53:46.79256+00'
--    where id = 'aa06dcd2-89d9-447e-b73a-20b4e4c2487a';
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` держит старый ответ, а снимок справочника
-- (`src/lib/exerciseSnapshot.ts`, версия 2) хранит строки на момент своей сборки — карточка
-- останется пустой до пересборки снимка (фоновая раз в трое суток, принудительная — Настройки →
-- «Справочник упражнений» → «Обновить»).
