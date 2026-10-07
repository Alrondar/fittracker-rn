# Аудит структуры проекта FitTracker RN — 2026-10-07

Вопрос владельца: корректно ли разбиты файлы, всё ли логично и просто найти, нет ли лишних файлов и кода.

Метод: детерминированный скрипт-обход (не grep-догадки) — граф импортов по 311 TS/TSX-файлам в `app/` + `src/`, разрешение относительно путей и алиасов по `tsconfig.json`/`babel.config.js`, транзитивная достижимость от 23 роут-файлов `app/`; плюс `wc -l`, `git ls-files`, `.gitignore`, `package.json` vs фактические импорты.

Вне scope повторного репорта (уже в STATUS/`code-quality-2026-10-06.md`): **QA-1** (`createClient` без дженерика, `database.types.ts` не подключён), **CTR-3** (20 файлов >500 строк), **QA-9** (6 удалённых осиротевших компонентов + «~40 неиспользуемых экспортов»), SEC/FZ/BUG-серии.

## 1. Вердикт

Разбивка в целом правильная и читать её можно: `app/` = тонкие роуты Expo (23 файла, роли совпадают с `INVENTORY.md §1`), `src/components/<feature>/` = 12 фичевых папок, `src/services/` = единственная граница Supabase, `src/engine/` = чистое ядро, `src/lib/` = инфраструктура. Мусора в ассетах нет: все 93 SVG `src/assets/equipment-icons/` на что-то ссылается.

Проблемы три класса, и ни одна не «переписать архитектуру»:

1. **Есть слой-заготовка, до которого нет пути** — 13 файлов (≈68 КБ, из них 45 КБ — `database.types.ts`) транзитивно недостижимы от роутов: два файла-пустышки с `export {}`, мёртвый сервис, мёртвая карточка с её утилитой, «стилевой слой» и барели типов/UI.
2. **Навигация врёт ровно там, где её ищут** — `INVENTORY.md §0` ссылается на несуществующие `app.config.ts` и `hooks/program/`; алиасы `@/*` в `tsconfig.json` и `babel.config.js` противоречат друг другу и не используются ни разу (1597 внутренних импортов — относительные, вплоть до `../../../src/store/useStore`); правила агента лежат в 4 местах (корневые `.md`, `.cursor/rules/`, `.ai/workspace/analysis/`, `spark-output/`) — это не копипаста, но синхронизировать их приходится руками.
3. **Мелкий tracked-хлам и сломанная проводка** — в git лежат 81 КБ gradle-лога, `.bak`, 0-байтовый tmp-файл и 4 одноразовых codemod'а от закрытых пакетов; `npm test` объявлен, но jest не установлен и тестов нет; `@react-navigation/bottom-tabs` импортируется, но не объявлен в зависимостях.

## 2. Находки

### STR-1 | 🟠 | 12 файлов, недостижимых от роутов (без учёта `database.types.ts` = QA-1) | Мёртвый код, оставшийся после пакетов

Доказательство: транзитивное замыкание от 23 записей `app/` не накрывает эти файлы; по каждому — повторный grep по именам экспортов, ссылки только самоцитаты или комментарии.

| Файл | Размер | Что это | Как умер |
|---|---|---|---|
| `src/components/workout/sections/ExerciseCardEquipment.tsx` | 205 B | буквально `export {};` + комментарий «kept as a placeholder to avoid breaking any potential imports» | UX-16 D2 → заменён на `ExerciseCardTags.tsx`; импортов-обёрток не нашлось ни одного |
| `src/components/workout/sections/ExerciseCardMuscles.tsx` | 205 B | то же, `export {};` | тот же пакет |
| `src/components/workout/sections/ExerciseCardKnowledge.tsx` | 3.0 КБ | рабочий компонент «Важно знать» | `ExerciseCard.tsx:13-17` подключает Header/Tags/Warning/Actions/Info, Knowledge — нет |
| `src/components/profile/NutritionWeekCard.tsx` | 5.3 КБ | FEAT-2.1 «Неделя питания» | вытеснена живой `dashboard/NutritionWeekTable.tsx` (её подключает `DashboardNutritionCard.tsx:318`); сам `useWeeklyNutrition` жив — его использует `WeeklyBalanceChip.tsx:35`. Единственный след карточки в дереве — комментарий в `progress/VolumeTrendChart.tsx:3` |
| `src/utils/nutritionTrend.ts` | 2.6 КБ | `computeWeekAdherence` | импортируется только вышеуказанной мёртвой карточкой — отваливается каскадом |
| `src/services/programPhasesService.ts` | 3.2 КБ | CRUD фаз (create/update/delete/reorder) | `hooks/useProgramPhases.ts:3` берёт `ProgramPhase` и мутации из `programsService.ts` |
| `src/styles/index.ts` + `components/input.ts` + `components/list.ts` + `components/workout.ts` | 7.0 КБ | барель + 3 стилевые фабрики | барель никем не импортируется, фабрики — только из бареля; `createWorkoutStyles(_colors)` к тому же с подчёркнутым параметром, т.е. заглушка |
| `src/types/index.ts` | 1.0 КБ | рукописные `Exercise`/`Workout` интерфейсы | ни одного импорта из `src/types` (реальные типы живут в сервисах и `types/workout.ts`) |
| `src/components/ui/index.ts` | 207 B | барель 18 UI-компонентов | все 18 импортируются по именам файлов |

Итог: ~23 КБ мёртвого исходника, кроме `database.types.ts`.

### STR-2 | 🔴 | `babel.config.js:7-21` vs `tsconfig.json:7-32` | Алиасы противоречат друг другу и не используются

Доказательство: скрипт классифицировал 2299 спецификатора импорта в `app/`+`src/` → **1597 относительных, 702 npm, 0 алиасных**. При этом `babel-plugin-module-resolver` мапит `@` → `./src`, а `tsconfig.paths` мапит `"@/*"` → `"./*"` (корень репозитория). Запись `@/lib/supabase` собралась бы в `src/lib/supabase`, а `tsc` искал бы `./lib/supabase` → расхождение сборки и типов; `@/types/database.types` не разрешился бы вообще (реальный путь — `src/types/`). Плюс `tsconfig.include`/`exclude` ссылаются на несуществующее: `libs/react-native-body-highlighter/__tests__`, `admin` (панель — отдельный репозиторий `../fittracker-admin`).

Последствие для поисковой навигации: самый дорогой эффект — `app/program/[id]/edit.tsx:13` → `../../../src/store/useStore`, и так 30+ файлов; `INVENTORY.md §0` об этом молчит.

Решение — в одну из сторон: либо включить алиасы (единый источник: `@/*` → `./src/*` в обоих конфигах) и сконвертировать импорты кодомодом, либо удалить 9 `paths` + 8 `alias` и оставить только относительные. Половинчатое состояние хуже обоих.

### STR-3 | 🟠 | `package.json` scripts vs фактическое дерево | Объявленный, но неработающий слой тестов

Доказательство: `"test": "jest"`, но `jest` отсутствует и в `dependencies`, и в `devDependencies`, и в `node_modules` (проверено `ls -d node_modules/jest` → нет); тест-файлов (`*.test.*`, `*.spec.*`, `__tests__`) в `app/`+`src/` — 0. Одновременно `"postinstall": "patch-package"` при пустом каталоге `patches/` (в git не входит ни одного файла). Единственный работающий гейт — `tsc --noEmit` + `eslint .` (базлайн 0/0 зафиксирован в `code-quality-2026-10-06.md`).

Последствие: любой, кто ищет «как это проверить», получает команду, которая падает, и документ, который ссылается на прогоны, которых негде запустить. Решение — на выбор владельца: либо убрать `test`/`patches`-wiring, либо завести минимальный jest-пакет под `engine/` (чистые функции — самый дешёвый кейс).

### STR-4 | 🟡 | `src/components/CustomTabBar.tsx:4` | Фантомная зависимость

Доказательство: `import { BottomTabBarProps } from '@react-navigation/bottom-tabs'`, пакета нет в `package.json:dependencies` — живёт только как транзитив `expo-router`. Поднимется на любом `npm ci` с другой версией роутера. Исправление: объявить зависимость (или взять тип из `expo-router`).

### STR-5 | 🟠 | `src/components/` (корень) и `src/components/ui/` | Разбивка компонентов непоследовательна

В корне `src/components/` лежат 9 файлов, и три из них — чисто программные: `ProgramCard.tsx`, `ProgramFormSheet.tsx`, `ProgramProgressCard.tsx` (рядом есть `components/program/` с 14 файлами). Ещё три — примитивы, место которым в `ui/`: `FadeIn.tsx`, `Toast.tsx`, `Skeleton.tsx`. Отдельная ловушка: **`components/Skeleton.tsx` (205 строк, примитивы `ShimmerWrap`/`Skeleton`/`ListSkeleton`) и `components/ui/skeletons.tsx` (198 строк, экранные `DashboardSkeleton`/`WorkoutSkeleton`/…)** — обе системы живые и используются вместе в одном файле (`app/(tabs)/index.tsx:28-29`), но лежат в разных слоях и различаются только регистром и числом; по имени невозможно понять, куда идти. `ui/index.ts` как точка входа не работает (STR-1), т.е. «барель дизайн-системы» есть, но им никто не пользуется.

Остальное (12 фичевых папок) — размечено аккуратно: `workout/` 42 файла, `ui/` 19, `program/` 14, `dashboard/` 14.

### STR-6 | 🟡 | `src/services/` + `src/utils/` + `src/engine/` | Имена-омонимы не подсказывают роль

Сами слои правильные (I/O в `services`, чистый расчёт в `utils`/`engine`), но пары имён не различимы без прочтения файла:

| Пара/тройка | Фактическая роль |
|---|---|
| `services/workoutService.ts` (616) vs `services/workoutsService.ts` | сессия тренировки vs список/активные программы — различаются одной буквой `s` |
| `services/exercisesService.ts` vs `services/exercisesServiceNormalized.ts` | первый — чистый шим-реэкспорт 5 функций + 9 типов из второго |
| `engine/weeklySummary.ts` (743) + `services/weeklySummaryService.ts` (567) + `hooks/useWeeklySummary.ts` | одна фича на трёх слоях с почти идентичными именами |
| `services/forecastService.ts` + `utils/workoutForecast.ts` + `hooks/useWorkoutForecast.ts` | то же |
| `utils/strengthStandards.ts` + `constants/strengthStandards.ts` + `services/*` | нормативы в двух папках |
| `utils/cycle.ts` + `types/cycle.ts` + `services/cycleService.ts` + `hooks/useCycle.ts` | цикл в четырёх |
| `utils/muscleLoad.ts` + `utils/programMuscleLoad.ts` + `services/muscleStatsService.ts` | факт-агрегация / плановая / Supabase-граница |

Самое дешёвое исправление без перестройки архитектуры: переименовать по роли (`workoutSessionService`, `workoutListService`, убрать шим `exercisesService`), и в `INVENTORY.md §0` добавить таблицу «фича → слои».

### STR-7 | 🟡 | `src/utils/` (25 файлов) и `src/hooks/workout/` | Плоский utils и единственный feature-подкаталог хуков

`utils/` — 25 файлов, многие по одной функции (`dateKey.ts`, `reps.ts`, `rpe.ts`, `plates.ts`, `streak.ts`, `trend.ts`, `numericInput.ts`…); группировки по доменам нет, поэтому «где функция расчёта RPE» решается только поиском. В `hooks/` 41 файл лежит плоско, и только один хук вынесен в подпапку — `hooks/workout/` с тремя файлами-спутниками (`useWorkoutSession.loader/.mapper/.types`); при этом `INVENTORY.md §0` обещает ещё и `hooks/program/` (STR-9). Правило «выносим спутников крупного хука» существует, но применено один раз.

### STR-8 | 🟡 | корень репозитория + `scripts/` | В git лежат артефакты и отработанные codemod'ы

`git ls-files` (524 файла) включает: `build_full.log` — 81 696 Б UTF-16 gradle-лога сборки от 24.08; `tsc-check.sh.bak` — 4-строчный локальный хелпер «cd /c/projects/…; npx tsc --noEmit | head -100»; `types.tmp.ts` — 0 байт; `refactoring_guide.md` — 93 строки, про которые сам `AGENTS.md` говорит «архив, не обновлять»; `scripts/ux4-audit.js`, `scripts/ux4-codemod.js`, `scripts/web-alert-codemod.js`, `scripts/w1-docs.js` — одноразовые кодомоды закрытых пакетов UX-4 / WEB-1 / W1. Из `scripts/` живые и полезные: `generate-types.ts`, `gen-app-icons.js`, `fix-equipment-svg.mjs`.

### STR-9 | 🟡 | `INVENTORY.md §0` и ролевые строки | Карта кода расходится с деревом

| Утверждение в `INVENTORY.md` | Факт |
|---|---|
| §0 «Expo config → `app.config.ts` + `src/lib/config.ts`» | `app.config.ts` не существует, есть `app.json` |
| §0 «Хуки → `src/hooks/`, feature-подпапки (`hooks/workout/`, `hooks/program/`, …)» | подпапка одна: `hooks/workout/` |
| §0 «Shared UI → `src/components/ui/` (… `Skeleton` …)» | `Skeleton.tsx` лежит в `src/components/`, в `ui/` — `skeletons.tsx` |
| §0/«Migrations → проверка в `types/database.types.ts`» | путь `src/types/database.types.ts`, файла к тому же никто не импортирует (QA-1) |
| §`useWeeklyNutrition` → «NutritionWeekCard (profile)» | карточка недостижима (STR-1) |
| §PR7 → «ExerciseCardKnowledge использует SectionSubheading…» | компонент сам недостижим (STR-1) |

Это самый дорогой класс находок: навигация по проекту строится именно на §0, а он указывает в несуществующие места. Отдельно §12 уже фиксировался как дрейфующий (CTR-3: «workout/[id] ~400» при 603).

### STR-10 | 🟡 | 4 места хранения правил агента | Правильно, но синхронизировать приходится вручную

Корень: 9 `.md`-файлов, 3002 строки (STATUS.md — 200 КБ одной таблицей, 552 строки; INVENTORY — 78 КБ). Плюс `.cursor/rules/00-architecture.mdc`…`04-schema-inventory.mdc` (5 файлов по 32-43 строки, у трёх `alwaysApply: true`), `.ai/workspace/analysis/` (3 разбора инцидентов) и `spark-output/` (14 файлов: audit/, arch/, specs/, checklists/, context/, plan, dashboard.html).

Поправка по факту: `.cursor/rules/*` — не дословные копии, а сжатые конспекты; каждый из 5 файлов ссылается на `CLAUDE.md`/`PRODUCT.md`/`STATUS.md` 7-11 раз, т.е. правило «один факт — один владелец» формально не нарушено. Проблемы другие: синхронность (одни и те же инварианты в 4 форматах надо обновлять разом) и «где искать» — `.cursor/*` читается только в Cursor, тогда как основной агент здесь работает через `AGENTS.md` + `.qoder/`. Решение за владельцем: либо объявить `.cursor/rules` устаревшими и удалить, либо держать как зеркала и проверять их в каждом доки-пакете.

### STR-11 | 🟢 | рабочее дерево vs `.gitignore` | Bulk-дампы и пустые каталоги мешают поиску по дереву

`data/free-exercise-db-main/free-exercise-db-main/exercises/**` — 2666 файлов (в git не входят: `git ls-files data` → 0), но попадают в Glob/поисковые листинги и засоряют контекст агента. Исключение в `.gitignore` (`!data/exercises/`, `!data/exercises/**/*`) указывает на путь, которого нет — реально дамп лежит глубже, т.е. задуманный whitelist не работает. `dist/`, `web-deploy/`, `.expo/`, `android/` — игнорируемые артефакты (для `android/` это норма expo-prebuild). Пустые: `patches/`, `.kilo/` (только `.gitignore`).

## 3. Что проверено и признано нормой

Фичевая разбивка `src/components/` (12 папок), тонкость роутов `app/` (23 файла, максимум 659 строк), граница Supabase в `services/`, чистый `engine/`, `lib/feedback.ts` как канон, `styles/components/card/` (9 файлов + барель, все живые), 93/93 SVG-ассетов востребованы, циклов импорта нет (подтверждает `arch/dependency-impact-2026-10-06.md`), в коде 0 `TODO`/`FIXME`/`@ts-ignore` и 27 `eslint-disable` на 311 файлов — не захламлено.

## 4. Предлагаемые пакеты (по одному, как обычно)

| Пакет | Что | Gate |
|---|---|---|
| **STR-A: вычистить мёртвое** | 12 файлов из STR-1 (кроме `database.types.ts`) + 4 файла из STR-8 + 4 отработанных codemod-а | `tsc --noEmit` + `eslint .` |
| **STR-B: карта кода** | правки `INVENTORY.md §0` по всем 6 строкам STR-9 + одна таблица «фича → слои» из STR-6 | ручная сверка с деревом |
| **STR-C: проводка** | решение по STR-2 (алиасы: включить и конвертировать ИЛИ удалить 9+8 записей), STR-3 (`test`/`patches`), STR-4 (объявить `@react-navigation/bottom-tabs`) | `tsc`, `expo export --platform web` |
| **STR-D: переезд файлов** | 9 файлов из корня `src/components/` по папкам + склейка `Skeleton.tsx`/`ui/skeletons.tsx` в один `ui/skeletons.tsx` (rename-коммит, без изменения логики) | `tsc`, `eslint`, прогон 4 табов на устройстве |
| **STR-E: docs-владение** | вердикт по `.cursor/rules/*` (удалить как мёртвый для Qoder-агента слой или оставить зеркалом и проверить, что они не расходятся с `CLAUDE.md`) и по сегментации `STATUS.md` (200 КБ одной таблицей) | — |

Ничего из перечисленного не меняет рантайм-поведение, кроме STR-D (чистые move/rename) и STR-C в варианте «включить алиасы» (1597 правок импортов — самый рискованный пункт, поэтому он отдельным пакетом и требует решения владельца).

Проверка по второму дереву (правило worktree из `AGENTS.md`): в `../fittracker-rn-web` (ветка `web-port`) по всем 12 кандидатам STR-A найден только один след — тот же комментарий в `src/components/progress/VolumeTrendChart.tsx:3`, импортов нет. Т.е. мёртвые файлы мертвы и в порту, удаление из `main` безопасно для обеих веток.
