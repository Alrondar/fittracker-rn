-- SEC-12: copy_program_for_user не проверял, что p_user_id совпадает с auth.uid().
-- Функция SECURITY DEFINER (обходит RLS как postgres), поэтому любой входивший
-- пользователь мог скопировать программу на чужой id. Инвариант CLAUDE.md §RPC:
-- SECURITY DEFINER обязан явно проверять auth.uid() (как в create_workouts_for_program).
-- IS DISTINCT FROM, а не <>, иначе NULL auth.uid() проходил бы проверку.
-- Тело повторяет продефинированную версию 1-в-1, добавлен только guard.

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
            (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
          VALUES
            (v_new_day_id, v_ex.exercise_id, v_ex.exercise_name, v_ex.sets,
             v_ex.reps_range, v_ex.rest_seconds, v_ex.intensity, v_ex.position);
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
          (program_day_id, exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position)
        VALUES
          (v_new_day_id, v_ex.exercise_id, v_ex.exercise_name, v_ex.sets,
           v_ex.reps_range, v_ex.rest_seconds, v_ex.intensity, v_ex.position);
      END LOOP;
    END LOOP;
  END IF;

  RETURN v_new_program_id;
END;
$function$;
