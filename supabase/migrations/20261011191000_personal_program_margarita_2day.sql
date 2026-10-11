-- ============================================================================
-- Личная программа «Два дня: передняя + жимы / задняя + тяги» для 5b770d3b-cf21-4c98-9976-3c22fc35b4f5 (Маргарита).
-- created_by = владелец -> вкладка «Мои программы»; в каталог ready не попадает (там фильтр created_by IS NULL).
-- Источник: spark-output/programs/маргарита-2и3-дня.md. Файл сгенерирован парсером из таблиц документа:
-- цифры не перепечатывались руками, суммы подходов по фазам сверены (39 / 50 / 39 / 23).
--
-- Инварианты:
--   * duration 10 = 2 + 4 + 3 + 1 (втяжка / объём / сила / дилоуд)
--   * у каждого дня заполнен phase_id; дни каждой фазы — отдельные строки (подходы в фазах разные)
--   * exercise_name 1-в-1 из exercises.name, exercise_id резолвится по этому же имени
--   * reps_range через дефис, без единиц: в планках стоит число (45, 30) и политика progression_policy = time_based
--   * target_rpe задан во всех строках: её логи дают 95% покрытия RPE при среднем 8.43 — движок его прочитает
--   * intensity: high — движения с двойной прогрессией, low — кор/баланс/face pull/разгибания на блоке, medium — остальная изоляция
--   * «Дилоуд» = phase_type deload значением поля, иначе progression.ts не снизит вес (0.9x и коды DELOAD_PHASE)
--   * резинок нет; грудь 0 по решению владельца (плечи завернуты вперёд, горизонтальные жимы не добавляем)
--   * три строки со статусом needs_review: «Сгибание ног сидя», «Отведение ноги в сторону в нижнем блоке», «Журавлик»
--     (утверждённой замены им в каталоге нет: у паттерна knee_flexion 0 строк approved, отведения без резинки тоже)
--
-- ТРАНСПОРТ: применять БЛОК за БЛОКОМ — apply_migration не везёт ~10 КБ кириллицы за раз.
--   БЛОК 0 = программа + фазы, блоки 1..4 = дни и упражнения одной фазы.
--   Перед вставкой: select id, full_name from profiles where id = '5b770d3b-cf21-4c98-9976-3c22fc35b4f5';
--   Откат — внизу файла. Активацию не делать: user_programs не трогаем, программу запускает сама пользовательница.
-- ============================================================================

-- == БЛОК 0: программа и фазы ==
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
values ('a2000000-0000-4000-8000-5b770d3b0002', 'Два дня: передняя + жимы / задняя + тяги', 'intermediate', 10, 'Аналог трёхдневной на случай, когда три тренировки не получаются: тот же пул движений, жимовая часть верха в день передней цепи, тяговая — в день задней.',
        array['Вт','Пт']::text[], '5b770d3b-cf21-4c98-9976-3c22fc35b4f5', null);

insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
values
  ('a2000000-0000-4000-8000-5b770d3b0201', 'a2000000-0000-4000-8000-5b770d3b0002', 1, 'Втяжка', 'hypertrophy', 2, 'Технический микроцикл: RPE 7, вес румынки −10% от пика (после спада 50.7 → 35 за месяц)', 1),
  ('a2000000-0000-4000-8000-5b770d3b0202', 'a2000000-0000-4000-8000-5b770d3b0002', 2, 'Объём', 'hypertrophy', 4, 'Основная работа: база на RPE 8 в диапазонах 6-12, изоляция на RPE 9', 2),
  ('a2000000-0000-4000-8000-5b770d3b0203', 'a2000000-0000-4000-8000-5b770d3b0002', 3, 'Сила', 'strength', 3, 'Подходов меньше, чем в объёме, диапазоны 5-10 повторений, отдых длиннее', 3),
  ('a2000000-0000-4000-8000-5b770d3b0204', 'a2000000-0000-4000-8000-5b770d3b0002', 4, 'Дилоуд', 'deload', 1, 'Разгрузка: база 2 подхода, изоляция 1, RPE 6', 4);

-- == БЛОК 1: фаза 1 «Втяжка», 2 нед, 39 подходов в неделю ==
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0201', 1, 1, 'Передняя цепь + жимы', 1),
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0201', 1, 2, 'Задняя цепь + тяги', 2);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Передняя цепь + жимы', 'Приседания в Смите', 3, '10-12', 90, 'high', 7, 'double_progression', 1),
    ('Передняя цепь + жимы', 'Приседания плие с гантелью', 2, '10-12', 60, 'medium', 8, 'linear', 2),
    ('Передняя цепь + жимы', 'Разгибание ног в тренажере', 2, '12-15', 45, 'medium', 8, 'linear', 3),
    ('Передняя цепь + жимы', 'Мёртвый жук', 2, '12', 60, 'low', 7, 'linear', 4),
    ('Передняя цепь + жимы', 'Жим гантелей сидя', 3, '10-12', 75, 'high', 7, 'double_progression', 5),
    ('Передняя цепь + жимы', 'Махи гантелями в стороны стоя', 3, '12-15', 45, 'medium', 8, 'linear', 6),
    ('Передняя цепь + жимы', 'Тяга каната к лицу (Face Pull)', 2, '15', 45, 'low', 8, 'linear', 7),
    ('Передняя цепь + жимы', 'Разгибание рук на верхнем блоке (канат)', 1, '12-15', 45, 'low', 8, 'linear', 8),
    ('Задняя цепь + тяги', 'Ягодичный мостик со штангой', 3, '10-12', 90, 'high', 7, 'double_progression', 1),
    ('Задняя цепь + тяги', 'Румынская тяга в Смите', 3, '10-12', 90, 'high', 7, 'double_progression', 2),
    ('Задняя цепь + тяги', 'Сгибание ног сидя', 2, '12-15', 60, 'medium', 8, 'linear', 3),
    ('Задняя цепь + тяги', 'Журавлик', 2, '10', 60, 'medium', 8, 'linear', 4),
    ('Задняя цепь + тяги', 'Отведение ноги назад в кроссовере на одной ноге', 2, '12-15', 45, 'medium', 8, 'linear', 5),
    ('Задняя цепь + тяги', 'Отведение ноги в сторону в нижнем блоке', 2, '15-20', 45, 'medium', 8, 'linear', 6),
    ('Задняя цепь + тяги', 'Тяга верхнего блока к груди широким хватом', 3, '10-12', 90, 'high', 7, 'double_progression', 7),
    ('Задняя цепь + тяги', 'Тяга нижнего блока к поясу сидя', 2, '10-12', 75, 'high', 7, 'double_progression', 8),
    ('Задняя цепь + тяги', 'Скручивания велосипед', 2, '15-20', 45, 'low', 8, 'linear', 9)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = 'a2000000-0000-4000-8000-5b770d3b0201' and d.name = e.day
  join exercises x on x.name = e.name;

-- == БЛОК 2: фаза 2 «Объём», 4 нед, 50 подходов в неделю ==
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0202', 1, 1, 'Передняя цепь + жимы', 1),
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0202', 1, 2, 'Задняя цепь + тяги', 2);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Передняя цепь + жимы', 'Приседания в Смите', 4, '8-12', 105, 'high', 8, 'double_progression', 1),
    ('Передняя цепь + жимы', 'Приседания плие с гантелью', 3, '10-12', 75, 'medium', 8, 'linear', 2),
    ('Передняя цепь + жимы', 'Разгибание ног в тренажере', 2, '10-15', 60, 'medium', 9, 'linear', 3),
    ('Передняя цепь + жимы', 'Мёртвый жук', 3, '12', 60, 'low', 8, 'linear', 4),
    ('Передняя цепь + жимы', 'Жим гантелей сидя', 4, '10-12', 90, 'high', 8, 'double_progression', 5),
    ('Передняя цепь + жимы', 'Махи гантелями в стороны стоя', 4, '12-15', 60, 'medium', 9, 'linear', 6),
    ('Передняя цепь + жимы', 'Тяга каната к лицу (Face Pull)', 2, '15', 45, 'low', 9, 'linear', 7),
    ('Передняя цепь + жимы', 'Разгибание рук на верхнем блоке (канат)', 2, '12-15', 45, 'low', 9, 'linear', 8),
    ('Задняя цепь + тяги', 'Ягодичный мостик со штангой', 4, '6-10', 120, 'high', 8, 'double_progression', 1),
    ('Задняя цепь + тяги', 'Румынская тяга в Смите', 4, '8-12', 105, 'high', 8, 'double_progression', 2),
    ('Задняя цепь + тяги', 'Сгибание ног сидя', 2, '10-15', 60, 'medium', 9, 'linear', 3),
    ('Задняя цепь + тяги', 'Журавлик', 2, '10-12', 75, 'medium', 8, 'linear', 4),
    ('Задняя цепь + тяги', 'Отведение ноги назад в кроссовере на одной ноге', 3, '12-15', 60, 'medium', 9, 'linear', 5),
    ('Задняя цепь + тяги', 'Отведение ноги в сторону в нижнем блоке', 2, '15-20', 45, 'medium', 9, 'linear', 6),
    ('Задняя цепь + тяги', 'Тяга верхнего блока к груди широким хватом', 4, '8-12', 105, 'high', 8, 'double_progression', 7),
    ('Задняя цепь + тяги', 'Тяга нижнего блока к поясу сидя', 3, '8-10', 90, 'high', 8, 'double_progression', 8),
    ('Задняя цепь + тяги', 'Скручивания велосипед', 2, '15-20', 45, 'low', 9, 'linear', 9)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = 'a2000000-0000-4000-8000-5b770d3b0202' and d.name = e.day
  join exercises x on x.name = e.name;

-- == БЛОК 3: фаза 3 «Сила», 3 нед, 39 подходов в неделю ==
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0203', 1, 1, 'Передняя цепь + жимы', 1),
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0203', 1, 2, 'Задняя цепь + тяги', 2);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Передняя цепь + жимы', 'Приседания в Смите', 3, '6-8', 120, 'high', 8, 'double_progression', 1),
    ('Передняя цепь + жимы', 'Приседания плие с гантелью', 2, '10', 75, 'medium', 8, 'linear', 2),
    ('Передняя цепь + жимы', 'Разгибание ног в тренажере', 2, '10-12', 60, 'medium', 8, 'linear', 3),
    ('Передняя цепь + жимы', 'Мёртвый жук', 2, '12', 60, 'low', 8, 'linear', 4),
    ('Передняя цепь + жимы', 'Жим гантелей сидя', 3, '8-10', 105, 'high', 8, 'double_progression', 5),
    ('Передняя цепь + жимы', 'Махи гантелями в стороны стоя', 3, '12', 60, 'medium', 8, 'linear', 6),
    ('Передняя цепь + жимы', 'Тяга каната к лицу (Face Pull)', 2, '15', 45, 'low', 8, 'linear', 7),
    ('Передняя цепь + жимы', 'Разгибание рук на верхнем блоке (канат)', 1, '12', 45, 'low', 8, 'linear', 8),
    ('Задняя цепь + тяги', 'Ягодичный мостик со штангой', 3, '5-8', 150, 'high', 8, 'double_progression', 1),
    ('Задняя цепь + тяги', 'Румынская тяга в Смите', 3, '6-8', 120, 'high', 8, 'double_progression', 2),
    ('Задняя цепь + тяги', 'Сгибание ног сидя', 2, '10-12', 60, 'medium', 8, 'linear', 3),
    ('Задняя цепь + тяги', 'Журавлик', 2, '8-10', 90, 'medium', 8, 'linear', 4),
    ('Задняя цепь + тяги', 'Отведение ноги назад в кроссовере на одной ноге', 2, '12', 60, 'medium', 8, 'linear', 5),
    ('Задняя цепь + тяги', 'Отведение ноги в сторону в нижнем блоке', 2, '15', 45, 'medium', 8, 'linear', 6),
    ('Задняя цепь + тяги', 'Тяга верхнего блока к груди широким хватом', 3, '6-8', 120, 'high', 8, 'double_progression', 7),
    ('Задняя цепь + тяги', 'Тяга нижнего блока к поясу сидя', 3, '6-8', 105, 'high', 8, 'double_progression', 8),
    ('Задняя цепь + тяги', 'Скручивания велосипед', 1, '15', 45, 'low', 8, 'linear', 9)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = 'a2000000-0000-4000-8000-5b770d3b0203' and d.name = e.day
  join exercises x on x.name = e.name;

-- == БЛОК 4: фаза 4 «Дилоуд», 1 нед, 23 подходов в неделю ==
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
values
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0204', 1, 1, 'Передняя цепь + жимы', 1),
  ('a2000000-0000-4000-8000-5b770d3b0002', 'a2000000-0000-4000-8000-5b770d3b0204', 1, 2, 'Задняя цепь + тяги', 2);

insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, target_rpe, progression_policy, position)
select d.id, x.id, x.name, e.sets, e.reps, e.rest, e.intensity, e.rpe, e.policy, e.ord
  from (values
    ('Передняя цепь + жимы', 'Приседания в Смите', 2, '10', 60, 'high', 6, 'double_progression', 1),
    ('Передняя цепь + жимы', 'Приседания плие с гантелью', 1, '12', 45, 'medium', 6, 'linear', 2),
    ('Передняя цепь + жимы', 'Разгибание ног в тренажере', 1, '15', 45, 'medium', 6, 'linear', 3),
    ('Передняя цепь + жимы', 'Мёртвый жук', 2, '12', 60, 'low', 6, 'linear', 4),
    ('Передняя цепь + жимы', 'Жим гантелей сидя', 2, '10', 45, 'high', 6, 'double_progression', 5),
    ('Передняя цепь + жимы', 'Махи гантелями в стороны стоя', 1, '15', 45, 'medium', 6, 'linear', 6),
    ('Передняя цепь + жимы', 'Тяга каната к лицу (Face Pull)', 1, '15', 45, 'low', 6, 'linear', 7),
    ('Передняя цепь + жимы', 'Разгибание рук на верхнем блоке (канат)', 1, '15', 45, 'low', 6, 'linear', 8),
    ('Задняя цепь + тяги', 'Ягодичный мостик со штангой', 2, '10', 60, 'high', 6, 'double_progression', 1),
    ('Задняя цепь + тяги', 'Румынская тяга в Смите', 2, '10', 60, 'high', 6, 'double_progression', 2),
    ('Задняя цепь + тяги', 'Сгибание ног сидя', 1, '12-15', 45, 'medium', 6, 'linear', 3),
    ('Задняя цепь + тяги', 'Журавлик', 1, '12', 45, 'medium', 6, 'linear', 4),
    ('Задняя цепь + тяги', 'Отведение ноги назад в кроссовере на одной ноге', 1, '15', 45, 'medium', 6, 'linear', 5),
    ('Задняя цепь + тяги', 'Отведение ноги в сторону в нижнем блоке', 1, '20', 45, 'medium', 6, 'linear', 6),
    ('Задняя цепь + тяги', 'Тяга верхнего блока к груди широким хватом', 2, '10', 60, 'high', 6, 'double_progression', 7),
    ('Задняя цепь + тяги', 'Тяга нижнего блока к поясу сидя', 1, '10', 45, 'high', 6, 'double_progression', 8),
    ('Задняя цепь + тяги', 'Скручивания велосипед', 1, '20', 45, 'low', 6, 'linear', 9)
  ) e(day,name,sets,reps,rest,intensity,rpe,policy,ord)
  join program_days d on d.phase_id = 'a2000000-0000-4000-8000-5b770d3b0204' and d.name = e.day
  join exercises x on x.name = e.name;

-- ============================================================================
-- ОТКАТ (только если программа НЕ запускалась):
--   select count(*) from workouts where program_id = 'a2000000-0000-4000-8000-5b770d3b0002';   -- должно быть 0
-- delete from workouts where program_id = 'a2000000-0000-4000-8000-5b770d3b0002';  -- каскадом снимет workout_exercises и workout_logs
-- delete from programs where id = 'a2000000-0000-4000-8000-5b770d3b0002';          -- каскадом: фазы, дни, упражнения, user_programs

-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ (положительные счётчики; пустая группировка = «строк нет», а не «чисто»)
-- 1. структура — всё обязано быть 0:
--    select count(*) filter (where pd.phase_id is null) days_wo_phase,
--           count(*) filter (where pe.exercise_id is null) ex_null_id,
--           count(*) filter (where pe.target_rpe is null) no_rpe, count(*) filter (where pe.position is null) no_pos
--      from program_days pd left join program_exercises pe on pe.program_day_id = pd.id
--     where pd.program_id = 'a2000000-0000-4000-8000-5b770d3b0002';
-- 2. имена 1-в-1 с каталогом:
--    select count(*) name_drift from program_exercises pe join exercises e on e.id = pe.exercise_id
--     where pe.program_day_id in (select id from program_days where program_id = 'a2000000-0000-4000-8000-5b770d3b0002')
       and pe.exercise_name is distinct from e.name;   -- 0
-- 3. пофазные метрики, ожидание: Втяжка — 2 дней / 17 упр / 39 подходов; Объём — 2 дней / 17 упр / 50 подходов; Сила — 2 дней / 17 упр / 39 подходов; Дилоуд — 2 дней / 17 упр / 23 подходов
--    select ph.phase_number, ph.phase_type, ph.weeks_count, count(distinct pd.id) days, count(pe.id) ex, sum(pe.sets) sets
--      from program_phases ph join program_days pd on pd.phase_id = ph.id
--      left join program_exercises pe on pe.program_day_id = pd.id
--     where ph.program_id = 'a2000000-0000-4000-8000-5b770d3b0002' group by 1,2,3 order by 1;
-- 4. дубли position в дне (должно быть пусто):
--    select program_day_id, position, count(*) from program_exercises
--     where program_day_id in (select id from program_days where program_id = 'a2000000-0000-4000-8000-5b770d3b0002')
--     group by 1,2 having count(*) > 1;
-- 5. при старте сгенерируется 10 x 2 = 20 тренировок;
--    E2E генерации — только begin ... rollback, и только пока у программы нет workouts.
