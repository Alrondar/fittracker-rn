-- Валидация seeded-программы. Заменить :prog_id на id программы, :expect_* — на
-- ожидаемые из брифа числа. Все запросы — read-only, безопасны на проде.

-- 1. Resolver: ни одно имя не потерялось; все id ведут в каталог
select count(*) as exercises_total,
       count(*) filter (where e.exercise_id is null) as unresolved,
       count(distinct e.exercise_name) as uniq_names
  from program_days d
  join program_exercises e on e.program_day_id = d.id
 where d.program_id = :prog_id;
-- ожидание: unresolved = 0; exercises_total = :expect_exercises

-- 1b. Потерянные на join с каталогом имена из seed-листа (сверить вручную).
-- join в seed_template.sql drop'ит нерешённое имя молча — сверять
-- exercises_total с ожидаемым числом из брифа (запрос 1).
select e.exercise_name
  from program_days d
  join program_exercises e on e.program_day_id = d.id
  left join exercises x on x.id = e.exercise_id
 where d.program_id = :prog_id and x.id is null;
-- ожидание: 0 строк (FK SET NULL мог обнулить exercise_id)

-- 2. Структура: у КАЖДОГО дня заполнен phase_id; дни есть в каждой фазе
select p.phase_number, p.name, p.phase_type, p.weeks_count,
       count(d.id) as days,
       count(d.id) filter (where d.phase_id is null) as bad_days
  from program_phases p
  left join program_days d on d.phase_id = p.id
 where p.program_id = :prog_id
 group by p.id
 order by p.position;
-- ожидание: bad_days = 0; days одинаков во всех фазах;
-- sum(weeks_count) == (select duration from programs where id = :prog_id)

-- 3. Conformance: уровни, intensity, RPE, порядок позиций
select (select level from programs where id = :prog_id) as level,
       (select count(*) from program_exercises e
          join program_days d on d.id = e.program_day_id
         where d.program_id = :prog_id
           and e.intensity not in ('low','medium','high')) as bad_intensity,
       (select count(*) from program_exercises e
          join program_days d on d.id = e.program_day_id
         where d.program_id = :prog_id
           and (e.target_rpe < 1 or e.target_rpe > 10)) as bad_rpe,
       (select count(*) from (
          select e.program_day_id, e.position
            from program_exercises e join program_days d on d.id = e.program_day_id
           where d.program_id = :prog_id
           group by 1,2 having count(*) > 1) dup) as dup_positions;
-- dup_positions > 0 допустим ТОЛЬКО если день намеренно вариатный; для фазовых
-- программ позиции уникальны внутри одного program_day_id.

-- 4. Seeded-признак и отсутствие мусора
select id, name, created_by is null as is_seeded, share_code, source_program_id,
       (select count(*) from workouts w
         where w.program_id = p.id) as active_workouts
  from programs p where p.id = :prog_id;
-- ожидание: is_seeded = true, share_code/source null; для ПРАВОК существующих:
-- active_workouts = 0 иначе предупреждать о blast-radius.

-- 5. E2E: копирование как у реального пользователя (только SELECT-часть;
-- саму функцию запускать по протоколу set_config из CLAUDE.md/памяти проекта,
-- либо через UI)
select (select count(*) from program_phases where program_id = :prog_id) as orig_phases,
       (select count(*) from program_days d where d.program_id = :prog_id) as orig_days,
       (select count(*) from program_days d join program_exercises e on e.program_day_id = d.id
         where d.program_id = :prog_id) as orig_ex;
-- после copy_program_for_user(:prog_id, uid) те же три count'а для нового
-- :copy_id обязаны совпасть; затем удалить копию через UI/сервис, не raw DELETE.

-- 6. Целостность ссылок (обязательно для ПРАВОК существующих программ, 25.09):
--    id проставлен, имя = канон каталога, движение = задуманное
select count(*) filter (where e.exercise_id is null) as null_ids,
       count(*) filter (where e.exercise_name is distinct from x.name) as name_drift,
       count(*) filter (where e.exercise_name <> x.name
         and x.movement_pattern is distinct from
             (select x2.movement_pattern from exercises x2 where x2.name = e.exercise_name limit 1)
       ) as likely_wrong_target,
       count(*) as rows_checked
  from program_days d
  join program_exercises e on e.program_day_id = d.id
  join programs p on p.id = d.program_id
  left join exercises x on x.id = e.exercise_id
 where p.id = :prog_id;
-- ожидание: null_ids=0, name_drift=0, likely_wrong_target=0.
-- Пример из прода: ярлык «Махи гантели в стороны» + id «Махи гантели перед собой»
-- = другой паттерн (боковая дельта vs передняя) → карта мышц и замены врут.

-- 7. Баланс жим/тяга по фазам (тренерская метрика; махи — ОТДЕЛЬНО, их нельзя
--    класть в «жим», на этом в 25.09 был построен ложный вывод о дисбалансе):
with f as (
  select ph.position as phn, coalesce(x.movement_pattern,'UNRES') as fam, e."sets" as st
    from programs p join program_phases ph on ph.program_id = p.id
    join program_days d on d.phase_id = ph.id
    join program_exercises e on e.program_day_id = d.id
    left join exercises x on x.id = e.exercise_id
   where p.id = :prog_id
)
select phn,
       sum(st) filter (where fam in ('push_horizontal','push_vertical')) as press,
       sum(st) filter (where fam in ('pull_horizontal','pull_vertical','elbow_flexion')) as pull,
       round((sum(st) filter (where fam in ('push_horizontal','push_vertical')))::numeric
             / nullif(sum(st) filter (where fam in ('pull_horizontal','pull_vertical','elbow_flexion')),0), 2) as ratio,
       sum(st) filter (where fam = 'squat') as squat,
       sum(st) filter (where fam in ('hinge','knee_flexion','lunge')) as post_chain,
       sum(st) filter (where fam = 'UNRES') as unattributed
  from f group by phn order by phn;
-- ориентиры каталога: ratio 1.0–1.3 (StrongLifts 2.0 — канон минимализма),
-- post_chain ≥ 0.5 × squat, в unattributed не должно быть подходов (см. запрос 6).

-- 8. Уникальность имён в каталоге (перед применением!).
--    seed-шаблон резолвит exercise_id через `join exercises x on x.name = e.name`;
--    если имя встречается в каталоге дважды, JOIN РАЗМНОЖИТ строки и в программу
--    лягут дубли подходов с двумя разными exercise_id — без ошибки и без warnings.
select e.name, count(*) as rows_in_catalog, string_agg(e.status, ',') as statuses
  from exercises e
 where e.name in (:names_from_seed_file)
 group by e.name having count(*) > 1;
-- ожидание: 0 строк. Ненайденные имена (seed-resolver молча drop'ит) ловятся
-- запросом 1; здесь проверяется только кратность.

-- 9. Как получать :names_from_seed_file (подтверждено 25.09): имена ОБЯЗАТЕЛЬНО
--    извлекать из байтов готового .sql (node/grep по VALUES-кортежам), а не
--    перепечатывать. Ручной перенос строк seed'а в проверочный SQL уже приводил
--    к ложке («выпады с гантелей» вместо «с гантелями») — она «ловится» только
--    потому, что unresolved становится > 0; при переносе метаданных (например
--    movement_pattern) ошибка ничем не выдаст себя.
