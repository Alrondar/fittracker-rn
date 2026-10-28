-- ============================================================================
-- WT-1 (27.10.2026): тип тренировки перестаёт быть пустой колонкой
--
-- Дефект. Колонка `workouts.workout_type` в проде есть, с CHECK на четыре
-- значения ('strength', 'hypertrophy', 'cardio', 'mixed'), и не заполнена НИ
-- ОДНОЙ строкой из 658. Поэтому в недельном обзоре разбивка объёма по типам
-- была захардкожена нулями (`weeklySummaryService.ts:436`, пометка FD11-3), а
-- два инсайта, которые по этой разбивке решают, никогда не срабатывали:
-- пороги роста/падения объёма (insights.ts:37-52: силовая неделя допускает
-- +15 %/-15 %, гипертрофия — +10 %/-10 %, кардио — +20 %/-20 %) и «Дисбаланс
-- нагрузки» (insights.ts:168-186: 80 %+ объёма одного типа).
--
-- Правило (вердикт владельца 27.10, вариант «a»): новую колонку не вводим,
-- укладываем фазы в уже разрешённые CHECK-ом значения:
--   strength    -> strength
--   hypertrophy -> hypertrophy
--   deload, custom, фаза отсутствует, свободное занятие -> mixed
--   cardio из фазы не появляется никогда — не выдумываем
-- Словарь `phase_type` в проде — ровно четыре значения: custom, deload,
-- hypertrophy, strength (замерено 27.10 по всей таблице program_phases).
-- Значения 'power' в нём нет, поэтому оно отдельно не расписано.
--
-- Что делает файл. (1) Помощник `workout_type_from_phase_type(text)` — одно
-- место, где правило живёт на стороне базы; то же правило повторяет
-- `src/utils/workoutType.ts` на стороне клиента. Дубль через два языка
-- неизбежен, но он в четыре строки и связан перекрёстным комментарием. (2) Тип
-- пишет генерация снимка `create_workouts_for_program`. (3) Тип доезжает до
-- будущих занятий при правке программы — через
-- `sync_program_changes_to_workouts`, тем же инвариантом, что SYNC-1: правка
-- фазы должна отражаться на занятиях, которые ещё не начаты. (4) Разовое
-- заполнение уже созданных не начатых занятий.
--
-- Границы. Заполнение трогает ТОЛЬКО `started_at IS NULL AND finished_at IS
-- NULL` и только колонку `workout_type`. 208 висячих занятий (program_id
-- указывает на удалённую программу) остаются NULL по вердикту «оставить» —
-- привязки к фазе у них нет, выводить тип пришлось бы наугад. Начатые и
-- завершённые 77 занятий не трогаем совсем: брать их тип задним числом не
-- откуда.
--
-- Следствие (называю сам). Пока завершённые занятия без типа, недельный обзор
-- начнёт показывать разбивку только с первого завершения занятия, созданного
-- после этой правки: объём исторических занятий остаётся только в totalVolume и
-- в знаменателе долей. Пороги при этом не врут — доля просто меньше, пока тип
-- не проставлен. Если нужно увидеть разбивку на текущей истории, это отдельное
-- решение (тип тогда выводится из указателя фазы у завершённых строк).
--
-- Побочный эффект. На `workouts` висят два одинаковых BEFORE UPDATE-триггера
-- (`update_workouts_updated_at` и `workouts_updated_at_trigger`), оба просто
-- ставят `updated_at = NOW()`. Значит у заполненных строк служебное время
-- сдвинется. Ни приложение, ни офлайн-логика `workouts.updated_at` не читают —
-- проверено по `src/` и `app/` 27.10, поэтому эффект ограничен самой колонкой.
-- Два дублирующих триггера — отдельная находка, в этом изменении не чинится.
--
-- Свойства функций сохранены: SECURITY DEFINER, `search_path = public`, тело
-- каноническое (прод-версия на 27.10 совпадает с git построчно — сверено по
-- `pg_get_functiondef`), guard'ы авторизации не тронуты, гранты как раньше.
--
-- Состояние прода ДО применения (27.10, срез по не начатым и не завершённым):
--   всего занятий 658, из них с заполненным workout_type — 0;
--   не начато и не завершено — 581, из них:
--     130 фаза strength, 122 фаза hypertrophy, 45 фаза deload, 12 фаза custom,
--     64 свободных (program_id IS NULL), 208 висячих (программа удалена);
--   заполнению подлежат 309 + 64 = 373 строки; после правки NULL остаётся
--   только на 208 висячих;
--   начатых или завершённых — 77 строки (не трогаются).
--   СНИМОК НЕПОСРЕДСТВЕННО ПЕРЕД ВЫКЛАДКОЙ (база живая, за 15 минут до этого):
--   не начато 578 (130 сила, 119 гипертрофия, 45 разгрузка, 12 custom, 64
--   свободных, 208 висячих), начато-завершено 80 — три занятия успели пройти,
--   поэтому заполнено 370 строк, а не 373. Числа ниже в файле — фактические.
--
-- ОТКАТ:
--   update workouts set workout_type = null
--     where started_at is null and finished_at is null;
--   drop function public.workout_type_from_phase_type(text);
--   плюс повтор файла с прежними телами (списки колонок без `workout_type` и
--   блок обновления имени дня без него же).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.workout_type_from_phase_type(p_phase_type text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_phase_type = 'strength' then 'strength'
    when p_phase_type = 'hypertrophy' then 'hypertrophy'
    else 'mixed'
  end;
$function$;

-- Функция вызывается только изнутри SECURITY DEFINER-функций и из этого файла,
-- клиент её не дёргает. Гранты — как у остальных RPC (SEC-11): anon вне доступа.
revoke execute on function public.workout_type_from_phase_type(text) from anon, public;
grant execute on function public.workout_type_from_phase_type(text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- (2) Генерация снимка: у занятия из фазы тип = тип фазы; у занятия программы без
-- фаз — mixed (правило то же, просто не из чего вывести больше).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_workouts_for_program(p_user_id uuid, p_program_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_phase record;
  v_week integer;
  v_day record;
  v_workout_id uuid;
  v_created integer := 0;
  v_has_phases boolean;
  v_week_days_count integer;
begin
  -- Проверка авторизации
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'Нельзя создавать тренировки для другого пользователя';
  end if;

  -- Удалить все старые тренировки для этой программы
  delete from public.workout_logs
  where workout_exercise_id in (
    select we.id
    from public.workout_exercises we
    where we.workout_id in (
      select id from public.workouts
      where user_id = p_user_id and program_id = p_program_id
    )
  );
  
  delete from public.workout_exercises
  where workout_id in (
    select id from public.workouts
    where user_id = p_user_id and program_id = p_program_id
  );
  
  delete from public.workouts
  where user_id = p_user_id and program_id = p_program_id;

  -- Проверка наличия фаз
  select exists (
    select 1 from public.program_phases
    where program_id = p_program_id
  ) into v_has_phases;

  -- Создание новых тренировок
  if v_has_phases then
    for v_phase in
      select * from public.program_phases
      where program_id = p_program_id
      order by phase_number, position nulls last
    loop
      for v_week in 1..greatest(v_phase.weeks_count, 1)
      loop
        -- Проверяем, сколько дней для этой недели
        select count(*) into v_week_days_count
        from public.program_days
        where phase_id = v_phase.id
          and week_number = v_week;
        
        -- Если дней для этой недели нет, используем неделю 1 (fallback)
        -- Если дней для недели 1 тоже нет, пропускаем эту неделю
        if v_week_days_count = 0 then
          select count(*) into v_week_days_count
          from public.program_days
          where phase_id = v_phase.id
            and week_number = 1;
          
          if v_week_days_count = 0 then
            continue; -- Нет дней ни для этой недели, ни для недели 1
          end if;
        end if;
        
        -- Берём дни для этой недели, или fallback на неделю 1
        for v_day in
          select * from public.program_days
          where phase_id = v_phase.id
            and week_number = case
              when v_week_days_count > 0 and exists (
                select 1 from public.program_days
                where phase_id = v_phase.id
                  and week_number = v_week
              ) then v_week
              else 1
            end
          order by day_number, position nulls last
        loop
          insert into public.workouts
            (user_id, program_id, name, workout_type, phase_number, week_number, day_index, created_at)
          values
            (p_user_id, p_program_id, v_day.name,
             public.workout_type_from_phase_type(v_phase.phase_type),
             v_phase.phase_number,
             v_week, v_day.day_number, now())
          returning id into v_workout_id;

          insert into public.workout_exercises
            (workout_id, exercise_id, order_index, position,
             target_sets, target_reps_range, rest_seconds, intensity, target_rpe, progression_policy)
          select
            v_workout_id,
            pe.exercise_id,
            pe.position,
            pe.position,
            pe.sets,
            pe.reps_range,
            pe.rest_seconds,
            pe.intensity, pe.target_rpe, pe.progression_policy
          from public.program_exercises pe
          where pe.program_day_id = v_day.id
            and pe.exercise_id is not null
          order by pe.position;

          v_created := v_created + 1;
        end loop;
      end loop;
    end loop;
  else
    -- Fallback для программ без фаз
    for v_day in
      select * from public.program_days
      where program_id = p_program_id
      order by week_number, day_number
    loop
      insert into public.workouts
        (user_id, program_id, name, workout_type, phase_number, week_number, day_index, created_at)
      values
        (p_user_id, p_program_id, v_day.name,
         public.workout_type_from_phase_type(null),
         1,
         v_day.week_number, v_day.day_number, now())
      returning id into v_workout_id;

      insert into public.workout_exercises
        (workout_id, exercise_id, order_index, position,
         target_sets, target_reps_range, rest_seconds, intensity, target_rpe, progression_policy)
      select
        v_workout_id,
        pe.exercise_id,
        pe.position,
        pe.position,
        pe.sets,
        pe.reps_range,
        pe.rest_seconds,
        pe.intensity, pe.target_rpe, pe.progression_policy
      from public.program_exercises pe
      where pe.program_day_id = v_day.id
        and pe.exercise_id is not null
      order by pe.position;

      v_created := v_created + 1;
    end loop;
  end if;

  return v_created;
end;
$function$;

-- ----------------------------------------------------------------------------
-- (3) Синк правок программы: блок, который переименовывает день, теперь приводит
-- и тип. Привязка к фазе — через день из `program_effective_days` (там её нет,
-- поэтому `program_days -> program_phases`), фан-аута нет: дублей phase_number
-- внутри программы в проде 0, занятий, где phase_number матчится больше чем на
-- одну фазу, — 0 (замерено 27.10).
-- Условие «не пишем, если уже совпадает» расширено на обе колонки, поэтому
-- счётчик `updated_workouts` теперь считает строки с любым из двух расхождений.
-- ----------------------------------------------------------------------------

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

  -- [WT-1] eff дополнен phase_type: тип дня правится вместе с именем дня.
  WITH eff AS (
    SELECT e0.phase_number, e0.week_number, e0.day_number,
           e0.program_day_id, e0.day_name, pp.phase_type
    FROM program_effective_days(p_program_id, v_user_id) e0
    JOIN program_days pd ON pd.id = e0.program_day_id
    JOIN program_phases pp ON pp.id = pd.phase_id
  )
  UPDATE workouts w
  SET name = e.day_name,
      workout_type = public.workout_type_from_phase_type(e.phase_type)
  FROM eff e
  WHERE w.user_id = v_user_id
    AND w.program_id = p_program_id
    AND w.started_at IS NULL
    AND w.finished_at IS NULL
    AND e.phase_number = w.phase_number
    AND e.week_number = w.week_number
    AND e.day_number = w.day_index
    AND (   w.name IS DISTINCT FROM e.day_name
         OR w.workout_type IS DISTINCT FROM public.workout_type_from_phase_type(e.phase_type));

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

  -- [SYNC-1] здесь добавлены target_sets, target_rpe и progression_policy.
  -- Привязка строки снимка к строке программы — по exercise_id (не по позиции):
  -- дублей упражнения внутри одного дня и дублей номера фазы в проде нет
  -- (замерено 27.10), поэтому join остаётся 1:1.
  WITH eff AS (
    SELECT * FROM program_effective_days(p_program_id, v_user_id)
  )
  UPDATE workout_exercises AS we
  SET
    sets = pe.sets,
    target_sets = pe.sets,
    target_reps_range = pe.reps_range,
    rest_seconds = pe.rest_seconds,
    intensity = pe.intensity,
    target_rpe = pe.target_rpe,
    progression_policy = pe.progression_policy,
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

  -- [SYNC-1] вставка нового упражнения дня тоже обязана нести план подходов,
  -- целевой RPE и политику — иначе занятие рисует дефолтные 3 подхода.
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
      pe.target_rpe,
      pe.progression_policy,
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
    target_sets,
    target_reps_range,
    rest_seconds,
    intensity,
    target_rpe,
    progression_policy,
    position,
    order_index
  )
  SELECT
    workout_id,
    exercise_id,
    sets,
    sets,
    reps_range,
    rest_seconds,
    intensity,
    target_rpe,
    progression_policy,
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
$function$;

-- ----------------------------------------------------------------------------
-- (4) Разовое заполнение. Идемпотентно: фильтр `workout_type IS NULL` и предикат
-- по не начатым строкам.
--
-- а) не начатое занятие живой программы с найденной фазой — тип из фазы.
--    У висячих занятий (программа удалена) join по `program_phases` не даёт
--    строк, поэтому 208 rows отсекаются сами, без отдельного условия.
-- ----------------------------------------------------------------------------

UPDATE workouts w
   SET workout_type = public.workout_type_from_phase_type(pp.phase_type)
  FROM program_phases pp
 WHERE w.started_at IS NULL
   AND w.finished_at IS NULL
   AND w.workout_type IS NULL
   AND pp.program_id = w.program_id
   AND pp.phase_number = w.phase_number;

-- б) свободные занятия (без программы и без фазы) — смешанная. Только
--    program_id IS NULL: висячие строки с program_id не должны получить тип.

UPDATE workouts w
   SET workout_type = 'mixed'
 WHERE w.started_at IS NULL
   AND w.finished_at IS NULL
   AND w.workout_type IS NULL
   AND w.program_id IS NULL;

-- ============================================================================
-- ПРОВЕРКИ ПОСЛЕ ПРИМЕНЕНИЯ (чистое чтение)
--   1) заполнение по бакетам — ожидаем strength 130, hypertrophy 119,
--      mixed 121 (45 разгрузка + 12 custom + 64 свободных), NULL 208:
--        select coalesce(workout_type,'(NULL)') as t, count(*)
--        from workouts where started_at is null and finished_at is null group by 1;
--   2) начатые или завершённые занятия остались без типа — 80 строк с NULL:
--        select count(*) from workouts
--        where (started_at is not null or finished_at is not null)
--          and workout_type is null;
--   3) helper возвращает правило, в том числе на NULL и на неизвестное значение:
--        select public.workout_type_from_phase_type(null),
--               public.workout_type_from_phase_type('strength'),
--               public.workout_type_from_phase_type('deload');
--   4) тела функций содержат новый столбец:
--        select p.proname, pg_get_functiondef(p.oid) like '%workout_type%' as has_col
--        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--        where n.nspname = 'public'
--          and p.proname in ('create_workouts_for_program','sync_program_changes_to_workouts');
--   5) CHECK не нарушен (значения только из четырёх разрешённых) — запрос 1 это
--      показывает по построению; отдельных значений вроде 'power' или 'cardio'
--      в не начатых занятиях быть не должно.
--   6) идемпотентность: повторный прогон двух UPDATE не должен находить строк
--        count(не начатое с NULL типа, но с найденной фазой) = 0
--        count(не начатое свободное с NULL типа) = 0
--   7) штатная проверка живьём: «Мои программы» → редактор → у фазы поменять
--      phase_type (например hypertrophy -> strength) → сохранить → не начатое
--      занятие этой фазы должно получить новый тип (видно в разбивке недельного
--      обзора после завершения); при «Перезапуске» программы тип проставляется
--      сразу у всех новых занятий.
--
-- ФАКТ ПОСЛЕ ПРИМЕНЕНИЯ 27.10.2026 (apply_migration, имя `workout_type_from_phase`;
-- записано в supabase_migrations.schema_migrations):
--   заполнено 370 строк из 578 не начатых: strength 130, hypertrophy 119,
--   mixed 121 (45 + 12 + 64), NULL 208 — ровно висячие, по вердикту;
--   начато или завершено — 80 строк, все остались без типа, контрольная сумма
--   их значений f1fa92a5e87c1f92fb39026b8c2d1738 — идентична замераю до
--   (то есть правка в них не заходила);
--   всего занятий 658 (было 658), строк снимка 3367 (без изменений), записей
--   подходов 1142 — выросло не из-за правки: база живая, между замерами 3
--   занятия были начаты и закрыты реальным пользователем (581 -> 578 не начатых,
--   77 -> 80 начатых-завершённых, hypertrophy 122 -> 119). Плановое число
--   заполнения 373 стало 370 по той же причине;
--   повторный прогон обоих UPDATE заполнил бы 0 строк (идемпотентность);
--   helper: null -> mixed, strength -> strength, hypertrophy -> hypertrophy,
--   deload -> mixed, custom -> mixed, неизвестное ('power') -> mixed;
--   в данных ровно 3 различных значения типа, значений вне CHECK нет;
--   фаз вне словаря (strength/hypertrophy/deload/custom) в проде 0;
--   прод-тела трёх функций совпадают с этим файлом с точностью до пробелов —
--   md5 без пробелов: helper e7a52251c729366945a11671beee0060,
--   create_workouts_for_program 37f0e5a60237f454139ffa4418fe3d08,
--   sync_program_changes_to_workouts 890ef55058b93e4e8837fa5adfe15b0d.
--   НЕ проверено живьём: «Перезапустить» программу и старт дня (обе ветки
--   пишут тип новым занятиям) — требуется прогон на устройстве или в браузере.
-- ============================================================================
