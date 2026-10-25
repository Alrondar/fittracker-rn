-- 20261025180000_repoint_frames_to_media_repo.sql
-- Кадры техники переезжают в отдельный репозиторий fittracker-exercise-media.
-- В проекте приложения (fittracker-rn) бинарников больше нет, поэтому и адрес
-- навигатора меняется на новое место.
--
-- ПОРЯДОК ОБЯЗАТЕЛЬНЫЙ. Сначала пуш нового репозитория в `main` и проверка, что
-- raw-адрес отдаёт файл (иначе все 56 карточек уйдут в 404), только потом эта
-- миграция. Проверка адреса:
--   curl -sSI https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/<Папка>/00f.jpg
--
-- Тронет ровно те строки, чей адрес указывает на наш прежний хост: 56 позиций
-- (замер 25.10). 764 позиции легаси ведут на yuhonas/free-exercise-db и их не
-- трогаем — мы у них ничего не забираем.
--
-- Счётчики ДО (пробегать перед применением):
--   select count(*) filter (where media_url like '%Alrondar/fittracker-rn%')   as ours,
--          count(*) filter (where media_url like '%Alrondar/fittracker-exercise-media%') as moved,
--          count(*) filter (where media_url like '%yuhonas/free-exercise-db%') as upstream,
--          count(*) filter (where media_url is null or media_url = '')         as no_frame,
--          count(*)                                                            as total
--     from exercises;
--   -- ожидаем: ours 56 · moved 0 · upstream 764 · no_frame 5 · total 825
-- Счётчики ПОСЛЕ: ours 0 · moved 56 · остальные без изменений.
--
-- Почему отдельной колонки версии не пришлось: адрес меняется целиком, а телефон
-- и наше локальное хранилище кадров ключуют кэш по полному адресу — старые байты
-- автоматически становятся неактуальными (src/lib/mediaCache.ts, src/utils/mediaScheme.ts).
--
-- Реверс — обратный replace того же префикса, телом ниже. Строки до правки
-- дампом лежат в spark-output/export/pre-repoint-dump.json (56 записей id/name/
-- media_url, снято 25.10 через PostgREST).
--
-- Явного begin/commit нет: `apply_migration` сам оборачивает миграцию в
-- транзакцию, поэтому самопроверка на шаге 2 откатывает переезд целиком.

-- Шаг 1. Переезд: префикс старого хоста → новый репозиторий, схема имён та же
-- (`exercises/<Папка>/…` вместо `data/exercises/<Папка>/…`).
update exercises
   set media_url = replace(
         media_url,
         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/',
         'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/'
       )
 where media_url like 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/%';

-- Шаг 2. Самопроверка в той же транзакции: если после правки осталась хоть одна
-- строка на старом хосте (в любой форме адреса) или новая сумма не совпала с
-- ожидаемыми 56 — откат.
do $$
declare
  ours   integer;
  moved  integer;
begin
  select count(*) into ours  from exercises
    where media_url like '%Alrondar/fittracker-rn%';
  select count(*) into moved from exercises
    where media_url like '%Alrondar/fittracker-exercise-media/main/exercises/%';
  if ours <> 0 or moved <> 56 then
    raise exception 'переезд кадров не сошёлся: осталось % на старом хосте, переехало % (ожидалось 0 и 56)', ours, moved;
  end if;
end $$;

-- Реверс (выполнять отдельным заходом, счётчики — те же, зеркально):
--   update exercises
--      set media_url = replace(
--            media_url,
--            'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/',
--            'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/'
--          )
--    where media_url like 'https://raw.githubusercontent.com/Alrondar/fittracker-exercise-media/main/exercises/%';
