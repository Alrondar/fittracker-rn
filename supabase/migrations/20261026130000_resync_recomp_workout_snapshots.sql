-- ============================================================================
-- Патч снимков тренировок программы «Рекомпозиция — 3 дня, акцент грудь»
-- Экземпляр: c9d3e430-0000-4000-8000-000000000001 (владелец 6416429a-…)
--
-- Причина: программа была запущена в 11:38, а правки состава и объёма легли в
-- 11:50 (три позиции снаряда) и 12:20 (подходы и повторы). Тренировки — снимки,
-- они сами не переписываются, поэтому 99 строк из 324 отстали от программы:
--   36 — висит старое упражнение (тяга гантели, пуловер штангой, носки в платформе)
--   53 — старое число подходов
--   10 — старые повторы (жим лёжа и присед в объёмной фазе)
--
-- Что делает: приводит каждую строку workout_exercises не начатого занятия к
-- значению той же позиции в программе — ровно то, что вставила бы функция
-- create_workouts_for_program при «Перезапустить». Колонку `sets` не трогает:
-- генерация её не пишет (там остаётся DEFAULT 3), экран занятия читает
-- target_sets (src/hooks/workout/useWorkoutSession.mapper.ts:65).
--
-- Границы: только workouts этого пользователя и этой программы, где
-- started_at IS NULL AND finished_at IS NULL. Начатых и завершённых нет
-- (проверено: 36 не начатых, 0 начатых, заложенных подходов 0), поэтому
-- история занятий не переписывается.
--
-- Привязка — по (номер фазы, номер дня, позиция): позиции в программе не
-- менялись, а exercise_id в снимках местами устарел, поэтому матчить по нему
-- нельзя. Недельных шаблонов в программе нет (все дни week_number = 1), так что
-- fallback недели на 1 — это то же правило, по которому занималась генерация.
-- ============================================================================

with want as (
  select w.id as workout_id,
         pe.position, pe.exercise_id, pe.exercise_name,
         pe.sets, pe.reps_range, pe.rest_seconds, pe.intensity,
         pe.target_rpe, pe.progression_policy
    from workouts w
    join program_phases ph   on ph.program_id = w.program_id
                            and ph.phase_number = w.phase_number
    join program_days pd     on pd.phase_id = ph.id
                            and pd.week_number = 1
                            and pd.day_number = w.day_index
    join program_exercises pe on pe.program_day_id = pd.id
   where w.program_id = 'c9d3e430-0000-4000-8000-000000000001'
     and w.user_id = '6416429a-10ef-4e35-ab2f-6c405ee4b283'
     and w.started_at is null
     and w.finished_at is null
)
update workout_exercises we
   set exercise_id         = x.exercise_id,
       target_sets         = x.sets,
       target_reps_range   = x.reps_range,
       rest_seconds        = x.rest_seconds,
       intensity           = x.intensity,
       target_rpe          = x.target_rpe,
       progression_policy  = x.progression_policy
  from want x
 where we.workout_id = x.workout_id
   and we.position = x.position
   and (   we.exercise_id is distinct from x.exercise_id
        or we.target_sets is distinct from x.sets
        or we.target_reps_range is distinct from x.reps_range
        or we.rest_seconds is distinct from x.rest_seconds
        or we.intensity is distinct from x.intensity
        or we.target_rpe is distinct from x.target_rpe
        or we.progression_policy is distinct from x.progression_policy);

-- ============================================================================
-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ
--   1) ни одной расходящейся строки не осталось (сверка снимка с программой
--      по тем же семи полям) — ожидаем 0
--   2) контрольная сумма снимков = контрольная сумма строк программы
--   3) начатых/завершённых занятий по-прежнему 0, заложенных подходов 0
--   4) всего строк в снимках 324 (по 9/8/10 на занятие)
--
-- ОТКАТ не предусмотрен как отдельный файл: значения возвращаются повторением
-- этого же UPDATE от старой программы (снимок до правки = то, что лежало в
-- program_exercises до миграций fix_recomp_three_positions и
-- tune_recomp_biceps_and_base_sets). Проще всего откатиться штатно — нажать
-- «Перезапустить» уже на исправленной программе, это тот же результат.
-- ============================================================================
