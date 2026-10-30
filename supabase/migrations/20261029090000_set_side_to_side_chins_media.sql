-- 20261029090000_set_side_to_side_chins_media.sql
-- «Подтягивания широким хватом со смещением в стороны» (1208d0bd, name_eng "Side To Side Chins")
-- — поставить media_url на нашу нарисованную пару.
--
-- Зачем. Строка живёт со статусом `approved` и вовсе без ссылки на кадр: карточка в приложении
-- открывается пустой, что выглядит как брак, а не как отсутствие картинки. Пара нарисована 29.10
-- и принята владельцем покадровой приёмкой (сначала женская, вердикт, затем мужская тем же
-- текстом). Спека согласована до генерации: смещение корпуса к ДАЛЬНЕЙ руке и скрещённые
-- лодыжки — оба условия владельца. Кадры разложены в соседний репозиторий медиа
-- `exercises/Side_To_Side_Chins/{00f,01f,00m,01m}.jpg`, 850×567; средняя разница пикселей
-- против исходников 1.03–1.08 — та же полоса шума перекодировки, что у четырёх позиций партии
-- 23–24.10 (1.41–1.51) и у запястья (1.22–1.28), то есть цвет и кадрирование не пострадали.
--
-- Отличие от соседней строки. «Подтягивания широким хватом» (e4bcc6ac) уже имеет нашу пару в том
-- же ракурсе; различие ровно одно и оно обязано читаться на уменьшенном кадре карточки — на
-- верхнем фазе корпус ушёл в сторону одной руки, эта рука согнута и держит нагрузку, вторая
-- почти прямая. Проверено листом в размере карточки (`spark-output/export/qc/sidechins-cardsize.jpg`).
--
-- Хост. С 25.10 кадры справочника отдаёт `Alrondar/fittracker-exercise-media`, а не
-- `Alrondar/fittracker-rn/main/data/exercises` (переезд — `20261025180000_repoint_frames_to_media_repo.sql`).
-- Новый путь обязан быть на новом префиксе, иначе ссылка уедет в удалённую из проекта папку.
--
-- ПРЕДПОСЫЛКА. Применять миграцию только после пуша медиа-репозитория: до пуша все четыре адреса
-- отдают 404, и карточка из пустой превратится в битую. Проверка после пуша (ожидаем 200 на всех
-- четырёх рамках):
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/01m.jpg
-- В папке рядом лежат `0.jpg` и `1.jpg` — это зеркало апстрима, оно на строку не ссылается и
-- остаётся как есть.
--
-- Blast radius. ОДНА строка `exercises`, поле `media_url` (был NULL) и `updated_at`. Занятость
-- строки — 0 слотов в `program_exercises` и 0 строк в `workout_exercises` (замер продом 29.10),
-- в `exercise_media` у неё тоже 0 строк: пересобирать снимки названий и правки вложенных
-- тренировок не нужно. `status`, `name`, `name_eng`, `aliases` и `search_text` не меняются;
-- триггеры `trg_exercise_search_text` и `trg_fill_search_text` висят как `BEFORE UPDATE OF name,
-- name_eng, short_name, aliases, …`, поэтому на правку одного `media_url` не срабатывают и
-- поисковый текст остаётся прежним.
--
-- Профиль «мужчина» закрыт: в папке лежат обе пары, `00m/01m` на месте, инвариант схемы
-- (переключать строку только когда готовы оба пола) выполнен.

-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, status, media_url, updated_at from public.exercises
--    where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8';
--   -- ожидается: approved, media_url IS NULL, updated_at = '2026-08-13 09:46:59.371443+00'
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url like '%free-exercise-db%')           as upstream,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo + no_frame = total (замер 30.10: 818 + 4 = 822), upstream 0,
--   -- no_frame 2..4 — точная пара чисел не фиксируется: миграций кадров в очереди несколько,
--   -- и порядок их применения не должен блокировать запись

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
     where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8'
       and status = 'approved'
       and name_eng = 'Side To Side Chins'
       and media_url is null;

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Side To Side Chins" без кадра, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Side_To_Side_Chins/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Side_To_Side_Chins уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 822 or n_upstream <> 0
       or n_noframe not between 2 and 4
       or n_repo + n_noframe <> n_total then
        raise exception
            'set media aborted: расхождение по кадрам (media_repo %, upstream %, no_frame %, total %) — ждали total 822, upstream 0, no_frame 2..4 и media_repo = total - no_frame',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка без кадра; кадры сейчас % / без кадра % / каталог %',
        n_repo, n_noframe, n_total;
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Side_To_Side_Chins/00f.jpg'
 where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8';
--   -- ссылка кончается на /00f.jpg — это включает гендерную пару в src/utils/mediaScheme.ts
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- сдвиг ровно на одну строку: кадр на нашем хосте +1, без кадра −1; каталог 822 не меняется.
--   -- Замер 30.10 до записи: 818 / 0 / 4 / 822.
--   select search_text from public.exercises
--    where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8';
--   -- обязан остаться прежним: «подтягивания широким хватом со смещением в стороны side to side
--   -- chins подтягивания в стороны … широчайшие бицепс мышцы предплечья ромбовидные задняя дельта
--   -- турник unilateral compound strength»
--
-- РЕВЕРС (полный: возвращаем и отсутствие кадра, и прежний updated_at):
--   update public.exercises
--      set media_url = null, updated_at = '2026-08-13 09:46:59.371443+00'
--    where id = '1208d0bd-998e-4dcb-9f4e-aa016c7e88d8';
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` держит старый ответ, а снимок справочника
-- (`src/lib/exerciseSnapshot.ts`) хранит строки на момент своей сборки — карточка останется
-- пустой до пересборки снимка (фоновая раз в трое суток, принудительная — Настройки →
-- «Справочник упражнений» → «Обновить»).
