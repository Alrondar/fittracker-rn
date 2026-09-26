---
name: program-seeding
description: Генерация и выкладка готовых (seeded) тренировочных программ FitTracker — SQL seed-миграция по реальной схеме programs/program_phases/program_days/program_exercises, валидация через copy_program_for_user, чек-лист корректности. Использовать при задачах «добавь готовую программу», «seed программ», «PPL/upper-lower для каталога», правке вкладок «Готовые программы от тренеров» и ImportProgramSheet.
---

# Skill: Program Seeding (готовые программы)

## Overview

Создание новых готовых программ для каталога «Готовые программы от тренеров» (`app(tabs)/programs.tsx`, вкладка ready). Программа = строка в `programs` (`created_by IS NULL`) + фазы + дни + упражнения. Выкладка — SQL-миграция в `supabase/migrations/` + тот же SQL на прод через `apply_migration`, затем обязательная проверка копированием.

**Tracker first:** программы — курируемый контент, не LLM-генерация в проде (ROADMAP: AI-last, CI-7 optional).

## Схема (проверено по проде 25.09.2026)

DDL этих таблиц нет в `supabase/migrations/` (исторически вне репозитория) — источник истины: `information_schema` / MCP `execute_sql`, или `src/services/programsService.ts` + `copy_program_for_user`.

### programs (id — **text**, uuid-строка)

| Колонка | Тип | Правила для seed |
|---|---|---|
| `id` | text, default `(gen_random_uuid())::text` | задать явно стабильным uuid — удобнее откат |
| `name` | text NOT NULL | **уникальна по смыслу с существующими** — проверить до вставки |
| `level` | text NOT NULL | в проде: `beginner` / `intermediate` / `advanced` (CHECK нет, UI ожидает эти) |
| `duration` | int NOT NULL | недели; должно совпадать с суммой `weeks_count` фаз |
| `description` | text | человекочитаемая, RU |
| `schedule` | text[] | RU-дни: ` ARRAY['Пн','Ср','Пт'] ` и т.п. |
| `created_by` | uuid NULL FK→auth.users | **обязательно NULL** — иначе не seeded |
| `share_code`, `source_program_id` | text NULL | seed: NULL |

### program_phases (id — text)

`program_id` FK→programs ON DELETE CASCADE; `phase_number` int, `name` text (RU: «Гипертрофия», «Сила», «Дилоуд»), `phase_type` в проде: `hypertrophy` / `strength` / `deload` / `custom`, `weeks_count` int default 1, `position` int.

### program_days (id — uuid)

`program_id` text FK; **`phase_id` text FK→program_phases ON DELETE CASCADE**; `day_number` int (1..N внутри цикла), `name` text, `position` int, `week_number` int NOT NULL default 1.

### program_exercises (id — uuid)

`program_day_id` uuid FK ON DELETE CASCADE; `exercise_name` text NOT NULL; `exercise_id` uuid NULL FK→exercises ON DELETE SET NULL; `sets` int; `reps_range` text NOT NULL (диапазон — **дефис**, `4-6`, не `–`); `rest_seconds` int; `intensity` text NOT NULL CHECK ∈ `low|medium|high`; `position` int NOT NULL; `target_rpe` smallint NULL (1..10 CHECK); `progression_policy` text default `'linear'`.

## Критические инварианты

1. **Каждая фаза имеет собственные строки `program_days` с заполненным `phase_id`.** Дни не переиспользуются между фазами. `copy_program_for_user` выбирает дни строго `WHERE phase_id = v_phase.id`; день без `phase_id` в phased-программе **не скопируется вообще** (молча, без ошибки).
2. `created_by IS NULL` — признак seeded. На нём держатся: вкладка ready, `copyProgramForUser` (`programsService.ts:541`), rollback замены упражнения (`app/workout/[id].tsx:289` — `replaceExerciseInProgram` для seeded падает, это ожидаемо).
3. **`target_rpe` и `progression_policy` доезжают до тренировки (с 25.09, RPE-1).** Раньше обе терялись: `copy_program_for_user` копировал 8 колонок из 10, `create_workouts_for_program` вставлял `workout_exercises` тем же укороченным списком, а `save_program_snapshot` вообще не писал `target_rpe` (в проде было 0 значений). Теперь все три функции несут оба поля, и seeded-программа **может** задавать `target_rpe` (CHECK 1–10) и `progression_policy`. Ограничение остаётся: `target_rpe` — единственный способ выразить «запас 1–2 повторения», `intensity low/medium/high` его не заменяет; исторические строки (до 25.09) остаются NULL и заполнятся только при следующем сохранении.
4. `exercise_id` ставить из каталога (`exercises`, 826 шт., есть `status approved|needs_review` — отдавать `approved`). `exercise_name` копировать из той же строки 1-в-1 — по нему ищутся alternatives/warmup/injury-данные.
5. `duration` = сумма `weeks_count` всех фаз; канон deload −30% объёма (см. `src/engine/progression.ts`, FD-P2c).
6. Миграции репозитория **append-only**: исправление существующей seeded-программы — новая миграция с DELETE по явному `id` + ре-вставка, не правка старого файла.
7. Известный долг: 6 существующих seeded-программ есть только в проде, без seed-миграций в репо. Новые программы обязаны иметь миграцию (иначе `supabase start`-replay их потеряет).
8. **Тренировки — снимки.** `create_workouts_for_program` копирует `sets/reps_range/rest/intensity` в `workout_exercises`; правка `program_exercises` НЕ меняет уже созданные тренировки пользователя. Поэтому blast-radius контент-правки = вкладка ready + будущие копирования (проверено прод-данными 25.09: 24 тренировки StrongLifts остались со старыми значениями после ребаланса программ).
9. **`exercise_name` — денормализованный кэш, его рендерит `DayCard`.** В прод-каталоге 79+106 строк имели имя ≠ `exercises.name` (устаревшие ярлыки, «е» вместо «ё») и 18+16 строк с `exercise_id IS NULL` → `injury_exercise_warnings`/alternatives/warmup для них не работали. Обязанность seed'а: id проставлен, имя совпадает с каталогом 1-в-1; при правке существующей программы сверяй оба поля (validate.sql, запрос 6).
10. **Конвенция значений `reps_range`:** число/диапазон через дефис. Конструкт «до отказа» безопасен (`parseRepsRange` → `null`, цели нет). Тайминг в виде «30 сек» парсится как `{min:30,max:30}` → increase будет поднимать вес «по повторам»; у приложения нет концепции timed-упражнений (FD-SEED-2a), поэтому в seed'е тайминг — осознанный компромисс, а не нейтральное значение.
11. **Не перечитывай таблицу, в которую тот же оператор только что вставил строки.** Основной запрос видит снимок БД до начала оператора, а не результат data-modifying CTE. Для шаблона это значит: `insert … select from dy d join program_phases ph on ph.id = d.phase_id` даёт **0 строк** (фазы из CTE `ph` ещё «не существуют»), и программа ложится с фазами и днями, но без упражнений — без ошибки. Нужное значение фазы (тип, недели) передавай литералом блока. Именно так сломалась первая выкладка 25.09: 3 фазы + 9 дней + 0 упражнений в `Домашней`.
12. **Проверяй выкладку положительным счётчиком.** После применения для каждой фазы сверь `count(program_exercises)` и `sum(sets)` с планом, который метрики скилла считают локально из seed-листа. Пустая группировка в проверочном запросе — это не «всё чисто», а «строк нет». Плюс `unresolved = 0`, `name_drift = 0`, `target_rpe not null` там, где задумано.

## Workflow

1. **Бриф**: цель (сила/гипертрофия/новичок), уровень, дней/нед, сплит (PPL, U/L, Full Body…), оборудование. Базовые частоты: beginner 3 дня, intermediate 4–5, advanced 6.
2. **Проектирование**: фазы (обычно hypertrophy → strength → deload; deload 1 нед обязательна как последняя), дни, 5–8 упражнений/день. Проверить баланс мышц через `primary_muscles`/`movement_pattern` каталога; не дублировать одно движение-паттерн подряд.
3. **Resolver**: каждый `exercise_name` должен существовать в `exercises` (см. `references/validate.sql`, запрос 1). Нерешённые — подобрать существующее, **не** добавлять упражнения в каталог без отдельного запроса пользователя.
   - **Ловушка (подтверждено прод-тестом 25.09):** каталог **смешанный** по «ё»/«е» — есть и «Жим ногами в тренажёре», и «Сведение ног в тренажере», и «Подъем…». Никакого правила на букву: имя брать только из результата `select name from exercises …` и вставлять дословно.
   - **Ловушка ручного набора:** латинская `e` вместо кириллической не видна глазу и молча снимает резолв. Перед применением доставать имена из самого файла миграции (grep/node-парсер строк `values`) и прогонять ровно этот список через `left join exercises x on x.name = c.nm` — `unresolved_names` обязано быть 0.
   - `status`: предпочтителен `approved`; `needs_review` допустим, т.к. существующие seeded-программы его уже используют (проверено), но число таких строк назови в отчёте.
4. **Seed SQL**: `assets/seed_template.sql` — декларативный CTE (`insert…returning` → следующий уровень), один WITH-блок на фазу. id программы — стабильный uuid, заданный явно (удобнее откат). Все имена в `e(day_name,name,…)` — дословно из `exercises.name` (каталог смешанный по «ё»/«е», см. шаг 3 — не печатать имена по памяти).
5. **Выкладка**: записать файл в `supabase/migrations/` (`ГГГГММДДЧЧММСС_seed_program_<slug>.sql`) И применить тот же SQL на прод через MCP `apply_migration` (поток как в WARMUP-2, см. память проекта reference-supabase-mcp). Записи через `execute_sql` блокируются классификатором auto-mode — не повторять blocked-вызовы, а запросить явное подтверждение пользователя.
   - **Лимит транспорта (подтверждено 26.09):** `apply_migration` не доезжает до сервера с ~10 КБ кириллического SQL (кириллица в JSON — 6 байт/символ; ошибка выглядит как «parameter validation failed», а не как отказ БД). Программу на 3 фазы кладите **тремя вызовами: фаза за фазой** (`<name>`, `<name>_phase2`, `<name>_phase3`); `insert into programs` — в первом. Данные остаются идентичными файлу, но записей в истории будет больше, чем файлов — отмечай это в отчёте и в `STATUS.md`.
6. **Валидация** (обязательна, до отчёта): `references/validate.sql` — запросы 1–8; затем E2E: `copy_program_for_user('<id>','<auth.uid>')` внутри `begin; … rollback;` (техника set_config из памяти проекта) и сравнить counts оригинала/копии; проверить что у копии все дни имеют `phase_id`. Метрики объёма (press/pull/squat/posterior по фазам) считать **локально** из файла миграции парсером VALUES-кортежей, а не перепечатывая строки в SQL (validate.sql, запрос 9).
7. **Отчёт**: название, фазы/недели, дни, упр-й/день, id программы, результат E2E. Обновить `STATUS.md`/`INVENTORY.md` только если поменялся blast-radius.

## Шаблон

Полный рабочий seed-файл — `assets/seed_template.sql` (программа + один WITH-блок на фазу:
phases → days → exercises с резолвом `exercise_id` по точному имени). На каждую новую
программу из шаблона генерируется отдельный миграционный файл; менять в шаблоне нужно
только данные (uuid, метаданные, список `(day_name, name, sets, reps, rest, intensity)`).

## Запрещено

- Seed с `created_by` = uuid пользователя.
- Дни без `phase_id` в phased-программе (молча теряются при копировании).
- Придумывать `exercise_name`/uuid упражнений, которых нет в `exercises`.
- Править применённые миграции задним числом.
- Применять SQL на прод без записанного файла в `supabase/migrations/` (и наоборот).
- Обходить `injury_exercise_warnings` / hard-exclusion ожиданиями «AI сам разберётся» — safety фильтруется на рантайме, но seed обязан использовать безопасные базовые движения для beginner.

## Source of truth

- Схема/констрейнты: MCP `information_schema` + `pg_constraint` (не документы).
- Копирование: `supabase/migrations/20260924051742_copy_program_for_user_uid_check.sql`.
- Consum'еры seeded-семантики: `src/services/programsService.ts` (`copyProgramForUser`, `share_code` импорт), `app(tabs)/programs.tsx`, `app/workout/[id].tsx`.
- Прогрессия/edges: `src/engine/progression.ts`; продукты: `PRODUCT.md` §готовые программы; этапность: `ROADMAP.md` B/C.

## Resources

- `references/validate.sql` — 9 проверочных запросов (резолв имён, структура фаз/дней, conformance, diff_counts, E2E-копия, целостность ссылок id/имени, баланс жим/тяга, кратность имён в каталоге + метод извлечения имён из файла).
