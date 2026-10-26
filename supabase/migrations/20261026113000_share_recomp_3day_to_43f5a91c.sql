-- ============================================================================
-- Копия личной программы «Рекомпозиция — 3 дня, акцент грудь»
-- Источник: a8f0c610-0000-4000-8000-000000000001 (владелец 195b3d79-…)
-- Владелец копии: 43f5a91c-57d7-4f9d-a33f-405614364821
--
-- Способ: вставка SELECT'ом из строк источника, а не повторный LIST значений —
-- так копии не грозит расхождение имени/подходов/отдыха против оригинала
-- (сверка контрольной сумм обеих программ после применения обязательна).
--
-- Семантика: created_by = uuid нового владельца -> программа лежит в его
-- «Мои программы»; source_program_id = id источника -> повторный вызов
-- copy_program_for_user для этого пользователя вернёт существующую копию,
-- а не создаст вторую (проверка в теле функции по паре created_by/source).
--
-- id фаз заданы литералом (b7c1d920-…-011..014); id дней генерирует БД —
-- привязка упражнений к новым дням идёт по (номер фазы, day_number, week_number),
-- что уникально внутри программы.
-- ============================================================================

-- === шаг 1: программа =======================================================
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
select 'b7c1d920-0000-4000-8000-000000000001',
       s.name, s.level, s.duration, s.description, s.schedule,
       '43f5a91c-57d7-4f9d-a33f-405614364821', s.id
  from programs s
 where s.id = 'a8f0c610-0000-4000-8000-000000000001';

-- === шаг 2: фазы ============================================================
insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
select v.id, 'b7c1d920-0000-4000-8000-000000000001', s.phase_number,
       s.name, s.phase_type, s.weeks_count, s.description, s.position
  from (values
    (1, 'b7c1d920-0000-4000-8000-000000000011'),
    (2, 'b7c1d920-0000-4000-8000-000000000012'),
    (3, 'b7c1d920-0000-4000-8000-000000000013'),
    (4, 'b7c1d920-0000-4000-8000-000000000014')
  ) v(phase_number, id)
  join program_phases s on s.program_id = 'a8f0c610-0000-4000-8000-000000000001'
                       and s.phase_number = v.phase_number;

-- === шаг 3: дни =============================================================
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
select 'b7c1d920-0000-4000-8000-000000000001', np.id,
       sd.week_number, sd.day_number, sd.name, sd.position
  from program_days sd
  join program_phases sp on sp.id = sd.phase_id
  join program_phases np on np.program_id = 'b7c1d920-0000-4000-8000-000000000001'
                         and np.phase_number = sp.phase_number
 where sp.program_id = 'a8f0c610-0000-4000-8000-000000000001';

-- === шаг 4: упражнения ======================================================
insert into program_exercises (program_day_id, exercise_id, exercise_name, sets, reps_range,
                               rest_seconds, intensity, target_rpe, progression_policy, position)
select nd.id, se.exercise_id, se.exercise_name, se.sets, se.reps_range,
       se.rest_seconds, se.intensity, se.target_rpe, se.progression_policy, se.position
  from program_exercises se
  join program_days sd   on sd.id = se.program_day_id
  join program_phases sp on sp.id = sd.phase_id
  join program_phases np on np.program_id = 'b7c1d920-0000-4000-8000-000000000001'
                         and np.phase_number = sp.phase_number
  join program_days nd   on nd.phase_id = np.id
                         and nd.day_number = sd.day_number
                         and nd.week_number = sd.week_number
 where sp.program_id = 'a8f0c610-0000-4000-8000-000000000001';

-- ============================================================================
-- ОТКАТ (пока копия не запускалась)
--   delete from workouts where program_id = 'b7c1d920-0000-4000-8000-000000000001';
--   delete from programs where id = 'b7c1d920-0000-4000-8000-000000000001';
--   (каскадом снимутся фазы, дни, упражнения)
-- ============================================================================
