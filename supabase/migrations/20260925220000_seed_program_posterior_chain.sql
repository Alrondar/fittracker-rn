-- seed_program_posterior_chain: «Задняя цепь и ягодицы» (готовая/seeded программа)
-- Сгенерирована по скиллу .cursor/skills/program-seeding.
-- Дыра в каталоге: hip-dominant программы нет — «Ягодичный мостик со штангой» встречался
-- только в 3 продвинутых сплитах по 3–4 подхода/нед, при 4/7 профилях goal=lose (женский).
-- intermediate, 3 дня (Пн/Ср/Пт), 8 нед: Гипертрофия 5 → Сила 2 → Дилоуд 1.
-- Инварианты: created_by IS NULL; phase_id у каждого дня; имена 1-в-1 из exercises.
-- Целевые метрики: press:pull ≈ 1.0–1.1, posterior(hinge+knee_flexion+lunge) ≥ squat.

insert into programs (id, name, level, duration, description, schedule, created_by)
values ('b1000000-0000-4000-8000-000000000001',
        'Задняя цепь и ягодицы', 'intermediate', 8,
        'Три тренировки в неделю с упором на разгибание бедра и заднюю поверхность: ягодицы и бицепс бедра получают основной объём, quadriceps и верх тела — поддерживающий. Пять недель гипертрофии, две тяжёлые, одна разгрузочная. Нужно: штанга, скамья, гантели, резинка и гиперэкстензия. Работайте за 1–2 повторения до отказа, кроме последних подходов базовых движений.',
        array['Пн','Ср','Пт'], null);

-- ===== Фаза 1. Гипертрофия (недели 1–5) =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b1000000-0000-4000-8000-000000000001', 1, 'Гипертрофия', 'hypertrophy', 5, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b1000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Ягодицы и задняя A'),(2,'Верх и корпус'),(3,'Ноги и ягодицы B')) d(num,name) on true
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
    ('Ягодицы и задняя A','Ягодичный мостик со штангой',4,'8-10',120,'high',1),
    ('Ягодицы и задняя A','Становая тяга на прямых ногах с широкой постановкой',3,'10-12',120,'medium',2),
    ('Ягодицы и задняя A','Сгибание ног лежа',3,'12-15',90,'low',3),
    ('Ягодицы и задняя A','Отведение ноги в сторону с резинкой',3,'15',60,'low',4),
    ('Ягодицы и задняя A','Махи гантелями в стороны стоя',3,'12-15',60,'low',5),
    ('Ягодицы и задняя A','Мёртвый жук',3,'10-12',60,'low',6),
    ('Верх и корпус','Жим гантелей лежа на горизонтальной скамье',3,'10-12',90,'medium',1),
    ('Верх и корпус','Подтягивания',3,'6-8',90,'medium',2),
    ('Верх и корпус','Тяга гантелей в наклоне нейтральным хватом',3,'10-12',90,'medium',3),
    ('Верх и корпус','Жим гантелей сидя',3,'10-12',90,'medium',4),
    ('Верх и корпус','Скручивания на полу',3,'15-20',45,'low',5),
    ('Ноги и ягодицы B','Фронтальные приседания',3,'8-10',120,'high',1),
    ('Ноги и ягодицы B','Болгарские выпады с гантелями',3,'10-12',90,'medium',2),
    ('Ноги и ягодицы B','Гиперэкстензия',3,'12-15',90,'medium',3),
    ('Ноги и ягодицы B','Приседания с гантелями',3,'12',90,'medium',4),
    ('Ноги и ягодицы B','Подъем на носки в тренажере для жима ногами',3,'12-15',60,'low',5),
    ('Ноги и ягодицы B','Ножницы лёжа на животе',3,'12-15',45,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 2. Сила (недели 6–7): базовые тяжелее, аксессуаров меньше =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b1000000-0000-4000-8000-000000000001', 2, 'Сила', 'strength', 2, 2)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b1000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Ягодицы и задняя A'),(2,'Верх и корпус'),(3,'Ноги и ягодицы B')) d(num,name) on true
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
    ('Ягодицы и задняя A','Ягодичный мостик со штангой',5,'5-6',180,'high',1),
    ('Ягодицы и задняя A','Становая тяга на прямых ногах с широкой постановкой',4,'6-8',150,'high',2),
    ('Ягодицы и задняя A','Сгибание ног лежа',3,'8-10',90,'medium',3),
    ('Ягодицы и задняя A','Отведение ноги в сторону с резинкой',2,'15',60,'low',4),
    ('Ягодицы и задняя A','Махи гантелями в стороны стоя',2,'10-12',60,'low',5),
    ('Ягодицы и задняя A','Мёртвый жук',2,'10-12',60,'low',6),
    ('Верх и корпус','Жим гантелей лежа на горизонтальной скамье',4,'6-8',150,'high',1),
    ('Верх и корпус','Подтягивания',4,'6-8',120,'high',2),
    ('Верх и корпус','Тяга гантелей в наклоне нейтральным хватом',4,'8-10',120,'medium',3),
    ('Верх и корпус','Жим гантелей сидя',3,'6-8',120,'medium',4),
    ('Верх и корпус','Скручивания на полу',2,'15-20',45,'low',5),
    ('Ноги и ягодицы B','Фронтальные приседания',4,'5-6',180,'high',1),
    ('Ноги и ягодицы B','Болгарские выпады с гантелями',3,'8-10',120,'medium',2),
    ('Ноги и ягодицы B','Гиперэкстензия',3,'10-12',90,'medium',3),
    ('Ноги и ягодицы B','Приседания с гантелями',2,'10',90,'low',4),
    ('Ноги и ягодицы B','Подъем на носки в тренажере для жима ногами',2,'10-12',60,'low',5),
    ('Ноги и ягодицы B','Ножницы лёжа на животе',2,'12-15',45,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 3. Дилоуд (неделя 8): все движения сохранены, подходы ~−50% =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b1000000-0000-4000-8000-000000000001', 3, 'Дилоуд', 'deload', 1, 3)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b1000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Ягодицы и задняя A'),(2,'Верх и корпус'),(3,'Ноги и ягодицы B')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       6 -- [RPE-3] фаза deload: целевой RPE 6 по всей фазе (канон RPE-2)
  from dy d
  join (values
    ('Ягодицы и задняя A','Ягодичный мостик со штангой',2,'10',120,'low',1),
    ('Ягодицы и задняя A','Становая тяга на прямых ногах с широкой постановкой',2,'10',120,'low',2),
    ('Ягодицы и задняя A','Сгибание ног лежа',2,'12',60,'low',3),
    ('Ягодицы и задняя A','Отведение ноги в сторону с резинкой',2,'15',45,'low',4),
    ('Ягодицы и задняя A','Махи гантелями в стороны стоя',2,'12',45,'low',5),
    ('Ягодицы и задняя A','Мёртвый жук',2,'10',45,'low',6),
    ('Верх и корпус','Жим гантелей лежа на горизонтальной скамье',2,'10',90,'low',1),
    ('Верх и корпус','Подтягивания',2,'6',90,'low',2),
    ('Верх и корпус','Тяга гантелей в наклоне нейтральным хватом',2,'10',90,'low',3),
    ('Верх и корпус','Жим гантелей сидя',2,'10',90,'low',4),
    ('Верх и корпус','Скручивания на полу',2,'12',45,'low',5),
    ('Ноги и ягодицы B','Фронтальные приседания',2,'8',120,'low',1),
    ('Ноги и ягодицы B','Болгарские выпады с гантелями',2,'10',90,'low',2),
    ('Ноги и ягодицы B','Гиперэкстензия',2,'12',90,'low',3),
    ('Ноги и ягодицы B','Приседания с гантелями',2,'12',90,'low',4),
    ('Ноги и ягодицы B','Подъем на носки в тренажере для жима ногами',2,'15',45,'low',5),
    ('Ноги и ягодицы B','Ножницы лёжа на животе',2,'12',45,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;
