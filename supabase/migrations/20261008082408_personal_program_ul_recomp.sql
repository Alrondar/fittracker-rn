-- Личная программа «Upper/Lower — Силовая рекомпозиция» для пользователя
-- 6416429a-10ef-4e35-ab2f-6c405ee4b283 (created_by = владелец → попадёт в «Мои программы»,
-- а не в каталог ready). Источник — JSON от владельца от 08.10.2026.
--
-- Инварианты (program-seeding):
--   * duration 8 = weeks_count 4 + 3 + 1
--   * у КАЖДОГО дня заполнен phase_id (иначе create_workouts_for_program молча не скопирует)
--   * дни каждой фазы — отдельные строки program_days
--   * exercise_name 1-в-1 из exercises.name (каталог смешан по «ё/е»), exercise_id из каталога
--   * reps_range через дефис; intensity ∈ low|medium|high; target_rpe 1..10
--   * phase_id заданы литералами, вставку не перечитываем в том же операторе
--   * прогрессия: linear | double_progression (движок реализует обе)
--
-- Объём по фазам (рабочие подходы/нед): фаза 1 = 81, фаза 2 = 82, фаза 3 = 46 (−43%).
-- Откат: см. DELETE-блок в конце файла (выполнять только если программа не запускалась).

-- === шаг 0: программа ===
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
values ('7f3c1a90-0000-4000-8000-000000000001',
        'Upper/Lower — Силовая рекомпозиция', 'intermediate', 8,
        '4-дневный сплит с акцентом на верх тела и одним убойным днём ног. Классическая периодизация: гипертрофия → сила → дилоуд.',
        array['Пн','Вт','Чт','Пт'],
        '6416429a-10ef-4e35-ab2f-6c405ee4b283', null);

-- === шаг 1: фазы (литеральные id) ===
insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
values
  ('7f3c1a90-0000-4000-8000-000000000101','7f3c1a90-0000-4000-8000-000000000001',1,'Гипертрофия','hypertrophy',4,
   'Накопление объёма, работа в диапазоне 8-12 повторений, подготовка связок и ЦНС к тяжёлым весам.',1),
  ('7f3c1a90-0000-4000-8000-000000000102','7f3c1a90-0000-4000-8000-000000000001',2,'Сила','strength',3,
   'Развитие максимальной силы. Снижение объёма, повышение интенсивности, работа в диапазоне 4-6 повторений.',2),
  ('7f3c1a90-0000-4000-8000-000000000103','7f3c1a90-0000-4000-8000-000000000001',3,'Дилоуд','deload',1,
   'Активное восстановление. Снижение объёма на 40-50%, работа с лёгкими весами, RPE 6.',3);

-- === шаг 2: дни фазы 1 (phase_id — литерал) ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000101',1,1,'Push',1),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000101',1,2,'Pull',2),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000101',1,3,'Legs',3),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000101',1,4,'Upper',4);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    -- day, exercise_name, sets, reps, rest, intensity, target_rpe, progression_policy, ord
    ('Push','Жим штанги лежа на горизонтальной скамье',4,'6-10',120,'high',8,'double_progression',1),
    ('Push','Жим штанги на наклонной скамье (30–45°)',3,'8-12',90,'high',8,'double_progression',2),
    ('Push','Отжимания на брусьях (акцент грудь)',3,'8-12',90,'medium',8,'double_progression',3),
    ('Push','Махи гантелями в стороны стоя',4,'12-15',60,'medium',9,'linear',4),
    ('Push','Разгибание рук на верхнем блоке (прямая рукоять)',3,'10-12',60,'low',9,'linear',5),
    ('Push','Французский жим EZ-штанги лежа',3,'10-12',60,'low',9,'linear',6),
    ('Pull','Тяга штанги в наклоне',4,'6-8',120,'high',8,'double_progression',1),
    ('Pull','Тяга верхнего блока к груди широким хватом',4,'8-12',90,'high',8,'double_progression',2),
    ('Pull','Пуловер в блоке (Straight-Arm Pulldown)',3,'12-15',60,'medium',8,'linear',3),
    ('Pull','Тяга каната к лицу (Face Pull)',4,'15-20',60,'low',9,'linear',4),
    ('Pull','Подъем штанги на бицепс стоя',3,'10-12',60,'low',9,'linear',5),
    ('Pull','Сгибание рук с гантелями нейтральным хватом (молот)',3,'12-15',60,'low',9,'linear',6),
    ('Legs','Приседания со штангой на плечах',4,'6-10',150,'high',8,'double_progression',1),
    ('Legs','Румынская становая тяга (румынка)',4,'8-12',120,'high',8,'double_progression',2),
    ('Legs','Жим ногами в тренажёре',4,'10-15',90,'high',8,'double_progression',3),
    ('Legs','Сгибание ног сидя',4,'12-15',60,'medium',9,'linear',4),
    ('Legs','Подъем на носки в тренажере для жима ногами',4,'15-20',60,'low',9,'linear',5),
    ('Upper','Жим в тренажере Chest Press',4,'8-12',90,'high',8,'double_progression',1),
    ('Upper','Тяга нижнего блока к поясу сидя',3,'10-12',90,'high',8,'double_progression',2),
    ('Upper','Жим гантелей сидя',3,'10-12',90,'medium',8,'double_progression',3),
    ('Upper','Обратные разведения гантелей в наклоне',4,'15-20',60,'low',9,'linear',4),
    ('Upper','Подъем гантелей на бицепс сидя',3,'10-12',60,'low',9,'linear',5),
    ('Upper','Разгибание рук на трицепс в кроссовере с нижнего блока',3,'12-15',60,'low',9,'linear',6)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000101' and d.name = e.day
  join exercises x on x.name = e.name;

-- === шаг 3: дни фазы 2 ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000102',1,1,'Push',1),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000102',1,2,'Pull',2),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000102',1,3,'Legs',3),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000102',1,4,'Upper',4);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Push','Жим штанги лежа на горизонтальной скамье',5,'4-6',180,'high',8,'linear',1),
    ('Push','Жим штанги на наклонной скамье (30–45°)',4,'6-8',120,'high',8,'linear',2),
    ('Push','Отжимания на брусьях (акцент грудь)',3,'6-10',90,'medium',8,'linear',3),
    ('Push','Махи гантелями в стороны стоя',3,'10-12',60,'medium',8,'linear',4),
    ('Push','Разгибание рук на верхнем блоке (прямая рукоять)',3,'8-10',60,'low',8,'linear',5),
    ('Push','Французский жим EZ-штанги лежа',3,'8-10',60,'low',8,'linear',6),
    ('Pull','Тяга штанги в наклоне',5,'4-6',180,'high',8,'linear',1),
    ('Pull','Тяга верхнего блока к груди широким хватом',4,'6-8',120,'high',8,'linear',2),
    ('Pull','Пуловер в блоке (Straight-Arm Pulldown)',3,'10-12',60,'medium',8,'linear',3),
    ('Pull','Тяга каната к лицу (Face Pull)',3,'12-15',60,'low',8,'linear',4),
    ('Pull','Подъем штанги на бицепс стоя',3,'8-10',60,'low',8,'linear',5),
    ('Pull','Сгибание рук с гантелями нейтральным хватом (молот)',3,'10-12',60,'low',8,'linear',6),
    ('Legs','Приседания со штангой на плечах',5,'4-6',180,'high',8,'linear',1),
    ('Legs','Румынская становая тяга (румынка)',4,'6-8',150,'high',8,'linear',2),
    ('Legs','Жим ногами в тренажёре',4,'8-10',120,'high',8,'linear',3),
    ('Legs','Сгибание ног сидя',3,'10-12',60,'medium',8,'linear',4),
    ('Legs','Подъем на носки в тренажере для жима ногами',4,'12-15',60,'low',8,'linear',5),
    ('Upper','Жим в тренажере Chest Press',4,'6-8',120,'high',8,'linear',1),
    ('Upper','Тяга нижнего блока к поясу сидя',4,'6-8',120,'high',8,'linear',2),
    ('Upper','Жим гантелей сидя',3,'8-10',90,'medium',8,'linear',3),
    ('Upper','Обратные разведения гантелей в наклоне',3,'12-15',60,'low',8,'linear',4),
    ('Upper','Подъем гантелей на бицепс сидя',3,'8-10',60,'low',8,'linear',5),
    ('Upper','Разгибание рук на трицепс в кроссовере с нижнего блока',3,'10-12',60,'low',8,'linear',6)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000102' and d.name = e.day
  join exercises x on x.name = e.name;

-- === шаг 4: дни фазы 3 (Дилоуд) ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000103',1,1,'Push',1),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000103',1,2,'Pull',2),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000103',1,3,'Legs',3),
  ('7f3c1a90-0000-4000-8000-000000000001','7f3c1a90-0000-4000-8000-000000000103',1,4,'Upper',4);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Push','Жим штанги лежа на горизонтальной скамье',2,'10',90,'low',6,'linear',1),
    ('Push','Жим штанги на наклонной скамье (30–45°)',2,'10',90,'low',6,'linear',2),
    ('Push','Отжимания на брусьях (акцент грудь)',2,'10',60,'low',6,'linear',3),
    ('Push','Махи гантелями в стороны стоя',2,'12',60,'low',6,'linear',4),
    ('Push','Разгибание рук на верхнем блоке (прямая рукоять)',2,'12',60,'low',6,'linear',5),
    ('Push','Французский жим EZ-штанги лежа',2,'12',60,'low',6,'linear',6),
    ('Pull','Тяга штанги в наклоне',2,'10',90,'low',6,'linear',1),
    ('Pull','Тяга верхнего блока к груди широким хватом',2,'10',90,'low',6,'linear',2),
    ('Pull','Пуловер в блоке (Straight-Arm Pulldown)',2,'12',60,'low',6,'linear',3),
    ('Pull','Тяга каната к лицу (Face Pull)',2,'15',60,'low',6,'linear',4),
    ('Pull','Подъем штанги на бицепс стоя',2,'12',60,'low',6,'linear',5),
    ('Pull','Сгибание рук с гантелями нейтральным хватом (молот)',2,'12',60,'low',6,'linear',6),
    ('Legs','Приседания со штангой на плечах',2,'10',90,'low',6,'linear',1),
    ('Legs','Румынская становая тяга (румынка)',2,'10',90,'low',6,'linear',2),
    ('Legs','Жим ногами в тренажёре',2,'12',60,'low',6,'linear',3),
    ('Legs','Сгибание ног сидя',2,'12',60,'low',6,'linear',4),
    ('Legs','Подъем на носки в тренажере для жима ногами',2,'15',60,'low',6,'linear',5),
    ('Upper','Жим в тренажере Chest Press',2,'10',90,'low',6,'linear',1),
    ('Upper','Тяга нижнего блока к поясу сидя',2,'10',90,'low',6,'linear',2),
    ('Upper','Жим гантелей сидя',2,'10',90,'low',6,'linear',3),
    ('Upper','Обратные разведения гантелей в наклоне',2,'15',60,'low',6,'linear',4),
    ('Upper','Подъем гантелей на бицепс сидя',2,'12',60,'low',6,'linear',5),
    ('Upper','Разгибание рук на трицепс в кроссовере с нижнего блока',2,'12',60,'low',6,'linear',6)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000103' and d.name = e.day
  join exercises x on x.name = e.name;

-- === откат (выполнять вручную, только если программа не запускалась) ===
-- delete from user_programs where program_id = '7f3c1a90-0000-4000-8000-000000000001';
-- delete from workouts where program_id = '7f3c1a90-0000-4000-8000-000000000001';
-- delete from programs where id = '7f3c1a90-0000-4000-8000-000000000001';  -- каскад снимет фазы/дни/упражнения

-- === проверка ===
-- select ph.phase_number, count(distinct d.id) days, count(pe.id) ex, sum(pe.sets) sets
--   from program_phases ph
--   join program_days d on d.phase_id = ph.id
--   left join program_exercises pe on pe.program_day_id = d.id
--  where ph.program_id = '7f3c1a90-0000-4000-8000-000000000001'
--  group by 1 order by 1;   -- ожидали: 1|4|23|81, 2|4|23|82, 3|4|23|46
-- Факт применения (прод, 08.10.2026): ровно так; no_exid=0, unresolved=0, name_drift=0,
-- no_rpe=0, dup_positions=0, days_wo_phase=0; user_programs/workouts для программы — 0 (не запускалась).
