-- ============================================================================
-- DAY4-RESTORE (17.10.2026): вернуть день 4 недели 2 аккаунту 6416429a.
--
-- Что случилось: при финише дня 3 (15.10 16:01:41.780) прогресс сдвинулся два
-- раза — newDay = curDay + 1 в src/services/programsService.ts:524 не
-- идемпотентна, а путь финиша вызывает её повторно из retry-обработчика
-- src/hooks/useWorkoutSession.ts:1087,1108-1110. Указатель ушёл на 5, и через
-- 8,2 с ленивый старт создал строку дня 5. Строки дня 4 в неделе 2 не
-- создавалось ни в одном статусе: тренировки будущих недель у личных программ
-- досоздаются по одной в момент старта (src/services/workoutService.ts:161-172),
-- поэтому перескочивший день не существует в таблице вообще.
--
-- Объём записи (удалений нет):
--   1 строка в workouts — user 6416429a, program 7f3c1a90-…0002,
--     phase_number=1, week_number=2, day_index=4, name из шаблона («Shoulders & Abs»);
--   6 строк в workout_exercises — копия program_exercises шаблонного дня
--     (фаза 1, неделя 1, день 4) в колонках, которые пишет
--     create_workouts_for_program: target_sets/target_reps_range/rest_seconds/
--     intensity/target_rpe/progression_policy, order_index = position = pe.position;
--   1 строка user_programs.current_day: 5 -> 4 (день 5 остаётся незакрытым).
--
-- Счётчики до (сняты 17.10 перед записью): тренировок у программы 19,
--   фаза 1 / неделя 2 = [1,2,3,5], шаблон недели 1 = [1,2,3,4,5], указатель 5,
--   упражнений в шаблонном дне 4 = 6.
-- После: 20 тренировок, [1,2,3,4,5], указатель 4, у новой строки 6 упражнений.
--
-- Идемпотентность: вставка защищена NOT EXISTS, повторный прогон ничего не удваивает.
-- Реверс:
--   delete from workouts
--     where user_id = '6416429a-10ef-4e35-ab2f-6c405ee4b283'
--       and program_id = '7f3c1a90-0000-4000-8000-000000000002'
--       and phase_number = 1 and week_number = 2 and day_index = 4
--       and started_at is null and finished_at is null;  -- каскад снимет workout_exercises
--   update user_programs set current_day = 5
--     where user_id = '6416429a-10ef-4e35-ab2f-6c405ee4b283'
--       and program_id = '7f3c1a90-0000-4000-8000-000000000002'
--       and current_phase = 1 and current_week = 2 and current_day = 4;
--
-- ОГРАНИЧЕНИЕ (здесь не чинится): предикат sync_program_changes_to_workouts
-- связывает тренировку с шаблоном строгой тройкой (фаза, неделя, день)
-- (supabase/migrations/20261016120000_sync_order_index_with_position.sql:60-87),
-- а у этой программы program_days есть только неделя 1. Восстановленная строка
-- формально сирота: любое сохранение этой программы в редакторе удалит её вместе
-- с её упражнениями. До починки предиката программу …0002 в редакторе не сохранять.
-- ============================================================================

-- Шаг 1 — тренировка + снимок упражнений одним запросом (id новой строки
-- нужен в том же вызове, поэтому модифицирующая CTE, а не DO-блок: обёртка
-- миграций не принимает вложенный $$).
with new_workout as (
  insert into public.workouts
    (user_id, program_id, name, phase_number, week_number, day_index, created_at)
  select '6416429a-10ef-4e35-ab2f-6c405ee4b283'::uuid,
         '7f3c1a90-0000-4000-8000-000000000002',
         pd.name, 1, 2, 4, now()
    from public.program_days pd
    join public.program_phases pp on pp.id = pd.phase_id
   where pd.program_id = '7f3c1a90-0000-4000-8000-000000000002'
     and pp.phase_number = 1
     and pd.week_number = 1
     and pd.day_number = 4
     and not exists (
       select 1 from public.workouts w
        where w.user_id = '6416429a-10ef-4e35-ab2f-6c405ee4b283'
          and w.program_id = '7f3c1a90-0000-4000-8000-000000000002'
          and w.phase_number = 1 and w.week_number = 2 and w.day_index = 4
     )
  returning id
)
insert into public.workout_exercises
  (workout_id, exercise_id, order_index, position,
   target_sets, target_reps_range, rest_seconds, intensity, target_rpe, progression_policy)
select nw.id, pe.exercise_id, pe.position, pe.position,
       pe.sets, pe.reps_range, pe.rest_seconds, pe.intensity,
       pe.target_rpe, pe.progression_policy
  from new_workout nw
  join public.program_days pd on pd.program_id = '7f3c1a90-0000-4000-8000-000000000002'
  join public.program_phases pp on pp.id = pd.phase_id
                             and pp.phase_number = 1
                             and pd.week_number = 1
                             and pd.day_number = 4
  join public.program_exercises pe on pe.program_day_id = pd.id
 where pe.exercise_id is not null;

-- Шаг 2 — указатель обратно на день 4 (строгий guard: трогаем только случай,
-- когда программа стоит ровно на 1/2/5, то есть на перескоке).
update public.user_programs
   set current_day = 4
 where user_id = '6416429a-10ef-4e35-ab2f-6c405ee4b283'
   and program_id = '7f3c1a90-0000-4000-8000-000000000002'
   and current_phase = 1 and current_week = 2 and current_day = 5;
