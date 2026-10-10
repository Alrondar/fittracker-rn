-- 20261010180000_media_url_gendered_frames_wave1.sql
--
-- ЗАЧЕМ. Волна 1 справочника перерисовала 38 позиций в четыре рамки
-- 00f/01f (женщина) и 00m/01m (мужчина), но media_url у всех 37 из них (без
-- Reverse Grip Bent-Over Rows — там мужская пара ещё не принята) по-прежнему
-- ведёт на `<папка>/0.jpg`. Пока ссылка на легаси-имени, приложение физически не
-- может показать мужской вариант: `parseMediaUrls` достраивает пару из имени в URL
-- (src/utils/mediaScheme.ts), а не из наличия файлов на диске.
--
-- Симптом владельца 10.10: «менял пол на мужской и женский — во многих
-- упражнениях выводит только женский вариант, хотя мужской точно есть». Для 16
-- позиций на нашем хосте под именем `0.jpg` лежит НАШ ЖЕНСКИЙ рендер (замер
-- 10.10: md5 хостового Machine_Hip_Thrust/0.jpg == md5 локального 00f.jpg, как и
-- Clamshell) — поэтому при любом поле показывается женщина.
--
-- ЧТО ДЕЛАЕТ. 37 строк: media_url -> https://raw.githubusercontent.com/
-- Alrondar/fittracker-rn/main/data/exercises/<папка>/00f.jpg. Папка берётся там,
-- где реально лежат наши кадры, а не из старого URL: у трёх позиций старый URL
-- вёл на другое имя (Cable Glute Kickback On Bench -> High_Cable_Hip_Abduction,
-- Cross Over - With Bands -> Cross_Over_-With_Bands, Dumbbell Fly ->
-- Dumbbell_Flyes). Условие `~ '/0\.jpg$'` не даёт перезаписать строку, которую
-- кто-то поправил руками на произвольный источник.
--
-- ПОРЯДОК. Применять ТОЛЬКО после пуша кадров. До пуша `00f.jpg` на хосте = 404
-- (замер 10.10 по шести позициям), и миграция повесила бы пустой бокс вместо
-- работающего легаси. Проверка перед применением:
--   python spark-output/export/check-media-names.py --http
-- (жёстких быть не должно; скрипт требует обе гендерные пары у позиции на новой
-- схеме — иначе профиль «мужчина» ушёл бы в 404).
--
-- BLAST RADIUS. Только `exercises.media_url`, 37 строк из 825. У поля нет
-- foreign key и оно нигде не участвует в выборках/JOIN — `program_exercises` и
-- `workout_exercises` ссылаются на `exercises.id`, а не на URL, поэтому
-- тренировки и программы не затронуты. Кэш карточек — RQ, обновится при следующем
-- заходе. `updated_at` не трогаем (у поля он и не висит).
--
-- ПОСЛЕ. Девять восстановленных легаси-пар (Clamshell, Bent-Over T-Raise,
-- Incline Y-Raise, One-Arm Cable Lateral Raise, Wide-Grip Barbell Upright Row,
-- Alternating Lateral Raise with Pause, B-Stance Dumbbell Romanian Deadlift,
-- Dumbbell Romanian Deadlift, Single-Leg Hip Thrust) и семь прежних our-host
-- файлов становятся невостребованными — снимаются следующим коммитом.
--
-- РЕВЕРС — в конце файла.

update exercises e
   set media_url = v.new_url
  from (values
    ('Alternating Lateral Raise with Pause',      'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Alternating_Lateral_Raise_with_Pause/00f.jpg'),
    ('B-Stance Dumbbell Romanian Deadlift',       'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/B-Stance_Dumbbell_Romanian_Deadlift/00f.jpg'),
    ('Band Good Morning',                         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Band_Good_Morning/00f.jpg'),
    ('Barbell Bench Press - Medium Grip',         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Barbell_Bench_Press_-_Medium_Grip/00f.jpg'),
    ('Barbell Hip Thrust',                        'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Barbell_Hip_Thrust/00f.jpg'),
    ('Barbell Squat',                             'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Barbell_Squat/00f.jpg'),
    ('Bent Over Barbell Row',                     'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Bent_Over_Barbell_Row/00f.jpg'),
    ('Bent-Over T-Raise',                         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Bent-Over_T-Raise/00f.jpg'),
    ('Cable Crossover',                           'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cable_Crossover/00f.jpg'),
    ('Cable Glute Kickback On Bench',             'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cable_Glute_Kickback_On_Bench/00f.jpg'),
    ('Cable Hip Extension at 45 Degrees',         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cable_Hip_Extension_at_45_Degrees/00f.jpg'),
    ('Clamshell',                                 'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Clamshell/00f.jpg'),
    ('Close-Grip Standing Barbell Curl',          'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Close-Grip_Standing_Barbell_Curl/00f.jpg'),
    ('Cross Over - With Bands',                   'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cross_Over_-_With_Bands/00f.jpg'),
    ('Dumbbell Bench Press',                      'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Bench_Press/00f.jpg'),
    ('Dumbbell Bicep Curl',                       'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Bicep_Curl/00f.jpg'),
    ('Dumbbell Fly',                              'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Fly/00f.jpg'),
    ('Dumbbell Hip Thrust',                       'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Hip_Thrust/00f.jpg'),
    ('Dumbbell Romanian Deadlift',                'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Romanian_Deadlift/00f.jpg'),
    ('Hammer Curls',                              'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Hammer_Curls/00f.jpg'),
    ('Incline Y-Raise',                           'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Incline_Y-Raise/00f.jpg'),
    ('Low Cable Hip Abduction',                   'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Low_Cable_Hip_Abduction/00f.jpg'),
    ('Machine Hip Thrust',                        'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Machine_Hip_Thrust/00f.jpg'),
    ('One-Arm Cable Lateral Raise',               'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/One-Arm_Cable_Lateral_Raise/00f.jpg'),
    ('One-Arm Dumbbell Row',                      'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/One-Arm_Dumbbell_Row/00f.jpg'),
    ('Pullups',                                   'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Pullups/00f.jpg'),
    ('Pushups',                                   'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Pushups/00f.jpg'),
    ('Romanian Deadlift',                         'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Romanian_Deadlift/00f.jpg'),
    ('Rotational Romanian Deadlift',              'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Rotational_Romanian_Deadlift/00f.jpg'),
    ('Single-Leg Hip Thrust',                     'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Single-Leg_Hip_Thrust/00f.jpg'),
    ('Smith Machine Hip Thrust',                  'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Smith_Machine_Hip_Thrust/00f.jpg'),
    ('Standing Biceps Cable Curl',                'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Standing_Biceps_Cable_Curl/00f.jpg'),
    ('Standing One-Arm Cable Curl',               'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Standing_One-Arm_Cable_Curl/00f.jpg'),
    ('Straight-Arm Pulldown',                     'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Straight-Arm_Pulldown/00f.jpg'),
    ('Wide Stance Stiff Legs',                    'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Wide_Stance_Stiff_Legs/00f.jpg'),
    ('Wide-Grip Barbell Upright Row',             'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Wide-Grip_Barbell_Upright_Row/00f.jpg'),
    ('Wide-Grip Lat Pulldown',                    'https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Wide-Grip_Lat_Pulldown/00f.jpg')
  ) as v(name_eng, new_url)
 where e.name_eng = v.name_eng
   and e.media_url ~ '/0\.jpg$';

-- РЕВЕРС (снимает миграцию; применять вместе с возвратом легаси-файлов в репозиторий,
-- если те уже удалены следующим коммитом):
--
-- update exercises e set media_url = v.old_url
--   from (values
--     ('Alternating Lateral Raise with Pause','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Alternating_Lateral_Raise_with_Pause/0.jpg'),
--     ('B-Stance Dumbbell Romanian Deadlift','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/B-Stance_Dumbbell_Romanian_Deadlift/0.jpg'),
--     ('Band Good Morning','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Good_Morning/0.jpg'),
--     ('Barbell Bench Press - Medium Grip','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg'),
--     ('Barbell Hip Thrust','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg'),
--     ('Barbell Squat','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg'),
--     ('Bent Over Barbell Row','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg'),
--     ('Bent-Over T-Raise','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Bent-Over_T-Raise/0.jpg'),
--     ('Cable Crossover','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg'),
--     ('Cable Glute Kickback On Bench','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/High_Cable_Hip_Abduction/0.jpg'),
--     ('Cable Hip Extension at 45 Degrees','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Cable_Hip_Extension_at_45_Degrees/0.jpg'),
--     ('Clamshell','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Clamshell/0.jpg'),
--     ('Close-Grip Standing Barbell Curl','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Standing_Barbell_Curl/0.jpg'),
--     ('Cross Over - With Bands','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cross_Over_-With_Bands/0.jpg'),
--     ('Dumbbell Bench Press','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg'),
--     ('Dumbbell Bicep Curl','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg'),
--     ('Dumbbell Fly','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg'),
--     ('Dumbbell Hip Thrust','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Hip_Thrust/0.jpg'),
--     ('Dumbbell Romanian Deadlift','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Dumbbell_Romanian_Deadlift/0.jpg'),
--     ('Hammer Curls','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg'),
--     ('Incline Y-Raise','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Incline_Y-Raise/0.jpg'),
--     ('Low Cable Hip Abduction','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Low_Cable_Hip_Abduction/0.jpg'),
--     ('Machine Hip Thrust','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Machine_Hip_Thrust/0.jpg'),
--     ('One-Arm Cable Lateral Raise','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/One-Arm_Cable_Lateral_Raise/0.jpg'),
--     ('One-Arm Dumbbell Row','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg'),
--     ('Pullups','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg'),
--     ('Pushups','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg'),
--     ('Romanian Deadlift','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg'),
--     ('Rotational Romanian Deadlift','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Rotational_Romanian_Deadlift/0.jpg'),
--     ('Single-Leg Hip Thrust','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Single-Leg_Hip_Thrust/0.jpg'),
--     ('Smith Machine Hip Thrust','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Smith_Machine_Hip_Thrust/0.jpg'),
--     ('Standing Biceps Cable Curl','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg'),
--     ('Standing One-Arm Cable Curl','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_One-Arm_Cable_Curl/0.jpg'),
--     ('Straight-Arm Pulldown','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg'),
--     ('Wide Stance Stiff Legs','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide_Stance_Stiff_Legs/0.jpg'),
--     ('Wide-Grip Barbell Upright Row','https://raw.githubusercontent.com/Alrondar/fittracker-rn/main/data/exercises/Wide-Grip_Barbell_Upright_Row/0.jpg'),
--     ('Wide-Grip Lat Pulldown','https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg')
--   ) as v(name_eng, old_url)
--  where e.name_eng = v.name_eng;
