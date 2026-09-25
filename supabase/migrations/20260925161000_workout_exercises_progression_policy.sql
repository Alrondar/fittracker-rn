-- FD-4 (вариант A, согласован 25.09): progression_policy end-to-end
--
-- Два leak'а:
--   1) workout_exercises не имел колонки policy → снапшот тренировки (
--      startNextWorkout) терял политику, движок всегда жил по 'linear';
--   2) save_program_snapshot (редактор программ) не включал progression_policy
--      в upsert program_exercises → политика не доходила даже до шаблона.
-- Тело функции взято побайтово из прод-дампа pg_get_functiondef от 25.09
-- (репо не содержало определения — drift по SEC-15 исправляется здесь же);
-- изменения строго помечены [FD-4].
--
-- Blast radius: ADD COLUMN с DEFAULT — 2126 строк workout_exercises получают
-- 'linear' (текущее фактически поведение движка, семантика не меняется);
-- 0 строк program_exercises имеют нелинейную политику (проверено count'ом).
-- Откат: см. rollback в конце файла (drop column + тело до изменений).

BEGIN;

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS progression_policy text DEFAULT 'linear';

COMMENT ON COLUMN public.workout_exercises.progression_policy IS
  'FD-4: политика прогрессии, скопированная из program_exercises при сиде тренировки: linear, double_progression, greyskull, time_based';

CREATE OR REPLACE FUNCTION public.save_program_snapshot(p_program_id text, p_schedule jsonb, p_deleted_phase_ids jsonb, p_deleted_day_ids jsonb, p_deleted_exercise_ids jsonb, p_phases jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;

  v_phase jsonb;
  v_day jsonb;
  v_exercise jsonb;

  v_real_phase_id text;
  v_real_day_id uuid;

  v_phase_id_map jsonb := '{}';
  v_day_id_map jsonb := '{}';

  v_deleted_phase_id text;
  v_deleted_day_id uuid;
  v_deleted_exercise_id uuid;

  v_schedule text[];
BEGIN
  -- ========================================================
  -- 1. Проверка владельца
  -- ========================================================
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

  -- ========================================================
  -- 2. Обновление расписания: jsonb -> text[]
  -- ========================================================
  IF p_schedule IS NOT NULL THEN
    IF jsonb_typeof(p_schedule) = 'array' THEN
      SELECT COALESCE(array_agg(trim(t.elem) ORDER BY t.rn), '{}'::text[])
      INTO v_schedule
      FROM jsonb_array_elements_text(p_schedule) WITH ORDINALITY AS t(elem, rn)
      WHERE t.elem IS NOT NULL
        AND trim(t.elem) <> '';
    ELSE
      v_schedule := '{}'::text[];
    END IF;

    UPDATE programs
    SET schedule = v_schedule
    WHERE id = p_program_id;
  END IF;

  -- ========================================================
  -- 3. Удаление помеченных сущностей
  -- ========================================================

  -- 3.1. Фазы: program_phases.id = text
  FOR v_deleted_phase_id IN
    SELECT x
    FROM jsonb_array_elements_text(
      COALESCE(p_deleted_phase_ids, '[]'::jsonb)
    ) AS x
  LOOP
    DELETE FROM program_exercises
    WHERE program_day_id IN (
      SELECT id
      FROM program_days
      WHERE phase_id = v_deleted_phase_id
    );

    DELETE FROM program_days
    WHERE phase_id = v_deleted_phase_id;

    DELETE FROM program_phases
    WHERE id = v_deleted_phase_id;
  END LOOP;

  -- 3.2. Дни: program_days.id = uuid
  FOR v_deleted_day_id IN
    SELECT x::uuid
    FROM jsonb_array_elements_text(
      COALESCE(p_deleted_day_ids, '[]'::jsonb)
    ) AS x
  LOOP
    DELETE FROM program_exercises
    WHERE program_day_id = v_deleted_day_id;

    DELETE FROM program_days
    WHERE id = v_deleted_day_id;
  END LOOP;

  -- 3.3. Упражнения: program_exercises.id = uuid
  FOR v_deleted_exercise_id IN
    SELECT x::uuid
    FROM jsonb_array_elements_text(
      COALESCE(p_deleted_exercise_ids, '[]'::jsonb)
    ) AS x
  LOOP
    DELETE FROM program_exercises
    WHERE id = v_deleted_exercise_id;
  END LOOP;

  -- ========================================================
  -- 4. Upsert фаз
  -- ========================================================
  FOR v_phase IN
    SELECT *
    FROM jsonb_array_elements(COALESCE(p_phases, '[]'::jsonb))
  LOOP
    IF (v_phase->>'isNew')::boolean THEN
      INSERT INTO program_phases (
        program_id,
        phase_number,
        name,
        phase_type,
        weeks_count,
        description,
        position
      )
      VALUES (
        p_program_id,
        (v_phase->>'phase_number')::int,
        v_phase->>'name',
        v_phase->>'phase_type',
        (v_phase->>'weeks_count')::int,
        v_phase->>'description',
        (v_phase->>'position')::int
      )
      RETURNING id INTO v_real_phase_id;

      v_phase_id_map := v_phase_id_map || jsonb_build_object(
        v_phase->>'id',
        v_real_phase_id
      );
    ELSE
      v_real_phase_id := v_phase->>'id';

      v_phase_id_map := v_phase_id_map || jsonb_build_object(
        v_phase->>'id',
        v_real_phase_id
      );

      UPDATE program_phases
      SET
        phase_number = (v_phase->>'phase_number')::int,
        name = v_phase->>'name',
        phase_type = v_phase->>'phase_type',
        weeks_count = (v_phase->>'weeks_count')::int,
        description = v_phase->>'description',
        position = (v_phase->>'position')::int
      WHERE id = v_real_phase_id;
    END IF;

    -- ======================================================
    -- 5. Upsert дней для этой фазы
    -- ======================================================
    FOR v_day IN
      SELECT *
      FROM jsonb_array_elements(COALESCE(v_phase->'days', '[]'::jsonb))
    LOOP
      IF (v_day->>'isNew')::boolean THEN
        INSERT INTO program_days (
          program_id,
          phase_id,
          week_number,
          day_number,
          name,
          position
        )
        VALUES (
          p_program_id,
          v_real_phase_id,
          (v_day->>'week_number')::int,
          (v_day->>'day_number')::int,
          v_day->>'name',
          (v_day->>'position')::int
        )
        RETURNING id INTO v_real_day_id;

        v_day_id_map := v_day_id_map || jsonb_build_object(
          v_day->>'id',
          v_real_day_id::text
        );
      ELSE
        v_real_day_id := (v_day->>'id')::uuid;

        v_day_id_map := v_day_id_map || jsonb_build_object(
          v_day->>'id',
          v_real_day_id::text
        );

        UPDATE program_days
        SET
          phase_id = v_real_phase_id,
          week_number = (v_day->>'week_number')::int,
          day_number = (v_day->>'day_number')::int,
          name = v_day->>'name',
          position = (v_day->>'position')::int
        WHERE id = v_real_day_id;
      END IF;

      -- ====================================================
      -- 6. Upsert упражнений для этого дня
      -- ====================================================
      FOR v_exercise IN
        SELECT *
        FROM jsonb_array_elements(COALESCE(v_day->'exercises', '[]'::jsonb))
      LOOP
        IF (v_exercise->>'isNew')::boolean THEN
          INSERT INTO program_exercises (
            program_day_id,
            exercise_id,
            exercise_name,
            sets,
            reps_range,
            rest_seconds,
            intensity,
            position,
            progression_policy  -- [FD-4]
          )
          VALUES (
            v_real_day_id,
            nullif(v_exercise->>'exercise_id', '')::uuid,
            v_exercise->>'exercise_name',
            (v_exercise->>'sets')::int,
            v_exercise->>'reps_range',
            (v_exercise->>'rest_seconds')::int,
            v_exercise->>'intensity',
            (v_exercise->>'position')::int,
            COALESCE(v_exercise->>'progression_policy', 'linear')  -- [FD-4]
          );
        ELSE
          UPDATE program_exercises
          SET
            exercise_id = nullif(v_exercise->>'exercise_id', '')::uuid,
            exercise_name = v_exercise->>'exercise_name',
            sets = (v_exercise->>'sets')::int,
            reps_range = v_exercise->>'reps_range',
            rest_seconds = (v_exercise->>'rest_seconds')::int,
            intensity = v_exercise->>'intensity',
            position = (v_exercise->>'position')::int,
            -- [FD-4] COALESCE: клиент без ключа progression_policy (старая
            -- сборка приложения) не затирает уже сохранённую политику
            progression_policy = COALESCE(v_exercise->>'progression_policy', progression_policy)
          WHERE id = (v_exercise->>'id')::uuid;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

COMMIT;

-- Rollback (запускать вручную при откате):
-- BEGIN;
-- ALTER TABLE public.workout_exercises DROP COLUMN IF EXISTS progression_policy;
-- \i supabase/baseline/save_program_snapshot.prod-dump-2026-09-25.sql
-- COMMIT;
-- (baseline-файл = точное прод-тело до [FD-4]-правок, лежит в репо)
