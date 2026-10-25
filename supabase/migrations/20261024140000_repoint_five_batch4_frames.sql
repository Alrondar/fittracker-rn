-- 20261024140000_repoint_five_batch4_frames.sql
-- Партия 23–24.10: пять перерисованных позиций легаси — перевести media_url на нашу папку.
--
-- Адреса переписаны 25.10 под репозиторий медиа: кадры этой партии лежат в
-- `Alrondar/fittracker-exercise-media/exercises/<Папка>/…`, прежний путь
-- `…/fittracker-rn/main/data/exercises/…` после удаления папки из `main` отдаёт 404,
-- поэтому в старом виде миграция применима была бы только с битыми карточками на выходе.
--
-- Зачем. Кадры нарисованы, приняты владельцем покадровой приёмкой, но в строках по-прежнему
-- стоит ссылка на чужую апстримную папку, и приложение показывает старый кадр про другое движение:
--   «Подтягивания широким хватом» рисуются тягой верхнего блока сидя (трос, стек, валики);
--   «Планка на локтях» открывается присевшей на полукорточки фигурой со сложенными руками;
--   «Ягодичный мостик на полу» — мостиком со штангой на бёдрах, которой в тексте нет;
--   «Французский жим обратным хватом» — разгибанием на блоке, а не со штангой лёжа;
--   «Подъём на носки в тренажёре для жима ногами» — полным жимом ногами, где колено ходит.
--
-- Переключатель — сам media_url (src/utils/mediaScheme.ts): ссылка на `00f.jpg` включает гендерную
-- пару, ссылка на `0.jpg` — легаси. Откат строки возвращает легаси без правки кода и без удаления
-- файлов.
--
-- Инвариант схемы. Переводим строку только когда в папке лежат ОБЕ пары (женская и мужская), иначе
-- профиль «мужчина» упирается в 404. Замерено 24.10: в каждой из пяти папок по четыре файла,
-- все 850×567; раскладка проверена mean-разницей пикселей против исходников (1.4–1.5). После
-- переезда адресов проверено заново, 25.10: HEAD по всем 20 адресам нового хоста (пять папок ×
-- 00f/01f/00m/01m) — 200/200, включая `Butt_Lift_(Bridge)` с круглыми скобками в имени папки.
--
-- Порядок. Сначала эта миграция задумывалась как следующая после 20261023194000 (удаление пуловера
-- в Смите); фактически она ложится ПОСЛЕ 20261025180000 (переезд 56 строк в репозиторий медиа), и
-- счётчики читаются уже от нового хоста: на нашем 56 → 61, апстрим 764 → 759, total 825.
--
-- Триггеры. На exercises висят trg_exercise_search_text и trg_fill_search_text — оба
-- `BEFORE UPDATE OF name, name_eng, short_name, aliases, …`, то есть на правку ОДНОГО media_url
-- не срабатывают. Проверено dry-run'ом в BEGIN…ROLLBACK 24.10: search_text остаётся
-- дословно прежним, меняется только updated_at (trg_exercises_updated_at). Поэтому здесь
-- updated_at не пишем руками — его ставит триггер.
--
-- Blast radius. ПЯТЬ строк exercises, поле media_url (путь апстрима → наш путь) и updated_at.
-- status, name, name_eng, aliases и search_text не меняются; program_exercises хранит снимок
-- exercise_name, поэтому слоты программ не пересобираются. Другая строка на новый путь не
-- ссылается — наши папки до этой миграции не использовались ни одной строкой (замер 24.10:
-- Wide-Grip_Pull-Up 0, Calf_Press_On_The_Leg_Press_Machine 0 на нашем хосте).
--
-- Занятость (замер продом 24.10; слоты — во все программы, hist — строки workout_exercises):
--   «Подтягивания широким хватом»  32 / 73 — самая горячая, кадр увидят все, кто её делает;
--   «Подъём на носки …»            23 / 26;
--   «Планка на локтях»             19 / 30;
--   «Ягодичный мостик на полу»      4 /  4;
--   «Французский жим обратным хватом» 0 / 0.
--   (У носков и планки история выросла против замеров 21.10 — 16 и 25; это новые протоколы,
--    не расхождение учёта.)
--
-- Осиротевшие апстримные папки (замер 24.10 числом строк, чей media_url смотрит на путь):
--   Wide-Grip_Lat_Pulldown            1 ссылка (эта строка) → ОСИРОТЕЕТ. Вторая строка с таким
--                                     именем в URL — eb299866 «Тяга верхнего блока … широким
--                                     хватом» — уже на НАШЕМ хосте, апстрим она не держит;
--   Calf_Press_On_The_Leg_Press_Machine 1 ссылка (эта строка) → ОСИРОТЕЕТ;
--   Plank                               2 ссылки → у «Копенгагенских приведений» (b419d3b1)
--                                     остаётся, НЕ осиротевает;
--   Barbell_Glute_Bridge                2 ссылки → остаётся у хозяина папки 5e082615 «Ягодичный
--                                     мостик со штангой на полу», НЕ осиротевает;
--   Reverse_Grip_Triceps_Pushdown       2 ссылки → остаётся у c71845ce «Разгибание рук в
--                                     кроссовере обратным хватом» (approved), НЕ осиротевает.
--                                     Прежняя запись в legacy-frame-audit.md («осиротеет») была
--                                     ошибочной — здесь исправлена по замеру.
-- Файлы на апстриме мы не трогаем; локальные зеркала легаси-кадров 0.jpg/1.jpg в репозитории медиа
-- тоже — они инертны, клиент читает media_url.

-- ПРОВЕРКИ до (ожидается ровно пять строк со ссылками на yuhonas/free-exercise-db; на нашем хосте
-- 56, upstream 764, no_media 5, total 825 — снимались 24.10, перечитаны 25.10 после переезда:
-- ссылки всех пяти строк до сих пор стоят замеренные апстримные, только хозяин файлов сменился):
--   select id, name, status, media_url, updated_at from public.exercises
--    where id in ('e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4',
--                 '99e41686-535c-4315-b076-ec7a1adc5a6a',
--                 '5f214a11-cabc-4155-b73a-1812e0f303e9',
--                 'c557b192-3494-42b7-a703-f1f7ac86b6fb',
--                 '19f4f807-e47c-4741-98bd-f940dfd30b92');
--   select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                           as no_media,
--          count(*)                                                            as total
--     from public.exercises;

-- GUARD. Ни одна строка не переключается, если каталог ушёл от замера 24.10: пять ожидаемых
-- ссылок должны стоять на апстриме, счётчики — быть 56 / 764 / 825 (наш хост с 25.10 считается
-- по метке fittracker-exercise-media). Иначе миграция прерывается до первого update, и откат
-- не нужен.
do $$
declare
    n_expected bigint;
    n_ours     bigint;
    n_upstream bigint;
    n_total    bigint;
begin
    select count(*) into n_expected
      from public.exercises
     where (id, media_url) in (
        ('e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4',
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg'),
        ('99e41686-535c-4315-b076-ec7a1adc5a6a',
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg'),
        ('5f214a11-cabc-4155-b73a-1812e0f303e9',
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg'),
        ('c557b192-3494-42b7-a703-f1f7ac86b6fb',
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Grip_Triceps_Pushdown/0.jpg'),
        ('19f4f807-e47c-4741-98bd-f940dfd30b92',
         'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/0.jpg'));

    if n_expected <> 5 then
        raise exception
            'repoint aborted: ожидалось 5 строк с замеренными 24.10 апстримными ссылками, найдено %',
            n_expected;
    end if;

    select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%'),
           count(*) filter (where media_url like '%free-exercise-db%'),
           count(*)
      into n_ours, n_upstream, n_total
      from public.exercises;

    if n_ours <> 56 or n_upstream <> 764 or n_total <> 825 then
        raise exception
            'repoint aborted: счётчики сдвинулись (our_host %, upstream %, total %), сверку 24.10 56/764/825 перечитать',
            n_ours, n_upstream, n_total;
    end if;

    raise notice 'repoint guard ok: 5 строк на апстриме, our_host 56, upstream 764, total 825';
end
$$;

-- 1. Подтягивания широким хватом (Wide-Grip Pull-Up)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Wide-Grip_Pull-Up/00f.jpg'
 where id = 'e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4';

-- 2. Планка на локтях (Plank)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Plank/00f.jpg'
 where id = '99e41686-535c-4315-b076-ec7a1adc5a6a';

-- 3. Ягодичный мостик на полу (Butt Lift (Bridge)) — имя папки с круглыми скобками,
--    URL после пуша проверять отдельным curl'ом, а не по шаблону.
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Butt_Lift_(Bridge)/00f.jpg'
 where id = '5f214a11-cabc-4155-b73a-1812e0f303e9';

-- 4. Французский жим обратным хватом (Reverse-Grip Barbell Lying Triceps Extension)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Reverse-Grip_Barbell_Lying_Triceps_Extension/00f.jpg'
 where id = 'c557b192-3494-42b7-a703-f1f7ac86b6fb';

-- 5. Подъём на носки в тренажёре для жима ногами (Calf Press On The Leg Press Machine)
update public.exercises
   set media_url = 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/Calf_Press_On_The_Leg_Press_Machine/00f.jpg'
 where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';

-- ПОСЛЕ (ожидается пять новых путей на нашем хосте, статус всех пяти без изменений):
--   select id, name, status, media_url from public.exercises
--    where id in ('e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4','99e41686-535c-4315-b076-ec7a1adc5a6a',
--                 '5f214a11-cabc-4155-b73a-1812e0f303e9','c557b192-3494-42b7-a703-f1f7ac86b6fb',
--                 '19f4f807-e47c-4741-98bd-f940dfd30b92');
--   select count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%') as our_host,
--          count(*) filter (where media_url like '%free-exercise-db%')        as upstream,
--          count(*) filter (where media_url is null)                           as no_media,
--          count(*)                                                            as total
--     from public.exercises;
--   -- счётчики до/после: наш хост 56 → 61, upstream 764 → 759, no_media 5 → 5, total 825
--   -- search_text у всех пяти обязан остаться прежним (триггеры срабатывают только на правку
--   -- name / name_eng / short_name / aliases / muscles / tags / category):
--   select id, search_text from public.exercises where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
--   -- механический матчинг имени папки с name_eng: расхождение у этих строк исчезает, кроме
--   -- «Подтягиваний» (папка Wide-Grip_Pull-Up = name_eng Wide-Grip Pull-Up — тоже сходится)
--
-- РЕВЕРС (полный: возвращаем старый путь и старый updated_at; status и search_text не менялись):
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg', updated_at = '2026-10-09 04:32:53.165963+00' where id = 'e4bcc6ac-eec8-4a7d-a29d-d97a5848f8f4';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg', updated_at = '2026-08-13 09:46:59.371443+00' where id = '99e41686-535c-4315-b076-ec7a1adc5a6a';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg', updated_at = '2026-08-13 09:46:59.371443+00' where id = '5f214a11-cabc-4155-b73a-1812e0f303e9';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Grip_Triceps_Pushdown/0.jpg', updated_at = '2026-10-09 04:32:53.165963+00' where id = 'c557b192-3494-42b7-a703-f1f7ac86b6fb';
--   update public.exercises set media_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/0.jpg', updated_at = '2026-08-19 07:53:46.79256+00' where id = '19f4f807-e47c-4741-98bd-f940dfd30b92';
--
-- Клиентский кеш (src/lib/queryPersistence.ts) держит старый ответ, поэтому в приложении и на вебе
-- новый кадр появится после свежего прогона, а не мгновенно. Файлы уже на хосте: партия лежит в
-- репозитории медиа (коммит 87edf54 в `main`), адреса проверены HEAD-ом 25.10 — переключать ссылку
-- раньше пула файла было бы нельзя, теперь можно. Отдельно: скачанный ранее снимок справочника
-- (src/lib/exerciseSnapshot.ts) держит старые адреса кадров, версия снимка поднята до 2, так что
-- первый старт после применения перетянет справочник заново.
