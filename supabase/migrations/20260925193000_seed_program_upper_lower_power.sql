-- seed_program_upper_lower_power: готовая (seeded) программа «Upper/Lower — Сила»
-- Сгенерирована по скиллу .cursor/skills/program-seeding (workflow, шаблон, валидация).
-- level advanced, 4 дня/нед, 8 нед: Сила (4) -> Гипертрофия (3) -> Дилоуд (1, объём ~-30%).
-- Инварианты: created_by IS NULL; у каждого дня заполнен phase_id; exercise_name 1-в-1
-- из exercises (см. validate-запрос перед применением); ids заданы явно -> откат точечный.

insert into programs (id, name, level, duration, description, schedule, created_by)
values ('f1f20000-0000-4000-8000-000000000001',
        'Upper/Lower — Сила', 'advanced', 8,
        'Четыре тренировки в неделю по схеме верх/низ. Первые четыре недели — тяжёлые базовые движения на 3-6 повторов, затем три недели гипертрофии на блоках и гантелях, восьмая неделя — разгрузка. Подходит при наличии штанги, скамьи, тяги и стойки.',
        array['Пн','Вт','Чт','Пт'], null);

-- ============ Фаза 1. Сила (недели 1-4) ============
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'f1f20000-0000-4000-8000-000000000001', 1, 'Сила', 'strength', 4, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'f1f20000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Верх A'),(2,'Низ A'),(3,'Верх B'),(4,'Низ B')) d(num,name) on true
  returning id, name
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord)
  from dy d
  join (values
    ('Верх A','Жим штанги лежа на горизонтальной скамье',5,'4-6',240,'high',1),
    ('Верх A','Тяга штанги в наклоне',5,'4-6',180,'high',2),
    ('Верх A','Жим штанги стоя (армейский жим)',4,'6-8',150,'medium',3),
    ('Верх A','Подтягивания широким хватом',4,'6-8',120,'medium',4),
    ('Верх A','Махи гантелями в стороны стоя',3,'10-12',90,'low',5),
    ('Верх A','Подъем штанги на бицепс стоя',3,'8-10',90,'low',6),
    ('Верх A','Разгибание рук на верхнем блоке (канат)',3,'10-12',90,'low',7),
    ('Низ A','Приседания со штангой на плечах',5,'4-6',240,'high',1),
    ('Низ A','Румынская тяга со штангой',4,'6-8',180,'medium',2),
    ('Низ A','Жим ногами в тренажёре',4,'8-10',150,'medium',3),
    ('Низ A','Сгибание ног лежа',3,'10-12',90,'low',4),
    ('Низ A','Подъем на носки стоя',4,'10-12',60,'low',5),
    ('Низ A','Планка на локтях (классическая)',3,'60',60,'low',6),
    ('Верх B','Жим гантелей лежа на горизонтальной скамье',4,'6-8',180,'medium',1),
    ('Верх B','Тяга гантели одной рукой в наклоне',4,'8-10',150,'medium',2),
    ('Верх B','Жим гантелей сидя',4,'8-10',120,'medium',3),
    ('Верх B','Тяга верхнего блока к груди широким хватом',4,'8-10',120,'medium',4),
    ('Верх B','Махи гантелями в наклоне',3,'12-15',60,'low',5),
    ('Верх B','Скручивания на полу',3,'15-20',60,'low',6),
    ('Низ B','Фронтальные приседания',4,'6-8',180,'high',1),
    ('Низ B','Болгарские выпады',3,'10',120,'medium',2),
    ('Низ B','Сведение ног в тренажере',3,'12-15',60,'low',3),
    ('Низ B','Сгибание ног сидя',3,'12-15',60,'low',4),
    ('Низ B','Подъем на носки сидя',4,'12-15',60,'low',5),
    ('Низ B','Планка на локтях (классическая)',3,'60',60,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ============ Фаза 2. Гипертрофия (недели 5-7) ============
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'f1f20000-0000-4000-8000-000000000001', 2, 'Гипертрофия', 'hypertrophy', 3, 2)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'f1f20000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Верх A'),(2,'Низ A'),(3,'Верх B'),(4,'Низ B')) d(num,name) on true
  returning id, name
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord)
  from dy d
  join (values
    ('Верх A','Жим гантелей лежа на горизонтальной скамье',4,'8-10',120,'medium',1),
    ('Верх A','Тяга горизонтального блока к поясу в кроссовере',4,'10-12',90,'medium',2),
    ('Верх A','Жим гантелей сидя',4,'10-12',90,'medium',3),
    ('Верх A','Тяга верхнего блока к груди широким хватом',4,'10-12',90,'medium',4),
    ('Верх A','Махи гантелями в стороны сидя',3,'12-15',60,'low',5),
    ('Верх A','Подъем штанги на бицепс стоя',3,'10-12',60,'low',6),
    ('Низ A','Жим ногами в тренажёре',4,'10-12',120,'medium',1),
    ('Низ A','Выпады с гантелями',3,'10',90,'medium',2),
    ('Низ A','Сгибание ног сидя',3,'12-15',60,'low',3),
    ('Низ A','Сведение ног в тренажере',3,'15',60,'low',4),
    ('Низ A','Подъем на носки стоя',4,'15',45,'low',5),
    ('Верх B','Жим штанги лежа на горизонтальной скамье',4,'8-10',120,'medium',1),
    ('Верх B','Подтягивания широким хватом',4,'max',90,'medium',2),
    ('Верх B','Тяга гантели одной рукой в наклоне',4,'10-12',90,'medium',3),
    ('Верх B','Махи гантелями в наклоне',3,'12-15',60,'low',4),
    ('Верх B','Разгибание рук на верхнем блоке (канат)',3,'12-15',60,'low',5),
    ('Низ B','Приседания со штангой на плечах',4,'8',150,'medium',1),
    ('Низ B','Румынская тяга со штангой',4,'10',120,'medium',2),
    ('Низ B','Болгарские выпады',3,'12',90,'medium',3),
    ('Низ B','Сгибание ног лежа',3,'12-15',60,'low',4),
    ('Низ B','Скручивания на полу',3,'20',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ============ Фаза 3. Дилоуд (неделя 8; объём ~-30%, веса не макс.) ============
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'f1f20000-0000-4000-8000-000000000001', 3, 'Дилоуд', 'deload', 1, 3)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'f1f20000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Верх A'),(2,'Низ A'),(3,'Верх B'),(4,'Низ B')) d(num,name) on true
  returning id, name
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord)
  from dy d
  join (values
    ('Верх A','Жим штанги лежа на горизонтальной скамье',3,'8',120,'low',1),
    ('Верх A','Тяга верхнего блока к груди широким хватом',3,'10',90,'low',2),
    ('Верх A','Жим гантелей сидя',2,'10',90,'low',3),
    ('Низ A','Жим ногами в тренажёре',3,'10',120,'low',1),
    ('Низ A','Сгибание ног сидя',2,'12',60,'low',2),
    ('Низ A','Подъем на носки стоя',2,'12',45,'low',3),
    ('Верх B','Жим гантелей лежа на горизонтальной скамье',3,'8',120,'low',1),
    ('Верх B','Тяга горизонтального блока к поясу в кроссовере',3,'10',90,'low',2),
    ('Верх B','Махи гантелями в стороны сидя',2,'12',60,'low',3),
    ('Низ B','Фронтальные приседания',3,'8',120,'low',1),
    ('Низ B','Выпады с гантелями',2,'10',90,'low',2),
    ('Низ B','Скручивания на полу',2,'15',45,'low',3)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;
