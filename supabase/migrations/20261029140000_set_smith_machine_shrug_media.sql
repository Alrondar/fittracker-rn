-- 20261029140000_set_smith_machine_shrug_media.sql
-- «Шраги в Смите» (62adbf83, name_eng "Smith Machine Shrug") — поставить media_url на нашу
-- нарисованную пару. Это последняя строка каталога, у которой нет кадра.
--
-- Зачем. Строка `approved`, но кадра не было вовсе: карточка открывалась пустой, что читается как
-- брак, а не как отсутствие картинки. Имя `Smith Machine Shrug` и статус завела миграция
-- `20261029100000_name_and_approve_three_rows_without_name_eng`. Пара нарисована и принята
-- владельцем 29.10 (женская и мужская — с первого раза), кадры разложены в соседний репозиторий
-- медиа и запушены 30.10 (коммит `a66a2a1`, шестнадцать адресов проверены HEAD-ом, все 200).
-- Файлы — `exercises/Smith_Machine_Shrug/{00f,01f,00m,01m}.jpg`, 850×567, средняя разница пикселей
-- против исходников 1.20–1.29 — та же полоса шума перекодировки, что у всей серии.
--
-- Что рисовали. Шраги в Смите: гриф на высоте середины бедра, стопы на ширине плеч, хват чуть шире
-- плеч, руки прямые, плечи поднимаются строго вверх к ушам, короткая пауза, вниз под контролем;
-- гриф едет по вертикальным направляющим и поднимается ровно на столько же, на сколько плечи.
-- Ограничители от соседних строк прописаны в промпте явно: согнутые локти превращают движение в
-- тягу, отрыв пяток — в подъём на носки, гриф за спиной — это «Шраги Ли Хейни» (`Smith Machine
-- Behind the Back Shrug`), гриф не на направляющих — «Шраги со штангой перед собой».
-- Принятая особенность: амплитуда шраг 6–8 см, поэтому нарисованный подъём грифа выше жизни
-- (около 10 см) — осознанно, иначе на размере карточки разница кадров не читается.
--
-- Хост. С 25.10 кадры справочника отдаёт `Alrondar/fittracker-exercise-media`.
--
-- ПРЕДПОСЫЛКА ВЫПОЛНЕНА: кадры запушены 30.10, все четыре адреса отдают 200 — проверено HEAD-ом
-- до написания этой миграции. Для проверки после пуша:
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/00f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/01f.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/00m.jpg
--   curl -sI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/01m.jpg
--
-- ПОРЯДОК. Три предыдущие миграции кадров этой серии уже выложены 30.10
-- (`set_side_to_side_chins_media`, `set_barbell_hold_media`, `set_nordic_hamstring_curl_media`),
-- поэтому здесь счётчики можно сверить точно, без запаса на порядок:
--   замер 30.10 после них — каталог 822, наш хост 821, апстрим 0, без кадра 1 (эта строка).
-- Инвариант «наш хост + без кадра = каталог» всё равно проверяется: если какая-то из трёх
-- откатится, guard это поймает.
--
-- Blast radius. ОДНА строка `exercises`, поле `media_url` (был NULL) и `updated_at`. Занятость —
-- 0 слотов в `program_exercises` и 0 строк в `workout_exercises`, в `exercise_media` 0 строк
-- (замер продом 30.10): ни одна программа и ни один протокол на неё не смотрят. `status`, `name`,
-- `name_eng`, `short_name`, `aliases` и `search_text` не меняются; триггеры поиска висят как
-- `BEFORE UPDATE OF name, name_eng, short_name, aliases, …`, поэтому на правку одного `media_url`
-- не срабатывают.
--
-- Профиль «мужчина» закрыт: в папке лежат обе пары, `00m/01m` на месте.

-- ПРОВЕРКИ до (замер 30.10 после трёх выкладок):
--   select id, name, status, name_eng, media_url, updated_at from public.exercises
--    where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--   -- ожидается: approved, name_eng 'Smith Machine Shrug', media_url IS NULL,
--   -- updated_at = '2026-10-29 10:45:14.789388+00' (его сдвинула миграция имён — реверс
--   -- возвращает именно это значение, а не августовское)
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url like '%free-exercise-db%')           as upstream,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo 821 · upstream 0 · no_frame 1 · total 822

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
     where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e'
       and status = 'approved'
       and name_eng = 'Smith Machine Shrug'
       and media_url is null;

    if n_row <> 1 then
        raise exception
            'set media aborted: ожидалась одна approved-строка "Smith Machine Shrug" без кадра, найдено %',
            n_row;
    end if;

    select count(*) into n_dup_url
      from public.exercises
     where media_url like '%/exercises/Smith_Machine_Shrug/%';

    if n_dup_url <> 0 then
        raise exception
            'set media aborted: на папку Smith_Machine_Shrug уже ссылается % строк(а) — миграция применена дважды?',
            n_dup_url;
    end if;

    select count(*) filter (where media_url like '%fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*) filter (where media_url is null),
           count(*)
      into n_repo, n_upstream, n_noframe, n_total
      from public.exercises;

    if n_total <> 822 or n_upstream <> 0 or n_noframe <> 1
       or n_repo + n_noframe <> n_total then
        raise exception
            'set media aborted: расхождение по кадрам (media_repo %, upstream %, no_frame %, total %) — ждали total 822, upstream 0, no_frame 1 и media_repo = total - no_frame',
            n_repo, n_upstream, n_noframe, n_total;
    end if;

    raise notice 'guard ok: последняя строка без кадра; кадры сейчас % / без кадра % / каталог %',
        n_repo, n_noframe, n_total;
end
$$;

update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Smith_Machine_Shrug/00f.jpg'
 where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';

-- ПОСЛЕ:
--   select id, status, media_url from public.exercises
--    where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--   -- ссылка кончается на /00f.jpg — это включает гендерную пару в src/utils/mediaScheme.ts
--   select count(*) filter (where media_url like '%fittracker-exercise-media%') as media_repo,
--          count(*) filter (where media_url is null)                             as no_frame,
--          count(*)                                                             as total
--     from public.exercises;
--   -- ожидается: media_repo 821 → 822, no_frame 1 → 0, total 822 без изменений.
--   -- Строк без кадра в каталоге не остаётся вовсе.
--   select search_text from public.exercises
--    where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--   -- обязан остаться прежним: «шраги в смите smith machine shrug шраги в смите шраги в смите
--   -- верхняя трапеция мышцы поднимающие лопатку тренажер смита bilateral isolation strength»
--
-- РЕВЕРС:
--   update public.exercises
--      set media_url = null, updated_at = '2026-10-29 10:45:14.789388+00'
--    where id = '62adbf83-2e5c-473b-b9f6-ef6ddce0334e';
--
-- Кеш и офлайн. `src/lib/queryPersistence.ts` держит старый ответ, а снимок справочника
-- (`src/lib/exerciseSnapshot.ts`) хранит строки на момент своей сборки — карточка останется
-- пустой до пересборки снимка (фоновая раз в трое суток, принудительная — Настройки →
-- «Справочник упражнений» → «Обновить»).
