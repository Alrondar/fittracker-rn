# Срез по пользователю: read-only SQL перед составлением личной программы

Только `select`. Каждый рецепт прогонян на проде 11.10.2026 для пользователя `6416429a-10ef-4e35-ab2f-6c405ee4b283` (кейс PPLUL, отчёт `spark-output/report/user-6416429a-pplul-2026-10-07.md`). Заменяй `<uid>` — подстановки вида `:'uid'` в MCP не работают.

Дисциплина чтения (нарушение = неверный диагноз):

- **Эффективная дата** тренировки: `coalesce(finished_at, started_at, created_at)`; `created_at` — не дата занятия (`CLAUDE.md` §4).
- **Рабочий подход**: `workout_logs.is_warmup = false`; разминка не входит в объём и рекорды (`exercisesServiceNormalized.ts:194-204`).
- **Связь логов**: держаться `workout_logs.workout_exercise_id → workout_exercises.workout_id`. Колонка `workout_logs.workout_id` заполнена несогласованно: на этом пользователе «призрачных» тренировок получается 8 по `workout_id` против 5 по связи через `workout_exercises`.
- **Объём по мышцам**: primary вес 1.0, secondary 0.5 — та же методология, что в движке (`src/engine/weeklySummary/`, `muscleVolume`/`muscleFatigue`/`chronicVolume`/`muscleStrength.daysAgo`). SQL нужен для среза по конкретному человеку до обращения к коду; пороги «мало/много» — из `weeklySummary`, не из этого файла.

## 0. Профиль, замеры, готовность, травмы

```sql
select gender, birth_date, height_cm, current_weight_kg, body_fat_percentage,
       goal, activity_level, pharmacology_type, onboarding_data
  from profiles where id = '<uid>';

select date, weight_kg, chest_cm, arm_cm, thigh_cm, waist_cm
  from body_metrics where user_id = '<uid>' order by date desc limit 12;

select date, readiness, soreness, fatigue, sleep_hours, stress_level
  from daily_readiness where user_id = '<uid>' order by date desc limit 14;

select body_part, injury_type, severity, status, restricted_exercises, notes
  from user_injuries where user_id = '<uid>';
```

Ожидаемое: `user_injuries` на срезе прода **пуст у всех** (0 строк в таблице) — это не «травм нет», а «данных нет», спросить словами. В `profiles` нет стажа/уровня и снаряжения (`SKILL.md` Шаг 1).

## 1. Приверженность и качество данных

```sql
with w as (select * from workouts where user_id = '<uid>')
select (select count(*) from w where finished_at is not null)   finished_total,
       (select count(*) from w where skipped_at is not null)    skipped,
       (select count(*) from w where started_at is null and finished_at is null
                                  and skipped_at is null)       untouched_planned,
       (select count(distinct date_trunc('week', finished_at)) from w
         where finished_at is not null)                         weeks_active,
       (select count(*) from w x where x.finished_at is not null
          and not exists (select 1 from workout_logs l
                            join workout_exercises we on we.id = l.workout_exercise_id
                           where we.workout_id = x.id and l.is_warmup = false)) phantom_finished_no_logs,
       (select count(*) from w where finished_at >= now() - interval '4 weeks')  fin_4w,
       (select count(*) from w where finished_at >= now() - interval '12 weeks') fin_12w;
```

Кейс: 22 завершённые, 4 пропуска, 229 незатронутых запланированных, 6 активных недель, 8 «призрачных» (завершёны без рабочих сетов), 19 за 4 недели, 22 за 12. Читай так: `untouched_planned` — это future-расписание программы, а не долг; `phantom` — в объём не входит.

## 2. Недельный объём по мышцам (перекос)

```sql
with logs as (
  select date_trunc('week', w.finished_at) wk, m.muscle, m.wt,
         coalesce(l.weight_kg, 0) * greatest(coalesce(l.reps, 0), 0) vol
    from workout_logs l
    join workout_exercises we on we.id = l.workout_exercise_id
    join workouts w            on w.id = we.workout_id
    join exercises e           on e.id = we.exercise_id
    cross join lateral (
      select mu muscle, 1.0 wt from unnest(e.primary_muscles) mu
      union all
      select mu muscle, 0.5 wt from unnest(e.secondary_muscles) mu
       where not (mu = any (e.primary_muscles))
    ) m
   where w.user_id = '<uid>' and w.finished_at is not null
     and w.finished_at >= now() - interval '8 weeks'
     and l.is_warmup = false
)
select muscle, round(sum(wt), 1) sets_8w, round(sum(wt) / 8, 1) sets_per_week,
       round(sum(vol) / 1000, 1) tonnage_8w
  from logs group by 1 order by 3 desc;
```

Кейс: широчайшие 9.8, бицепс 9.3, трицепс 8.9, передняя дельта 7.9 подходов/нед — при квадрицепсе 0.9, бицепсе бедра 1.3, ягодичной 1.4. Это и есть обоснование акцента в новой программе (и причина, по которой «Upper Focus 5-Day» легла в прод 08.10).

## 3. Частота и «сколько дней не трогал» (отставание)

```sql
with s as (
  select w.id wid, w.finished_at fa, m.muscle
    from workout_exercises we
    join workouts w  on w.id = we.workout_id
    join exercises e on e.id = we.exercise_id
    cross join lateral (select unnest(e.primary_muscles) muscle) m
   where w.user_id = '<uid>' and w.finished_at is not null
)
select muscle, count(distinct wid) sessions_total,
       count(distinct date_trunc('week', fa)) weeks_touched,
       floor(extract(epoch from now() - max(fa)) / 86400)::int days_since_last
  from s group by 1 order by 4 desc nulls last;
```

`weeks_touched = 1` при `sessions_total > 1` = группа «заброшена после одного блока»; `days_since_last` > 14 — стартовать по ней ниже среднего объёма и с `double_progression`.

## 4. Силовая динамика по базовым (E1RM по месяцам)

```sql
select e.name, to_char(date_trunc('month', w.finished_at), 'YYYY-MM') mth,
       round(max(l.weight_kg * (1 + coalesce(l.reps, 0) / 30.0))::numeric, 1) e1rm,
       count(*) sets
  from workout_logs l
  join workout_exercises we on we.id = l.workout_exercise_id
  join workouts w           on w.id = we.workout_id
  join exercises e          on e.id = we.exercise_id
 where w.user_id = '<uid>' and l.is_warmup = false and coalesce(l.weight_kg, 0) > 0
   and w.finished_at is not null
   and e.name in ('Приседания со штангой на плечах',
                  'Жим штанги лежа на горизонтальной скамье',
                  'Тяга штанги в наклоне', 'Становая тяга (становая)',
                  'Жим гантелей сидя')
 group by 1, 2 order by 1, 2;
```

Epley как в `src/utils/e1rm.ts`. Кейс: жим лежа 126.7 (07) → 139.3 (09) → 108.0 (10), тяга в наклоне 116.7 → 120.0 → 108.0, приседания только 09 (133.3). Падение последней точки на >10% = «не поднимать интенсивность в фазе 1», а не «силовая фаза сразу».

## 5. RPE-дисциплина и покрытие

```sql
select count(*) working_sets,
       count(*) filter (where l.rpe is not null)  with_rpe,
       count(*) filter (where l.rir is not null)  with_rir,
       round(avg(l.rpe)::numeric, 2)              avg_rpe,
       count(*) filter (where coalesce(l.weight_kg, 0) = 0) zero_weight
  from workout_logs l
  join workout_exercises we on we.id = l.workout_exercise_id
  join workouts w           on w.id = we.workout_id
 where w.user_id = '<uid>' and l.is_warmup = false
   and w.finished_at >= now() - interval '12 weeks';
```

Кейс: 315 рабочих сетов, 258 с RPE (82%), средний 8.17, 11 сетов с нулевым весом (собственный вес — не ошибка). Если `with_rpe/working_sets < 0.5`, `target_rpe` в программе задавать осторожно (только в ключевых) и предупреждать, что движок без RPE прогрессирует только по повторам (`ExerciseSettingsSheet` подсказка, `progression/core.ts:parseRepsRange`).

## 6. Боли: где именно и на каких движениях

```sql
select p.body_part, p.pain_level, bool_or(p.stop_exercise) any_stop,
       count(*) n_events, count(distinct e.name) n_exercises,
       min(p.occurred_at)::date first_at, max(p.occurred_at)::date last_at
  from pain_events p
  left join exercises e on e.id = p.exercise_id
 where p.user_id = '<uid>'
 group by 1, 2 order by 4 desc;

-- те же события с названиями движений (для выбора, что снять/ограничить)
select p.occurred_at::date, p.body_part, p.pain_level, p.stop_exercise, e.name, w.name workout
  from pain_events p
  left join exercises e on e.id = p.exercise_id
  left join workouts w  on w.id  = p.workout_id
 where p.user_id = '<uid>' order by p.occurred_at desc limit 20;
```

Кейс: 2 события, `body_part='shoulder'`, `pain_level=1`, без остановок, август. `body_part` — машинные значения (`shoulder`, …), сопоставлять с `injury_exercise_warnings.body_part` и `src/constants/injuries.ts`, а не с русскими названиями из разговора.

## 7. Фактическое снаряжение (подстановка вместо вопроса «что у тебя есть»)

```sql
select eq.name equipment, count(distinct w.id) sessions_12w, count(*) working_sets
  from workout_logs l
  join workout_exercises we   on we.id = l.workout_exercise_id
  join workouts w             on w.id = we.workout_id
  join exercise_equipment ee  on ee.exercise_id = we.exercise_id
  join equipment eq           on eq.id = ee.equipment_id
 where w.user_id = '<uid>' and l.is_warmup = false
   and w.finished_at >= now() - interval '12 weeks'
 group by 1 order by 2 desc;
```

Кейс: штанга/гантели (14 сессий), верхний блок и скамья (11), наклонная скамья и стойки (7), EZ-гриф, пояс, кроссовер, тренажёры — полный зал; но турник только 2 сессии, жим ногами 1. Такую выборку показывать пользователю как «вот что вы реально делаете» и подтверждать словами: инвентарь меняется, а история его не описывает полностью.

## 8. Текущая программа и прогресс (что бы не затоптать запуском)

```sql
select up.program_id, p.name, p.level, p.duration, up.is_active,
       up.current_phase, up.current_week, up.current_day,
       up.started_at::date, up.completed_at::date,
       (select count(*) from workouts w
         where w.program_id = up.program_id and w.user_id = up.user_id)                       planned,
       (select count(*) from workouts w
         where w.program_id = up.program_id and w.user_id = up.user_id
           and w.finished_at is not null)                                                     done,
       (select count(*) from workouts w
         where w.program_id = up.program_id and w.user_id = up.user_id
           and w.skipped_at is not null)                                                      skipped
  from user_programs up
  join programs p on p.id = up.program_id
 where up.user_id = '<uid>'
 order by up.started_at desc nulls last;
```

Кейс: активна `7f3c1a90-0000-4000-8000-000000000002` «Upper Focus 5-Day» (1/1/3, 40 запланировано, 2 сделано, 1 пропуск) — то есть **две программы от 08.10 уже запущены**, вторая (`…001`) в статусе «завершена» и содержит 0 выполненных тренировок. Активная запись = та, чью витрину и future-тренировки тронет `startProgram`/`sync`; а «Начать программу» по этой же программе удалит все её 40 тренировок вместе с 2 выполненными (`editor-matrix.md` грабля 6).

## 9. Движения, которые пользователь уже делает (опора для новой программы)

```sql
select e.name, e.status, e.movement_pattern, e.difficulty,
       count(distinct w.id) sessions, count(*) working_sets,
       max(l.rpe) max_rpe, max(coalesce(l.weight_kg, 0)) best_weight
  from workout_logs l
  join workout_exercises we on we.id = l.workout_exercise_id
  join workouts w           on w.id = we.workout_id
  join exercises e          on e.id = we.exercise_id
 where w.user_id = '<uid>' and l.is_warmup = false and w.finished_at is not null
   and w.finished_at >= now() - interval '16 weeks'
 group by 1, 2, 3, 4 order by 5 desc limit 25;
```

Приоритет при компоновке: знакомые движения (пользователь умеет, техника проверена историей) → опорный фонд каталога (`exercise-catalog`, запрос 5) → новое только под цель акцента. Не тащить в программу то, чего нет ни там, ни там.

## Чего в БД нет и что нужно спросить

| Нет | Спросить |
|---|---|
| Уровня/стажа | «Сколько месяцев регулярно, жим/присед/тяга ориентировочно» |
| Снаряжения как факта | список железа + «был ли доступ к тренажёрам 4 недели назад» (история ≠ доступ) |
| Травм (`user_injuries` пуст) | часть тела, характер, что болит под нагрузкой, что уже снимали |
| Целевых акцентов | «что хотите вытянуть», сверить с запросом 2 и 3 |
| Восстановления вне приложения | сон/стресс/питание — косвенно `daily_readiness`, но покрытие низкое |
| Предпочтений по сплиту и дням | какие дни реально свободны (в `schedule` это витрина, дни не привязаны) |
