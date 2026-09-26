-- ============================================================================
-- RPE-1: целевой RPE больше не теряется при сохранении и копировании программы.
--
-- Диагноз (проверено прод-запросами и чтением кода 25.09.2026):
--   * ExerciseSettingsSheet.tsx:354 отдаёт target_rpe, useProgramEditor.ts:222
--     кладёт его в payload -> клиент менять НЕ нужно, дыра только на сервере;
--   * save_program_snapshot не имел target_rpe ни в INSERT, ни в UPDATE-списке ->
--     значение выбрасывалось молча: в проде 0 из 937 строк program_exercises и
--     0 workout_exercises с target_rpe;
--   * copy_program_for_user копировал 8 колонок из 10 -> при копировании готовой
--     программы терялись target_rpe И progression_policy.
--   progression.ts обе ветки читает, поэтому фича ENG-17 в UI выглядела рабочей.
--
-- Техника правки: тела взяты побайтово из текущих прод-версий, добавлены только
--   блоки с меткой [RPE-1]. Генератор проверяет обратимость: после удаления этих
--   блоков тело совпадает с оригиналом по md5 (значит ничего больше не сдвинуто).
--   До правки: save_program_snapshot md5=86e8e5474a777d4f50d2780be0cec97c (7293),
--             copy_program_for_user md5=e1fa33bfc68f4d14bf1ed7969cc11c7b (3279).
--   CREATE OR REPLACE сохраняет ACL, SECURITY DEFINER и search_path (проверено на
--   FD-4): гранты authenticated/service_role и запрет anon (SEC-11) не затрагиваются.
--   SEC-12 guard (p_user_id IS DISTINCT FROM auth.uid()) в copy остаётся нетронутым.
--
-- Откат: переприменить тела из supabase/migrations/20260925161000_*.sql
--   (save_program_snapshot) и 20260924051742_*.sql (copy_program_for_user) без
--   [RPE-1]-блоков. Схема не меняется: колонка target_rpe существует с миграции
--   20260904094734 (CHECK 1..10), данные не затираются.
-- ============================================================================

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
            progression_policy,  -- [FD-4]
            target_rpe  -- [RPE-1]
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
            COALESCE(v_exercise->>'progression_policy', 'linear'),  -- [FD-4]
            (nullif(v_exercise->>'target_rpe', ''))::smallint  -- [RPE-1]
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
            progression_policy = COALESCE(v_exercise->>'progression_policy', progression_policy),
            -- [RPE-1] явный null (шкалу сбросили в «—») ОБЯЗАН очищать поле, поэтому
            -- проверка наличия ключа jsonb_exists(), а не COALESCE: сборка без ключа
            -- target_rpe не затирает сохранённое, новая — может сбросить.
            target_rpe = CASE WHEN jsonb_exists(v_exercise, 'target_rpe')
                              THEN (nullif(v_exercise->>'target_rpe', ''))::smallint
                              ELSE target_rpe END
          WHERE id = (v_exercise->>'id')::uuid;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.copy_program_for_user(p_program_id text, p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing       programs.id%TYPE;
  v_new_program_id programs.id%TYPE;
  v_phase          record;
  v_new_phase_id   program_phases.id%TYPE;
  v_day            record;
  v_new_day_id     program_days.id%TYPE;
  v_ex             record;
  v_has_phases     boolean;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Нельзя копировать программу для другого пользователя';
  END IF;

  SELECT id INTO v_existing
    FROM programs
   WHERE created_by = p_user_id
     AND source_program_id = p_program_id
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO programs (id, name, level, duration, description, schedule, created_by, source_program_id)
  SELECT gen_random_uuid()::text, name, level, duration, description, schedule, p_user_id, p_program_id
  FROM programs WHERE id = p_program_id
  RETURNING id INTO v_new_program_id;

  SELECT EXISTS (SELECT 1 FROM program_phases WHERE program_id = p_program_id)
  INTO v_has_phases;

  IF v_has_phases THEN
    FOR v_phase IN
      SELECT * FROM program_phases WHERE program_id = p_program_id ORDER BY phase_number
    LOOP
      INSERT INTO program_phases
        (program_id, phase_number, name, phase_type, weeks_count, description, position)
      VALUES
        (v_new_program_id, v_phase.phase_number, v_phase.name, v_phase.phase_type,
         v_phase.weeks_count, v_phase.description, v_phase.position)
      RETURNING id INTO v_new_phase_id;

      FOR v_day IN
        SELECT * FROM program_days WHERE phase_id = v_phase.id ORDER BY week_number, day_number
      LOOP
        INSERT INTO program_days
          (program_id, phase_id, week_number, day_number, name, position)
        VALUES
          (v_new_program_id, v_new_phase_id, v_day.week_number, v_day.day_number,
           v_day.name, v_day.position)
        RETURNING id INTO v_new_day_id;

        FOR v_ex IN
          SELECT * FROM program_exercises WHERE program_day_id = v_day.id ORDER BY position
        LOOP
          INSERT INTO program_exercises
            (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position,
             target_rpe, progression_policy)  -- [RPE-1] раньше эти два поля терялись
          VALUES
            (v_new_day_id, v_ex.exercise_id, v_ex.exercise_name, v_ex.sets,
             v_ex.reps_range, v_ex.rest_seconds, v_ex.intensity, v_ex.position,
             v_ex.target_rpe, v_ex.progression_policy);
        END LOOP;
      END LOOP;
    END LOOP;
  ELSE
    FOR v_day IN
      SELECT * FROM program_days WHERE program_id = p_program_id ORDER BY day_number
    LOOP
      INSERT INTO program_days
        (program_id, phase_id, week_number, day_number, name, position)
      VALUES
        (v_new_program_id, NULL, COALESCE(v_day.week_number, 1),
         v_day.day_number, v_day.name, v_day.position)
      RETURNING id INTO v_new_day_id;

      FOR v_ex IN
        SELECT * FROM program_exercises WHERE program_day_id = v_day.id ORDER BY position
      LOOP
        INSERT INTO program_exercises
          (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position,
           target_rpe, progression_policy)  -- [RPE-1] раньше эти два поля терялись
        VALUES
          (v_new_day_id, v_ex.exercise_id, v_ex.exercise_name, v_ex.sets,
           v_ex.reps_range, v_ex.rest_seconds, v_ex.intensity, v_ex.position,
           v_ex.target_rpe, v_ex.progression_policy);
      END LOOP;
    END LOOP;
  END IF;

  RETURN v_new_program_id;
END;
$function$;
