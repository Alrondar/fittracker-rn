-- ============================================================================
-- RPE-2: заполнение исторических target_rpe (прод, 25.09.2026).
--
-- Причина: до RPE-1 (миграции 223000/224000) поле физически не сохранялось,
-- поэтому во всех строках шаблонов и их копях стоит NULL, и ветка движка
-- RPE_UNDER_TARGET (progression.ts:604-614) не работала ни у кого.
--
-- Канон значения (детерминированный, из самих данных, без гадания по упражнениям):
--   фаза deload                -> 6   (вес и так снижен, запас большой)
--   intensity = 'low'          -> 9   (изоляция/аксессуары работают ближе к отказу)
--   intensity = 'medium|high'  -> 8   (базовые и подсобные рабочие движения = RIR 2)
-- Проверка ветки: increase срабатывает при evalRpe <= target - 2, то есть для
-- target 8 нужен записанный RPE <= 6, для 9 — <= 7, для 6 — <= 4 (на делоаде
-- практически недостижимо => рекомендаций «поднимать вес» на делоаде не появится).
--
-- Область: ТОЛЬКО шаблоны (created_by IS NULL) и их копии (source_program_id IS NOT
-- NULL) = 903 строки program_exercises. Авторские программы пользователей (34 строки,
-- 2 автора) не трогаем: там интенсивность выбирал человек, а не куратор каталога.
-- Идемпотентность: update только WHERE target_rpe IS NULL — то, что пользователь
-- задал руками (после RPE-1), не затирается.
--
-- Вторая часть: открытые плановые тренировки (workout_exercises, 638 строк) — они
-- создавались снапшотом до починки и остались с NULL. Сопоставление с программой
-- проверено до записи: (phase_number, day_index, exercise_id) даёт ровно 1 строку
-- программы для всех 638 (unmatchable = 0, ambiguous = 0), поэтому перенос безопасен.
-- Выполненные и пропущенные тренировки не трогаем: там история рекомендаций уже
-- состоялась и менять её задним числом нельзя.
--
-- Откат (все затронутые строки были NULL, поэтому откат точный):
--   update program_exercises e set target_rpe = null
--     from program_days d join programs p on p.id = d.program_id
--     where d.id = e.program_day_id and e.target_rpe is not null
--       and (p.created_by is null or p.source_program_id is not null)
--       and p.id in (select id from programs where created_by is null or source_program_id is not null);
--   -- и workout_exercises по тому же join, где we.target_rpe было NULL до миграции.
--   Прагматичный откат одной строкой (значения 6/8/9 проставлены только здесь):
--   update program_exercises e set target_rpe = null
--     from program_days d join programs p on p.id = d.program_id
--     where d.id = e.program_day_id
--       and (p.created_by is null or p.source_program_id is not null)
--       and e.target_rpe in (6,8,9);
-- ============================================================================

-- 1) шаблоны и их копии
update program_exercises e
   set target_rpe = case
                      when coalesce(ph.phase_type, 'none') = 'deload' then 6
                      when e.intensity = 'low' then 9
                      else 8
                    end
  from program_days d
  join programs p on p.id = d.program_id
  join program_phases ph on ph.id = d.phase_id
 where d.id = e.program_day_id
   and e.target_rpe is null
   and (p.created_by is null or p.source_program_id is not null);

-- 2) открытые плановые тренировки, снапшот которых снят до RPE-1.
--    Маппинг идёт подсеткой: в `UPDATE … FROM` нельзя ссылаться на псевдоним
--    обновляемой таблицы внутри JOIN-ов (первая попытка упала на 42P01).
--    min() безопасен: сопоставление (phase_number, day_index, exercise_id)
--    проверено как 1:1 для всех 638 строк (ambiguous = 0).
update workout_exercises we
   set target_rpe = m.tr
  from (
        select we2.id as we_id, min(pe.target_rpe) as tr
          from workouts w
          join workout_exercises we2 on we2.workout_id = w.id
          join programs p on p.id = w.program_id
          join program_phases ph on ph.program_id = p.id and ph.phase_number = w.phase_number
          join program_days pd on pd.phase_id = ph.id and pd.day_number = w.day_index
          join program_exercises pe on pe.program_day_id = pd.id and pe.exercise_id = we2.exercise_id
         where we2.target_rpe is null
           and pe.target_rpe is not null
           and w.finished_at is null
           and w.skipped_at is null
           and (p.created_by is null or p.source_program_id is not null)
         group by we2.id
  ) m
 where we.id = m.we_id
   and we.target_rpe is null;
