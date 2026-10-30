-- 20261029130000_set_nordic_hamstring_curl_media.sql
-- «Скандинавские сгибания» (3f168d4a, name_eng "Nordic Hamstring Curl") — поставить media_url
-- на нашу нарисованную пару.
--
-- Зачем. Строка была `approved` и вовсе без ссылки на кадр: карточка в приложении открывалась
-- пустой, что читается как брак, а не как отсутствие картинки. Английское имя заведено 29.10
-- миграцией `20261029100000_name_and_approve_three_rows_without_name_eng` (версия реестра
-- `20261029104514`) — оно и дало имя папке под кадры. Пара нарисована 29.10 и принята владельцем
-- покадровой приёмкой: сначала женская (три версии до попадания в глубину), затем мужская тем же
-- текстом. Кадры разложены в соседний репозиторий медиа —
-- `exercises/Nordic_Hamstring_Curl/{00f,01f,00m,01m}.jpg`, 850×567, средняя разница пикселей
-- против исходников 1.00–1.09 — та же полоса шума перекодировки, что у принятых позиций.
--
-- Что рисовали и чем это отличалось от соседей. Движение изометрической пары не имеет: кадр 1 —
-- вертикальная стойка на коленях, кадр 2 — низ эксцентрической фазы, та же жёсткая линия
-- «колено-таз-плечи-макушка» наклонена вперёд. Ракурс мёртвый боковой (движение лежит в
-- сагиттальной плоскости), поэтому ноги почти совпадают силуэтом — отсюда блок DEPTH ORDER:
-- ближняя нога рисуется резко и полностью, дальняя темнее и со сдвигом, и «TWO KNEES, TWO SHOES
-- MUST READ». Опора — низкая стойка с мягкой планкой на голенях, а не партнёр: второй человек в
-- кадре запрещён блоками CHARACTER LOCK и SINGLE FRAME. Руки на старте скрещены на груди, потому
-- что внизу человек ловит себя ими же.
--
-- ЧЕСТНО ПРО ОСТАТОК. Горизонтальное положение сцены между кадрами не удержалось ни в одной из
-- трёх версий: колени стоят на ~35 % ширины кадра в первом и на ~68 % во втором, то есть пара
-- выглядит так, будто камера сделала панораму. Владелец принял это осознанно 29.10: каждый кадр
-- по отдельности верен, на карточке показывается первый. В мужском втором кадре к тому же есть
-- небольшая складка в тазе (около 20°) — ошибка, которую источники называют первой; на размере
-- карточки она не видна. Записано, чтобы при следующем проходе по кадрам это не открыли заново.
--
-- Хост. С 25.10 кадры справочника отдаёт `Alrondar/fittracker-exercise-media`, а не
-- `Alrondar/fittracker-rn/main/data/exercises` (переезд — `20261025180000_repoint_frames_to_media_repo.sql`).
--
-- ПРЕДПОСЫЛКА. Применять только после пуша медиа-репозитория: до пуша все четыре адреса отдают 404,
-- и карточка из пустой превратится в битую. Проверка после пуша (ожидаем 200 на всех четырёх):
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/01m.jpg
--
-- ПОРЯДОК ПРИМЕНЕНИЯ. На выкладку стоят ещё две миграции кадров — `20261029090000_…side_to_side_
-- chins…` и `20261029120000_set_barbell_hold_media.sql`, и обе тоже переводят по строке из «без
-- кадра» в «наш хост». Поэтому guard сверяет не пару чисел, а инвариант: каталог 822, апстрим 0,
-- «без кадра» от 2 до 4, и наш_хост + без_кадра = каталог. Замер 29.10: 818 / 0 / 4 / 822.
--
-- Blast radius. ОДНА строка `exercises`, поле `media_url` (был NULL) и `updated_at`. Занятость —
-- 0 слотов в `program_exercises` и 0 строк в `workout_exercises`, в `exercise_media` 0 строк
-- (замер продом 29.10): пересобирать снимки не нужно. `status`, `name`, `name_eng`, `short_name`,
-- `aliases` и `search_text` не меняются; триггеры поиска висят как `BEFORE UPDATE OF name, name_eng,
-- short_name, aliases, …`, поэтому на правку одного `media_url` не срабатывают.
--
-- Профиль «мужчина» закрыт: в папке лежат обе пары, `00m/01m` на месте.

-- ПРОВЕРКИ до (замер 29.10):
--   select id, name, status, name_eng, media_url, updated_at from public.exercises
--    where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--   -- ожидается: approved, name_eng 'Nordic Hamstring Curl', media_url IS NULL,
--   -- updated_at = '2026-10-29 10:45:14.789388+00' (его сдвинула утренняя миграция имён —
--   -- реверс возвращает именно это значение)
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url like '%free-exercise-db%')           as upstream,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo 818 · upstream 0 · no_frame 4 · total 822

-- GUARD.
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
     where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3'
       and status = 'approved'
       and name_eng = 'Nordic Hamstring Curl'
       and media_url is null;

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Nordic Hamstring Curl" без кадра, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Nordic_Hamstring_Curl/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Nordic_Hamstring_Curl уже ссылается % строк(а) — миграция применена дважды?',
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
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Nordic_Hamstring_Curl/00f.jpg'
 where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--   -- ссылка кончается на /00f.jpg — это включает гендерную пару в src/utils/mediaScheme.ts
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- сдвиг ровно на одну строку: если до было 818 / 4, станет 819 / 3; если две другие
--   -- миграции кадров ушли раньше — 820 / 2 → 821 / 1. Каталог 822 не меняется.
--   select search_text from public.exercises
--    where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--   -- обязан остаться прежним: «скандинавские сгибания nordic hamstring curl нордические сгибания
--   -- скандинавские сгибания (nordic hamstring curl) nordic hamstring curl бицепс бедра икроножная
--   -- разгибатели спины коврик партнер тренажер nordic bilateral isolation posterior_chain
--   -- rehabilitation strength»
--
-- РЕВЕРС:
--   update public.exercises
--      set media_url = null, updated_at = '2026-10-29 10:45:14.789388+00'
--    where id = '3f168d4a-5b8c-46c2-8692-cfb32f86ecd3';
--   -- после реверса строка снова без кадра; пара файлов в медиа-репозитории остаётся и никому
--   -- не мешает — она не осиротеет как «папка без ссылки», а просто перестанет показываться.
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` держит старый ответ, а снимок справочника
-- (`src/lib/exerciseSnapshot.ts`) хранит строки на момент своей сборки — карточка останется
-- пустой до пересборки снимка (фоновая раз в трое суток, принудительная — Настройки →
-- «Справочник упражнений» → «Обновить»).
