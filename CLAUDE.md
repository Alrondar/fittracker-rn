# FitTracker RN — Полные инструкции для AI-ассистента

## 🎯 О проекте

Приложение для ведения тренировок на React Native (Expo).

- **Язык**: TypeScript ~5.9 (строгая типизация)
- **Навигация**: Expo Router ~6.0 (файловая, группы маршрутов `(tabs)`, `(auth)`)
- **Бэкенд**: Supabase (PostgreSQL + RLS + RPC + Auth), `@supabase/supabase-js` ^2.110. Project ID: `trgiihqqcovidwcqwdkl`
- **Аутентификация**: Supabase Auth (email/password), единый слой `src/services/authService.ts`.
- **Стейт-менеджмент**:
  - `@tanstack/react-query` ^5.101 — для ВСЕХ серверных данных (списки, CRUD, пагинация, dashboard, goals).
  - `zustand` ^5 — ТОЛЬКО для UI-стейта (`isAuthenticated`, `userId`, `themePreferences`).
  - ⚠️ Исторически в `useStore` ещё лежат `workouts` / `logs` / `alternativesCache` — это tech debt (см. ниже), постепенно выносить в React Query.
- **Стилизация**: Единая дизайн-система через `useTheme()` + атомарные UI-компоненты.
- **Анимации**: `react-native-reanimated` ^3.16 + `react-native-gesture-handler` ~2.28.
- **Иконки**: `lucide-react-native` ^1.24 + кастомные SVG (`react-native-svg` 15.12 + `react-native-svg-transformer`).
- **Изображения**: `expo-image` ~3.0 (замена Image из RN).
- **Тактильность**: `expo-haptics` ~15.0.
- **Drag & Drop**: `react-native-draggable-flatlist` ^4.0.
- **Runtime**: Expo SDK ~54, React Native 0.81.5, React 19.1.

---

## 🏗️ Архитектура

### Структура папок

```
app/                          # Expo Router (экраны)
  _layout.tsx                 # КОРНЕВОЙ layout: QueryClient, провайдеры, auth-гейт,
                              # onAuthStateChange, PASSWORD_RECOVERY → update-password
  (auth)/                     # Группа авторизации
    _layout.tsx               # Только Stack headerShown:false (БЕЗ провайдеров/гейта)
    login.tsx                 # Вход / регистрация
    reset-password.tsx        # Запрос письма сброса пароля
    update-password.tsx       # Смена пароля по recovery-сессии
  (tabs)/                     # Главный таб-бар
    _layout.tsx               # Таб-бар layout
    index.tsx                 # Dashboard (React Query через useDashboard)
    exercises.tsx             # Справочник упражнений (infinite scroll, фильтры)
    history.tsx               # История тренировок
    programs.tsx              # Программы тренировок (+ импорт по коду)
    workouts.tsx              # Тренировки (useFocusEffect — обновление по фокусу)
    profile.tsx               # Профиль пользователя
    exercise/[id].tsx         # Детальный экран упражнения (hero-слайдер, аккордеоны)
    history/[id].tsx          # Детали истории
    profile/                  # Экраны профиля (без таб-бара)
      goals.tsx               # Цели и макросы (React Query через goalsService)
      injuries.tsx            # Травмы пользователя
      metrics.tsx             # Замеры тела
      settings.tsx            # Настройки (тема, профиль)
    program/[id].tsx          # Детальный экран программы (редактор + шаринг)
    workout/
      [id].tsx                # Экран тренировки (сессия + авторазминка)
      create.tsx              # Создание тренировки (programId / repeatId → workoutService)

src/
  assets/equipment-icons/     # SVG-иконки оборудования (44 шт.)
  components/
    ui/                       # Атомарные UI (AppButton, AppCard, AppBadge, AppInput)
    workout/                  # Компоненты тренировки
      ExerciseCard.tsx        # Карточка упражнения (memo, аккордеоны, подходы)
      ExerciseSlider.tsx      # Слайдер: основная + альтернативы (memo)
      ExerciseInfoAccordion.tsx
      MuscleBubbles.tsx
      EquipmentBubbles.tsx
      TechniqueMediaSlider.tsx
      WarmupBlock.tsx
      RestTimer.tsx
      WorkoutTimer.tsx
    exercises/                # Компоненты справочника
    program/                  # Компоненты программ
      PhaseCard.tsx
      DayCard.tsx             # Карточка дня (DraggableFlatList упражнений — scrollEnabled={false})
      sheets/                 # PhaseSettings, DaySettings, ExercisePicker,
                              # ExerciseSettings, ScheduleEditor, ImportProgram, ShareProgram
    profile/                  # MacroPieChart и др.
    Dashboard-компоненты:     # ActivityCalendar, ExerciseProgressCard, LastWorkoutCard,
                              # PersonalRecordsCard, WeeklyStatsCard, ProgramProgressCard
    Общие:                    # AnimatedButton, BottomSheet, CustomTabBar, EquipmentIcon,
                              # FadeIn, ProgramCard, ProgramFormSheet, SectionHeader,
                              # Skeleton, SwipeableCard, Toast/ToastProvider
  hooks/
    useDashboard.ts           # Dashboard (React Query, queryKey ['dashboard', userId])
    useBodyMetrics.ts
    useExerciseDetail.ts      # staleTime: Infinity
    useExercises.ts           # useInfiniteQuery, debounce, фильтры, activationOnly
    useInjuryWarnings.ts      # avoid/caution
    useProfile.ts
    useProgramEditor.ts       # Редактор программ (drag & drop, CRUD, фазы)
    usePrograms.ts            # useInfiniteQuery
    useTheme.tsx
    useTimerSettings.ts       # Настройки таймера отдыха (звук/вибрация/отсчёт)
    useToast.ts
    useWarmup.ts              # Разминка (исключает противопоказанные по activeInjuries)
    useWorkoutSession.ts      # Сессия тренировки (useCallback + ref-зеркала для memo)
  services/
    authService.ts            # Supabase Auth: signIn/signUp/signOut/reset/update/getSession/
                              # onAuthStateChange/mapAuthError + ensureProfile
    dashboardService.ts       # Агрегация данных dashboard (Promise.allSettled)
    exercisesService.ts       # Упражнения: список, словари фильтров, по ID
    goalsService.ts           # Цели: getGoalsProfile/saveGoalsProfile (upsert)
    metricsService.ts         # Замеры тела (getLatestMetric/createMetric)
    profileService.ts         # Профиль, статистика, КБЖУ, личные рекорды, травмы
    programsService.ts        # getProgramWithPhases, advanceProgramProgress,
                              # createWorkoutsFromProgram (upfront), getActiveProgram, CRUD
    programSharingService.ts  # generateShareCode, importProgramByCode, formatShareCode
    warmupService.ts          # Автогенерация разминки по целевым мышцам
    workoutService.ts         # startProgramWorkout, repeatWorkout
  store/                      # Zustand (в идеале только UI-стейт)
  constants/
    equipmentIcons.ts
    exerciseCategories.ts
    phaseTypes.ts             # hypertrophy/strength/power/deload/custom: getPhaseMeta/getPhaseColor
    injuries.ts               # BODY_PARTS/INJURY_TYPES + matchesContraindication/
                              # targetsInjuredMuscle/computeExerciseWarnings
    muscleColors.ts
    muscleGroups.ts
    semanticColors.ts         # LEVEL_COLORS, MACRO_COLORS, PHARMA_COLORS, SEVERITY_COLORS,
                              # BODY_PART_COLORS, BODY_ZONE_COLORS
    theme.ts                  # 5 акцентов × 2 режима, SPACING, BORDER_RADIUS, GRADIENTS
  styles/
    common.ts
    typography.ts
    components/
      card/                   # Модульная структура (createCardStyles)
      dashboard.ts            # createDashboardStyles
      workout.ts              # createWorkoutStyles
  types/
    database.types.ts         # Автогенерация типов Supabase (npx supabase gen types)
    index.ts                  # Exercise, Workout, WorkoutExercise, SetLog, WorkoutLog
    metrics.ts
    workout.ts                # ExerciseData / AlternativeExercise / SetData (с reps_range)
  lib/
    supabase.ts               # Supabase клиент + хелперы getList/getString
    timerSounds.ts            # Генерация WAV-бипов (expo-audio)

supabase/
  cleanup_duplicate_policies.sql  # Скрипт очистки дублирующихся RLS-политик (34 → 12)
  rpc_add_security_invoker.sql    # RPC-1: явный SECURITY INVOKER + search_path (применён 29.07.2026)

.env                          # Локальные переменные (НЕ в git — см. .gitignore)
.env.example                  # Шаблон переменных для разработчиков (коммитится)
```

---

## 🔐 Авторизация и профили (Supabase Auth)

### Единый слой `authService.ts`

- UI-экраны НЕ вызывают `supabase.auth.*` напрямую — только через `authService`.
- Редиректы по состоянию сессии делает корневой `_layout.tsx` через `onAuthStateChange` (единственный источник истины по переходам), не сервис.
- Экспортирует: `signIn`, `signUp`, `signOut`, `sendPasswordReset`, `updatePassword`, `getSession`, `onAuthStateChange`, `mapAuthError`.
- `signUp` возвращает `{ user, needsEmailConfirmation }` (`needsEmailConfirmation = !data.session`).

### Создание профиля

- Профиль создаётся триггером БД `handle_new_user` (AFTER INSERT ON auth.users).
- ⚠️ **КРИТИЧНО**: в таблице `profiles` НЕТ колонки `email`. Триггер и `ensureProfile` пишут ТОЛЬКО `id`. Попытка записать `email` роняет запрос ошибкой `42703`.
- `ensureProfile(userId)` — страховочный идемпотентный `upsert({ id }, { onConflict: 'id' })`; вызывается на `signIn` (чинит старые аккаунты) и на `signUp` только при наличии сессии. Ошибку `23505` (unique violation) игнорирует, вход НЕ блокирует.
- Email пользователя всегда берётся из `auth.users` (`supabase.auth.getUser()`), не из `profiles`.

### Ключи Supabase и секретность (SEC-1, закрыто 29.07.2026 — путь A)

- Клиент использует **publishable API key** (`sb_publishable_...`, новый формат Supabase) — публичный, защищён RLS. Лежит в трёх местах (см. SCALE-4): `.env` (`EXPO_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_KEY`), `app.json → extra.supabaseAnonKey`, хардкод в `src/lib/supabase.ts`.
- **Legacy JWT-ключи (`anon`/`service_role` в формате `eyJ...`) ОТКЛЮЧЕНЫ** в Dashboard («Disable JWT-based API keys»). Старый `service_role` из утечки/git-истории невалиден навсегда.
- **Secret key в проекте НЕ хранится и клиенту НЕ нужен.** Для миграций/дампов — `supabase login` + `supabase link` (без секретного ключа).
- `.env` заблокирован в `.gitignore`; коммитится только `.env.example` с плейсхолдерами.
- ⚠️ Git-история: старый `.env` с ключом может оставаться в истории коммитов. Для приватного репо при отключённых legacy это приемлемо (ключ мёртв); полная чистка — `git filter-repo --path .env --invert-paths` + force push (опционально).

### RLS-политики (сверено с БД, консолидировано 29.07.2026)

> ⚠️ **Важно**: 29.07.2026 выполнена очистка дублирующихся политик (скрипт `supabase/cleanup_duplicate_policies.sql`). Количество политик сокращено с **34 до 12**. Консолидация: там, где были отдельные политики на SELECT/INSERT/UPDATE/DELETE + дубликаты, оставлена единая `ALL`-политика.

- `profiles`: `profiles_select` / `profiles_insert` / `profiles_update` — `auth.uid() = id`. (Дубликаты с длинными описаниями удалены.)
- `programs`: SELECT — `created_by IS NULL OR created_by = auth.uid()`; INSERT/UPDATE/DELETE — `created_by = auth.uid()`. (Seeded-программы: `created_by IS NULL`.)
- `program_phases` / `program_days` / `program_exercises`: SELECT — через связь с `programs` (`created_by IS NULL OR created_by = auth.uid()`); INSERT/UPDATE/DELETE — `created_by = auth.uid()`.
- `user_programs`: `Users can manage their own programs` (ALL) — `auth.uid() = user_id`. (6 дублирующих политик удалены.)
- `workouts`: `Users can manage their own workouts` (ALL) — `auth.uid() = user_id`. (4 отдельные политики удалены.)
- `workout_exercises`: `Users can manage their workout exercises` (ALL) — через `workouts.user_id = auth.uid()`. (INSERT/SELECT удалены.)
- `workout_logs`: SELECT/INSERT/UPDATE/DELETE — через `workout_exercises → workouts.user_id = auth.uid()`. (1 дублирующий SELECT удалён.)
- `body_metrics`: `Users can manage their own body metrics` (ALL) — `auth.uid() = user_id`. (4 отдельные политики удалены.)
- `exercises`, `equipment`, `exercise_equipment`, `injury_exercise_warnings`: SELECT для всех (справочники). (Дублирующий SELECT в `exercises` удалён.)

### Корневой auth-гейт (`app/_layout.tsx`)

- `QueryClient` создаётся ВНЕ компонента.
- `getSession()` при старте → `setAuth`; `onAuthStateChange` → `setAuth(session?.user?.id ?? null)`.
- `PASSWORD_RECOVERY` → `router.replace('/(auth)/update-password')` (setAuth намеренно не вызывается; исключение в гейте удерживает экран).
- Неавторизованный → `/(auth)/login`; авторизованный в `(auth)` (кроме `update-password`) → `/(tabs)`.
- Deep link для сброса пароля: `fittracker://reset-password` (схема из `app.json`).

---

## 🗄️ Серверная логика (PostgreSQL RPC) — аудит SCALE-6 выполнен 29.07.2026

> Аудит проведён по определениям функций, выгруженным через SQL Editor (`pg_get_functiondef`), и политикам RLS (`pg_policies`). Серверная логика больше НЕ является слепой зоной.

### Инвентарь RPC-функций

| Функция | Назначение | Security | Транзакция | Идемпотентность |
| --- | --- | --- | --- | --- |
| `copy_program_for_user(p_program_id, p_user_id)` | Копирование программы с фазами/днями/упражнениями | `DEFINER` + проверка `auth.uid()` | ✅ неявная | ✅ проверка `source_program_id` |
| `create_workouts_for_program(p_user_id, p_program_id)` | Создание всех тренировок программы upfront | `DEFINER` + проверка `auth.uid()` | ✅ неявная | ✅ проверка существования |
| `generate_share_code(p_program_id)` | Генерация уникального кода `FIT-XXXXXX` | `DEFINER` + проверка владельца | ✅ неявная | ✅ (повторная генерация допустима) |
| `search_exercises(...)` | Нечёткий поиск + фильтры + пагинация | `DEFINER`, `STABLE` | n/a (read-only) | n/a |
| `update_day_position` / `update_exercise_position` | Обновление позиции (drag & drop) | ✅ явный `INVOKER` + `search_path` (RLS применяются) | ✅ | ✅ |
| `handle_new_user` | Триггер создания профиля | `DEFINER` | ✅ | ✅ `ON CONFLICT DO NOTHING` |
| `handle_workouts_updated_at` / `update_updated_at_column` | Триггеры `updated_at` | `INVOKER` | ✅ | n/a |
| `normalize_equipment_*` / `split_equipment*` / `migrate_exercise_equipment` | Миграция/нормализация данных оборудования | `INVOKER` | ✅ | ✅ (`ON CONFLICT DO NOTHING`) |

### ✅ Подтверждённые сильные стороны

1. **Транзакционная целостность**: `copy_program_for_user` и `create_workouts_for_program` — единые PL/pgSQL-блоки; любой сбой откатывает всю операцию.
2. **Идемпотентность**: обе функции создания имеют явные проверки `IF EXISTS` и не дублируют данные.
3. **Безопасность**: модифицирующие функции с `SECURITY DEFINER` явно проверяют `auth.uid()` (`RAISE EXCEPTION` при чужом `user_id`).
4. **Батчинг**: `create_workouts_for_program` вставляет упражнения через `INSERT INTO ... SELECT` (нет N+1 на уровне упражнений).
5. **Нечёткий поиск**: `search_exercises` корректно использует `pg_trgm` (`word_similarity` > 0.4), нормализацию `ё→е`, ранжирование по релевантности + популярности.

### ⚠️ Замечания по серверной логике (задачи)

- **RPC-1** 🟢: `update_day_position` / `update_exercise_position` — **ЗАКРЫТО 29.07.2026** (явный `SECURITY INVOKER` + `SET search_path TO 'public'`, скрипт `supabase/rpc_add_security_invoker.sql`). Поведение не изменилось: по умолчанию функции и так были `INVOKER`, защита обеспечивалась RLS. Правка делает намерение явным в исходнике и приводит стиль к остальным RPC.
- **RPC-2** 🟢: Дублирующиеся RLS-политики — **ЗАКРЫТО** 29.07.2026 (скрипт `supabase/cleanup_duplicate_policies.sql`, 34 → 12 политик).
- **RPC-3 (SEC-6)** 🟡: Для атомарного сохранения логов тренировки нужен RPC `upsert_workout_logs(p_workout_exercise_id, p_logs jsonb)` — `INSERT ... ON CONFLICT (workout_exercise_id, set_number) DO UPDATE` + удаление отсутствующих подходов в одной транзакции. Заменяет клиентский паттерн `DELETE` + `INSERT` в `saveWorkout()`. **Статус: спроектирован, не применён.**
- **PERF (copy)** 🟡: `copy_program_for_user` использует вложенные циклы `FOR`. Приемлемо для типичных программ; оптимизация через CTE — в бэклоге (Long-term).

### Правила работы с RPC

- Все новые RPC держать в `supabase/migrations` под тем же ревью, что и клиентский код.
- Модифицирующие функции с обходом RLS — только `SECURITY DEFINER` + явная проверка `auth.uid()`.
- Функции, которые **не** должны обходить RLS, явно объявлять как `SECURITY INVOKER` + `SET search_path TO 'public'` (паттерн: `update_day_position`, `update_exercise_position`).
- Атомарные мульти-операции (delete+insert, множественные upsert) — только через RPC, не через клиентский `Promise.all`.
- После миграций регенерировать типы: `npx supabase gen types typescript --project-id trgiihqqcovidwcqwdkl --schema public > src/types/database.types.ts` (из корня проекта).

---

## 🏋️ Данные упражнений (Supabase)

- Таблица `exercises` — 870+ записей, названия на русском.
- Категории (поле `category`, скаляр): `strength`, `stretching`, `plyometrics`, `olympic weightlifting`, `powerlifting`, `cardio`. Русские подписи/иконки — в `constants/exerciseCategories.ts`.
- Мышцы (`primary_muscles`, `secondary_muscles` — массивы) на русском. Группы для фильтра — в `constants/muscleGroups.ts`.
- Оборудование (`equipment` — массив) на русском (68 значений).
- `can_be_activation` (boolean) — тип «Активация» (62 упражнения).
- `media_url` — одиночный URL (free-exercise-db). Клиент генерирует пару `0.jpg + 1.jpg` через `parseMediaUrls` в `TechniqueMediaSlider.tsx`.
- ⚠️ Колонки `description` в таблице НЕТ — не включать в select (ошибка 42703).

### Справочник

- Пагинация 40/страница (`useInfiniteQuery`), лёгкий select (`id, name, primary_muscles, equipment, can_be_activation`), серверные фильтры: `overlaps` (мышцы, оборудование), `in` (категория), `ilike` + `.or()` (поиск), debounce 300 мс, `keepPreviousData`, `staleTime: Infinity` для словарей.
- Альтернативы: поле `alternatives` (массив ID) + fallback по `overlaps('primary_muscles', ...)`.

---

## 🔁 Периодизация программ (фазы / мезоциклы)

### Модель данных

```
programs → program_phases (phase_number, name, phase_type, weeks_count, position)
         → program_days (phase_id, week_number, day_number)
         → program_exercises

user_programs: current_phase / current_week / current_day (прогресс по фазам), is_active, started_at

workouts: phase_number / week_number / day_index (связь тренировки с фазой/неделей/днём),
          started_at / finished_at / duration_seconds
```

- `program_days.id`, `program_exercises.id` — `uuid`; `programs.id`, `program_phases.id` — `text` (для сидов: `gen_random_uuid()` для дней/упражнений, `gen_random_uuid()::text` для программ/фаз).
- Типы фаз (`constants/phaseTypes.ts`): `hypertrophy`, `strength`, `power`, `deload`, `custom`. Цвет/иконка/подпись — через `getPhaseMeta` / `getPhaseColor` (без хардкода).

### Создание тренировок

- **Вариант B (upfront)**: при старте программы `createWorkoutsFromProgram` создаёт тренировки для ВСЕХ фаз и недель сразу. Для каждой недели берутся её дни либо шаблон недели 1 (fallback). Канонический путь — RPC `create_workouts_for_program` (идемпотентный, транзакционный).
- **Точечное создание** (`workoutService.startProgramWorkout`): создаёт тренировку текущего дня (`current_phase/week/day`), идемпотентно (возвращает существующую незавершённую), fallback на шаблон недели 1. Используется экраном `workout/create.tsx`.
- **Повтор** (`workoutService.repeatWorkout`): копирует тренировку как ad-hoc (без привязки к программе).
- **Вариативность по неделям** (шаблон + переопределения): неделя 1 = шаблон; недели 2…N наследуют, пока не переопределены (`copyTemplateToWeek`); сброс — `resetWeekToTemplate`.

### Прогрессия

- `advanceProgramProgress`: день → (конец недели?) неделя++ → (конец фазы по `weeks_count`?) фаза++ → (нет следующей фазы?) программа завершена. Fallback для программ без фаз — старая логика по `duration`.
- RPC `copy_program_for_user(p_program_id, p_user_id)`: копирует программу с фазами/днями/упражнениями (`programs.id`/`program_phases.id` — text, `program_days.id` — uuid). Идемпотентен (проверка `source_program_id`), транзакционен.

### Готовые программы (6, засеяны, `created_by IS NULL`)

| Программа | Уровень | Дней/нед | Фазы |
| --- | --- | --- | --- |
| Full Body — Старт | beginner | 3 | Адаптация (4) → Прогрессия (3) → Дилоуд (1) |
| StrongLifts 5×5 | beginner | 2 | База 5×5 (8) → Интенсификация (3) → Дилоуд (1) |
| PPL Классический | intermediate | 3 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| Upper/Lower | intermediate | 4 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPLUL | intermediate | 5 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPL 6-day | advanced | 6 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |

### UX списка тренировок (`workouts.tsx`)

- `SectionList` с группировкой по фазам/неделям (заголовки через `SectionHeader`), статусы (✅ выполнена / ▶️ следующая / ⏸️ в процессе / ⏳ будущая), бейджи фаз, шапка с прогрессом программы.
- «Следующая» определяется по `current_phase/week/day` из `user_programs`.
- `useFocusEffect` — список обновляется при каждом возврате на вкладку (решает проблему «начал программу → ушёл → вернулся → экран не обновился»).

### Dashboard (`ProgramProgressCard`)

- Бейдж текущей фазы (иконка + цвет типа), «Фаза N/M · Неделя X», прогресс-бар в цвете фазы.

---

## 🤝 Шаринг программ по коду

- `programs.share_code` (text, nullable) — код для импорта.
- RPC `generate_share_code(p_program_id)` — генерирует уникальный код (только для своих программ, проверка владельца через `auth.uid()`).
- `programSharingService`: `generateShareCode`, `importProgramByCode(code, userId)`, `formatShareCode` (человекочитаемый формат).
- UI: FAB «Поделиться» + `ShareProgramSheet` в `program/[id].tsx`; кнопка импорта (Link2) + `ImportProgramSheet` в `programs.tsx`.

---

## 🎨 Дизайн-система и стили

### Темы

- 5 акцентов (purple, orange, blue, neon, pink), 2 режима (light, dark).

### Правила стилизации

- Все цвета через `const { colors } = useTheme()`.
- **СТРОГО ЗАПРЕЩЁН хардкод цветов** (`#7c3aed`, `'white'`, `'#333'`) — использовать `colors.primary`, `colors.textInverse`, `colors.textPrimary`. (Остаточный исторический хардкод есть в `badge.ts`, `button.ts`, `common.ts`, `dashboard.ts`, `history.tsx` — не добавлять новый, постепенно вычищать.)
- Отступы: `SPACING.xs/sm/md/lg/xl/xxl`. Радиусы: `BORDER_RADIUS.sm/md/lg/xl/full`.
- Альфа-суффиксы — паттерн проекта: `colors.warning + '12'`, `colors.primary + '15'`.
- Модульность стилей: `card.ts` разбит на папку `src/styles/components/card/`. Импорт через `index.ts` (`createCardStyles`).

### Иконки оборудования

- `<EquipmentIcon name="..." size={...} primaryMuscles={[...]} />` (проп `name`, не `type`!). Цвет — по первой целевой мышце через `getMuscleColor`.
- Цвета мышц: только через `getMuscleColor(muscle)` из `constants/muscleColors.ts`.

### Единый дизайн-язык карточки упражнения

- **Живая обводка**: `avoid` → `colors.error`, `caution` → `colors.warning`, заменено → `colors.primary`, все подходы заполнены → `colors.success + '60'`, по умолчанию → `colors.border`.
- **Аккордеоны** (`ExerciseInfoAccordion`): без контурных обводок, цветной значок + uppercase-заголовок + шеврон; анимация `maxHeight`; `pointerEvents="none"` в свёрнутом состоянии; одна открытая секция на карточку.
- **Баблы мышц** (`MuscleBubbles`): primary — насыщенный цвет группы с точкой-маркером, secondary — нейтральный фон с цветной обводкой.
- **Слайдеры техники**: ленивый монтаж (`everOpened`), автоплей 3с только в раскрытом аккордеоне.

---

## ⚡ Производительность (ОБЯЗАТЕЛЬНО)

- Никогда не вкладывай VirtualizedLists (FlatList, DraggableFlatList) в ScrollView. Используй `ListHeaderComponent`. Исключение-паттерн: вложенный `DraggableFlatList` ДОПУСТИМ только с `scrollEnabled={false}` (см. `PhaseCard.tsx`, `DayCard.tsx`).
- Никаких `console.log` в PanResponder, onScroll, анимациях.
- QueryClient создаётся ВНЕ компонента (в `_layout.tsx`).
- Файлы не должны превышать 500 строк (God Objects запрещены).
- Использовать `expo-image` вместо `Image` из React Native.
- Фабрики стилей (`createCardStyles(colors)`, `createDashboardStyles(colors)` и др.) — только через `useMemo` на уровне экрана. НИКОГДА внутри `renderItem`.
- Колбэки в карточки — только `useCallback`; в хуках с зависимостью от массивов — ref-зеркала (`exercisesRef` в `useWorkoutSession`).
- Карточки списков — `React.memo`.
- Тяжёлые данные (technique, benefits, risks, injuries, settings, alternatives, media_url) — не тянуть в списки; грузить по требованию на детальных экранах.
- `useFocusEffect` (из `expo-router`) для обновления данных экрана при возврате по фокусу (вкладки).
- Серверные данные — через React Query (`useQuery`/`useInfiniteQuery`/`useMutation`), запросы в `services/`.

---

## 🚫 Анти-паттерны (НЕ ДЕЛАЙ ТАК)

❌ Хранить серверные данные в Zustand.
❌ Делать N+1 запросов к Supabase (используй вложенные `select('*, days(*, exercises(*))')`).
❌ Писать `supabase.from()` прямо в UI-компонентах (выноси в `services/` или хуки).
❌ Использовать `Math.random()` в `keyExtractor`.
❌ Использовать `LayoutAnimation` (no-op в New Architecture).
❌ Использовать `Image` из `react-native` (используй `expo-image`).
❌ Включать `description` в select из `exercises` (колонки не существует).
❌ Писать `email` в `profiles` (колонки не существует — ошибка 42703).
❌ Монтировать слайдеры/автоплеи в свёрнутых аккордеонах (ленивый монтаж через `everOpened`).
❌ Вставлять `gen_random_uuid()::text` в `program_days.id` / `program_exercises.id` (они `uuid` — использовать `gen_random_uuid()` без `::text`; `::text` только для `programs.id` / `program_phases.id`).
❌ Вызывать `supabase.auth.*` в UI (только через `authService`).
❌ Показывать сырые ошибки Postgres/Supabase пользователю (используй `mapAuthError` или единый маппер).
❌ Делать неатомарные операции (delete + insert без транзакции) — используй RPC.
❌ Вкладывать VirtualizedLists в ScrollView без `scrollEnabled={false}`.
❌ Создавать дублирующиеся RLS-политики (консолидировано 29.07.2026 — использовать единые `ALL`-политики, см. секцию «RLS-политики»).
❌ Создавать RPC с `SECURITY DEFINER` без явной проверки `auth.uid()` внутри.
❌ Хранить/коммитить `service_role`/secret-ключи (использовать publishable key для клиента; секреты — вне git, см. SEC-1).
❌ Создавать RPC, которые должны подчиняться RLS, без явного `SECURITY INVOKER` + `SET search_path TO 'public'` (паттерн см. в `update_day_position`/`update_exercise_position`).

---

## 🔴 Критические проблемы безопасности (из аудита 29.07.2026)

### SEC-1 — Service Role Key закоммичен в `.env` 🔴 ✅ ЗАКРЫТО 29.07.2026

**Проблема**: В `.env` был закоммичен `SUPABASE_SERVICE_ROLE_KEY` — ключ, обходящий все RLS-политики.

**Решение (путь A, применено)**: переход на новые **publishable API keys** (`sb_publishable_...`) во всех трёх местах (`.env`, `app.json → extra`, `src/lib/supabase.ts`); **legacy JWT-ключи отключены** в Dashboard («Disable JWT-based API keys») → старый `service_role` невалиден навсегда; secret key в проекте не хранится; `.env` в `.gitignore`; создан `.env.example`. Пользовательские сессии не слетели (путь A не трогает JWT secret). Git-история — опциональная чистка (`git filter-repo`).

### SEC-2 — Подходы/веса/повторы не сохраняются до конца сессии 🔴

**Проблема**: `useWorkoutSession.ts` — `updateSet()` только локальный `setExercises(...)`, ни одного сетевого вызова. `workout_logs` пишутся единственный раз в `saveWorkout()` по нажатию "Завершить". Краш приложения = потеря всей тренировки.

**Действие**: Реализовать автосохранение подходов "по ходу дела" (debounce 1-2 сек) или upsert по `(workout_exercise_id, set_number)` через RPC `upsert_workout_logs` (см. RPC-3).

### SEC-3 — Вложенный VirtualizedList без `scrollEnabled={false}` 🟠 ✅ ЗАКРЫТО 29.07.2026

**Проблема**: `src/components/program/DayCard.tsx` — `DraggableFlatList` без `scrollEnabled={false}` внутри внешнего `ScrollView` (`program/[id].tsx`), в нарушение правила проекта. Соседний `PhaseCard.tsx` уже был сделан правильно.

**Решение (применено)**: добавлен проп `scrollEnabled={false}` в единственный `DraggableFlatList` `DayCard.tsx` (ветка editMode), по образцу `PhaseCard.tsx`. `tsc --noEmit` чист; drag&drop упражнений не затронут.

### SEC-4 — `.single()` на потенциально пустой выборке 🟠 ✅ ЗАКРЫТО 29.07.2026

**Проблема**: `programsService.ts → createWorkoutsFromProgram` — `.single()` бросал ошибку, если совпадений 0 (резолв упражнения по имени через ILIKE).

**Решение (применено)**: `.single()` → `.maybeSingle()` (возвращает `null` вместо исключения) + guard `if (!exerciseId) continue;` — нерезолвнутое упражнение пропускается, консистентно с RPC `create_workouts_for_program` (`pe.exercise_id is not null`). Без guard'а замена лишь сменила бы одну ошибку на not-null violation при вставке. `workoutIds.push` вне цикла упражнений → потеря id тренировки исключена.
⚠️ Функция `createWorkoutsFromProgram` — **легаси** (канонический путь старта — RPC); после grep-подтверждения отсутствия вызовов — кандидат на удаление (см. PERF-1 / tech debt). Хрупкий ILIKE-резолв «имя → id» сам по себе — архитектурный долг, выходит за рамки SEC-4.

### SEC-5 — Разное поведение сброса пароля 🟠 ✅ ЗАКРЫТО 29.07.2026

**Проблема**: `app/profile/settings.tsx → handleChangePassword` вызывал `supabase.auth.resetPasswordForEmail(email)` напрямую, без `redirectTo` → письмо вело на дефолтный Supabase URL, а не обратно в приложение.

**Решение (применено)**: вызов заменён на `sendPasswordReset(email, 'fittracker://reset-password')` из `authService` (импорт добавлен, прямой `supabase.auth.*` удалён). Ссылка из письма теперь ведёт на deep link → `PASSWORD_RECOVERY` → экран `update-password`, единообразно с `reset-password.tsx`. Заодно закрыта auth-часть SEC-10.

### SEC-6 — Неатомарное удаление+вставка `workout_logs` 🟡

**Проблема**: `saveWorkout()` — сначала `DELETE`, затем batch `INSERT`. Если `DELETE` прошёл, а `INSERT` упал — потеря логов.

**Действие**: Создать RPC `upsert_workout_logs` (спроектирован, см. RPC-3) для delete+insert в одной транзакции.

### SEC-7 — Ошибка продвижения прогресса "проглатывается" 🟡

**Проблема**: Если `advanceProgramProgress` падает, UI показывает "Успех", но прогресс не продвигается.

**Действие**: Показывать ошибку пользователю, не продолжать как успех.

### SEC-8 — Кастомная URL-схема уязвима к перехвату 🟡

**Проблема**: `fittracker://reset-password` — custom URL scheme, не Universal/App Links.

**Действие**: Миграция на Universal/App Links с verified `assetlinks.json`/`apple-app-site-association`.

### SEC-9 — Сырые ошибки Postgres показываются пользователю 🟢

**Проблема**: Повсеместный паттерн `catch (e:any) { Alert.alert('Ошибка', e.message) }`.

**Действие**: Создать единый маппер ошибок по аналогии с `mapAuthError`.

### SEC-10 — Прямые вызовы `supabase.*` в UI 🟢 ✅ ЗАКРЫТО 29.07.2026 (в `settings.tsx`)

**Проблема**: `app/profile/settings.tsx` напрямую делал `supabase.from('profiles').update(...)`, `supabase.from('workouts').select(...)`, `supabase.from('nutrition_logs').select(...)`, `supabase.auth.resetPasswordForEmail(...)`.

**Решение (применено)**: все прямые вызовы вынесены/удалены. `loadUserData` → `profileService.getProfileData` (бонусом `.maybeSingle()` вместо `.single()`); `handleSaveProfile` → новый `profileService.updateFullName`; `handleChangePassword` → `sendPasswordReset` (SEC-5); `handleExportData` + секция «Данные» удалены целиком (вариант A — фейковый экспорт скрыт, унёс 2 `supabase.from`). Импорт `supabase` и иконка `Download` удалены. grep по `settings.tsx`: `supabase` не встречается.
⚠️ SEC-10 закрыт ТОЛЬКО для `settings.tsx`. Прямые `supabase.from()` в UI остаются в `history.tsx`, `injuries.tsx`, `workouts.tsx` — см. tech debt, выносить постепенно.

---

## 🏗️ Архитектурные проблемы (из аудита)

### ARCH-1 — Три параллельные архитектуры Bottom Sheet

**Проблема**: `SheetShell.tsx` используется только одним потребителем. Ещё 7+ шторок пишут свой overlay/backdrop. `CustomBottomSheet` без потребителей.

**Действие**: Централизовать в один компонент.

### ARCH-2 — Дублирующиеся системы Toast

**Проблема**: `useToast.ts` и `ToastProvider.tsx` — два независимых механизма с одинаковым именем.

**Действие**: Оставить один, удалить дубликат.

### ARCH-3 — Маппинг "уровень программы → цвет" продублирован 3+ раза

**Проблема**: Канонический `LEVEL_COLORS` в `semanticColors.ts`, но есть локальные копии в `ProgramCard.tsx` и `ProgramFormSheet.tsx`.

**Действие**: Использовать единый источник из `semanticColors.ts` (как сделано для `phaseTypes.ts`).

### ARCH-4 — Два конкурирующих движка анимации

**Проблема**: Reanimated v3 + легаси `Animated` API в `FadeIn.tsx`, `Toast.tsx`, `SwipeableCard.tsx`, `BottomSheet.tsx`, `AnimatedButton.tsx`.

**Действие**: Мигрировать на Reanimated v3, удалить легаси.

### ARCH-5 — Хардкод цветов сверх зафиксированного долга

**Проблема**: `Toast.tsx`, `ProgramProgressCard.tsx`, оверлеи шторок — хардкод цветов.

**Действие**: Заменить литералы на `colors.*`.

### ARCH-6 — Систематический `any` в сервисном слое

**Проблема**: Мапперы принимают `row: any`, `we: any`, `ex: any`, `log: any`.

**Действие**: Заменить на типы из `database.types.ts`.

### ARCH-7 — Устаревшие/дублирующиеся доменные типы

**Проблема**: `src/types/index.ts` и `src/types/workout.ts` сосуществуют с разной моделью.

**Действие**: Унифицировать, удалить устаревший.

### ARCH-8 — Сопоставление противопоказаний через keyword-эвристики

**Проблема**: `matchesContraindication` ищет подстроки в свободном тексте `exercises.injuries`.

**Действие**: Создать структурированную таблицу связей `exercise_id ↔ body_part ↔ injury_type`.

---

## ⚡ Проблемы производительности (из аудита)

### PERF-1 — N+1 в легаси-генерации тренировок

**Проблема**: `programsService.createWorkoutsFromProgram` — вложенный N+1 (фаза × неделя × день × упражнение).

**Действие**: Использовать RPC `create_workouts_for_program` (уже транзакционный, с батчингом упражнений) или переписать на batch-операции.

### PERF-2 — Клиентский пересчёт фильтров

**Проблема**: `exercisesService.getFilterOptions` тянет все строки таблицы `exercises` на клиент.

**Действие**: Серверный агрегат (GROUP BY / RPC).

### PERF-3 — Тяжёлые поля в разминке

**Проблема**: `warmupService.generateWarmup` тянет до 80 кандидатов со всеми тяжёлыми полями.

**Действие**: Тянуть только `muscles/equipment/category`, тексты — для финалистов.

### PERF-4 — Двойные запросы при сохранении программы

**Проблема**: `useProgramEditor.saveProgram` — на каждое неизменённое упражнение 2 запроса.

**Действие**: Объединить в один `.update({position, sets, reps_range, ...})`.

### PERF-5 — `SCREEN_WIDTH` не реагирует на Split View

**Проблема**: `theme.ts` читает `Dimensions.get('window').width` один раз при загрузке модуля.

**Действие**: Использовать `useWindowDimensions()` или слушать изменения.

### PERF-6 — Нет транзакции при сохранении программы

**Проблема**: `saveProgram()` собирает десятки промисов через `Promise.all` без отката при частичном фейле.

**Действие**: Postgres RPC с транзакцией.

---

## 📈 Масштабируемость и поддерживаемость (из аудита)

### SCALE-1 — Ноль автотестов

**Проблема**: Нет `__tests__`, `.test.ts`, тестового скрипта в `package.json`.

**Действие**: Написать тесты для критичных чистых функций (`advanceProgramProgress`, `computeExerciseWarnings`, калькулятор КБЖУ, скоринг разминки).

### SCALE-2 — Нет crash/error-мониторинга

**Проблема**: Нет Sentry и т.п.

**Действие**: Интегрировать Sentry.

### SCALE-3 — Мёртвый код раздувает бандл

**Проблема**: 16 неподключённых SVG-иконок + `AnimatedButton`, `SwipeableCard`, `BottomSheet.tsx`, мёртвый Context в `ToastProvider`.

**Действие**: Удалить после grep по репо.

### SCALE-4 — Конфигурация/секреты продублированы в трёх местах

**Проблема**: `.env`, `app.json → extra`, хардкод в `src/lib/supabase.ts`. После SEC-1 во всех трёх местах теперь publishable-ключ, но единого источника истины по-прежнему нет — смена ключа требует правки в трёх местах.

**Действие**: Единый источник истины (читать ключ в `supabase.ts` из `expo-constants` / env, убрать хардкод).

### SCALE-5 — Модули превышают лимит 500 строк

**Проблема**: `useWorkoutSession.ts`, `useProgramEditor.ts`, `ExerciseCard.tsx`, `WarmupBlock.tsx`.

**Действие**: Разбить на меньшие модули.

### SCALE-6 — Бизнес-логика в RPC не под ревью ✅ АУДИТ ВЫПОЛНЕН 29.07.2026

**Статус**: Аудит проведён (см. секцию «🗄️ Серверная логика (PostgreSQL RPC)»). Слепая зона закрыта.

**Результаты**: транзакционность и идемпотентность критичных RPC подтверждены; найдены замечания RPC-1 (закрыт 29.07.2026), RPC-2 (дубли RLS — закрыто), RPC-3 (нужен `upsert_workout_logs`).

**Действие (ongoing)**: Держать `supabase/migrations` под тем же ревью, что и клиентский код.

### SCALE-7 — Дрейф документации

**Проблема**: `CLAUDE.md` помечает хардкод градиентов в `history.tsx` как открытый, но в переданной версии уже на `colors.*`.

**Действие**: Актуализировать документацию.

---

## 🚀 Roadmap исправлений (из аудита)

### 🟢 Quick Wins (дни, низкий риск, высокая отдача)

- [x] **RPC-2**: Очистка дублирующихся RLS-политик (34 → 12, скрипт `supabase/cleanup_duplicate_policies.sql`) — **ВЫПОЛНЕНО 29.07.2026**
- [x] **SCALE-6**: Аудит серверной логики RPC — **ВЫПОЛНЕНО 29.07.2026**
- [x] **SEC-1**: Убрать service_role key — **ВЫПОЛНЕНО 29.07.2026** (путь A: publishable keys + disable legacy JWT)
- [x] **SEC-3**: `scrollEnabled={false}` в `DayCard.tsx` — **ВЫПОЛНЕНО 29.07.2026**
- [x] **RPC-1**: Явный `SECURITY INVOKER` + `search_path` в `update_day_position` / `update_exercise_position` — **ВЫПОЛНЕНО 29.07.2026** (скрипт `supabase/rpc_add_security_invoker.sql`)
- [x] **SEC-4**: `.single()` → `.maybeSingle()` + guard в `createWorkoutsFromProgram` — **ВЫПОЛНЕНО 29.07.2026** (легаси-функция, кандидат на удаление)
- [x] **SEC-5**: Сброс пароля из Settings через `authService` с `redirectTo` — **ВЫПОЛНЕНО 29.07.2026** (`sendPasswordReset` + deep link)
- [x] **SEC-10**: Вынести `supabase.*` из `settings.tsx` в `services/` — **ВЫПОЛНЕНО 29.07.2026** (0 прямых вызовов в файле; остальные экраны — в tech debt)
- [x] Скрыть/реализовать фейковые тумблеры (напоминания, имперские единицы) — кнопка "Экспорт" уже СКРЫТА 29.07.2026 (вариант A, SEC-10); тумблеры остались (вне scope SEC-5/SEC-10)
- [ ] Свести хардкод-цвета (`Toast.tsx`, `ProgramProgressCard.tsx`, оверлеи шторок) к токенам темы
- [ ] Удалить подтверждённо мёртвый код (`AnimatedButton`, `SwipeableCard`, `BottomSheet.tsx`, мёртвый `ToastProvider`-контекст, `Frame*.svg`)
- [ ] Подключить неиспользуемые SVG оборудования в `EquipmentIcon`

### 🟡 Medium-term (недели, заметное улучшение архитектуры)

- [ ] **SEC-2**: Автосохранение подходов "по ходу дела" (debounce 1-2 сек)
- [ ] **SEC-6 / RPC-3**: Создать и применить RPC `upsert_workout_logs` (транзакционный upsert логов)
- [ ] **SEC-7**: Показывать ошибку продвижения прогресса пользователю
- [ ] **ARCH-1**: Централизовать Bottom Sheet в один компонент
- [ ] **ARCH-2**: Оставить один Toast, удалить дубликат
- [ ] **ARCH-3**: Использовать единый `LEVEL_COLORS` из `semanticColors.ts`
- [ ] **ARCH-4**: Мигрировать на Reanimated v3, удалить легаси `Animated`
- [ ] **ARCH-5**: Свести оставшийся хардкод цветов к токенам
- [ ] **ARCH-6**: Заменить `any` в мапперах на типы из `database.types.ts`
- [ ] **ARCH-7**: Унифицировать доменные типы
- [ ] **PERF-2**: Серверный агрегат для `getFilterOptions`
- [ ] **PERF-3**: Тянуть только лёгкие поля в `warmupService`
- [ ] **PERF-4**: Объединить запросы при сохранении программы
- [ ] **PERF-6**: Транзакция при сохранении программы через RPC
- [ ] **SCALE-1**: Тесты для 4 самых рискованных чистых модулей
- [ ] **SCALE-2**: Интегрировать Sentry

### 🔵 Long-term (месяцы, стратегические ставки)

- [ ] **SEC-8**: Миграция на Universal/App Links
- [ ] **ARCH-8**: Структурированная таблица противопоказаний
- [ ] **PERF-1**: Переписать легаси-генерацию тренировок на batch/RPC (канонический путь уже есть — `create_workouts_for_program`)
- [ ] **PERF-5**: Реагировать на изменение размера окна (Split View)
- [ ] **PERF (copy)**: Оптимизировать `copy_program_for_user` через CTE (вложенные циклы → `INSERT ... SELECT`)
- [ ] **SCALE-3**: Удалить мёртвый код и ассеты
- [ ] **SCALE-4**: Единый источник конфигурации/секретов
- [ ] **SCALE-5**: Разбить God Objects на меньшие модули
- [ ] **SCALE-6**: Ревью серверных RPC наравне с клиентским кодом (процесс запущен)
- [ ] Offline-first: локальная очередь записи с синхронизацией
- [ ] Реальные push-напоминания (`expo-notifications`)
- [ ] Помощь в достижении целей КБЖУ (база рецептов/продуктов)
- [ ] Юридический ревью фичи "фармакология" перед релизом
- [ ] CI/CD: lint + typecheck + тесты как обязательный гейт мёржа
- [ ] Продуктовая стратегия монетизации

---

## ⚠️ Известный tech debt

- `supabase.from()` в UI: `history.tsx`, `injuries.tsx`, `workouts.tsx` (запросы пока в компоненте; `workouts.tsx` уже на `useFocusEffect`, но не в сервисе). Выносить в `services/` + React Query.
- Серверные данные в Zustand: `useStore.workouts`/`logs`/`alternativesCache` — выносить в React Query / локальный state экранов.
- Хардкод градиентов: `history.tsx` (`getWorkoutGradient` — массив hex). Заменить на `gradients` из `useTheme()`.
- `profileService.getBurnedCalories`: в части версий N+1 (цикл по тренировкам). Корректная версия — один запрос логов через `.in('workout_exercises.workout_id', workoutIds)`.
- `useWorkoutSession.saveWorkout`: идемпотентность записи логов зависит от уникального индекса `ux_workout_logs_ex_set` на БД; клиентский `upsert` — после накатки индекса. Полное решение — RPC `upsert_workout_logs` (RPC-3).
- `database.types.ts`: держать в синхроне с БД (regenerate после миграций): `npx supabase gen types typescript --project-id trgiihqqcovidwcqwdkl --schema public > src/types/database.types.ts` (запускать из корня проекта, не из `android/`).
- Превышение 500 строк: `goals.tsx`, `program/[id].tsx` — кандидаты на разбиение.
- Артефакты форматирования: в ряде файлов встречаются синтаксические артефакты (`= >`, `& &`, пробелы в `</Text >`, именах пропсов). Проверять `npx tsc --noEmit`; при наличии — чистить.
- `programsService.createWorkoutsFromProgram` — легаси-путь генерации тренировок (вложенный N+1 + хрупкий ILIKE-резолв «имя → id»; SEC-4 закрыл падение, но не архитектуру). Канонический путь — RPC `create_workouts_for_program`. После grep-подтверждения отсутствия вызовов — удалить (PERF-1).
- Серверные функции-миграторы (`normalize_equipment_*`, `split_equipment*`, `migrate_exercise_equipment`) — одноразовые утилиты; после завершения миграции оборудования можно удалить (не используются в рантайме).

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

- **API/Библиотеки**: Проверено, что используются только методы из Expo SDK 54+, RN 0.81+, Reanimated v3.
- **Типизация**: Проверено соответствие типам Supabase (`database.types.ts`), нет кастов к `any`.
- **Логика**: Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### ✅ 3. Отчёт о сохранении функционала (Чек-лист)

Критически важно при рефакторинге. AI явно показывает, что ни одна фича не потеряна.

| Исходный функционал / Поведение | Статус | Комментарий |
| --- | --- | --- |
| Например: Drag & Drop упражнений | ✅ | Перенесено в useProgramEditor, DraggableFlatList |

---

## 📊 Статус задач

### ✅ ЭТАП 1: Фундамент и БД (ЗАВЕРШЁН)

- React Query внедрён. N+1 устранены. Dashboard оптимизирован. `usePrograms.ts` на `useInfiniteQuery`.

### ✅ ЭТАП 2: Производительность (ЗАВЕРШЁН)

- VirtualizedLists исправлены. `console.log` удалены из горячих путей. ScrollView → FlatList в `workout/[id].tsx`.

### ✅ ЭТАП 3: UI/UX и дизайн-система (ЗАВЕРШЁН)

- UI-кит (AppButton, AppCard, AppBadge, AppInput) внедрён. `card.ts` разбит на модульную структуру.

### ✅ ЭТАП 4: Рефакторинг God Objects (ЗАВЕРШЁН)

- Разобраны `workout/[id].tsx` и `program/[id].tsx`: хуки, DayCard, модалки в `program/sheets/`.

### ✅ ЭТАП 5: Новые фичи (ЗАВЕРШЁН)

- Замеры тела, система травм (avoid/caution), цели и макросы, настройки, Dashboard-виджеты. Программы: CRUD с модалками, drag & drop. База упражнений: 870+ записей, перевод, категории, `media_url`. Авторазминка, карточка упражнения, справочник, детальный экран, личные рекорды, поиск через RPC `search_exercises`, таймер отдыха (`expo-audio`), травмы (рефакторинг).

### 🚀 ЭТАП 6: Улучшения и полировка

- ✅ Регистрация и авторизация (базово ЗАВЕРШЕНО, требует прогона тест-сценария)
  - Supabase Auth (email/password), единый слой `authService.ts`.
  - Триггер `handle_new_user` создаёт профиль (только `id`, без `email`).
  - `ensureProfile` идемпотентен, не блокирует вход; чинит старые аккаунты на `signIn`.
  - RLS-политики профилей/программ/тренировок/логов (см. секцию «Авторизация и профили»).
  - Экраны `login` / `reset-password` / `update-password`, корневой auth-гейт, `PASSWORD_RECOVERY`.
  - ⚠️ Осталось: прогнать сквозной тест-сценарий (регистрация → вход → dashboard → старт программы → завершение → история).

- ✅ Dashboard на React Query (ЗАВЕРШЕНО)
  - `useDashboard` + `dashboardService` (Promise.allSettled), `useMemo`-стили, error-state с `refetch`.

- ✅ Цели и макросы на React Query (ЗАВЕРШЕНО)
  - `goalsService` (`getGoalsProfile`/`saveGoalsProfile`, upsert), `useQuery`/`useMutation`, `invalidateQueries`, авто-создание замера веса через `metricsService`.

- ✅ Список тренировок: обновление по фокусу (ЗАВЕРШЕНО)
  - `useFocusEffect` в `workouts.tsx`.

- ✅ Экран создания тренировки (ЗАВЕРШЕНО)
  - `workout/create.tsx` + `workoutService` (`startProgramWorkout` идемпотентно, `repeatWorkout`).

- ✅ Периодизация программ (ЗАВЕРШЕНО)
  - Модель programs → program_phases → program_days → program_exercises; типы фаз; редактор фаз (PhaseCard, шаблон + переопределения); прогрессия (`advanceProgramProgress`); создание тренировок upfront; 6 готовых программ; UX списка тренировок; ProgramProgressCard; RPC `copy_program_for_user`.

- ✅ Шаринг программ по коду (ЗАВЕРШЕНО)
  - `programs.share_code`, RPC `generate_share_code`, `programSharingService`, UI (ShareProgramSheet / ImportProgramSheet).

- ✅ Тип активности «Активация» (ЗАВЕРШЕНО)
  - Колонка `can_be_activation` (62 упражнения); RPC `search_exercises` возвращает `can_be_activation` + параметр `activation_filter`; бейджи в справочнике/детальном экране/разминке; фильтр «Только активация».

- ✅ Нечёткий поиск (ЗАВЕРШЕНО)
  - `pg_trgm` + `word_similarity` (порог 0.4) в RPC `search_exercises`; гибридный поиск LIKE + word_similarity; GIN-индекс `idx_exercises_name_norm_trgm`; ранжирование по релевантности.

- ✅ **Аудит серверной логики RPC (SCALE-6) (ЗАВЕРШЕНО 29.07.2026)**
  - Выгружены определения всех функций и RLS-политики через SQL Editor.
  - Подтверждены: транзакционность (`copy_program_for_user`, `create_workouts_for_program`), идемпотентность, `SECURITY DEFINER` с проверкой `auth.uid()`, батчинг упражнений.
  - Найдены замечания: RPC-1 (закрыт 29.07.2026), RPC-2 (закрыт 29.07.2026), RPC-3 (нужен `upsert_workout_logs`).
  - См. секцию «🗄️ Серверная логика (PostgreSQL RPC)».

- ✅ **Очистка дублирующихся RLS-политик (ЗАВЕРШЕНО 29.07.2026)**
  - Скрипт `supabase/cleanup_duplicate_policies.sql`: 34 → 12 политик.
  - Консолидация в единые `ALL`-политики: `body_metrics`, `user_programs`, `workouts`, `workout_exercises`; удалены дубли в `profiles`, `workout_logs`, `exercises`.

- ✅ **SEC-1: устранение service_role key (ЗАВЕРШЕНО 29.07.2026)**
  - Путь A: клиент переведён на publishable API keys (`sb_publishable_...`) в `.env` / `app.json` / `supabase.ts`.
  - Legacy JWT-ключи отключены в Dashboard; старый `service_role` невалиден.
  - `.env` в `.gitignore`, создан `.env.example`, secret key в проекте не хранится.

- ✅ **SEC-3: nested VirtualizedList в DayCard (ЗАВЕРШЕНО 29.07.2026)**
  - Добавлен `scrollEnabled={false}` в `DraggableFlatList` `DayCard.tsx` по образцу `PhaseCard.tsx`.

- ✅ **SEC-4: .single() на пустой выборке в createWorkoutsFromProgram (ЗАВЕРШЕНО 29.07.2026)**
  - .single() → .maybeSingle(): при нуле совпадений возвращает null вместо исключения → функция больше не падает на несовпавшем имени.

- ✅ **RPC-1: явный SECURITY INVOKER (ЗАВЕРШЕНО 29.07.2026)**
  - Функции `update_day_position` / `update_exercise_position` получили явный `SECURITY INVOKER` + `SET search_path TO 'public'`.
  - Скрипт `supabase/rpc_add_security_invoker.sql`; верификация через `pg_get_functiondef` + `prosecdef = false`.
  - Поведение не изменилось (функции и так были INVOKER по умолчанию, защита на RLS); правка фиксирует намерение в исходнике.

  - ✅ **SEC-4: `.single()` на пустой выборке (ЗАВЕРШЕНО 29.07.2026)**
  - `.single()` → `.maybeSingle()` + `if (!exerciseId) continue;` в `createWorkoutsFromProgram`.
  - Консистентно с RPC `create_workouts_for_program`; функция — легаси, кандидат на удаление.

- ✅ **SEC-5: сброс пароля из Settings (ЗАВЕРШЕНО 29.07.2026)**
  - `handleChangePassword` → `sendPasswordReset(email, 'fittracker://reset-password')` из `authService`.
  - Ссылка из письма ведёт в приложение (deep link → `update-password`), единообразно с `reset-password.tsx`.

- ✅ **SEC-10: вынос `supabase.*` из settings.tsx (ЗАВЕРШЕНО 29.07.2026)**
  - `loadUserData` → `profileService.getProfileData`; `handleSaveProfile` → `profileService.updateFullName` (новый метод).
  - `handleExportData` + секция «Данные» удалены (фейковый экспорт скрыт, вариант A).
  - 0 прямых `supabase.*` в файле; импорт `supabase`/`Download` удалены. Остальные экраны (`history`/`injuries`/`workouts`) — в tech debt.

- 🔲 **Аудит безопасности и архитектуры**
  - 🔴 SEC-2: Автосохранение подходов тренировки
  - 🟡 SEC-6 / RPC-3: Создать и применить RPC `upsert_workout_logs`
  - 🟡 SEC-7: Показывать ошибку продвижения прогресса
  - 🟡 SEC-8: Миграция на Universal/App Links
  - 🟢 SEC-9: Единый маппер ошибок

- 🔲 **Архитектурные улучшения**
  - ARCH-1: Централизовать Bottom Sheet
  - ARCH-2: Удалить дублирующийся Toast
  - ARCH-3: Единый `LEVEL_COLORS`
  - ARCH-4: Мигрировать на Reanimated v3
  - ARCH-5: Свести хардкод цветов
  - ARCH-6: Типизировать сервисный слой
  - ARCH-7: Унифицировать доменные типы
  - ARCH-8: Структурированная таблица противопоказаний

- 🔲 **Производительность**
  - PERF-1: Переписать легаси-генерацию тренировок
  - PERF-2: Серверный агрегат для фильтров
  - PERF-3: Лёгкие поля в разминке
  - PERF-4: Объединить запросы при сохранении
  - PERF-5: Реагировать на Split View
  - PERF-6: Транзакция при сохранении программы

- 🔲 **Масштабируемость**
  - SCALE-1: Автотесты для критичных функций
  - SCALE-2: Интегрировать Sentry
  - SCALE-3: Удалить мёртвый код
  - SCALE-4: Единый источник конфигурации
  - SCALE-5: Разбить God Objects
  - ✅ SCALE-6: Аудит серверных RPC (ВЫПОЛНЕНО 29.07.2026)
  - SCALE-7: Актуализировать документацию

- 🔲 Аудит тёмной темы
  - Контраст и читаемость во всех 10 комбинациях (5 акцентов × 2 режима).

- 🔲 Подготовка к релизу
  - EAS Build, иконки, сплэш-скрин.

- 🔲 (опционально) Автозапуск следующего подхода по окончании отдыха.

- ❌ Калькулятор блинов — отклонено (решение пользователя).

### 🔮 ЭТАП 7: Дальнейшее развитие (ИДЕИ)

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

---

## 📚 Дополнительные документы

- `AUDIT_REPORT.md` — полный отчёт аудита от 29.07.2026 (Principal Software Engineer / Lead Product Analyst)
- `fittracker-audit-report.md` — копия аудита для reference
- `supabase/cleanup_duplicate_policies.sql` — скрипт очистки дублирующихся RLS-политик (применён 29.07.2026)
- `supabase/rpc_add_security_invoker.sql` — скрипт RPC-1: явный `SECURITY INVOKER` + `search_path` (применён 29.07.2026)
- `.env.example` — шаблон переменных окружения (коммитится; реальный `.env` вне git)

---

**Последнее обновление**: 29.07.2026 (SEC-1, SEC-3, SEC-4, SEC-5, SEC-10, RPC-1 закрыты; RLS консолидированы 34 → 12; аудит SCALE-6 выполнен)