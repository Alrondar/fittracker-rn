-- seed_program_two_day_maintenance: «Две тренировки в неделю» (готовая/seeded программа)
-- Сгенерирована по скиллу .cursor/skills/program-seeding. 26.09.2026.
-- Дыра в каталоге: минимальная частота — 3 дня (StrongLifts, «Full Body — Старт»,
-- «Домашняя. Гантели и пол», PPL Классический, «Задняя цепь», «Сохранение массы в
-- дефиците» — все 3 дня; PPLUL 5, «Upper/Lower» 4, PPL 6). Занятому человеку и
-- возвращающемуся после перерыва выбирать нечего: 5–6 дней ему не подходит.
-- intermediate, 2 дня (Пн/Чт), 12 нед: База 6 → Сила 5 → Дилоуд 1.
-- Честность контента: 3–4 подхода на движение за сессию = нижняя граница эффективной
-- дозы (удержание силы и массы, не быстрый рост) — это сказано прямо в description.
-- Инварианты: created_by IS NULL; phase_id у каждого дня; имена 1-в-1 из exercises.
-- Целевые метрики: press:pull ≈ 1.0, постуральные паттерны не дублируются подряд.

insert into programs (id, name, level, duration, description, schedule, created_by)
values ('b5000000-0000-4000-8000-000000000001',
        'Две тренировки в неделю', 'intermediate', 12,
        'Две тренировки на весь корпус в неделю — рабочий минимум, когда времени больше нет. Это программа удержания, а не роста: с таким объёмом сила и масса сохраняются, а прибавляются медленно. Каждое движение — 3–4 подхода, всё тело за одну сессию, 45–55 минут. Шесть недель в умеренных 8–12 повторениях, пять недель тяжелее на 6–8, последняя неделя разгрузочная. Нужны гантели, штанга или тренажёры и турник с резинкой.',
        array['Пн','Чт'], null);

-- ===== Фаза 1. База (hypertrophy, недели 1–6) =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b5000000-0000-4000-8000-000000000001', 1, 'База', 'hypertrophy', 6, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b5000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Всё тело A'),(2,'Всё тело B')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       -- [RPE-3] канон RPE-2: аксессуар (low) -> 9, база/подсобка -> 8.
       -- ВАЖНО (инвариант 11): тип фазы здесь литерал, а не join program_phases — основной
       -- запрос не видит строки, вставленные data-modifying CTE в ту же таблицу.
       case when e.intensity = 'low' then 9 else 8 end
  from dy d
  join (values
    ('Всё тело A','Гоблет-приседания',4,'10-12',120,'medium',1),
    ('Всё тело A','Жим гантелей лежа на горизонтальной скамье',4,'8-10',120,'medium',2),
    ('Всё тело A','Тяга гантелей в наклоне нейтральным хватом',4,'8-10',120,'medium',3),
    ('Всё тело A','Становая тяга на прямых ногах с широкой постановкой',3,'10-12',90,'medium',4),
    ('Всё тело A','Отжимания от пола',3,'10-12',90,'medium',5),
    ('Всё тело A','Мёртвый жук',2,'10-12',45,'low',6),
    ('Всё тело B','Выпады с гантелями',3,'10-12',90,'medium',1),
    ('Всё тело B','Подтягивания с резинкой',4,'6-8',120,'medium',2),
    ('Всё тело B','Попеременный жим гантелей стоя',3,'8-10',120,'medium',3),
    ('Всё тело B','Гиперэкстензия',3,'12-15',90,'medium',4),
    ('Всё тело B','Махи гантелями в стороны стоя',3,'12-15',60,'low',5),
    ('Всё тело B','Подъем гантелей на бицепс стоя',2,'10-12',60,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 2. Сила (strength, недели 7–11): база тяжелее, аксессуаров меньше =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b5000000-0000-4000-8000-000000000001', 2, 'Сила', 'strength', 5, 2)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b5000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Всё тело A'),(2,'Всё тело B')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       -- [RPE-3] канон RPE-2: аксессуар (low) -> 9, база/подсобка -> 8 (литерал фазы, инвариант 11)
       case when e.intensity = 'low' then 9 else 8 end
  from dy d
  join (values
    ('Всё тело A','Гоблет-приседания',4,'6-8',150,'high',1),
    ('Всё тело A','Жим гантелей лежа на горизонтальной скамье',4,'6-8',150,'high',2),
    ('Всё тело A','Тяга гантелей в наклоне нейтральным хватом',4,'6-8',150,'high',3),
    ('Всё тело A','Становая тяга на прямых ногах с широкой постановкой',2,'8-10',120,'medium',4),
    ('Всё тело A','Отжимания от пола',3,'8-10',120,'medium',5),
    ('Всё тело A','Мёртвый жук',2,'10-12',45,'low',6),
    ('Всё тело B','Выпады с гантелями',3,'6-8',150,'medium',1),
    ('Всё тело B','Подтягивания с резинкой',4,'5-6',150,'high',2),
    ('Всё тело B','Попеременный жим гантелей стоя',3,'6-8',150,'medium',3),
    ('Всё тело B','Гиперэкстензия',2,'10-12',90,'medium',4),
    ('Всё тело B','Махи гантелями в стороны стоя',2,'12-15',60,'low',5),
    ('Всё тело B','Подъем гантелей на бицепс стоя',2,'8-10',60,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- ===== Фаза 3. Дилоуд (неделя 12): все движения сохранены, подходы ~−50% =====
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          'b5000000-0000-4000-8000-000000000001', 3, 'Дилоуд', 'deload', 1, 3)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select 'b5000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Всё тело A'),(2,'Всё тело B')) d(num,name) on true
  returning id, name, phase_id
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe)
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord),
       6 -- [RPE-3] фаза deload: целевой RPE 6 по всей фазе (канон RPE-2)
  from dy d
  join (values
    ('Всё тело A','Гоблет-приседания',2,'10',120,'low',1),
    ('Всё тело A','Жим гантелей лежа на горизонтальной скамье',2,'10',120,'low',2),
    ('Всё тело A','Тяга гантелей в наклоне нейтральным хватом',2,'10',120,'low',3),
    ('Всё тело A','Становая тяга на прямых ногах с широкой постановкой',2,'10',90,'low',4),
    ('Всё тело A','Отжимания от пола',2,'10',90,'low',5),
    ('Всё тело A','Мёртвый жук',2,'10',45,'low',6),
    ('Всё тело B','Выпады с гантелями',2,'10',120,'low',1),
    ('Всё тело B','Подтягивания с резинкой',2,'5',120,'low',2),
    ('Всё тело B','Попеременный жим гантелей стоя',2,'10',120,'low',3),
    ('Всё тело B','Гиперэкстензия',2,'12',90,'low',4),
    ('Всё тело B','Махи гантелями в стороны стоя',2,'12',60,'low',5),
    ('Всё тело B','Подъем гантелей на бицепс стоя',2,'12',60,'low',6)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;
