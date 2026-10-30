-- 20261029120000_set_barbell_hold_media.sql
-- «Удержание штанги» (f70c9ee3, name_eng "Barbell Hold") — поставить media_url на нашу
-- нарисованную пару.
--
-- Зачем. Строка была `approved` и вовсе без ссылки на кадр: карточка в приложении открывалась
-- пустой, что читается как брак, а не как отсутствие картинки. Английское имя заведено утром 29.10
-- миграцией `20261029100000_name_and_approve_three_rows_without_name_eng` (версия реестра
-- `20261029104514`) — именно оно дало имя папке под кадры. Пара нарисована 29.10 и принята
-- владельцем покадровой приёмкой: сначала женская, вердикт, затем мужская тем же текстом. Кадры
-- разложены в соседний репозиторий медиа — `exercises/Barbell_Hold/{00f,01f,00m,01m}.jpg`,
-- 850×567, средняя разница пикселей против исходников 1.22–1.26 — та же полоса шума перекодировки,
-- что у принятых позиций (подъём на носки 1.41–1.51, запястье 1.22–1.28, подтягивания в стороны
-- 1.03–1.08), то есть цвет и кадрирование не пострадали.
--
-- Чем позиция рискованна и что её отличает. Силуэт статического удержания грифа — верхняя точка
-- становой тяги, а «Становая тяга» в каталоге есть и ведёт на свой кадр. Различие, которое рисовали:
-- корпус вертикальный и в покое (таз под плечами, колени мягкие, без наклона), плечи опущены и не
-- «взяты» к ушам, гриф висит на прямых руках и НЕ лежит на бёдрах, за спиной пустая стойка с
-- незагруженными упорами. Проверено листом в размере карточки
-- (`spark-output/export/qc/barbellhold-cardsize.jpg`): читается как «стоит и держит». Оба кадра —
-- одна и та же поза, второй на несколько дыханий позже (приём принятой планки): движение статичное,
-- второй фазы у него нет.
--
-- Хост. С 25.10 кадры справочника отдаёт `Alrondar/fittracker-exercise-media`, а не
-- `Alrondar/fittracker-rn/main/data/exercises` (переезд — `20261025180000_repoint_frames_to_media_repo.sql`).
--
-- ПРЕДПОСЫЛКА. Применять только после пуша медиа-репозитория: до пуша все четыре адреса отдают 404,
-- и карточка из пустой превратится в битую. Проверка после пуша (ожидаем 200 на всех четырёх):
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/01m.jpg
--
-- ПОРЯДОК ПРИМЕНЕНИЯ И ПОЧЕМУ GUARD НЕ ПРИВЯЗАН К ТОЧНЫМ СЧЁТЧИКАМ КАДРОВ. В очереди на выкладку
-- стоит ещё `20261029090000_set_side_to_side_chins_media.sql` (подтягивания со смещением), и она
-- тоже переводит одну строку из «без кадра» в «наш хост». Какая из двух уйдёт первой — решать не
-- должно влиять на guard, поэтому здесь сверяется не пара чисел, а инвариант:
--   наш_хост + без_кадра = каталог, апстрим-ссылок 0, а «без кадра» — 4 или 3.
-- Замер 29.10 после слияния дубля: каталог 822, наш хост 818, апстрим 0, без кадра 4.
--
-- Blast radius. ОДНА строка `exercises`, поле `media_url` (был NULL) и `updated_at`. Занятость —
-- 0 слотов в `program_exercises` и 0 строк в `workout_exercises`, в `exercise_media` 0 строк
-- (замер продом 29.10): ни одна программа и ни один протокол на неё не смотрят, пересобирать
-- снимки не нужно. `status`, `name`, `name_eng`, `short_name`, `aliases` и `search_text` не
-- меняются; триггеры `trg_exercise_search_text` и `trg_fill_search_text` висят как
-- `BEFORE UPDATE OF name, name_eng, short_name, aliases, …`, поэтому на правку одного `media_url`
-- не срабатывают и поисковый текст остаётся прежним (тот же вывод, что для пяти позиций партии
-- 23–24.10 и для подтягиваний со смещением).
--
-- Профиль «мужчина» закрыт: в папке лежат обе пары, `00m/01m` на месте — инвариант схемы
-- (переключать строку только когда готовы оба пола) выполнен.

-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, status, name_eng, media_url, updated_at from public.exercises
--    where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--   -- ожидается: approved, name_eng 'Barbell Hold', media_url IS NULL,
--   -- updated_at = '2026-10-29 10:45:14.789388+00' (его сдвинула утренняя миграция имён —
--   -- реверс возвращает именно это значение, а не августовское)
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url like '%free-exercise-db%')           as upstream,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo 818 · upstream 0 · no_frame 4 · total 822

-- GUARD. Строка переключается только если она пуста по кадру, статус и имя совпадают, ни одна
-- другая строка на нашу папку ещё не ссылается, каталог не ушёл с 822 и кадровый инвариант цел.
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
     where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5'
       and status = 'approved'
       and name_eng = 'Barbell Hold'
       and media_url is null;

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Barbell Hold" без кадра, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Barbell_Hold/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Barbell_Hold уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 822 or n_upstream <> 0
       or n_noframe not in (3, 4)
       or n_repo + n_noframe <> n_total then
        raise exception
            'set media aborted: расхождение по кадрам (media_repo %, upstream %, no_frame %, total %) — ждали total 822, upstream 0, no_frame 3 или 4 и media_repo = total - no_frame',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: строка без кадра; кадры сейчас % / без кадра % / каталог %',
        n_repo, n_noframe, n_total;
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Barbell_Hold/00f.jpg'
 where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--   -- ссылка кончается на /00f.jpg — это включает гендерную пару в src/utils/mediaScheme.ts
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- сдвиг ровно на одну строку в обе стороны: если до было 818 / 4, станет 819 / 3;
--   -- если первой ушла миграция подтягиваний со смещением (819 / 3) — станет 820 / 2.
--   -- Каталог 822 не меняется.
--   select search_text from public.exercises
--    where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--   -- обязан остаться прежним: «удержание штанги barbell hold удержание штанги … мышцы предплечья
--   -- бицепс трапеция штанга isometric bilateral strength»
--
-- РЕВЕРС (полный: возвращаем и отсутствие кадра, и прежний updated_at):
--   update public.exercises
--      set media_url = null, updated_at = '2026-10-29 10:45:14.789388+00'
--    where id = 'f70c9ee3-a861-46c4-bcdf-9dc522dcf6d5';
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` держит старый ответ, а снимок справочника
-- (`src/lib/exerciseSnapshot.ts`) хранит строки на момент своей сборки — карточка останется
-- пустой до пересборки снимка (фоновая раз в трое суток, принудительная — Настройки →
-- «Справочник упражнений» → «Обновить»).
