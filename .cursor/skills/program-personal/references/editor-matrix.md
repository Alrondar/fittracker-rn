# Матрица возможностей редактора программ (для персональной программы)

Срез кода: 11.10.2026, `main`. Источник истины — сами файлы; перед правкой перечитай указатели, этот документ фиксирует решения и пределы, а не список функций.

## 1. Что настраивается и где

| Сущность | Где настраивается | Поля и пределы | Куда доезжает |
|---|---|---|---|
| Программа | `ProgramFormSheet` (создание/правка из каталога), `ScheduleEditorSheet` (в редакторе) | `name`, `description`, `duration` (недели), `level` (`beginner`/`intermediate`/`advanced`), `schedule` (чипы Пн–Вс) | `programs.*`; `schedule` — только витрина |
| Фаза | `PhaseSettingsSheet` | `name`, `phase_type` (5 значений: `hypertrophy`/`strength`/`power`/`deload`/`custom`, default `custom`), `weeks_count` (кламп 1–12), `description`; порядок — drag&drop или ↑/↓ | `program_phases.*`; тип влияет на движок (см. граблю 4) |
| Неделя фазы | `PhaseCard` → `copyTemplateToWeek`, `resetWeekToTemplate`, `addDayToPhaseWeek` (`useProgramPhases.ts:160/190/224`) | копирует дни `week_number=1` вместе с упражнениями как новые строки | `program_days.week_number` — читается `create_workouts_for_program` |
| День | `DaySettingsSheet` | **только `name`** (плюс добавление/удаление/порядок) | `program_days.name`, → `workouts.name` |
| Упражнение в дне | `ExerciseSettingsSheet` | `sets` 1–10; `reps_range` свободный текст; `target_rpe` «—» или 1–10; `rest_seconds` 30–300 шаг 15; `intensity` `low`/`medium`/`high`; `progression_policy` `linear`/`double_progression`/`greyskull`/`time_based`; порядок — drag&drop | все 6 полей доезжают до `workout_exercises` (`program-import-format.md` §2.6) |
| Выбор упражнения | `ExercisePickerSheet` | поиск от 2 символов, фильтр по мышцам/категории/снаряжению/разминочным, сортировка `name-asc`/`name-desc`/`popularity`, страница 40, счётчики фильтров | `exercise_id` + `exercise_name` из одной строки каталога |
| Save/sync | кнопка «Сохранить» | один атомарный `save_program_snapshot` + `sync_program_changes_to_workouts` | будущие/не начатые тренировки |
| Старт | «Начать программу» / long-press «Перезапустить» | диалог с предупреждением, если данные уже есть | `user_programs` + пересоздание `workouts` (см. граблю 6) |

## 2. Через UI сделать нельзя

- Задать `created_by`, `source_program_id`, `share_code` (шар — отдельный `ShareProgramSheet`/`generate_share_code`, импорт — `ImportProgramSheet`).
- Перенести программу между каталогом и «Моими» в обе стороны: из каталога — только копия (`copy_program_for_user`), обратно — никак.
- Привязать день программы к дню недели: `schedule` хранится списком дней, но `create_workouts_for_program` пишет `workouts(user_id, program_id, name, phase_number, week_number, day_index, created_at)` — `day_of_week` остаётся NULL, порядок задаёт `day_number`.
- Настроить разминку, темп, «до отказа», supersets, циклы/волны, смену упражнения внутри недели — таких полей в модели нет.
- Пересчитать `duration` из фаз (грабля 1) или отредактировать дни недели 2+ после сохранения (грабля 2).

## 3. Восемь граблей (все подтверждены кодом или данными прода 11.10)

1. **`duration` не пересчитывается при сохранении фаз.** `save_program_snapshot` получает дерево фаз и `schedule`, но `name`/`level`/`duration` не трогает (`useProgramEditor.ts:193-234`). В проде уже есть расхождение: личная программа «Че та» — `duration = 8` при одной фазе `weeks_count = 1`. Проверять запросом conformance (`SKILL.md` Шаг 5), править через `updateProgram`/`ProgramFormSheet`.
2. **Редактор загружает только неделю 1.** `getProgramWithPhases` оставляет в `days` строки с `week_number === 1` (`programsService.ts:365-367`); строки `phase_id IS NULL` в редактор тоже не попадают. Переопределение недели 2+ сохраняется и работает при генерации тренировок, но **визуально исчезает** после reload и правится только SQL. На срезе прода ни одна из 24 программ `week_number > 1` не использует.
3. **`day_number` перенумеровывается по всем дням фазы подряд.** В снапшоте `day_number: dayIndex + 1` считается внутри `days.filter(d => d.phase_id === phase.id)` (`useProgramEditor.ts:208-215`), без группировки по неделе → при переопределённых неделях нумерация съезжает, а `day_number` становится `workouts.day_index`.
4. **Тип фазы и движок не совпадают по алфавиту.** Редактор даёт `hypertrophy|strength|power|deload|custom` (`src/constants/phaseTypes.ts:27-63`), `progression.ts` понимает `strength|hypertrophy|endurance|deload` (`src/engine/progression.ts:76`): шага 1.25 кг (`:457`) и 0.9-го веса дилоуда (`:525`) «Мощность» и «Произвольная» не дадут, а `endurance` в редакторе нет. В `app/workout/[id].tsx:130` значение приводится через `as` — TypeScript не предупредит. Практический вывод: **дилоуд обязан быть `phase_type='deload'`**, а «power» — только витрина и цвет.
5. **`schedule` — витрина.** Чипы дней влияют на число «N дн/нед» в `ProgramHero` и на `programs.schedule`, на календарь занятий — нет. Реальная частота = `дней в фазе × недель`.
6. **«Начать программу» удаляет все тренировки этой программы.** `create_workouts_for_program` перед генерацией делает `delete workout_logs / workout_exercises / workouts where user_id = p_user_id and program_id = p_program_id` — **без фильтра по `finished_at`**, то есть вместе с завершёнными занятиями, заложенными подходами и рекордами (`supabase/migrations/20260925224000_carry_rpe_into_scheduled_workouts.sql`; в UI предупреждение есть — `useProgramEditor.ts:113-119`). Отката нет. Для уже занимавшегося по программе пользователя — только новая программа с другим именем.
7. **Каталожную (seeded) программу не сохранить.** `saveProgram` бросает «Нельзя редактировать чужую программу» при `created_by !== userId` (`useProgramEditor.ts:187-189`), `save_program_snapshot` требует владельца, `sync_program_changes_to_workouts` — тоже. При этом `toggleEditMode` на чужой программе **молча копирует её пользователю** (`:143-158`): правка каталога = создание копии, а не правка каталога.
8. **Дефолты пикера не равны конвенции программы.** Добавленное из пикера упражнение получает `sets 4 / '8-12' / 90 c / medium`, `target_rpe` не задаётся, `progression_policy` — `undefined`, который при сохранении превращается в `'linear'` (`useProgramEditor.ts:229`, `:349-360`). То есть «по умолчанию» даёт RPE-пустоту (конвенция: low 9 / medium-high 8, deload 6) и линейную политику там, где для набора массы нужна `double_progression`. После ручной сборки через UI проверять `count(*) filter (where target_rpe is null)`.

## 4. Что происходит с уже созданными тренировками

- Тренировки — **снимки**: правка `program_exercises` не меняет существующие `workout_exercises`. Sync трогает только `started_at IS NULL AND finished_at IS NULL`; история не переписывается (`CLAUDE.md` §5).
- `sync_program_changes_to_workouts` удаляет `workout_exercises`, чей `exercise_id` отсутствует в `program_exercises` — поэтому перед sync нужно сначала обновить `exercise_id` текущей тренировки (порядок шагов в `programsService.ts:790-930`, `replaceExerciseInProgram`).
- Тело этой функции **отсутствует в репозитории** (миграция `20260731122543` — 0 байт): читать `select pg_get_functiondef('public.sync_program_changes_to_workouts(text)')` на проде.

## 5. Как проверить, что редактор не потерял твою правку

```sql
-- всё ли дерево дожило до БД после «Сохранить» в UI
select ph.phase_number, ph.phase_type, ph.weeks_count, ph.position,
       pd.week_number, pd.day_number, pd.name, pe.position, pe.exercise_name,
       pe.sets, pe.reps_range, pe.rest_seconds, pe.intensity, pe.target_rpe, pe.progression_policy
  from program_phases ph
  join program_days pd on pd.phase_id = ph.id
  join program_exercises pe on pe.program_day_id = pd.id
 where ph.program_id = '<program_id>'
 order by ph.phase_number, pd.week_number, pd.day_number, pe.position;

-- что реально получит пользователь при старте (сколько тренировок создастся)
select count(*) filter (where pd.week_number = 1) template_days,
       sum(ph.weeks_count) weeks
  from program_phases ph join program_days pd on pd.phase_id = ph.id
 where ph.program_id = '<program_id>';
```
