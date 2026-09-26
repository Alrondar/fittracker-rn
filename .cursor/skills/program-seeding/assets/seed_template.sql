-- Seed-шаблон готовой программы (program-seeding), декларативный вариант.
-- Один WITH-блок = одна фаза; повторить блок с другим phase_number/неделями.
-- Инварианты: created_by IS NULL; phase_id у КАЖДОГО дня (copy_program_for_user
-- выбирает дни WHERE phase_id = v_phase.id); exercise_name 1-в-1 из каталога
-- (буква "е"/"ё" — дословно как в exercises.name, каталог СМЕШАННЫЙ:
--  'Жим ногами в тренажёре' vs 'Сведение ног в тренажере'); reps_range через дефис ('10-12').
-- join exercises x drop'ит нерешённые имена молча — перед применением прогнать
-- validate.sql запрос 1 по именам, извлечённым из этого файла (grep/node), а не
-- напечатанным вручную: латинская "e" вместо кириллической не видна глазу.

-- === шаг 0: программа (один раз) ===
insert into programs (id, name, level, duration, description, schedule, created_by)
values ('00000000-0000-4000-8000-000000000001',   -- <- заменить на реальный uuid
        'Full Body — База', 'beginner', 8,
        'Три тренировки в неделю, полный корпус, техника и база.',
        array['Пн','Ср','Пт'], null);

-- === шаг 1..N: по одному блоку на фазу ===
with ph as (
  insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, position)
  values (gen_random_uuid()::text,
          '00000000-0000-4000-8000-000000000001', 1, 'Адаптация', 'hypertrophy', 4, 1)
  returning id
), dy as (
  insert into program_days (program_id, phase_id, week_number, day_number, name, position)
  select '00000000-0000-4000-8000-000000000001', p.id, 1, d.num, d.name, d.num
    from ph p
    join (values (1,'Full Body A'),(2,'Full Body B'),(3,'Full Body C')) d(num,name) on true
  returning id, name
)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
-- с 25.09 (RPE-1) сюда можно добавлять target_rpe (1..10) и progression_policy:
-- их переносят и copy_program_for_user, и create_workouts_for_program.
-- progression_policy: 'linear' | 'double_progression' | 'greyskull' | 'time_based'
--   (типы src/types/workout.ts:4), но движок реализует только linear и
--   double_progression (progression.ts:465) — остальные две колонку примут и
--   проигнорируют, в seeded-программах их не ставить.
-- Для «запас 1–2 повторения» target_rpe — единственный выразимый канал,
-- intensity ('low','medium','high') его не заменяет.
select d.id, x.id, e.name, e.sets, e.reps, e.rest, e.intensity,
       row_number() over (partition by d.id order by e.ord)
  from dy d
  join (values
    -- day_name, exercise_name (1-в-1 из exercises), sets, reps, rest, intensity, ord
    ('Full Body A','Жим гантелей лежа на горизонтальной скамье',3,'10-12',90,'medium',1),
    ('Full Body A','Тяга гантели одной рукой в наклоне',3,'10-12',90,'medium',2),
    ('Full Body A','Жим гантелей сидя',3,'10-12',90,'medium',3),
    ('Full Body A','Выпады с гантелями',2,'12',60,'low',4),
    ('Full Body A','Планка на локтях (классическая)',3,'40',45,'low',5),
    ('Full Body B','Жим ногами в тренажёре',3,'10-12',90,'medium',1),
    ('Full Body B','Тяга верхнего блока к груди широким хватом',3,'10-12',90,'medium',2),
    ('Full Body B','Разгибание ног в тренажере',2,'12-15',60,'low',3),
    ('Full Body B','Сгибание ног сидя',2,'12-15',60,'low',4),
    ('Full Body B','Скручивания на полу',3,'15',45,'low',5),
    ('Full Body C','Жим гантелей на наклонной скамье',3,'8-10',120,'medium',1),
    ('Full Body C','Тяга штанги в наклоне',3,'8-10',120,'medium',2),
    ('Full Body C','Фронтальные приседания',2,'8',120,'medium',3),
    ('Full Body C','Махи гантелями в стороны',2,'15',45,'low',4),
    ('Full Body C','Подъем штанги на бицепс стоя',2,'12',45,'low',5)
  ) e(day_name,name,sets,reps,rest,intensity,ord) on e.day_name = d.name
  join exercises x on x.name = e.name;

-- Повторить шаг 1 для каждой фазы (position/phase_number увеличивать;
-- дни в разных фазах — разные строки program_days, те же имена дней).
-- Сумма weeks_count всех фаз == programs.duration.
