-- ============================================================================
-- BUG-6 (18.10.2026): идемпотентный сдвиг прогресс-указателя программы.
--
-- Дефект. Сдвиг жил в JavaScript: `advanceProgramProgress`
-- (src/services/programsService.ts:451-548) читал указатель
-- (current_phase/current_week/current_day) через PostgREST, считал «+1 день» и
-- писал обратно БЕЗ условия «указатель всё ещё там, где был». На входе — только
-- userId и programId, поэтому повтор вызова неотличим от первого:
-- «Повторить» после сетевой ошибки (src/hooks/useWorkoutSession.ts:1299),
-- «Повторить» при пропуске (app/(tabs)/workouts.tsx:141), второе устройство на
-- том же аккаунте — каждый раз указатель уезжал ещё на день.
--
-- Живое следствие: у 6416429a (программа 7f3c1a90-…0002) 15.10 закрыли день 3,
-- а указатель оказался на 5; строки дня 4 не существовало ни в одном статусе,
-- потому что дни будущих недель создаются только при старте. День
-- восстановлен вручную (20261017130000_restore_day4_week2_6416429a.sql),
-- предикат синхронизации починен (20261017134000), но сам перескок остаётся.
--
-- Правка. Перенос сдвига в Postgres с проверяемым предикатом:
--   1) указатель и тренировка читаются в одной транзакции, строка прогресса
--      блокируется FOR UPDATE;
--   2) сдвиг происходит ТОЛЬКО если тройка (phase_number, week_number,
--      day_index) завершаемой тренировки совпадает с указателем — CAS. Повтор
--      того же дня = холостой возврат 'already_advanced', а не ещё один день;
--   3) «сколько дней в неделе» считается по тому же правилу, что у
--      program_effective_days (своя неделя, иначе неделя 1 той же фазы) —
--      иначе правило размещения разъехалось бы с синхронизацией.
--
-- Свойства указателя сохранены как были, чтобы читатели (workoutService.ts:47,
-- workoutsService.ts:55, forecastService.ts:89, dashboardService.ts:337 — все с
-- `?? 1`) ничего не заметили: ветка «программа с фазами» пишет все три колонки,
-- ветка «программа без фаз» пишет только week+day и не трогает current_phase.
--
-- Счётчики, снятые 18.10 до применения: pg_proc по 'advance%'/'%progress%'/'%pointer%'
-- пуст (перегрузки не будет); на user_programs одна политика RLS (ALL,
-- authenticated, auth.uid() = user_id); UNIQUE на (user_id, program_id) нет, но
-- дубликатов строк = 0 и пользователей с несколькими активными = 0; активных
-- user_programs 7, из них с «предыдущий день не закрыт» = 0; программ без фаз
-- в каталоге 1, активных user_programs без фаз 0 (ветка достижима, поведение
-- сохранено); дефолты колонок указателя = 1, started_at DEFAULT now().
--
-- Откат: DROP FUNCTION ниже + возврат клиентского коммита. В момент применения
-- функция не изменяет данных, только создаётся; данные не откатываются.
--   drop function if exists public.advance_program_progress(uuid, text, uuid);
-- ============================================================================

DROP FUNCTION IF EXISTS public.advance_program_progress(uuid, text, uuid);

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
  v_up_id       uuid;
  v_wk_phase    int;
  v_wk_week     int;
  v_wk_day      int;
  v_phase_id    uuid;
  v_weeks_count int;
  v_days        int;
  v_new_phase   int;
  v_new_week    int;
  v_new_day     int;
  v_cur_phase   int;
  v_cur_week    int;
  v_cur_day     int;
BEGIN
  -- Вызываемый двигает только свою программу (SECURITY DEFINER RLS обходит).
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Та же выборка строки прогресса, что была в клиенте: активная, последняя по
  -- started_at. FOR UPDATE закрывает гонку двух устройств на одном аккаунте.
  -- Скалярные переменные, а не record: при нуле строк поле записи вести опаснее.
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

  SELECT coalesce(w.phase_number, 1),
         coalesce(w.week_number, 1),
         w.day_index
    INTO v_wk_phase, v_wk_week, v_wk_day
    FROM workouts w
   WHERE w.id = p_workout_id
     AND w.user_id = p_user_id
     AND w.program_id = p_program_id;

  -- Нет строки тренировки (все скаляры NULL) или разовая тренировка
  -- («повторить тренировку», repeatWorkout) с day_index IS NULL — двигать
  -- нечего.
  IF v_wk_day IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_workout',
      'phase', v_cur_phase, 'week', v_cur_week, 'day', v_cur_day
    );
  END IF;

  -- ГЛАВНЫЙ ПРЕДИКАТ. Указатель уже ушёл с этого дня ⇒ день учтён раньше
  -- (ретрай, второе устройство, возврат в просроченную сессию). Молча
  -- возвращаем текущий указатель вместо ещё одного «+1».
  IF ROW(v_cur_phase, v_cur_week, v_cur_day)
     IS DISTINCT FROM ROW(v_wk_phase, v_wk_week, v_wk_day) THEN
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
    -- Ветка «без фаз» — ровно прежняя арифметика: всего дней = все program_days
    -- программы (иначе 5), недель = programs.duration (иначе 8), current_phase
    -- не обновляется.
    IF EXISTS (SELECT 1 FROM program_phases pp WHERE pp.program_id = p_program_id) THEN
      -- Фазы у программы есть, но текущей фазы в них нет (указатель на
      -- удалённой фазе). Двигать нечего: честный статус вместо прыжка в первую.
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

    -- Только week+day: как в прежней JS-ветке, current_phase не пишем.
    UPDATE user_programs
       SET current_week = v_new_week, current_day = v_new_day
     WHERE id = v_up_id;

    RETURN jsonb_build_object(
      'status', 'advanced',
      'phase', v_cur_phase, 'week', v_new_week, 'day', v_new_day
    );
  END IF;

  -- Дней в неделе: своя неделя, иначе неделя 1 той же фазы — то же правило,
  -- что у program_effective_days (миграция 20261017134000:56-87); строки с
  -- week_number IS NULL не считаются ни там, ни там.
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

REVOKE ALL ON FUNCTION public.advance_program_progress(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_program_progress(uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_program_progress(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_program_progress(uuid, text, uuid) TO service_role;
