-- ============================================================================
-- RPE-1 (часть 3): create_workouts_for_program переносит target_rpe и
-- progression_policy из program_exercises в workout_exercises.
--
-- Найдено при починке целевого RPE 25.09.2026: две первые правки (миграция
-- 20260925223000) делали target_rpe сохраняемым и копируемым, но этот RPC
-- создавал запланированные тренировки из программы своим списком колонок из 8
-- полей — то есть RPE и политика терялись на пороге тренировки, а движок
-- (progression.ts) получал null. FD-4 закрыл только клиентский путь
-- startNextWorkout, серверный sync-путь остался незакрытым.
--
-- Дамп тела: supabase/baseline/create_workouts_for_program.prod-dump-2026-09-25-post-rpe1.sql
--   (md5 тела по байтам прод-дампа = ec7ba36bdded4d51578e6156ad44a0f5, длина 4850)
-- До правки: c22b78d6237a449f1e59d5443088c5fb, длина 4710 (+140 = 2 блока ×
--   (30 байт в списке колонок + 40 в выборке) — изменены только они).
-- Свойства сохранены: SECURITY DEFINER, search_path=public, владелец postgres,
--   гранты authenticated/service_role, anon без execute (SEC-11 не затронут),
--   guard p_user_id <> auth.uid() цел.
-- Откат: CREATE OR REPLACE с тем же телом, но без ", target_rpe, progression_policy"
--   в двух списках колонок и без ", pe.target_rpe, pe.progression_policy" в двух
--   выборках.
-- ============================================================================

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
            (user_id, program_id, name, phase_number, week_number, day_index, created_at)
          values
            (p_user_id, p_program_id, v_day.name, v_phase.phase_number,
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
        (user_id, program_id, name, phase_number, week_number, day_index, created_at)
      values
        (p_user_id, p_program_id, v_day.name, 1,
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
