-- ============================================================================
-- SYNC-WK-RESTORE (22.10.2026): вернуть активным программам тренировки недель,
-- которые снёс старый предикат синхронизации.
--
-- Дефект. До 17.10 `sync_program_changes_to_workouts` связывал тренировку с
-- шаблоном строгой тройкой (phase_number, week_number, day_index) и всё, что не
-- совпало, удалял вместе с exercise-строками. Генератор тренировок для недель, у
-- которых нет своих `program_days`, подставляет дни недели 1 той же фазы и пишет
-- настоящий `week_number`
-- (20260925224000_carry_rpe_into_scheduled_workouts.sql:80-116). Значит у любой
-- программы с `weeks_count > 1` и днями на одной неделе сохранение в редакторе
-- удаляло все неначатые тренировки будущих недель.
--
-- Предикат починен 17.10 (20261017134000_sync_week_fallback_predicate.sql), но
-- удалённые строки не возвращены. Следствие видно на экране «Тренировки»:
--   • группировка строится по существующим строкам
--     (src/services/workoutsService.ts:91-108) — неделя показывается не целиком;
--   • знаменатель прогресса в шапке = число строк
--     (src/services/workoutsService.ts:113) — «7 из 21» вместо «8 из 40»;
--   • видимые строки текущей недели создаёт по одной `startProgramWorkout`
--     (src/services/workoutService.ts:34-143) в момент нажатия «Начать», поэтому
--     пропавший день выглядит как «до него ещё не дошли».
--
-- Что делает. Для каждой АКТИВНОЙ программы проходит фазы × недели и вставляет
-- отсутствующие (phase_number, week_number, day_index) вместе со снимком
-- упражнений из того же шаблонного дня. Правило выбора недельного шаблона,
-- список колонок и порядок — как у генератора, чтобы восстановленный день не
-- отличался от созданного «с нуля».
--
-- Чего НЕ делает. Только INSERT под NOT EXISTS: ни одной существующей строки не
-- меняет и не удаляет, закрытые и начатые дни не трогает, неактивные программы
-- не обслуживает, ветку генератора «программа без фаз» не повторяет (у таких
-- программ недельных копий нет в принципе).
--
-- Счётчики до применения (dry-run тем же предикатом, 22.10 18:59 +0300):
--   9064a66b… «Похудение: 4 силовых дня (низ/верх)»        +22 тренировки, +154
--   6416429a… «Upper Focus 5-Day — Силовая рекомпозиция»   +18 тренировки, +102
--   5b770d3b… «Три дня: передняя цепь / верх / ягодицы»    +18 тренировки, +120
--   итого 58 тренировок и 376 строк workout_exercises; остальные 4 активные
--   программы уже полные — 0 строк к вставке.
--
-- Реверс. Вставляются только строки, которых не было, поэтому откат = удалить
-- созданное по времени применения и по трём программам, только неначатое:
--   delete from workout_logs wl
--    where wl.workout_exercise_id in (
--      select we.id from workout_exercises we
--      join workouts w on w.id = we.workout_id
--      where w.created_at >= '<ВРЕМЯ ПРИМЕНЕНИЯ>' and w.started_at is null
--        and w.finished_at is null
--        and w.program_id in ('3937d46f-ae1e-4e6f-9a1c-34ef46d3f4b4',
--                             '7f3c1a90-0000-4000-8000-000000000002',
--                             'a3000000-0000-4000-8000-5b770d3b0001'));
--   delete from workout_exercises we
--    where we.workout_id in (
--      select w.id from workouts w
--      where w.created_at >= '<ВРЕМЯ ПРИМЕНЕНИЯ>' and w.started_at is null
--        and w.finished_at is null
--        and w.program_id in (…те же три…));
--   delete from workouts w
--    where w.created_at >= '<ВРЕМЯ ПРИМЕНЕНИЯ>' and w.started_at is null
--      and w.finished_at is null
--      and w.program_id in (…те же три…);
-- Точное время применения вписывается сюда после прогона.
-- ============================================================================

do $do$
declare
  v_prog      record;
  v_phase     record;
  v_day       record;
  v_week      integer;
  v_days      integer;
  v_wid       uuid;
  v_rows      integer;
  v_workouts  integer := 0;
  v_exercises integer := 0;
begin
  for v_prog in
    select up.user_id, up.program_id
    from user_programs up
    where up.is_active
      and exists (
        select 1 from program_phases pp where pp.program_id = up.program_id
      )
  loop
    for v_phase in
      select pp.* from program_phases pp
      where pp.program_id = v_prog.program_id
      order by pp.phase_number, pp.position nulls last
    loop
      for v_week in 1..greatest(coalesce(v_phase.weeks_count, 1), 1)
      loop
        -- Ровно то же правило выбора недельного шаблона, что у генератора:
        -- свои дни недели, иначе дни недели 1 той же фазы.
        select count(*) into v_days
        from program_days pd
        where pd.phase_id = v_phase.id and pd.week_number = v_week;

        if v_days = 0 then
          select count(*) into v_days
          from program_days pd
          where pd.phase_id = v_phase.id and pd.week_number = 1;

          if v_days = 0 then
            continue; -- ни своих дней, ни недели 1 — генератор тоже пропускает
          end if;
        end if;

        for v_day in
          select pd.* from program_days pd
          where pd.phase_id = v_phase.id
            and pd.week_number = case
              when exists (
                select 1 from program_days x
                where x.phase_id = v_phase.id and x.week_number = v_week
              ) then v_week
              else 1
            end
          order by pd.day_number, pd.position nulls last
        loop
          if not exists (
            select 1 from workouts w
            where w.user_id = v_prog.user_id
              and w.program_id = v_prog.program_id
              and coalesce(w.phase_number, 1) = v_phase.phase_number
              and coalesce(w.week_number, 1) = v_week
              and w.day_index = v_day.day_number
          ) then
            insert into workouts
              (user_id, program_id, name, phase_number, week_number, day_index,
               created_at)
            values
              (v_prog.user_id, v_prog.program_id, v_day.name,
               v_phase.phase_number, v_week, v_day.day_number, now())
            returning id into v_wid;

            insert into workout_exercises
              (workout_id, exercise_id, order_index, position, target_sets,
               target_reps_range, rest_seconds, intensity, target_rpe,
               progression_policy)
            select
              v_wid,
              pe.exercise_id,
              pe.position,
              pe.position,
              pe.sets,
              pe.reps_range,
              pe.rest_seconds,
              pe.intensity, pe.target_rpe, pe.progression_policy
            from program_exercises pe
            where pe.program_day_id = v_day.id
              and pe.exercise_id is not null
            order by pe.position;

            get diagnostics v_rows = row_count;
            v_exercises := v_exercises + v_rows;
            v_workouts := v_workouts + 1;
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  raise notice 'SYNC-WK-RESTORE: создано тренировок=%, строк упражнений=%',
    v_workouts, v_exercises;
end
$do$;
