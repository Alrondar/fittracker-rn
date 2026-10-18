-- ============================================================================
-- ADV-atomic (18.10.2026): финиш и пропуск тренировки вместе со сдвигом
-- прогресса — одна транзакция.
--
-- Дефект. Закрытие тренировки было разбито на два независимых запроса:
-- `updateWorkout(finished_at, duration_seconds)`
-- (src/hooks/useWorkoutSession.ts:1257) и `advanceProgramProgress`
-- (src/hooks/useWorkoutSession.ts:1277); пропуск — точно так же
-- (src/services/workoutsService.ts:126-139). Между ними состояние
-- «день закрыт, указатель на нём» виден всем устройствам: бейдж «Следующая»
-- не появляется ни у одного дня (src/utils/workoutsList.ts:24-31 требует
-- точного совпадения тройки), прогноз пуст (src/services/forecastService.ts:109
-- отдаёт null), а старт с дашборда создаёт ВТОРУЮ строку на тот же день
-- (src/services/workoutService.ts:52-65 ищет под указателем незавершённую).
-- Это не теоретический риск: 18.10 первая версия `advance_program_progress`
-- упала на типах ровно в этом окне, и день 4 недели 2 у 6416429a пришлось
-- снимать вручную (20261018110000_advance_pointer_to_day5_6416429a.sql).
--
-- Правка. Три объекта:
--   1) `advance_pointer_from_triple(p_user_id, p_program_id, p_phase, p_week,
--      p_day)` — весь сдвиг указателя (CAS + арифметика) в одном теле: та же
--      проверка `auth.uid()`, та же блокировка строки `FOR UPDATE`, то же
--      правило «дней в неделе» (своя неделя, иначе неделя 1), что у
--      program_effective_days (20261017134000:56-87).
--   2) `finish_workout_and_advance(p_user_id, p_workout_id, p_finished_at,
--      p_duration_seconds, p_skipped)` — пишет finished_at/skipped_at и двигает
--      указатель в одной транзакции. Флаг `already_finished` различает первый
--      финиш и повтор: метки времени первого финиша НЕ перезаписываются,
--      поэтому двойной тап и повтор после обрыва безопасны.
--   3) `advance_program_progress(...)` остаётся тем же телом-обёрткой (та же
--      сигнатура, без DROP — переживать старым бандлам не о чем), но клиент её
--      больше не зовёт.
--
-- Свойства указателя сохранены: ветка «программа с фазами» пишет все три
-- колонки, ветка «без фаз» — только week+day, как в прежнем JS и в
-- 20261018090000:177-180. Читатели указателя (`?? 1` в workoutService.ts:47,
-- workoutsService.ts:55, forecastService.ts:89, dashboardService.ts:337) не
-- замечают изменений.
--
-- Типы id: program_phases.id и program_days.phase_id — text (схема наследует
-- текстовый programs.id); переменные объявлены text. Урок 18.10: откатывающая
-- компиляция plpgsql типов не проверяет.
--
-- Счётчики на 18.10 (чтение): активных user_programs 7, из них с незакрытым
-- предыдущим днём 0; открытых сессий (started_at NOT NULL, finished_at NULL) 3;
-- duplicate_day_rows = 0. Новых имён в pg_proc нет: advance%/%progress% даёт
-- только advance_program_progress.
--
-- Применение: двумя вызовами (helper + обёртка, затем finish) — payload с
-- кириллическими комментариями не проходит одним. Реверс:
--   drop function if exists public.finish_workout_and_advance(uuid, uuid, timestamptz, int, boolean);
--   drop function if exists public.advance_pointer_from_triple(uuid, text, int, int, int);
--   -- и вернуть тело advance_program_progress из 20261018090000
-- плюс откат клиентского коммита. Данных миграция не касается.
-- ============================================================================

-- --- шаг 1: сдвиг указателя по тройке дня ------------------------------------
DROP FUNCTION IF EXISTS public.advance_pointer_from_triple(uuid, text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.advance_pointer_from_triple(
  p_user_id uuid,
  p_program_id text,
  p_phase integer,
  p_week integer,
  p_day integer
)
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

  -- CAS: указатель уже ушёл с этого дня ⇒ день учтён раньше (ретрай, второе
  -- устройство, возврат в просроченную сессию).
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

    -- Программа без фаз: прежняя арифметика (всего дней = все program_days,
    -- иначе 5; недель = programs.duration, иначе 8), current_phase не пишем.
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

REVOKE ALL ON FUNCTION public.advance_pointer_from_triple(uuid, text, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_pointer_from_triple(uuid, text, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_pointer_from_triple(uuid, text, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_pointer_from_triple(uuid, text, integer, integer, integer) TO service_role;

-- --- шаг 2: прежний вызов по id тренировки = тонкая обёртка --------------------
CREATE OR REPLACE FUNCTION public.advance_program_progress(
  p_user_id uuid,
  p_program_id text,
  p_workout_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phase int;
  v_week  int;
  v_day   int;
BEGIN
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT coalesce(w.phase_number, 1),
         coalesce(w.week_number, 1),
         w.day_index
    INTO v_phase, v_week, v_day
    FROM workouts w
   WHERE w.id = p_workout_id
     AND w.user_id = p_user_id
     AND w.program_id = p_program_id;

  IF NOT FOUND OR v_day IS NULL THEN
    RETURN jsonb_build_object('status', 'no_workout');
  END IF;

  RETURN public.advance_pointer_from_triple(p_user_id, p_program_id, v_phase, v_week, v_day);
END;
$function$
;

-- --- шаг 3: финиш (или пропуск) + сдвиг в одной транзакции --------------------
DROP FUNCTION IF EXISTS public.finish_workout_and_advance(uuid, uuid, timestamptz, integer, boolean);

CREATE OR REPLACE FUNCTION public.finish_workout_and_advance(
  p_user_id uuid,
  p_workout_id uuid,
  p_finished_at timestamptz,
  p_duration_seconds integer,
  p_skipped boolean DEFAULT false
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prog         text;
  v_phase        int;
  v_week         int;
  v_day          int;
  v_was_finished boolean;
  v_res          jsonb;
  v_ts           timestamptz := coalesce(p_finished_at, now());
BEGIN
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Строка тренировки блокируется: повторный вызов увидит уже записанный
  -- finished_at и не переставит первую метку времени.
  SELECT w.program_id,
         coalesce(w.phase_number, 1),
         coalesce(w.week_number, 1),
         w.day_index,
         (w.finished_at IS NOT NULL)
    INTO v_prog, v_phase, v_week, v_day, v_was_finished
    FROM workouts w
   WHERE w.id = p_workout_id
     AND w.user_id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_workout', 'already_finished', false);
  END IF;

  IF NOT v_was_finished THEN
    UPDATE workouts
       SET finished_at      = v_ts,
           duration_seconds = coalesce(p_duration_seconds, duration_seconds),
           skipped_at       = CASE WHEN p_skipped THEN v_ts ELSE skipped_at END
     WHERE id = p_workout_id;
  END IF;

  -- Разовая тренировка («повторить тренировку», program_id/day_index NULL):
  -- двигать прогресс не по чему, но финиш ей нужен.
  IF v_prog IS NULL OR v_day IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'finished_no_program',
      'already_finished', v_was_finished
    );
  END IF;

  v_res := public.advance_pointer_from_triple(p_user_id, v_prog, v_phase, v_week, v_day);

  RETURN coalesce(v_res, jsonb_build_object('status', 'no_workout'))
    || jsonb_build_object('already_finished', v_was_finished);
END;
$function$
;

REVOKE ALL ON FUNCTION public.finish_workout_and_advance(uuid, uuid, timestamptz, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_workout_and_advance(uuid, uuid, timestamptz, integer, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.finish_workout_and_advance(uuid, uuid, timestamptz, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_workout_and_advance(uuid, uuid, timestamptz, integer, boolean) TO service_role;
