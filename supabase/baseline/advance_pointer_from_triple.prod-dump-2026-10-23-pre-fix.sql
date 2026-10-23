-- Дамп тела public.advance_pointer_from_triple из прода ДО правки
-- «указатель = первый незакрытый день» (20261023070000_pointer_first_unclosed_day.sql).
-- Снят 23.10.2026 04:2x UTC через pg_get_functiondef.
-- прод-md5 = 464c7a2b0c7c75ce2a102ecc47496ccb, длина 4610, аргументов 5.
-- Реверс: выполнить этот файл как миграцию (CREATE OR REPLACE с той же
-- сигнатурой — перегрузки не появляется).
CREATE OR REPLACE FUNCTION public.advance_pointer_from_triple(p_user_id uuid, p_program_id text, p_phase integer, p_week integer, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_up_id       uuid;
  v_phase_id    text;
  v_weeks_count int;
  v_days        int;
  v_new_phase   int;
  v_new_week    int;
  v_new_day     int;
  v_cur_phase   int;
  v_cur_week    int;
  v_cur_day     int;
BEGIN
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_program_id IS NULL OR p_phase IS NULL OR p_week IS NULL OR p_day IS NULL THEN
    RETURN jsonb_build_object('status', 'no_workout');
  END IF;

  SELECT up.id,
         coalesce(up.current_phase, 1),
         coalesce(up.current_week, 1),
         coalesce(up.current_day, 1)
    INTO v_up_id, v_cur_phase, v_cur_week, v_cur_day
    FROM user_programs up
   WHERE up.user_id = p_user_id
     AND up.program_id = p_program_id
     AND up.is_active
   ORDER BY up.started_at DESC NULLS LAST
   LIMIT 1
     FOR UPDATE;

  IF v_up_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_active');
  END IF;

  IF ROW(v_cur_phase, v_cur_week, v_cur_day)
     IS DISTINCT FROM ROW(p_phase, p_week, p_day) THEN
    RETURN jsonb_build_object(
      'status', 'already_advanced',
      'phase', v_cur_phase, 'week', v_cur_week, 'day', v_cur_day
    );
  END IF;

  SELECT pp.id, coalesce(pp.weeks_count, 1)
    INTO v_phase_id, v_weeks_count
    FROM program_phases pp
   WHERE pp.program_id = p_program_id
     AND pp.phase_number = v_cur_phase;

  IF v_phase_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM program_phases pp WHERE pp.program_id = p_program_id) THEN
      RETURN jsonb_build_object(
        'status', 'pointer_stale',
        'phase', v_cur_phase, 'week', v_cur_week, 'day', v_cur_day
      );
    END IF;

    SELECT count(*) INTO v_days FROM program_days pd WHERE pd.program_id = p_program_id;
    IF v_days = 0 THEN
      v_days := 5;
    END IF;

    SELECT coalesce(p.duration, 8) INTO v_weeks_count FROM programs p WHERE p.id = p_program_id;
    IF v_weeks_count IS NULL THEN
      v_weeks_count := 8;
    END IF;

    v_new_phase := 1;
    v_new_week  := v_cur_week;
    v_new_day   := v_cur_day + 1;

    IF v_new_day > v_days THEN
      v_new_day  := 1;
      v_new_week := v_cur_week + 1;

      IF v_new_week > v_weeks_count THEN
        UPDATE user_programs
           SET is_active = false, completed_at = now()
         WHERE id = v_up_id;
        RETURN jsonb_build_object(
          'status', 'completed',
          'phase', 1, 'week', v_weeks_count, 'day', v_days
        );
      END IF;
    END IF;

    UPDATE user_programs
       SET current_week = v_new_week, current_day = v_new_day
     WHERE id = v_up_id;

    RETURN jsonb_build_object(
      'status', 'advanced',
      'phase', v_cur_phase, 'week', v_new_week, 'day', v_new_day
    );
  END IF;

  SELECT count(*) INTO v_days
    FROM program_days pd
   WHERE pd.phase_id = v_phase_id
     AND pd.week_number = v_cur_week;

  IF v_days = 0 THEN
    SELECT count(*) INTO v_days
      FROM program_days pd
     WHERE pd.phase_id = v_phase_id
       AND pd.week_number = 1;
  END IF;

  IF v_days = 0 THEN
    v_days := 1;
  END IF;

  v_new_phase := v_cur_phase;
  v_new_week  := v_cur_week;
  v_new_day   := v_cur_day + 1;

  IF v_new_day > v_days THEN
    v_new_day  := 1;
    v_new_week := v_cur_week + 1;

    IF v_new_week > v_weeks_count THEN
      v_new_week  := 1;
      v_new_phase := v_cur_phase + 1;

      IF NOT EXISTS (
        SELECT 1 FROM program_phases pp
        WHERE pp.program_id = p_program_id
          AND pp.phase_number = v_new_phase
      ) THEN
        UPDATE user_programs
           SET is_active = false, completed_at = now()
         WHERE id = v_up_id;
        RETURN jsonb_build_object(
          'status', 'completed',
          'phase', v_cur_phase, 'week', v_cur_week, 'day', v_days
        );
      END IF;
    END IF;
  END IF;

  UPDATE user_programs
     SET current_phase = v_new_phase,
         current_week  = v_new_week,
         current_day   = v_new_day
   WHERE id = v_up_id;

  RETURN jsonb_build_object(
    'status', 'advanced',
    'phase', v_new_phase, 'week', v_new_week, 'day', v_new_day
  );
END;
$function$
;
