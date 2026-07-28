# FitTracker RN — Полные инструкции для AI-ассистента

## 🎯 О проекте

Приложение для ведения тренировок на React Native (Expo).

- **Язык:** TypeScript ~5.9 (строгая типизация)
- **Навигация:** Expo Router ~6.0 (файловая, группы маршрутов `(tabs)`, `(auth)`)
- **Бэкенд:** Supabase (PostgreSQL + RLS + RPC + Auth), `@supabase/supabase-js` ^2.110. Project ID: `trgiihqqcovidwcqwdkl`
- **Аутентификация:** Supabase Auth (email/password), единый слой `src/services/authService.ts`.
- **Стейт-менеджмент:**
  - `@tanstack/react-query` ^5.101 — для ВСЕХ серверных данных (списки, CRUD, пагинация, dashboard, goals).
  - `zustand` ^5 — ТОЛЬКО для UI-стейта (`isAuthenticated`, `userId`, `themePreferences`).
    ⚠️ Исторически в `useStore` ещё лежат `workouts`/`logs`/`alternativesCache` — это tech debt (см. ниже), постепенно выносить в React Query.
- **Стилизация:** Единая дизайн-система через `useTheme()` + атомарные UI-компоненты.
- **Анимации:** `react-native-reanimated` ^3.16 + `react-native-gesture-handler` ~2.28.
- **Иконки:** `lucide-react-native` ^1.24 + кастомные SVG (`react-native-svg` 15.12 + `react-native-svg-transformer`).
- **Изображения:** `expo-image` ~3.0 (замена Image из RN).
- **Тактильность:** `expo-haptics` ~15.0.
- **Drag & Drop:** `react-native-draggable-flatlist` ^4.0.
- **Runtime:** Expo SDK ~54, React Native 0.81.5, React 19.1.

---

## 🏗️ Архитектура

### Структура папок
app/ # Expo Router (экраны)
_layout.tsx # КОРНЕВОЙ layout: QueryClient, провайдеры, auth-гейт,
# onAuthStateChange, PASSWORD_RECOVERY → update-password
(auth)/ # Группа авторизации
_layout.tsx # Только Stack headerShown:false (БЕЗ провайдеров/гейта)
login.tsx # Вход / регистрация
reset-password.tsx # Запрос письма сброса пароля
update-password.tsx # Смена пароля по recovery-сессии
(tabs)/ # Главный таб-бар
_layout.tsx # Таб-бар layout
index.tsx # Dashboard (React Query через useDashboard)
exercises.tsx # Справочник упражнений (infinite scroll, фильтры)
history.tsx # История тренировок
programs.tsx # Программы тренировок (+ импорт по коду)
workouts.tsx # Тренировки (useFocusEffect — обновление по фокусу)
profile.tsx # Профиль пользователя
exercise/[id].tsx # Детальный экран упражнения (hero-слайдер, аккордеоны)
history/[id].tsx # Детали истории
profile/ # Экраны профиля (без таб-бара)
goals.tsx # Цели и макросы (React Query через goalsService)
injuries.tsx # Травмы пользователя
metrics.tsx # Замеры тела
settings.tsx # Настройки (тема, профиль)
program/[id].tsx # Детальный экран программы (редактор + шаринг)
workout/
[id].tsx # Экран тренировки (сессия + авторазминка)
create.tsx # Создание тренировки (programId / repeatId → workoutService)
src/
assets/equipment-icons/ # SVG-иконки оборудования (44 шт.)
components/
ui/ # Атомарные UI (AppButton, AppCard, AppBadge, AppInput)
workout/ # Компоненты тренировки
ExerciseCard.tsx # Карточка упражнения (memo, аккордеоны, подходы)
ExerciseSlider.tsx # Слайдер: основная + альтернативы (memo)
ExerciseInfoAccordion.tsx
MuscleBubbles.tsx
EquipmentBubbles.tsx
TechniqueMediaSlider.tsx
WarmupBlock.tsx
RestTimer.tsx
WorkoutTimer.tsx
exercises/ # Компоненты справочника
program/ # Компоненты программ
PhaseCard.tsx
sheets/ # PhaseSettings, DaySettings, ExercisePicker,
# ExerciseSettings, ScheduleEditor, ImportProgram, ShareProgram
profile/ # MacroPieChart и др.
Dashboard-компоненты: # ActivityCalendar, ExerciseProgressCard, LastWorkoutCard,
# PersonalRecordsCard, WeeklyStatsCard, ProgramProgressCard
Общие: # AnimatedButton, BottomSheet, CustomTabBar, EquipmentIcon,
# FadeIn, ProgramCard, ProgramFormSheet, SectionHeader,
# Skeleton, SwipeableCard, Toast/ToastProvider
hooks/
useDashboard.ts # Dashboard (React Query, queryKey ['dashboard', userId])
useBodyMetrics.ts
useExerciseDetail.ts # staleTime: Infinity
useExercises.ts # useInfiniteQuery, debounce, фильтры, activationOnly
useInjuryWarnings.ts # avoid/caution
useProfile.ts
useProgramEditor.ts # Редактор программ (drag & drop, CRUD, фазы)
usePrograms.ts # useInfiniteQuery
useTheme.tsx
useTimerSettings.ts # Настройки таймера отдыха (звук/вибрация/отсчёт)
useToast.ts
useWarmup.ts # Разминка (исключает противопоказанные по activeInjuries)
useWorkoutSession.ts # Сессия тренировки (useCallback + ref-зеркала для memo)
services/
authService.ts # Supabase Auth: signIn/signUp/signOut/reset/update/getSession/
# onAuthStateChange/mapAuthError + ensureProfile
dashboardService.ts # Агрегация данных dashboard (Promise.allSettled)
exercisesService.ts # Упражнения: список, словари фильтров, по ID
goalsService.ts # Цели: getGoalsProfile/saveGoalsProfile (upsert)
metricsService.ts # Замеры тела (getLatestMetric/createMetric)
profileService.ts # Профиль, статистика, КБЖУ, личные рекорды, травмы
programsService.ts # getProgramWithPhases, advanceProgramProgress,
# createWorkoutsFromProgram (upfront), getActiveProgram, CRUD
programSharingService.ts # generateShareCode, importProgramByCode, formatShareCode
warmupService.ts # Автогенерация разминки по целевым мышцам
workoutService.ts # startProgramWorkout, repeatWorkout
store/ # Zustand (в идеале только UI-стейт)
constants/
equipmentIcons.ts
exerciseCategories.ts
phaseTypes.ts # hypertrophy/strength/power/deload/custom: getPhaseMeta/getPhaseColor
injuries.ts # BODY_PARTS/INJURY_TYPES + matchesContraindication/
# targetsInjuredMuscle/computeExerciseWarnings
muscleColors.ts
muscleGroups.ts
semanticColors.ts # LEVEL_COLORS, MACRO_COLORS, PHARMA_COLORS, SEVERITY_COLORS,
# BODY_PART_COLORS, BODY_ZONE_COLORS
theme.ts # 5 акцентов × 2 режима, SPACING, BORDER_RADIUS, GRADIENTS
styles/
common.ts
typography.ts
components/
card/ # Модульная структура (createCardStyles)
dashboard.ts # createDashboardStyles
workout.ts # createWorkoutStyles
types/
database.types.ts # Автогенерация типов Supabase (npx supabase gen types)
index.ts # Exercise, Workout, WorkoutExercise, SetLog, WorkoutLog
metrics.ts
workout.ts # ExerciseData / AlternativeExercise / SetData (с reps_range)
lib/
supabase.ts # Supabase клиент + хелперы getList/getString
timerSounds.ts # Генерация WAV-бипов (expo-audio)

---

## 🔐 Авторизация и профили (Supabase Auth)

### Единый слой `authService.ts`
- UI-экраны **НЕ** вызывают `supabase.auth.*` напрямую — только через `authService`.
- Редиректы по состоянию сессии делает **корневой `_layout.tsx`** через `onAuthStateChange` (единственный источник истины по переходам), не сервис.
- Экспортирует: `signIn`, `signUp`, `signOut`, `sendPasswordReset`, `updatePassword`, `getSession`, `onAuthStateChange`, `mapAuthError`.
- `signUp` возвращает `{ user, needsEmailConfirmation }` (`needsEmailConfirmation = !data.session`).

### Создание профиля
- Профиль создаётся **триггером БД** `handle_new_user` (AFTER INSERT ON auth.users).
- ⚠️ **КРИТИЧНО:** в таблице `profiles` **НЕТ колонки `email`**. Триггер и `ensureProfile` пишут ТОЛЬКО `id`. Попытка записать `email` роняет запрос ошибкой `42703`.
- `ensureProfile(userId)` — страховочный идемпотентный `upsert({ id }, { onConflict: 'id' })`; вызывается на `signIn` (чинит старые аккаунты) и на `signUp` только при наличии сессии. Ошибку `23505` (unique violation) игнорирует, вход НЕ блокирует.
- Email пользователя всегда берётся из `auth.users` (`supabase.auth.getUser()`), не из `profiles`.

### RLS-политики (сверено с БД)
- `profiles`: SELECT/INSERT/UPDATE — `auth.uid() = id`.
- `programs`: SELECT — `created_by IS NULL OR created_by = auth.uid()`; INSERT/UPDATE/DELETE — `created_by = auth.uid()`. (Seeded-программы: `created_by IS NULL`.)
- `program_phases` / `program_days` / `program_exercises`: SELECT — через связь с `programs` (`created_by IS NULL OR created_by = auth.uid()`); INSERT/UPDATE/DELETE — `created_by = auth.uid()`.
- `user_programs`: SELECT/INSERT/UPDATE/DELETE — `auth.uid() = user_id`.
- `workouts`: SELECT/INSERT/UPDATE/DELETE — `auth.uid() = user_id`.
- `workout_exercises`: через `workouts.user_id = auth.uid()`.
- `workout_logs`: SELECT/INSERT/UPDATE/DELETE — через `workout_exercises → workouts.user_id = auth.uid()`.
- `exercises`, `equipment`, `exercise_equipment`, `injury_exercise_warnings`: SELECT для всех (справочники).

### Корневой auth-гейт (`app/_layout.tsx`)
- `QueryClient` создаётся ВНЕ компонента.
- `getSession()` при старте → `setAuth`; `onAuthStateChange` → `setAuth(session?.user?.id ?? null)`.
- `PASSWORD_RECOVERY` → `router.replace('/(auth)/update-password')` (setAuth намеренно не вызывается; исключение в гейте удерживает экран).
- Неавторизованный → `/(auth)/login`; авторизованный в `(auth)` (кроме `update-password`) → `/(tabs)`.
- Deep link для сброса пароля: `fittracker://reset-password` (схема из `app.json`).

---

## 🏋️ Данные упражнений (Supabase)

- Таблица `exercises` — 870+ записей, названия на русском.
- **Категории** (поле `category`, скаляр): `strength`, `stretching`, `plyometrics`, `olympic weightlifting`, `powerlifting`, `cardio`. Русские подписи/иконки — в `constants/exerciseCategories.ts`.
- **Мышцы** (`primary_muscles`, `secondary_muscles` — массивы) на русском. Группы для фильтра — в `constants/muscleGroups.ts`.
- **Оборудование** (`equipment` — массив) на русском (68 значений).
- **`can_be_activation`** (boolean) — тип «Активация» (62 упражнения).
- **`media_url`** — одиночный URL (free-exercise-db). Клиент генерирует пару `0.jpg + 1.jpg` через `parseMediaUrls` в `TechniqueMediaSlider.tsx`.
- ⚠️ Колонки `description` в таблице НЕТ — не включать в select (ошибка 42703).
- **Справочник:** пагинация 40/страница (`useInfiniteQuery`), лёгкий select (`id, name, primary_muscles, equipment, can_be_activation`), серверные фильтры: `overlaps` (мышцы, оборудование), `in` (категория), `ilike` + `.or()` (поиск), debounce 300 мс, `keepPreviousData`, `staleTime: Infinity` для словарей.
- **Альтернативы:** поле `alternatives` (массив ID) + fallback по `overlaps('primary_muscles', ...)`.

---

## 🔁 Периодизация программ (фазы / мезоциклы)

### Модель данных
- `programs` → `program_phases` (`phase_number`, `name`, `phase_type`, `weeks_count`, `position`) → `program_days` (`phase_id`, `week_number`, `day_number`) → `program_exercises`.
- `user_programs`: `current_phase` / `current_week` / `current_day` (прогресс по фазам), `is_active`, `started_at`.
- `workouts`: `phase_number` / `week_number` / `day_index` (связь тренировки с фазой/неделей/днём), `started_at` / `finished_at` / `duration_seconds`.
- `program_days.id`, `program_exercises.id` — `uuid`; `programs.id`, `program_phases.id` — `text` (для сидов: `gen_random_uuid()` для дней/упражнений, `gen_random_uuid()::text` для программ/фаз).
- **Типы фаз** (`constants/phaseTypes.ts`): `hypertrophy`, `strength`, `power`, `deload`, `custom`. Цвет/иконка/подпись — через `getPhaseMeta`/`getPhaseColor` (без хардкода).

### Создание тренировок
- **Вариант B (upfront):** при старте программы `createWorkoutsFromProgram` создаёт тренировки для ВСЕХ фаз и недель сразу. Для каждой недели берутся её дни либо шаблон недели 1 (fallback).
- **Точечное создание** (`workoutService.startProgramWorkout`): создаёт тренировку текущего дня (`current_phase/week/day`), идемпотентно (возвращает существующую незавершённую), fallback на шаблон недели 1. Используется экраном `workout/create.tsx`.
- **Повтор** (`workoutService.repeatWorkout`): копирует тренировку как ad-hoc (без привязки к программе).
- **Вариативность по неделям (шаблон + переопределения):** неделя 1 = шаблон; недели 2…N наследуют, пока не переопределены (`copyTemplateToWeek`); сброс — `resetWeekToTemplate`.

### Прогрессия
- `advanceProgramProgress`: день → (конец недели?) неделя++ → (конец фазы по `weeks_count`?) фаза++ → (нет следующей фазы?) программа завершена. Fallback для программ без фаз — старая логика по `duration`.
- RPC `copy_program_for_user(p_program_id, p_user_id)`: копирует программу с фазами/днями/упражнениями (`programs.id`/`program_phases.id` — text, `program_days.id` — uuid).

### Готовые программы (6, засеяны, `created_by IS NULL`)
| Программа | Уровень | Дней/нед | Фазы |
|---|---|---|---|
| Full Body — Старт | beginner | 3 | Адаптация (4) → Прогрессия (3) → Дилоуд (1) |
| StrongLifts 5×5 | beginner | 2 | База 5×5 (8) → Интенсификация (3) → Дилоуд (1) |
| PPL Классический | intermediate | 3 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| Upper/Lower | intermediate | 4 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPLUL | intermediate | 5 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPL 6-day | advanced | 6 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |

### UX списка тренировок (`workouts.tsx`)
- `SectionList` с группировкой по фазам/неделям (заголовки через `SectionHeader`), статусы (✅ выполнена / ▶️ следующая / ⏸️ в процессе / ⏳ будущая), бейджи фаз, шапка с прогрессом программы.
- «Следующая» определяется по `current_phase/week/day` из `user_programs`.
- **`useFocusEffect`** — список обновляется при каждом возврате на вкладку (решает проблему «начал программу → ушёл → вернулся → экран не обновился»).

### Dashboard (`ProgramProgressCard`)
- Бейдж текущей фазы (иконка + цвет типа), «Фаза N/M · Неделя X», прогресс-бар в цвете фазы.

---

## 🤝 Шаринг программ по коду

- `programs.share_code` (text, nullable) — код для импорта.
- RPC `generate_share_code(p_program_id)` — генерирует уникальный код (только для своих программ).
- `programSharingService`: `generateShareCode`, `importProgramByCode(code, userId)`, `formatShareCode` (человекочитаемый формат).
- UI: FAB «Поделиться» + `ShareProgramSheet` в `program/[id].tsx`; кнопка импорта (Link2) + `ImportProgramSheet` в `programs.tsx`.

---

## 🎨 Дизайн-система и стили

- **Темы:** 5 акцентов (purple, orange, blue, neon, pink), 2 режима (light, dark).
- **Правила стилизации:**
  - Все цвета через `const { colors } = useTheme()`.
  - СТРОГО ЗАПРЕЩЁН хардкод цветов (`#7c3aed`, `'white'`, `'#333'`) — использовать `colors.primary`, `colors.textInverse`, `colors.textPrimary`. (Остаточный исторический хардкод есть в `badge.ts`, `button.ts`, `common.ts`, `dashboard.ts`, `history.tsx` — не добавлять новый, постепенно вычищать.)
  - Отступы: `SPACING.xs/sm/md/lg/xl/xxl`. Радиусы: `BORDER_RADIUS.sm/md/lg/xl/full`.
  - Альфа-суффиксы — паттерн проекта: `colors.warning + '12'`, `colors.primary + '15'`.
- **Модульность стилей:** `card.ts` разбит на папку `src/styles/components/card/`. Импорт через `index.ts` (`createCardStyles`).
- **Иконки оборудования:** `<EquipmentIcon name="..." size={...} primaryMuscles={[...]} />` (проп `name`, не `type`!). Цвет — по первой целевой мышце через `getMuscleColor`.
- **Цвета мышц:** только через `getMuscleColor(muscle)` из `constants/muscleColors.ts`.

### Единый дизайн-язык карточки упражнения
- **Живая обводка:** `avoid` → `colors.error`, `caution` → `colors.warning`, заменено → `colors.primary`, все подходы заполнены → `colors.success + '60'`, по умолчанию → `colors.border`.
- **Аккордеоны** (`ExerciseInfoAccordion`): без контурных обводок, цветной значок + uppercase-заголовок + шеврон; анимация `maxHeight`; `pointerEvents="none"` в свёрнутом состоянии; одна открытая секция на карточку.
- **Баблы мышц** (`MuscleBubbles`): primary — насыщенный цвет группы с точкой-маркером, secondary — нейтральный фон с цветной обводкой.
- **Слайдеры техники:** ленивый монтаж (`everOpened`), автоплей 3с только в раскрытом аккордеоне.

---

## ⚡ Производительность (ОБЯЗАТЕЛЬНО)

- Никогда не вкладывай VirtualizedLists (FlatList, DraggableFlatList) в ScrollView. Используй `ListHeaderComponent`.
- Никаких `console.log` в PanResponder, onScroll, анимациях.
- QueryClient создаётся ВНЕ компонента (в `_layout.tsx`).
- Файлы не должны превышать 500 строк (God Objects запрещены).
- Использовать `expo-image` вместо `Image` из React Native.
- Фабрики стилей (`createCardStyles(colors)`, `createDashboardStyles(colors)` и др.) — только через `useMemo` на уровне экрана. НИКОГДА внутри `renderItem`.
- Колбэки в карточки — только `useCallback`; в хуках с зависимостью от массивов — ref-зеркала (`exercisesRef` в `useWorkoutSession`).
- Карточки списков — `React.memo`.
- Тяжёлые данные (technique, benefits, risks, injuries, settings, alternatives, media_url) — не тянуть в списки; грузить по требованию на детальных экранах.
- **`useFocusEffect`** (из `expo-router`) для обновления данных экрана при возврате по фокусу (вкладки).
- Серверные данные — через React Query (`useQuery`/`useInfiniteQuery`/`useMutation`), запросы в `services/`.

---

## 🚫 Анти-паттерны (НЕ ДЕЛАЙ ТАК)

- ❌ Хранить серверные данные в Zustand.
- ❌ Делать N+1 запросов к Supabase (используй вложенные `select('*, days(*, exercises(*))')`).
- ❌ Писать `supabase.from()` прямо в UI-компонентах (выноси в `services/` или хуки).
- ❌ Использовать `Math.random()` в `keyExtractor`.
- ❌ Использовать `LayoutAnimation` (no-op в New Architecture).
- ❌ Использовать `Image` из `react-native` (используй `expo-image`).
- ❌ Включать `description` в select из `exercises` (колонки не существует).
- ❌ Писать `email` в `profiles` (колонки не существует — ошибка 42703).
- ❌ Монтировать слайдеры/автоплеи в свёрнутых аккордеонах (ленивый монтаж через `everOpened`).
- ❌ Вставлять `gen_random_uuid()::text` в `program_days.id` / `program_exercises.id` (они `uuid` — использовать `gen_random_uuid()` без `::text`; `::text` только для `programs.id` / `program_phases.id`).
- ❌ Вызывать `supabase.auth.*` в UI (только через `authService`).

---

## ⚠️ Известный tech debt

- **`supabase.from()` в UI:** `history.tsx`, `injuries.tsx`, `workouts.tsx` (запросы пока в компоненте; `workouts.tsx` уже на `useFocusEffect`, но не в сервисе). Выносить в `services/` + React Query.
- **Серверные данные в Zustand:** `useStore.workouts`/`logs`/`alternativesCache` — выносить в React Query / локальный state экранов.
- **Хардкод градиентов:** `history.tsx` (`getWorkoutGradient` — массив hex). Заменить на `gradients` из `useTheme()`.
- **`profileService.getBurnedCalories`:** в части версий N+1 (цикл по тренировкам). Корректная версия — один запрос логов через `.in('workout_exercises.workout_id', workoutIds)`.
- **`useWorkoutSession.saveWorkout`:** идемпотентность записи логов зависит от уникального индекса `ux_workout_logs_ex_set` на БД; клиентский `upsert` — после накатки индекса.
- **`database.types.ts`:** держать в синхроне с БД (regenerate после миграций): `npx supabase gen types typescript --project-id trgiihqqcovidwcqwdkl --schema public > src/types/database.types.ts` (запускать из корня проекта, не из `android/`).
- **Превышение 500 строк:** `goals.tsx`, `program/[id].tsx` — кандидаты на разбиение.
- **Артефакты форматирования:** в ряде файлов встречаются синтаксические артефакты (`= >`, `& &`, пробелы в `</Text >`, именах пропсов). Проверять `npx tsc --noEmit`; при наличии — чистить.

---

## 📝 ФОРМАТ ОТВЕТА AI (СТРОГО СОБЛЮДАТЬ)

При генерации кода или рефакторинге AI обязан использовать следующий формат ответа:

### 💡 Основное решение / Код
[Здесь сам код, архитектура или объяснение]

### 🔍 1. Самопроверка и сверка с контекстом
- ✅ Стейт: Серверные данные через React Query, UI через Zustand.
- ✅ Архитектура: Запросы вынесены в `src/services/`, в UI нет `supabase.from()`.
- ✅ UI/UX: Использован `useTheme()`, атомарные компоненты (AppButton), нет хардкода цветов.
- ✅ Производительность: Нет FlatList в ScrollView, нет console.log в жестах/анимациях.
- ✅ Лимиты: Файл не превышает 500 строк.

### 🛡️ 2. Поиск галлюцинаций и ошибок
- API/Библиотеки: Проверено, что используются только методы из Expo SDK 54+, RN 0.81+, Reanimated v3.
- Типизация: Проверено соответствие типам Supabase (`database.types.ts`), нет кастов к `any`.
- Логика: Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### ✅ 3. Отчёт о сохранении функционала (Чек-лист)
Критически важно при рефакторинге. AI явно показывает, что ни одна фича не потеряна.

| Исходный функционал / Поведение | Статус | Комментарий |
| --- | --- | --- |
| Например: Drag & Drop упражнений | ✅ | Перенесено в useProgramEditor, DraggableFlatList |

---

## 📊 Статус задач

### ✅ ЭТАП 1: Фундамент и БД (ЗАВЕРШЁН)
React Query внедрён. N+1 устранены. Dashboard оптимизирован. `usePrograms.ts` на `useInfiniteQuery`.

### ✅ ЭТАП 2: Производительность (ЗАВЕРШЁН)
VirtualizedLists исправлены. `console.log` удалены из горячих путей. ScrollView → FlatList в `workout/[id].tsx`.

### ✅ ЭТАП 3: UI/UX и дизайн-система (ЗАВЕРШЁН)
UI-кит (AppButton, AppCard, AppBadge, AppInput) внедрён. `card.ts` разбит на модульную структуру.

### ✅ ЭТАП 4: Рефакторинг God Objects (ЗАВЕРШЁН)
Разобраны `workout/[id].tsx` и `program/[id].tsx`: хуки, DayCard, модалки в `program/sheets/`.

### ✅ ЭТАП 5: Новые фичи (ЗАВЕРШЁН)
Замеры тела, система травм (avoid/caution), цели и макросы, настройки, Dashboard-виджеты. Программы: CRUD с модалками, drag & drop. База упражнений: 870+ записей, перевод, категории, `media_url`. Авторазминка, карточка упражнения, справочник, детальный экран, личные рекорды, поиск через RPC `search_exercises`, таймер отдыха (`expo-audio`), травмы (рефакторинг).

### 🚀 ЭТАП 6: Улучшения и полировка

#### ✅ Регистрация и авторизация (базово ЗАВЕРШЕНО, требует прогона тест-сценария)
- Supabase Auth (email/password), единый слой `authService.ts`.
- Триггер `handle_new_user` создаёт профиль (только `id`, без `email`).
- `ensureProfile` идемпотентен, не блокирует вход; чинит старые аккаунты на `signIn`.
- RLS-политики профилей/программ/тренировок/логов (см. секцию «Авторизация и профили»).
- Экраны `login` / `reset-password` / `update-password`, корневой auth-гейт, `PASSWORD_RECOVERY`.
- ⚠️ Осталось: прогнать сквозной тест-сценарий (регистрация → вход → dashboard → старт программы → завершение → история).

#### ✅ Dashboard на React Query (ЗАВЕРШЕНО)
- `useDashboard` + `dashboardService` (Promise.allSettled), `useMemo`-стили, error-state с `refetch`.

#### ✅ Цели и макросы на React Query (ЗАВЕРШЕНО)
- `goalsService` (`getGoalsProfile`/`saveGoalsProfile`, upsert), `useQuery`/`useMutation`, `invalidateQueries`, авто-создание замера веса через `metricsService`.

#### ✅ Список тренировок: обновление по фокусу (ЗАВЕРШЕНО)
- `useFocusEffect` в `workouts.tsx`.

#### ✅ Экран создания тренировки (ЗАВЕРШЕНО)
- `workout/create.tsx` + `workoutService` (`startProgramWorkout` идемпотентно, `repeatWorkout`).

#### ✅ Периодизация программ (ЗАВЕРШЕНО)
- Модель programs → program_phases → program_days → program_exercises; типы фаз; редактор фаз (PhaseCard, шаблон + переопределения); прогрессия (`advanceProgramProgress`); создание тренировок upfront; 6 готовых программ; UX списка тренировок; ProgramProgressCard; RPC `copy_program_for_user`.

#### ✅ Шаринг программ по коду (ЗАВЕРШЕНО)
- `programs.share_code`, RPC `generate_share_code`, `programSharingService`, UI (ShareProgramSheet / ImportProgramSheet).

#### ✅ Тип активности «Активация» (ЗАВЕРШЕНО)
- Колонка `can_be_activation` (62 упражнения); RPC `search_exercises` возвращает `can_be_activation` + параметр `activation_filter`; бейджи в справочнике/детальном экране/разминке; фильтр «Только активация».

#### ✅ Нечёткий поиск (ЗАВЕРШЕНО)
- `pg_trgm` + `word_similarity` (порог 0.4) в RPC `search_exercises`; гибридный поиск LIKE + word_similarity; GIN-индекс `idx_exercises_name_norm_trgm`; ранжирование по релевантности.

#### 🔲 Аудит тёмной темы
Контраст и читаемость во всех 10 комбинациях (5 акцентов × 2 режима).

#### 🔲 Подготовка к релизу
EAS Build, иконки, сплэш-скрин.

#### 🔲 (опционально) Автозапуск следующего подхода по окончании отдыха.

#### ❌ Калькулятор блинов — отклонено (решение пользователя).

---

## 🔮 ЭТАП 7: Дальнейшее развитие (ИДЕИ)

- 🔲 Адаптивная периодизация (ИИ): автоподбор прогрессии по 1ПМ и результатам тренировок; автопрогрессия весов по фазам.
- 🔲 Умный подбор упражнений (ИИ): рекомендации по целям/травмам/оборудованию.
- 🔲 Видео техники (mp4 в media_url).
- 🔲 Избранные упражнения.
- 🔲 Офлайн-режим (локальный кэш каталога).
- 🔲 Онбординг первого запуска.
- 🔲 Аналитика и краш-репортинг (Sentry).
- 🔲 Экспорт истории тренировок (PDF/CSV).
- 🔲 UX списка тренировок (дополнения): автопрокрутка к «следующей» тренировке, фильтр по фазам, сворачивание прошедших недель.
- 🔲 Фото прогресса: Привязка фото к замерам тела (Supabase Storage).