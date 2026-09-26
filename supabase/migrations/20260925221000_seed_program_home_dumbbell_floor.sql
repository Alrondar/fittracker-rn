-- seed_program_home_dumbbell_floor: «Домашняя. Гантели и пол» (готовая/seeded)
-- По скиллу .cursor/skills/program-seeding.
-- Дыра: минимальный footprint существующего каталога — 6 позиций (StrongLifts: штанга +
-- силовая рама + стойки + скамья), остальные программы 14–21. При этом каталог держит
-- 142 упражнения «Пол», 117 «Гантели», 37 «Фитнес-резинки», 21 «Турник».
-- Фильтра по оборудованию в UI нет (решение пользователя 25.09: «пока без фильтров»),
-- поэтому оборудование заявлено прямо в названии и описании.
-- beginner, 3 дня (Пн/Ср/Пт), 8 нед: Адаптация 4 → Техника 3 → Дилоуд 1.
-- Все упражнения — status='approved' и оборудование только {Гантели, Пол, Турник,
-- Фитнес-резинки}. Тайминг-упражнений нет (планка заменена на «Мёртвый жук»: у
-- приложения нет концепции timed-упражнений — FD-SEED-2a).

insert into programs (id, name, level, duration, description, schedule, created_by)
values ('b3000000-0000-4000-8000-000000000001',
        'Домашняя. Гантели и пол', 'beginner', 8,
        'Три тренировки в неделю дома: нужны только гантели, коврик, турник и резинка — штанга, скамья и тренажеры не используются вообще. Четыре недели входим в режим, три ставим технику на 6–8 повторениях, последняя неделя разгрузочная. Каждое движение делаем медленно и под контролем: дома веса меньше, поэтому качество повторения решает. Сессия 30–40 минут.',
        array['Пн','Ср','Пт'], null);

-- ===== Фаза 1. Адаптация (недели 1–4) =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b3000000-0000-4000-8000-000000000001', 1, 'Адаптация', 'hypertrophy', 4, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b3000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Дома A'),(2,'Дома B'),(3,'Дома C')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       -- [RPE-3] канон RPE-2: аксессуар (low) -> 9, база/подсобка -> 8.
       -- ВАЖНО: тип фазы здесь литерал, а не join program_phases — основной запрос
       -- не видит строки, вставленные data-modifying CTE в ту же таблицу.
       case when e.intensity = 'low' then 9 else 8 end
  from dy d
  join (values
    ('Дома A','Приседания с гантелями',3,'12',90,'medium',1),
    ('Дома A','Жим гантелей лежа на полу',3,'10-12',90,'medium',2),
    ('Дома A','Тяга гантелей в наклоне нейтральным хватом',3,'10-12',90,'medium',3),
    ('Дома A','Отведение ноги в сторону с резинкой',3,'15',45,'low',4),
    ('Дома A','Мёртвый жук',3,'10-12',45,'low',5),
    ('Дома B','Выпады с гантелями',3,'10',90,'medium',1),
    ('Дома B','Подтягивания',3,'6-8',120,'high',2),
    ('Дома B','Попеременный жим гантелей стоя',3,'10-12',90,'medium',3),
    ('Дома B','Ягодичный мостик на одной ноге',3,'10-12',60,'medium',4),
    ('Дома B','Скручивания велосипед',3,'15-20',45,'low',5),
    ('Дома C','Приседания с фитнес-резинками',3,'12-15',60,'low',1),
    ('Дома C','Отжимания от пола',3,'10-12',90,'medium',2),
    ('Дома C','Разведение рук с резинкой (Pull Apart)',3,'15',45,'low',3),
    ('Дома C','Болгарские выпады с гантелями',3,'10',90,'medium',4),
    ('Дома C','Подтягивание коленей к груди лежа',3,'12',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 2. Техника (недели 5–7): меньше повторений, медленнее темп =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b3000000-0000-4000-8000-000000000001', 2, 'Техника', 'strength', 3, 2)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b3000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Дома A'),(2,'Дома B'),(3,'Дома C')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       -- [RPE-3] канон RPE-2: аксессуар (low) -> 9, база/подсобка -> 8.
       -- ВАЖНО: тип фазы здесь литерал, а не join program_phases — основной запрос
       -- не видит строки, вставленные data-modifying CTE в ту же таблицу.
       case when e.intensity = 'low' then 9 else 8 end
  from dy d
  join (values
    ('Дома A','Приседания с гантелями',4,'6-8',120,'high',1),
    ('Дома A','Жим гантелей лежа на полу',4,'6-8',120,'high',2),
    ('Дома A','Тяга гантелей в наклоне нейтральным хватом',4,'8-10',120,'medium',3),
    ('Дома A','Отведение ноги в сторону с резинкой',2,'15',45,'low',4),
    ('Дома A','Мёртвый жук',2,'10-12',45,'low',5),
    ('Дома B','Выпады с гантелями',3,'6-8',120,'high',1),
    ('Дома B','Подтягивания',4,'5-6',150,'high',2),
    ('Дома B','Попеременный жим гантелей стоя',3,'6-8',120,'medium',3),
    ('Дома B','Ягодичный мостик на одной ноге',3,'8-10',90,'medium',4),
    ('Дома B','Скручивания велосипед',2,'15-20',45,'low',5),
    ('Дома C','Приседания с фитнес-резинками',2,'12-15',60,'low',1),
    ('Дома C','Отжимания от пола',4,'6-8',120,'high',2),
    ('Дома C','Разведение рук с резинкой (Pull Apart)',3,'12',45,'low',3),
    ('Дома C','Болгарские выпады с гантелями',3,'6-8',120,'medium',4),
    ('Дома C','Подтягивание коленей к груди лежа',2,'12',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 3. Дилоуд (неделя 8) =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b3000000-0000-4000-8000-000000000001', 3, 'Дилоуд', 'deload', 1, 3)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b3000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Дома A'),(2,'Дома B'),(3,'Дома C')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       6 -- [RPE-3] фаза deload: целевой RPE 6 по всей фазе (канон RPE-2)
  from dy d
  join (values
    ('Дома A','Приседания с гантелями',2,'12',90,'low',1),
    ('Дома A','Жим гантелей лежа на полу',2,'12',90,'low',2),
    ('Дома A','Тяга гантелей в наклоне нейтральным хватом',2,'12',90,'low',3),
    ('Дома A','Отведение ноги в сторону с резинкой',2,'15',45,'low',4),
    ('Дома A','Мёртвый жук',2,'10',45,'low',5),
    ('Дома B','Выпады с гантелями',2,'10',90,'low',1),
    ('Дома B','Подтягивания',2,'6',120,'low',2),
    ('Дома B','Попеременный жим гантелей стоя',2,'10',90,'low',3),
    ('Дома B','Ягодичный мостик на одной ноге',2,'10',60,'low',4),
    ('Дома B','Скручивания велосипед',2,'15',45,'low',5),
    ('Дома C','Приседания с фитнес-резинками',2,'12',60,'low',1),
    ('Дома C','Отжимания от пола',2,'10',90,'low',2),
    ('Дома C','Разведение рук с резинкой (Pull Apart)',2,'15',45,'low',3),
    ('Дома C','Болгарские выпады с гантелями',2,'10',90,'low',4),
    ('Дома C','Подтягивание коленей к груди лежа',2,'12',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;
