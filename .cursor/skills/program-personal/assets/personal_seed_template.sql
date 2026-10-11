-- ============================================================================
-- Шаблон: ЛИЧНАЯ тренировочная программа (путь B — SQL-миграция)
--
-- Когда применять: когда программу нельзя собрать через редактор приложения
-- (переопределения недель week_number > 1, много программ, нужен побайтовый
-- контроль против согласованного листа). Во всех остальных случаях — путь A
-- (редактор), см. SKILL.md «Шаг 4».
--
-- Что заменить перед применением:
--   <PROG_UUID>        uuid программы, задать явно (удобнее откат), напр. 7f3c1a90-0000-4000-8000-000000000001
--   <PHASE_n_UUID>     uuid фазы n, тоже литералом (101/102/103 по хвосту — как в проде)
--   <UID>              uuid владельца-пользователя (profiles.id = auth.users.id)
--   имена/недели/подходы/повторы/rest/intensity/rpe/policy — из листа компоновки
--
-- Инварианты (нарушение = молча потерянные данные, а не ошибка):
--   * created_by = <UID>  -> программа попадёт в «Мои программы», НЕ в каталог
--   * duration = сумма weeks_count фаз; редактор при сохранении duration НЕ пересчитывает
--   * у КАЖДОГО дня заполнен phase_id (иначе create_workouts_for_program его не скопирует)
--   * дни каждой фазы — отдельные строки program_days
--   * exercise_name 1-в-1 из exercises.name (каталог смешан по «ё/е»), exercise_id из каталога
--   * reps_range через дефис; intensity in (low,medium,high); target_rpe 1..10 или NULL
--   * phase_id в join передаётся ЛИТЕРАЛОМ: не перечитывать таблицу, в которую тот же
--     оператор только что вставил строки (program-seeding, инвариант 11)
--   * phase_type = 'deload' для разгрузочной фазы значением поля, а не именем
--     ('custom'/power движок не читает — editor-matrix, грабля 4)
--   * транспорт apply_migration ~10 КБ кириллицы -> применять фазой за фазой
--     (<name>, <name>_phase2, ...), insert into programs — в первом вызове
--
-- Проверка владельца до вставки (обязательно, read-only):
--   select id, username, goal, current_weight_kg from profiles where id = '<UID>';
--   select count(*) from user_programs where user_id = '<UID>' and is_active;   -- кого перезапустим
--
-- Откат — в конце файла. Выкадывать в прод только через MCP apply_migration
-- и явное подтверждение владельца проекта; execute_sql для записей блокируется.
-- ============================================================================

-- === шаг 0: программа ===
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
values ('<PROG_UUID>',
        '<Название программы — уникальное по смыслу, с хвостом-пояснением>',
        'intermediate',          -- beginner | intermediate | advanced
        8,                       -- недели = сумма weeks_count ниже
        '<что это и зачем, 1-2 предложения по-русски>',
        array['Пн','Вт','Чт','Пт'],  -- витрина: на генерацию тренировок не влияет
        '<UID>',                 -- НЕ NULL: NULL превратит личную программу в каталожную
        null);                   -- uuid каталожной-источника, если это её копия

-- === шаг 1: фазы (id — литералы, дальше используются в join) ===
insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
values
  ('<PHASE_1_UUID>','<PROG_UUID>',1,'Гипертрофия','hypertrophy',4,'<накопление объёма>',1),
  ('<PHASE_2_UUID>','<PROG_UUID>',2,'Сила','strength',3,'<интенсивность выше, объём ниже>',2),
  ('<PHASE_3_UUID>','<PROG_UUID>',3,'Дилоуд','deload',1,'<объём -30..50%, RPE 6>',3);

-- === шаг 2: дни фазы 1 (week_number = 1 — шаблон недели) ===
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('<PROG_UUID>','<PHASE_1_UUID>',1,1,'Push',1),
  ('<PROG_UUID>','<PHASE_1_UUID>',1,2,'Pull',2),
  ('<PROG_UUID>','<PHASE_1_UUID>',1,3,'Legs',3),
  ('<PROG_UUID>','<PHASE_1_UUID>',1,4,'Upper',4);

-- === шаг 3: упражнения фазы 1 ===
-- Кортеж: (имя_дня, ИМЯ_ИЗ_КАТАЛОГА, подходы, повторы, отдых_сек, интенсивность, target_rpe, политика, порядок)
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Push','Жим штанги лежа на горизонтальной скамье',4,'6-10',120,'high',8,'double_progression',1),
    ('Push','Махи гантелями в стороны стоя',          4,'12-15', 60,'medium',9,'linear',2),
    ('Pull','Тяга штанги в наклоне',                  4,'6-8',  120,'high',8,'double_progression',1)
    -- ... остальные строки дня; имена копировать из вывода resolver'а ниже, не печатать по памяти
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = '<PHASE_1_UUID>' and d.name = e.day
  join exercises x    on x.name = e.name;

-- === шаг 4..N: повторить пары блоков «дни + упражнения» для каждой фазы ===
-- Для фазы 2: d.phase_id = '<PHASE_2_UUID>'; для дилоуда — intensity 'low', target_rpe 6,
-- подходы меньше, чем в объёмной фазе (не наоборот).

-- === опционально: переопределение недели (то, чего редактор не показывает после save) ===
-- insert into program_days (program_id, phase_id, week_number, day_number, name, position)
-- values ('<PROG_UUID>','<PHASE_1_UUID>',2,1,'Push (акцент жим)',1);
-- + упражнения этого дня; недели без своих дней падают на week_number = 1 (fallback в RPC).

-- ============================================================================
-- ОТКАТ (выполнять вручную, только если программа НЕ запускалась)
--   Проверка перед откатом: select count(*) from workouts
--     where program_id = '<PROG_UUID>';   -- >0 означает «пользователь уже занимался»
--
-- Каскады (проверено по pg_constraint 11.10): program_phases/program_days/
-- user_programs -> programs CASCADE; program_days.phase_id -> program_phases CASCADE;
-- program_exercises -> program_days CASCADE; workout_exercises и workout_logs ->
-- workouts CASCADE. У workouts.program_id Foreign KEY НЕТ — тренировки снимают только явно.
-- ============================================================================
-- delete from workouts where program_id = '<PROG_UUID>';        -- снимет workout_exercises и workout_logs
-- delete from programs where id = '<PROG_UUID>';                -- снимет фазы, дни, упражнения, user_programs

-- ============================================================================
-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ (положительные счётчики; пустая группировка = «строк нет»)
-- ============================================================================
-- 1. Резолв имён до вставки (unresolved обязано быть 0; имена брать из этого файла):
--    with c(nm) as (values ('Жим штанги лежа на горизонтальной скамье'),('...'))
--    select c.nm from c left join exercises x on x.name = c.nm where x.id is null;
--
-- 2. Структура:
--    select count(*) filter (where pd.phase_id is null) days_wo_phase,
--           count(*) filter (where pe.exercise_id is null) ex_null_id,
--           count(*) filter (where pe.target_rpe is null) no_rpe
--      from program_days pd
--      left join program_exercises pe on pe.program_day_id = pd.id
--     where pd.program_id = '<PROG_UUID>';
--
-- 3. Целостность имени с каталогом (name_drift = 0):
--    select count(*) from program_exercises pe
--      join exercises e on e.id = pe.exercise_id
--     where pe.program_day_id in (select id from program_days where program_id = '<PROG_UUID>')
--       and pe.exercise_name is distinct from e.name;
--
-- 4. Conformance duration и объём по фазам (сверить с листом компоновки):
--    select p.duration, sum(distinct ph.weeks_count) phase_weeks,
--           ph.phase_number, ph.phase_type, count(distinct pd.id) days,
--           count(pe.id) ex, sum(pe.sets) sets
--      from programs p
--      join program_phases ph on ph.program_id = p.id
--      join program_days pd    on pd.phase_id = ph.id
--      left join program_exercises pe on pe.program_day_id = pd.id
--     where p.id = '<PROG_UUID>'
--     group by 1,2,3,4 order by 3;
--
-- 5. Кратность position в дне (dup = 0, иначе порядок упражнений недетерминирован):
--    select program_day_id, position, count(*) from program_exercises
--     where program_day_id in (select id from program_days where program_id = '<PROG_UUID>')
--     group by 1,2 having count(*) > 1;
--
-- 6. E2E генерации тренировок — ТОЛЬКО внутри begin … rollback и только на этой программе:
--    begin;
--    select create_workouts_for_program('<UID>'::uuid, '<PROG_UUID>');
--    select phase_number, week_number, count(*) from workouts
--      where program_id = '<PROG_UUID>' group by 1,2 order by 1,2;
--    select count(*) from workout_exercises we
--      where we.workout_id in (select id from workouts where program_id = '<PROG_UUID>');
--    rollback;   -- обязательно: функция сначала удаляет ВСЕ тренировки программы, потом пересоздаёт
--    Ожидаемое число строк: сумма(weeks_count) x дней_в_неделе_фазы; упражнений — столько же,
--    сколько строк program_exercises с непустым exercise_id.
