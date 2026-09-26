-- seed_program_deficit_retention: «Сохранение массы в дефиците» (готовая/seeded)
-- По скиллу .cursor/skills/program-seeding.
-- Дыра: goal=lose у 5 из 7 заполненных профилей, а весь каталог — масснабор/сила с
-- 40–56 подходами жимов и работой «до отказа». Программа не «худит» (дефицит считает
-- КБЖУ-слой), она даёт тренировочный профиль, который не ломает восстановление в
-- дефиците: умеренный объём, запас 1–2 повторений, короткие сессии.
-- beginner, 3 дня (Пн/Ср/Пт), 6 нед: Работа 5 → Дилоуд 1.
-- target_rpe НЕ используется (write-путь поля мертв, 0/937), интенсивность — через
-- intensity + явное указание запаса в описании.

insert into programs (id, name, level, duration, description, schedule, created_by)
values ('b2000000-0000-4000-8000-000000000001',
        'Сохранение массы в дефиците', 'beginner', 6,
        'Три full-body тренировки в неделю по 40–45 минут для периода дефицита калорий: цель — сохранить мышцы и силу, а не «сжечь» больше. Остановитесь за 1–2 повторения до отказа во всех подходах, кроме последнего подхода базового движения. Если весовая прогрессия встал две недели подряд — это норма дефицита, удерживайте вес, а не добавляйте объём. Худеет дефицит калорий, эта программа бережет мышцы.',
        array['Пн','Ср','Пт'], null);

-- ===== Фаза 1. Работа (недели 1–5) =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b2000000-0000-4000-8000-000000000001', 1, 'Работа', 'hypertrophy', 5, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b2000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Full Body A'),(2,'Full Body B'),(3,'Full Body C')) d(num,name) on true
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
    ('Full Body A','Приседания с гантелями',3,'12',90,'medium',1),
    ('Full Body A','Жим гантелей лежа на горизонтальной скамье',3,'10-12',90,'medium',2),
    ('Full Body A','Тяга гантелей в наклоне нейтральным хватом',3,'10-12',90,'medium',3),
    ('Full Body A','Махи гантелями в стороны стоя',2,'12-15',60,'low',4),
    ('Full Body A','Мёртвый жук',3,'10-12',45,'low',5),
    ('Full Body B','Выпады с гантелями',3,'10-12',90,'medium',1),
    ('Full Body B','Подтягивания',3,'6-8',90,'high',2),
    ('Full Body B','Жим гантелей сидя',3,'10-12',90,'medium',3),
    ('Full Body B','Ножницы лёжа на животе',2,'12-15',45,'low',4),
    ('Full Body B','Скручивания велосипед',3,'15-20',45,'low',5),
    ('Full Body C','Фронтальные приседания',3,'8-10',120,'high',1),
    ('Full Body C','Ягодичный мостик со штангой',3,'10-12',90,'medium',2),
    ('Full Body C','Тяга верхнего блока к груди широким хватом',3,'10-12',90,'medium',3),
    ('Full Body C','Жим штанги лежа на горизонтальной скамье',3,'8-10',120,'medium',4),
    ('Full Body C','Разведение рук с резинкой (Pull Apart)',2,'15',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 2. Дилоуд (неделя 6): тот же набор, −1 подход, выше восстановление =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b2000000-0000-4000-8000-000000000001', 2, 'Дилоуд', 'deload', 1, 2)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b2000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Full Body A'),(2,'Full Body B'),(3,'Full Body C')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       6 -- [RPE-3] фаза deload: целевой RPE 6 по всей фазе (канон RPE-2)
  from dy d
  join (values
    ('Full Body A','Приседания с гантелями',2,'12',90,'low',1),
    ('Full Body A','Жим гантелей лежа на горизонтальной скамье',2,'12',90,'low',2),
    ('Full Body A','Тяга гантелей в наклоне нейтральным хватом',2,'12',90,'low',3),
    ('Full Body A','Махи гантелями в стороны стоя',2,'15',60,'low',4),
    ('Full Body A','Мёртвый жук',2,'10',45,'low',5),
    ('Full Body B','Выпады с гантелями',2,'12',90,'low',1),
    ('Full Body B','Подтягивания',2,'6',90,'low',2),
    ('Full Body B','Жим гантелей сидя',2,'12',90,'low',3),
    ('Full Body B','Ножницы лёжа на животе',2,'12',45,'low',4),
    ('Full Body B','Скручивания велосипед',2,'15',45,'low',5),
    ('Full Body C','Фронтальные приседания',2,'8',120,'low',1),
    ('Full Body C','Ягодичный мостик со штангой',2,'12',90,'low',2),
    ('Full Body C','Тяга верхнего блока к груди широким хватом',2,'12',90,'low',3),
    ('Full Body C','Жим штанги лежа на горизонтальной скамье',2,'10',120,'low',4),
    ('Full Body C','Разведение рук с резинкой (Pull Apart)',2,'15',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;
