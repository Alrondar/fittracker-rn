-- 20261011120000_media_url_gendered_frames_wave1_batch8.sql
--
-- ЗАЧЕМ. Партия 8 (ноги/квадрицепс) и принятая мужская пара тяги обратным
-- хватом — последние пять позиций волны 1, у которых `media_url` всё ещё ведёт на
-- апстримное `<папка>/0.jpg`. Пока ссылка на легася-имени, приложение физически не
-- может показать мужской вариант: `parseMediaUrls` достраивает пару из имени в URL
-- (src/utils/mediaScheme.ts), а не из наличия файлов на диске. Все четыре рамки
-- (`00f/01f/00m/01m`) этих позиций уже лежат в репозитории (коммиты `690538e`,
-- `42a3752`) и запушены.
--
-- ПОРЯДОК СОБЛЮДЁН. Пуш -> проверка, что новое имя отдаётся 200 -> миграция ->
-- снятие легаси следующим коммитом. Замер 10.11 после пуша `ea20bd1`:
-- 20 из 20 URL (`<папка>/{00f,01f,00m,01m}.jpg` на Alrondar/fittracker-rn/main)
-- вернули 200, включая мужские — иначе профиль «мужчина» ушёл бы в 404.
-- Дополнительно: `python spark-output/export/check-media-names.py --http` по этим
-- пяти позициям — расхождений 0, жёстких ошибок нет.
--
-- ЧТО ДЕЛАЕТ. Пять строк: media_url ->
-- https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/
-- <папка>/00f.jpg. Условие `~ '/0\.jpg$'` не даёт перезаписать строку, которую
-- кто-то поправил руками на произвольный источник.
--
-- BLAST RADIUS. Только `exercises.media_url`, 5 строк из 825. Затрагиваемые
-- позиции и их трафик (счётчики показаны для оценки видимости, а не для правок —
-- `program_exercises` и `workout_exercises` ссылаются на `exercises.id`, а не на
-- URL, поэтому ни одна тренировка, программа или связь не меняется):
--   Leg Press                     40 программ / 70 записей тренировок / 52 связи
--   Split Squat with Dumbbells    29 / 10 / 29
--   Dumbbell Lunges               25 / 40 / 14
--   Dumbbell Squat                 8 /  0 /  7
--   Reverse Grip Bent-Over Rows    0 /  0 /  8
-- Итого карточек, где сменится картинка: 102 строки в программах, 120 в
-- журналах тренировок. У поля нет foreign key и оно не участвует в JOIN.
-- Кэш карточек — RQ, обновится при следующем заходе. `updated_at` не трогаем.
--
-- ПОСЛЕ. Легаси `0.jpg`/`1.jpg` этих пяти папок становятся невостребованными —
-- снимаются следующим коммитом (не в этой миграции: до пуша удаления карточки
-- живут с пустым боксом).
--
-- РЕВЕРС — в конце файла.

update exercises e
   set media_url = v.new_url
  from (values
    ('Dumbbell Squat',              'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Squat/00f.jpg'),
    ('Dumbbell Lunges',             'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Lunges/00f.jpg'),
    ('Split Squat with Dumbbells',  'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Split_Squat_with_Dumbbells/00f.jpg'),
    ('Leg Press',                   'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Leg_Press/00f.jpg'),
    ('Reverse Grip Bent-Over Rows', 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Reverse_Grip_Bent-Over_Rows/00f.jpg')
  ) as v(name_eng, new_url)
 where e.name_eng = v.name_eng
   and e.media_url ~ '/0\.jpg$';

-- РЕВЕРС (снимает миграцию; применять вместе с возвратом легаси-файлов в репозиторий,
-- если те уже удалены следующим коммитом):
--
-- update exercises e set media_url = v.old_url
--   from (values
--     ('Dumbbell Squat','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Squat/0.jpg'),
--     ('Dumbbell Lunges','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg'),
--     ('Split Squat with Dumbbells','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg'),
--     ('Leg Press','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg'),
--     ('Reverse Grip Bent-Over Rows','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Grip_Bent-Over_Rows/0.jpg')
--   ) as v(name_eng, old_url)
--  where e.name_eng = v.name_eng;
