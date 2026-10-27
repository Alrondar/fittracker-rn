-- ============================================================================
-- Копия личной программы «Рекомпозиция — 3 дня, акцент грудь»
-- Источник: a8f0c610-0000-4000-8000-000000000001 (владелец 195b3d79-…)
-- Владелец копии: 6416429a-10ef-4e35-ab2f-6c405ee4b283 (основной тестовый
-- аккаунт, в нём есть история: 35 завершённых тренировок)
--
-- Способ тот же, что и для предыдущей копии: вставка SELECT'ом из строк
-- оригинала, а не перепечатка листа -> расхождение имён/подходов/отдыха
-- против оригинала исключено. Контрольная сумма после применения обязательна.
--
-- Ни активных тренировок, ни user_programs этот файл не трогает: программа
-- появляется в списке «Мои» и начнёт генерировать тренировки только после
-- «Начать программу» (тогда с текущего экземпляра снимется флаг активной).
-- ============================================================================

-- === шаг 1: программа =======================================================
insert into programs (id, name, level, duration, description, schedule, created_by, source_program_id)
select 'c9d3e430-0000-4000-8000-000000000001',
       s.name, s.level, s.duration, s.description, s.schedule,
       '6416429a-10ef-4e35-ab2f-6c405ee4b283', s.id
  from programs s
 where s.id = 'a8f0c610-0000-4000-8000-000000000001';

-- === шаг 2: фазы ============================================================
insert into program_phases (id, program_id, phase_number, name, phase_type, weeks_count, description, position)
select v.id, 'c9d3e430-0000-4000-8000-000000000001', s.phase_number,
       s.name, s.phase_type, s.weeks_count, s.description, s.position
  from (values
    (1, 'c9d3e430-0000-4000-8000-000000000011'),
    (2, 'c9d3e430-0000-4000-8000-000000000012'),
    (3, 'c9d3e430-0000-4000-8000-000000000013'),
    (4, 'c9d3e430-0000-4000-8000-000000000014')
  ) v(phase_number, id)
  join program_phases s on s.program_id = 'a8f0c610-0000-4000-8000-000000000001'
                       and s.phase_number = v.phase_number;

-- === шаг 3: дни =============================================================
insert into program_days (program_id, phase_id, week_number, day_number, name, position)
select 'c9d3e430-0000-4000-8000-000000000001', np.id,
       sd.week_number, sd.day_number, sd.name, sd.position
  from program_days sd
  join program_phases sp on sp.id = sd.phase_id
  join program_phases np on np.program_id = 'c9d3e430-0000-4000-8000-000000000001'
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
  join program_phases np on np.program_id = 'c9d3e430-0000-4000-8000-000000000001'
                         and np.phase_number = sp.phase_number
  join program_days nd   on nd.phase_id = np.id
                         and nd.day_number = sd.day_number
                         and nd.week_number = sd.week_number
 where sp.program_id = 'a8f0c610-0000-4000-8000-000000000001';

-- ============================================================================
-- ОТКАТ (пока копия не запускалась)
--   delete from workouts where program_id = 'c9d3e430-0000-4000-8000-000000000001';
--   delete from programs where id = 'c9d3e430-0000-4000-8000-000000000001';
-- ============================================================================
