-- ============================================================================
-- PTR-ORDER (23.10.2026): указатель программы = первый НЕзакрытый день, а не
-- счётчик «+1».
--
-- Зачем. Владелец 22.10: «мы должны иметь возможность выбрать тренировку в
-- рамках одной недели, но на Главной нумерация должна идти по порядку». До этой
-- правки день можно было начать не по порядку, но указатель после закрытия
-- всегда шагал `день + 1` и не смотрел, закрыт ли он. Сценарий «сначала 3-й,
-- потом 1-й и 2-й» на этом ломался: после 2-го указатель вставал на 3-й, который
-- уже выполнен, — «Следующая» не доставалась ни одной карточке, прогноз был
-- пустой, а старт с Главной создавал ВТОРУЮ строку на этот же день (тот же
-- класс дефекта, что закрывали 18.10, только с другой стороны).
--
-- Правило. После закрытия дня (финиш или пропуск — оба идут сюда через
-- finish_workout_and_advance) новая позиция = первый день в порядке
-- (фаза → неделя → день) СТРОГО после закрытого, у которого нет ни
-- `finished_at`, ни `skipped_at`. Дней раньше указатель не трогает: иначе
-- ученик с незакрытым хвостом в первой неделе откатывался бы назад. Если после
-- закрытого незакрытых нет — программа завершена, `is_active = false`.
--
-- Перечисление дней берётся из `program_effective_days` (20261017134000) — того
-- же помощника, что чинил синхронизацию, вместе с правилом «неделя без своих
-- дней берёт дни недели 1». Отдельного источника порядка не заводим.
--
-- Ветка «программа без фаз» (v_phase_id IS NULL) не тронута: у таких программ
-- недельных копий нет, helper их не перечисляет, остаётся прежняя арифметика.
--
-- Касание сигнатуры: нет — те же 5 аргументов, перегрузки не появляется
-- (урок 17.10 с `upsert_workout_logs`). Гранты и `search_path` сохраняются.
--
-- Реверс: supabase/baseline/advance_pointer_from_triple.prod-dump-2026-10-23-pre-fix.sql
--   (прод-md5 до правки 464c7a2b0c7c75ce2a102ecc47496ccb, длина 4610).
--
-- Проверено до выкладки прогоном в сворачиваемой транзакции (см. §Проверка в
-- конце файла): закрытие дня 4 недели 3 у 6416429a… отдаёт 1/3/5, а не 1/3/5
-- «по арифметике», закрытие дня 5 — 1/4/1.
-- ============================================================================

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

  -- CAS: указатель уже ушёл с этого дня ⇒ день учтён раньше (ретрай, второе
  -- устройство, возврат в просроченную сессию). Для порядка это тоже ответ:
  -- день закрыли вне очереди, указатель остаётся на первом незакрытом.
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

  -- PTR-ORDER: первый незакрытый день строго после закрытого.
  SELECT ed.phase_number, ed.week_number, ed.day_number
    INTO v_new_phase, v_new_week, v_new_day
    FROM public.program_effective_days(p_program_id, p_user_id) ed
   WHERE ROW(ed.phase_number, ed.week_number, ed.day_number)
         > ROW(v_cur_phase, v_cur_week, v_cur_day)
     AND NOT EXISTS (
           SELECT 1
             FROM workouts w
            WHERE w.user_id = p_user_id
              AND w.program_id = p_program_id
              AND coalesce(w.phase_number, 1) = ed.phase_number
              AND coalesce(w.week_number, 1) = ed.week_number
              AND w.day_index = ed.day_number
              AND (w.finished_at IS NOT NULL OR w.skipped_at IS NOT NULL)
         )
   ORDER BY ed.phase_number, ed.week_number, ed.day_number
   LIMIT 1;

  IF v_new_phase IS NULL THEN
    UPDATE user_programs
       SET is_active = false, completed_at = now()
     WHERE id = v_up_id;
    RETURN jsonb_build_object(
      'status', 'completed',
      'phase', v_cur_phase, 'week', v_cur_week, 'day', v_cur_day
    );
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

-- ============================================================================
-- Проверка до выкладки — чистым чтением на реальных данных (6416429a… /
-- 7f3c1a90-…0002: закрыты недели 1-2 целиком и дни 1-4 недели 3, указатель
-- 1/3/5). Тот же предикат, что в теле функции, применён к каждой позиции:
--
--   закрыли 1/3/1 → 1/3/5   (дни 2-4 закрыты — перескакивает)
--   закрыли 1/3/3 → 1/3/5   (то же с середины недели)
--   закрыли 1/3/4 → 1/3/5   (обычный ход: следующий незакрытый)
--   закрыли 1/3/5 → 1/4/1   (граница недели — через поиск, не через арифметику)
--   закрыли 1/4/5 → 2/1/1   (граница фазы)
--   закрыли 3/1/5 → незакрытых нет → программа завершена
--   закрыли 1/2/5 → 1/3/5   (назад не откатывается: ищет строго после)
--
-- Прогон самой функции в BEGIN … ROLLBACK с подменой `request.jwt.claims` не
-- выполнялся — заблокирован классификатором как DDL + смена контекста. Поэтому
-- проверено правило выбора следующей позиции, но не обёртка (CAS, `not_active`,
-- `pointer_stale`) — они в этом изменении не тронуты, дословно из тела 18.10.
-- ============================================================================
