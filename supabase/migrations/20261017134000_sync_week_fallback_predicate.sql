-- ============================================================================
-- SYNC-WK (17.10.2026): предикат синхронизации программы с тренировками
-- учитывает week-fallback генератора, а не только явные строки недели.
--
-- Дефект. `sync_program_changes_to_workouts` связывал тренировку с шаблоном
-- строгой тройкой (phase_number, week_number, day_index) и всё, что не
-- совпало, удалял вместе с exercise-строками. Генератор тренировок для недель,
-- у которых нет своих program_days, подставляет дни недели 1 той же фазы и
-- записывает в строку week_number = 2..N
-- (supabase/migrations/20260925224000_carry_rpe_into_scheduled_workouts.sql:80-116).
-- Значит у каждой личной программы с weeks_count > 1 и днями на одной неделе
-- (7f3c1a90-…0001/0002, a3000000-…, a2000000-…, a4000000-…) любое сохранение
-- программы в редакторе (src/hooks/useProgramEditor.ts:247) или замена
-- упражнения внутри программы (src/services/programsService.ts:980,1062)
-- удаляло ВСЕ неначатые тренировки будущих недель и их упражнения.
-- Живое следствие: у 6416429a программа …0002 потеряла 20 тренировок из 40
-- (13.10), день 4 недели 2 пришлось восстанавливать вручную
-- (20261017130000_restore_day4_week2_6416429a.sql).
--
-- Счётчики предиката, снятые 17.10 до правки (только существующие программы,
-- неначатые тренировки): всего 231, под старым предикатом 129 сирот,
-- под новым — 0. Отдельно 208 неначатых строк висят на program_id, которых в
-- таблицах programs/program_phases уже нет: sync их не трогает (guard
-- 'Program not found' отсекает раньше), это отдельный DQ-хвост.
--
-- Правка: единый «эффективный шаблон» (program_effective_days) — строки своей
-- недели, а для недели, которой в шаблоне нет, строки недели 1 той же фазы.
-- Правило совпадает с генератором, поэтому тренировка будущей недели перестаёт
-- быть сиротой. Настоящее удаление дня из программы по-прежнему удаляет его
-- неначатую тренировку: ветка «неделя есть в шаблоне» остаётся строгой.
--
-- Побочный (запланированный) эффект: statements 2–5 раньше для недель 2+ не
-- делали ничего (join не совпадал), теперь синхронизируют и их — имена дней и
-- состав/параметры упражнений доезжают до будущих тренировок.
--
-- Свойства сохраняем: SECURITY DEFINER, search_path=public, владелец postgres,
-- аргумент p_program_id text, guard v_user_id != auth.uid(), область
-- started_at IS NULL AND finished_at IS NULL, гранты authenticated/service_role
-- без PUBLIC и без anon. Для нового helper — та же схема грантов.
--
-- Дамп тела до правки:
--   supabase/baseline/sync_program_changes_to_workouts.prod-dump-2026-10-17-pre-fix.sql
--   md5 прод-тела = 552dbd98b3feab7791c94fcf043bb1ec, длина prosrc 5123
-- Откат: применить этот дамп (CREATE OR REPLACE) + drop helper'а:
--   drop function if exists public.program_effective_days(text, uuid);
-- Данные откатывать не нужно: правка ничего не переписывает в момент применения.
-- ============================================================================

-- --- шаг 1: эффективный шаблон дней -----------------------------------------
CREATE OR REPLACE FUNCTION public.program_effective_days(p_program_id text, p_user_id uuid)
 RETURNS TABLE(phase_number int, week_number int, day_number int, program_day_id uuid, day_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- Ветка 1: недели, у которых есть свои дни, — связка остаётся строгой.
  select pp.phase_number, pd.week_number, pd.day_number, pd.id, pd.name
  from program_phases pp
  join program_days pd on pd.phase_id = pp.id
  where pp.program_id = p_program_id

  union all

  -- Ветка 2: недели без своих дней берут дни недели 1 — ровно как генератор.
  -- Условие week_number <> 1 нужно, чтобы не продублировать неделю 1, когда
  -- она есть в шаблоне; непересечение веток даёт уникальность по
  -- (фаза, неделя, день), поэтому все join'ы ниже остаются 1:1.
  select pp.phase_number, u.week_number, pd.day_number, pd.id, pd.name
  from (
    select distinct coalesce(w.phase_number, 1) as phase_number,
                    coalesce(w.week_number, 1)  as week_number
    from workouts w
    where w.program_id = p_program_id
      and w.user_id = p_user_id
  ) u
  join program_phases pp
    on pp.program_id = p_program_id
   and pp.phase_number = u.phase_number
  join program_days pd
    on pd.phase_id = pp.id
   and pd.week_number = 1
  where u.week_number <> 1
    and not exists (
      select 1 from program_days x
      where x.phase_id = pp.id
        and x.week_number = u.week_number
    );
$function$
;

REVOKE ALL ON FUNCTION public.program_effective_days(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.program_effective_days(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.program_effective_days(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.program_effective_days(text, uuid) TO service_role;

-- --- шаг 2: предикат синхронизации -------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_program_changes_to_workouts(p_program_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_deleted_workouts int := 0;
  v_updated_workouts int := 0;
  v_deleted_exercises int := 0;
  v_updated_exercises int := 0;
  v_inserted_exercises int := 0;
BEGIN
  SELECT created_by::uuid
  INTO v_user_id
  FROM programs
  WHERE id = p_program_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  future_workouts AS (
    SELECT
      w.id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workouts w
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  orphaned AS (
    SELECT fw.id
    FROM future_workouts fw
    -- [SYNC-WK] был LEFT JOIN program_phases + program_days по строгой тройке.
    LEFT JOIN eff e
      ON e.phase_number = fw.phase_number
     AND e.week_number = fw.week_number
     AND e.day_number = fw.day_index
    WHERE e.program_day_id IS NULL
      -- [SYNC-WK] строки без номера дня не удаляем: раньше они проваливались
      -- в сироты из-за NULL в join'е, ad-hoc тренировки это не потеря шаблона.
      AND fw.day_index IS NOT NULL
  )
  DELETE FROM workouts
  WHERE id IN (
    SELECT id FROM orphaned
  );

  GET DIAGNOSTICS v_deleted_workouts = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  )
  UPDATE workouts w
  SET name = e.day_name
  FROM eff e
  WHERE w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL
    AND e.phase_number = w.phase_number
    AND e.week_number = w.week_number
    AND e.day_number = w.day_index
    AND w.name IS DISTINCT FROM e.day_name;

  GET DIAGNOSTICS v_updated_workouts = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  future_workout_exercises AS (
    SELECT
      we.id AS workout_exercise_id,
      we.workout_id,
      we.exercise_id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workout_exercises we
    JOIN workouts w
      ON w.id = we.workout_id
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  orphaned_exercises AS (
    SELECT fwe.workout_exercise_id
    FROM future_workout_exercises fwe
    -- [SYNC-WK] цепочка pp -> pd заменена на eff -> pe.
    LEFT JOIN eff e
      ON e.phase_number = fwe.phase_number
     AND e.week_number = fwe.week_number
     AND e.day_number = fwe.day_index
    LEFT JOIN program_exercises pe
      ON pe.program_day_id = e.program_day_id
     AND pe.exercise_id = fwe.exercise_id
    WHERE pe.id IS NULL
      AND fwe.day_index IS NOT NULL
  )
  DELETE FROM workout_exercises
  WHERE id IN (
    SELECT workout_exercise_id FROM orphaned_exercises
  );

  GET DIAGNOSTICS v_deleted_exercises = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  )
  UPDATE workout_exercises AS we
  SET
    sets = pe.sets,
    target_reps_range = pe.reps_range,
    rest_seconds = pe.rest_seconds,
    intensity = pe.intensity,
    position = pe.position,
    order_index = pe.position
  FROM workouts AS w
  JOIN eff AS e
    ON e.phase_number = w.phase_number
   AND e.week_number = w.week_number
   AND e.day_number = w.day_index
  JOIN program_exercises AS pe
    ON pe.program_day_id = e.program_day_id
  WHERE we.workout_id = w.id
    AND pe.exercise_id = we.exercise_id
    AND w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL;

  GET DIAGNOSTICS v_updated_exercises = ROW_COUNT;

  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  ),
  target_workouts AS (
    SELECT
      w.id AS workout_id,
      w.phase_number,
      w.week_number,
      w.day_index
    FROM workouts w
    WHERE w.user_id = v_user_id
      AND w.program_id = p_program_id
      AND w.started_at IS NULL
      AND w.finished_at IS NULL
  ),
  missing_exercises AS (
    SELECT
      tw.workout_id,
      pe.exercise_id,
      pe.sets,
      pe.reps_range,
      pe.rest_seconds,
      pe.intensity,
      pe.position
    FROM target_workouts tw
    JOIN eff e
      ON e.phase_number = tw.phase_number
     AND e.week_number = tw.week_number
     AND e.day_number = tw.day_index
    JOIN program_exercises pe
      ON pe.program_day_id = e.program_day_id
    LEFT JOIN workout_exercises we
      ON we.workout_id = tw.workout_id
     AND we.exercise_id = pe.exercise_id
    WHERE we.id IS NULL
      AND pe.exercise_id IS NOT NULL
  )
  INSERT INTO workout_exercises (
    workout_id,
    exercise_id,
    sets,
    target_reps_range,
    rest_seconds,
    intensity,
    position,
    order_index
  )
  SELECT
    workout_id,
    exercise_id,
    sets,
    reps_range,
    rest_seconds,
    intensity,
    position,
    position
  FROM missing_exercises;

  GET DIAGNOSTICS v_inserted_exercises = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_workouts', v_deleted_workouts,
    'updated_workouts', v_updated_workouts,
    'deleted_exercises', v_deleted_exercises,
    'updated_exercises', v_updated_exercises,
    'inserted_exercises', v_inserted_exercises
  );
END;
$function$
;
