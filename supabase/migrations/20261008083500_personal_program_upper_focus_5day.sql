-- Личная программа «Upper Focus 5-Day — Силовая рекомпозиция» для пользователя
-- 6416429a-10ef-4e35-ab2f-6c405ee4b283 (created_by = владелец → «Мои программы»,
-- в каталог ready не попадает). Источник — JSON от владельца от 08.10.2026.
--
-- Инварианты (program-seeding):
--   * duration 8 = weeks_count 4 + 3 + 1
--   * у КАЖДОГО дня заполнен phase_id; дни каждой фазы — отдельные строки
--   * exercise_name 1-в-1 из exercises.name (26 уникальных, unresolved = 0; 6 со status needs_review)
--   * reps_range через дефис; intensity ∈ low|medium|high; target_rpe 6..9; policy linear|double_progression
--   * phase_id — литералы, freshly-inserted таблицы в том же операторе не перечитываем
--
-- Объём (рабочие подходы/нед): фаза 1 = 89, фаза 2 = 95, фаза 3 = 52.
-- Примечание владельца-JSON: описание фазы 2 обещает «снижение объёма», по факту
-- подходов больше, чем в фазе 1 (89 → 95); оставлено как есть, отмечено в отчёте.
--
-- Откат: см. DELETE-блок в конце (только если программа не запускалась).

-- === шаг 0: программа ===
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
values ('7f3c1a90-0000-4000-8000-000000000002',
        'Upper Focus 5-Day — Силовая рекомпозиция', 'intermediate', 8,
        '5-дневный сплит с одним полноценным днем ног и максимальной специализацией на грудь, спину, плечи и руки. Классическая периодизация: гипертрофия → сила → дилоуд.',
        array['Пн','Вт','Ср','Пт','Сб'],
        '6416429a-10ef-4e35-ab2f-6c405ee4b283', null);

-- === шаг 1: фазы ===
insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
values
  ('7f3c1a90-0000-4000-8000-000000000201','7f3c1a90-0000-4000-8000-000000000002',1,'Гипертрофия','hypertrophy',4,
   'Накопление объёма, работа в диапазоне 8-15 повторений, акцент на памп и связь мозг-мышца.',1),
  ('7f3c1a90-0000-4000-8000-000000000202','7f3c1a90-0000-4000-8000-000000000002',2,'Сила','strength',3,
   'Развитие максимальной силы. Снижение объёма, повышение интенсивности, работа в диапазоне 4-8 повторений.',2),
  ('7f3c1a90-0000-4000-8000-000000000203','7f3c1a90-0000-4000-8000-000000000002',3,'Дилоуд','deload',1,
   'Активное восстановление. Снижение объёма на 50%, работа с лёгкими весами, RPE 6.',3);

-- === шаг 2: дни фазы 1 ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000201',1,1,'Chest & Triceps',1),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000201',1,2,'Back & Biceps',2),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000201',1,3,'Legs (Убойный день)',3),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000201',1,4,'Shoulders & Abs',4),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000201',1,5,'Arms & Pump',5);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Chest & Triceps','Жим штанги лежа на горизонтальной скамье',4,'6-10',120,'high',8,'double_progression',1),
    ('Chest & Triceps','Жим штанги на наклонной скамье (30–45°)',3,'8-12',90,'high',8,'double_progression',2),
    ('Chest & Triceps','Разводка в кроссовере (сведение рук)',3,'12-15',60,'low',9,'linear',3),
    ('Chest & Triceps','Французский жим EZ-штанги лежа',3,'10-12',60,'low',9,'linear',4),
    ('Chest & Triceps','Разгибание рук на верхнем блоке (прямая рукоять)',3,'12-15',60,'low',9,'linear',5),
    ('Back & Biceps','Тяга штанги в наклоне',4,'6-8',120,'high',8,'double_progression',1),
    ('Back & Biceps','Тяга верхнего блока к груди широким хватом',4,'8-12',90,'high',8,'double_progression',2),
    ('Back & Biceps','Пуловер в блоке (Straight-Arm Pulldown)',3,'12-15',60,'medium',8,'linear',3),
    ('Back & Biceps','Тяга каната к лицу (Face Pull)',3,'15-20',60,'low',9,'linear',4),
    ('Back & Biceps','Подъем штанги на бицепс стоя',3,'10-12',60,'low',9,'linear',5),
    ('Back & Biceps','Сгибание рук с гантелями нейтральным хватом (молот)',3,'12-15',60,'low',9,'linear',6),
    ('Legs (Убойный день)','Приседания со штангой на плечах',4,'6-10',150,'high',8,'double_progression',1),
    ('Legs (Убойный день)','Румынская становая тяга (румынка)',4,'8-12',120,'high',8,'double_progression',2),
    ('Legs (Убойный день)','Жим ногами в тренажёре',4,'10-15',90,'high',8,'double_progression',3),
    ('Legs (Убойный день)','Сгибание ног сидя',4,'12-15',60,'medium',9,'linear',4),
    ('Legs (Убойный день)','Подъем на носки в тренажере для жима ногами',4,'15-20',60,'low',9,'linear',5),
    ('Shoulders & Abs','Жим гантелей сидя',4,'8-12',90,'high',8,'double_progression',1),
    ('Shoulders & Abs','Махи гантелями в стороны стоя',4,'12-15',60,'medium',9,'linear',2),
    ('Shoulders & Abs','Обратные разведения гантелей в наклоне',4,'15-20',60,'low',9,'linear',3),
    ('Shoulders & Abs','Скручивания на полу',3,'15-20',45,'low',9,'linear',4),
    ('Shoulders & Abs','Подъем ног в висе на турнике',3,'10-15',60,'medium',9,'linear',5),
    ('Arms & Pump','Подъем гантелей на бицепс сидя',3,'10-12',60,'medium',9,'linear',1),
    ('Arms & Pump','Разгибание рук на трицепс в кроссовере с нижнего блока',3,'12-15',60,'low',9,'linear',2),
    ('Arms & Pump','Сгибание рук на бицепс в кроссовере стоя',3,'12-15',60,'low',9,'linear',3),
    ('Arms & Pump','Разгибание рук на верхнем блоке (канат)',3,'12-15',60,'low',9,'linear',4),
    ('Arms & Pump','Махи в кроссовере на среднюю дельту',3,'15-20',45,'low',9,'linear',5)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000201' and d.name = e.day
  join exercises x on x.name = e.name;

-- === шаг 3: дни фазы 2 ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000202',1,1,'Chest & Triceps',1),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000202',1,2,'Back & Biceps',2),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000202',1,3,'Legs (Убойный день)',3),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000202',1,4,'Shoulders & Abs',4),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000202',1,5,'Arms & Pump',5);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Chest & Triceps','Жим штанги лежа на горизонтальной скамье',5,'4-6',180,'high',8,'linear',1),
    ('Chest & Triceps','Жим штанги на наклонной скамье (30–45°)',4,'6-8',120,'high',8,'linear',2),
    ('Chest & Triceps','Разводка в кроссовере (сведение рук)',3,'10-12',60,'medium',8,'linear',3),
    ('Chest & Triceps','Французский жим EZ-штанги лежа',4,'8-10',90,'medium',8,'linear',4),
    ('Chest & Triceps','Разгибание рук на верхнем блоке (прямая рукоять)',3,'10-12',60,'low',8,'linear',5),
    ('Back & Biceps','Тяга штанги в наклоне',5,'4-6',180,'high',8,'linear',1),
    ('Back & Biceps','Тяга верхнего блока к груди широким хватом',4,'6-8',120,'high',8,'linear',2),
    ('Back & Biceps','Пуловер в блоке (Straight-Arm Pulldown)',3,'10-12',60,'medium',8,'linear',3),
    ('Back & Biceps','Тяга каната к лицу (Face Pull)',3,'12-15',60,'low',8,'linear',4),
    ('Back & Biceps','Подъем штанги на бицепс стоя',4,'8-10',60,'medium',8,'linear',5),
    ('Back & Biceps','Сгибание рук с гантелями нейтральным хватом (молот)',3,'10-12',60,'low',8,'linear',6),
    ('Legs (Убойный день)','Приседания со штангой на плечах',5,'4-6',180,'high',8,'linear',1),
    ('Legs (Убойный день)','Румынская становая тяга (румынка)',4,'6-8',150,'high',8,'linear',2),
    ('Legs (Убойный день)','Жим ногами в тренажёре',4,'8-10',120,'high',8,'linear',3),
    ('Legs (Убойный день)','Сгибание ног сидя',3,'10-12',60,'medium',8,'linear',4),
    ('Legs (Убойный день)','Подъем на носки в тренажере для жима ногами',4,'12-15',60,'low',8,'linear',5),
    ('Shoulders & Abs','Жим гантелей сидя',4,'6-8',120,'high',8,'linear',1),
    ('Shoulders & Abs','Махи гантелями в стороны стоя',4,'10-12',60,'medium',8,'linear',2),
    ('Shoulders & Abs','Обратные разведения гантелей в наклоне',3,'12-15',60,'low',8,'linear',3),
    ('Shoulders & Abs','Скручивания на полу',3,'15-20',45,'low',8,'linear',4),
    ('Shoulders & Abs','Подъем ног в висе на турнике',3,'10-15',60,'medium',8,'linear',5),
    ('Arms & Pump','Подъем гантелей на бицепс сидя',4,'8-10',60,'medium',8,'linear',1),
    ('Arms & Pump','Разгибание рук на трицепс в кроссовере с нижнего блока',4,'10-12',60,'low',8,'linear',2),
    ('Arms & Pump','Сгибание рук на бицепс в кроссовере стоя',3,'10-12',60,'low',8,'linear',3),
    ('Arms & Pump','Разгибание рук на верхнем блоке (канат)',3,'10-12',60,'low',8,'linear',4),
    ('Arms & Pump','Махи в кроссовере на среднюю дельту',3,'12-15',45,'low',8,'linear',5)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000202' and d.name = e.day
  join exercises x on x.name = e.name;

-- === шаг 4: дни фазы 3 (Дилоуд) ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000203',1,1,'Chest & Triceps',1),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000203',1,2,'Back & Biceps',2),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000203',1,3,'Legs (Убойный день)',3),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000203',1,4,'Shoulders & Abs',4),
  ('7f3c1a90-0000-4000-8000-000000000002','7f3c1a90-0000-4000-8000-000000000203',1,5,'Arms & Pump',5);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Chest & Triceps','Жим штанги лежа на горизонтальной скамье',2,'10-12',90,'low',6,'linear',1),
    ('Chest & Triceps','Жим штанги на наклонной скамье (30–45°)',2,'10-12',90,'low',6,'linear',2),
    ('Chest & Triceps','Разводка в кроссовере (сведение рук)',2,'12-15',60,'low',6,'linear',3),
    ('Chest & Triceps','Французский жим EZ-штанги лежа',2,'12-15',60,'low',6,'linear',4),
    ('Chest & Triceps','Разгибание рук на верхнем блоке (прямая рукоять)',2,'12-15',60,'low',6,'linear',5),
    ('Back & Biceps','Тяга штанги в наклоне',2,'10-12',90,'low',6,'linear',1),
    ('Back & Biceps','Тяга верхнего блока к груди широким хватом',2,'10-12',90,'low',6,'linear',2),
    ('Back & Biceps','Пуловер в блоке (Straight-Arm Pulldown)',2,'12-15',60,'low',6,'linear',3),
    ('Back & Biceps','Тяга каната к лицу (Face Pull)',2,'15-20',60,'low',6,'linear',4),
    ('Back & Biceps','Подъем штанги на бицепс стоя',2,'12-15',60,'low',6,'linear',5),
    ('Back & Biceps','Сгибание рук с гантелями нейтральным хватом (молот)',2,'12-15',60,'low',6,'linear',6),
    ('Legs (Убойный день)','Приседания со штангой на плечах',2,'10-12',90,'low',6,'linear',1),
    ('Legs (Убойный день)','Румынская становая тяга (румынка)',2,'10-12',90,'low',6,'linear',2),
    ('Legs (Убойный день)','Жим ногами в тренажёре',2,'12-15',60,'low',6,'linear',3),
    ('Legs (Убойный день)','Сгибание ног сидя',2,'12-15',60,'low',6,'linear',4),
    ('Legs (Убойный день)','Подъем на носки в тренажере для жима ногами',2,'15-20',60,'low',6,'linear',5),
    ('Shoulders & Abs','Жим гантелей сидя',2,'10-12',90,'low',6,'linear',1),
    ('Shoulders & Abs','Махи гантелями в стороны стоя',2,'12-15',60,'low',6,'linear',2),
    ('Shoulders & Abs','Обратные разведения гантелей в наклоне',2,'15-20',60,'low',6,'linear',3),
    ('Shoulders & Abs','Скручивания на полу',2,'15-20',45,'low',6,'linear',4),
    ('Shoulders & Abs','Подъем ног в висе на турнике',2,'10-15',60,'low',6,'linear',5),
    ('Arms & Pump','Подъем гантелей на бицепс сидя',2,'12-15',60,'low',6,'linear',1),
    ('Arms & Pump','Разгибание рук на трицепс в кроссовере с нижнего блока',2,'12-15',60,'low',6,'linear',2),
    ('Arms & Pump','Сгибание рук на бицепс в кроссовере стоя',2,'12-15',60,'low',6,'linear',3),
    ('Arms & Pump','Разгибание рук на верхнем блоке (канат)',2,'12-15',60,'low',6,'linear',4),
    ('Arms & Pump','Махи в кроссовере на среднюю дельту',2,'15-20',45,'low',6,'linear',5)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '7f3c1a90-0000-4000-8000-000000000203' and d.name = e.day
  join exercises x on x.name = e.name;

-- === откат (только если программа не запускалась) ===
-- delete from user_programs where program_id = '7f3c1a90-0000-4000-8000-000000000002';
-- delete from workouts where program_id = '7f3c1a90-0000-4000-8000-000000000002';
-- delete from programs where id = '7f3c1a90-0000-4000-8000-000000000002';  -- каскад снимет фазы/дни/упражнения

-- === проверка ===
-- select ph.phase_number, count(distinct d.id) days, count(pe.id) ex, sum(pe.sets) sets
--   from program_phases ph join program_days d on d.phase_id = ph.id
--   left join program_exercises pe on pe.program_day_id = d.id
--  where ph.program_id = '7f3c1a90-0000-4000-8000-000000000002' group by 1 order by 1;
--   -- ожидали: 1|5|26|89, 2|5|26|95, 3|5|26|52
