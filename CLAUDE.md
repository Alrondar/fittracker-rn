# FitTracker RN — Инструкции для AI-ассистента

> Срез: 01.08.2026. Статусы задач → TASKS_STATUS.md. Инвентарь → FILE_INVENTORY.md. Детальный рефакторинг → refactoring_guide.md.

## О проекте

Приложение для ведения тренировок на React Native (Expo).

- Язык: TypeScript ~5.9 (строгая типизация)
- Навигация: Expo Router ~6.0 (файловая, группы (tabs), (auth))
- Бэкенд: Supabase (PostgreSQL + RLS + RPC + Auth), @supabase/supabase-js ^2.110. Project ID: trgiihqqcovidwcqwdkl
- Аутентификация: Supabase Auth (email/password), единый слой src/services/authService.ts
- Стейт:
  - @tanstack/react-query ^5.101 — ВСЕ серверные данные
  - zustand ^5 — ТОЛЬКО UI-стейт (isAuthenticated, userId, themePreferences)
  - В useStore ещё лежат workouts/logs/alternativesCache — tech debt
- Стилизация: Единая дизайн-система через useTheme() + атомарные UI-компоненты
- Анимации: react-native-reanimated ^3.16 + react-native-gesture-handler ~2.28
- Иконки: lucide-react-native ^1.24 + кастомные SVG
- Изображения: expo-image ~3.0 (НЕ Image из RN)
- Тактильность: expo-haptics ~15.0
- Drag & Drop: react-native-draggable-flatlist ^4.0
- Runtime: Expo SDK ~54, React Native 0.81.5, React 19.1

## Архитектура

### Структура папок

    app/
      _layout.tsx              # QueryClient (ВНЕ компонента), провайдеры, auth-гейт
      (auth)/                  # login, reset-password, update-password
      (tabs)/
        index.tsx              # Dashboard + плейсхолдер «Нет активной программы»
        exercises.tsx          # Справочник (infinite scroll)
        history.tsx            # tech debt: supabase в UI
        programs.tsx           # Программы + активация + импорт
        workouts.tsx           # Тренировки по фазам/неделям
        profile.tsx
        exercise/[id].tsx      # Детальное упражнение
        history/[id].tsx       # tech debt: supabase в UI
        profile/               # goals, injuries (tech debt), metrics, settings (чист)
        program/[id].tsx       # Редактор + шаринг
        workout/[id].tsx       # Сессия тренировки
        workout/create.tsx
    src/
      components/ui/           # AppButton, AppCard, AppBadge, AppInput, SheetShell
      components/workout/      # ExerciseCard, ExerciseSlider, WarmupBlock, RestTimer, WorkoutTimer
      components/program/      # PhaseCard, DayCard, sheets/ (6 шторок)
      hooks/                   # React Query хуки + useWorkoutSession + useProgramEditor
      services/                # Бизнес-логика + Supabase
      constants/               # Тема, цвета, фазы, травмы
      styles/                  # Фабрики стилей
      types/                   # database.types.ts (UTF-16 + рассинхрон)
      lib/                     # supabase.ts (хардкод ключа)
    supabase/                  # SQL миграции

### Ключевые сервисы

| Сервис | Назначение |
|---|---|
| authService.ts | Supabase Auth: signIn/signUp/signOut/reset/update + ensureProfile |
| programsService.ts | CRUD + activateProgram(+reset) + getUserProgramsStatus + syncProgramChanges + deleteProgram |
| programSharingService.ts | generateShareCode, importProgramByCode |
| workoutService.ts | startProgramWorkout, repeatWorkout |
| workoutsService.ts | getWorkoutsData (секции по фазам/неделям) |
| dashboardService.ts | Агрегация Dashboard (PR-bias + формула калорий *300) |
| profileService.ts | Профиль, КБЖУ, травмы, личные рекорды |
| exercisesService.ts | Упражнения: список, фильтры (PERF-2) |
| goalsService.ts | Цели (upsert) |
| metricsService.ts | Замеры тела |
| warmupService.ts | Авторазминка (PERF-3) |

### Ключевые хуки

| Хук | Назначение |
|---|---|
| useDashboard.ts | Dashboard (React Query) |
| usePrograms.ts | Список программ + мутации |
| useProgramEditor.ts + useProgramPhases.ts | Редактор программ (SCALE-5 разбит) |
| useWorkoutSession.ts | Сессия тренировки (SEC-2: updateSet локальный) |
| useWorkouts.ts | Тренировки (React Query) |
| useExercises.ts | Справочник (useInfiniteQuery) |
| useInjuryWarnings.ts | avoid/caution |
| useWarmup.ts | Разминка с учётом травм |

## Авторизация и профили

### Единый слой authService.ts

UI-экраны НЕ вызывают supabase.auth.* напрямую — только через authService.
Редиректы делает корневой _layout.tsx через onAuthStateChange.

Экспортирует: signIn, signUp, signOut, sendPasswordReset, updatePassword, getSession, onAuthStateChange, mapAuthError.

### Создание профиля

Профиль создаётся триггером БД handle_new_user (AFTER INSERT ON auth.users).

КРИТИЧНО: в таблице profiles НЕТ колонки email. Триггер и ensureProfile пишут ТОЛЬКО id. Попытка записать email роняет запрос ошибкой 42703.

ensureProfile(userId) — идемпотентный upsert({ id }, { onConflict: 'id' }); вызывается на signIn и signUp. Ошибку 23505 игнорирует.

### Ключи Supabase (SEC-1 закрыто)

Клиент использует publishable API key (sb_publishable_...) — публичный, защищён RLS.
Legacy JWT-ключи (anon/service_role в формате eyJ...) ОТКЛЮЧЕНЫ в Dashboard.
Secret key в проекте НЕ хранится. .env в .gitignore; коммитится только .env.example.

Ключ продублирован в 3 местах (SCALE-4): .env, app.json → extra, хардкод в src/lib/supabase.ts.

### RLS-политики (консолидировано, 34 → 12)

- profiles: auth.uid() = id
- programs: SELECT — created_by IS NULL OR created_by = auth.uid(); INSERT/UPDATE/DELETE — created_by = auth.uid()
- program_phases / program_days / program_exercises: через связь с programs
- user_programs: auth.uid() = user_id (ALL)
- workouts: auth.uid() = user_id (ALL)
- workout_exercises: через workouts.user_id = auth.uid() (ALL)
- workout_logs: через workout_exercises → workouts.user_id = auth.uid()
- body_metrics: auth.uid() = user_id (ALL)
- exercises, equipment, exercise_equipment, injury_exercise_warnings: SELECT для всех

ТРЕБУЕТ ПРОВЕРКИ: user_injuries, nutrition_logs — не задокументированы. Выполнить SELECT * FROM pg_policies WHERE tablename IN ('user_injuries','nutrition_logs');

## Серверная логика (PostgreSQL RPC)

### Инвентарь RPC

| Функция | Security | Назначение |
|---|---|---|
| copy_program_for_user | DEFINER + проверка auth.uid() | Копирование программы |
| create_workouts_for_program | DEFINER + проверка auth.uid() | Создание тренировок upfront |
| sync_program_changes_to_workouts | DEFINER + проверка владельца | Синхронизация правок (FIT-2) |
| generate_share_code | DEFINER + проверка владельца | Генерация кода шаринга |
| search_exercises | DEFINER, STABLE | Нечёткий поиск (pg_trgm) |
| update_day_position / update_exercise_position | INVOKER + search_path | Drag & drop |
| handle_new_user | DEFINER | Триггер создания профиля |

### Правила работы с RPC

1. Security model:
   - Обходит RLS → SECURITY DEFINER + явная проверка auth.uid() внутри
   - Подчиняется RLS → SECURITY INVOKER + SET search_path TO 'public'
2. Идемпотентность: IF EXISTS / ON CONFLICT DO NOTHING
3. Транзакционность: единый PL/pgSQL-блок (не клиентский Promise.all)
4. Батчинг: INSERT INTO ... SELECT вместо вложенных циклов
5. Все новые RPC — в supabase/migrations под тем же ревью, что и клиентский код

### Регенерация типов (после миграции)

Legacy-ключи отключены (SEC-1). Команды --project-id и --linked падают.

Правильная команда:

    $env:PG = "postgresql://postgres.[ref]:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
    npx supabase gen types typescript --db-url $env:PG --schema public | Out-File -FilePath src/types/database.types.ts -Encoding utf8
    $env:PG = $null

Пароль: Dashboard → Connect → Session/Direct pooler. НЕ светить в чат/git.
Прямой хост db.<ref>.supabase.co на новом стеке НЕ резолвится — только pooler.

Проверка после регенерации:
- Файл в UTF-8 (не UTF-16)
- В секции Functions есть новая RPC
- tsc --noEmit чист

Текущее состояние database.types.ts: ✅ синхронизирован с БД (UTF-8, содержит sync_program_changes_to_workouts и upsert_workout_logs в Functions)
### RPC-3 ✅ закрыт 01.08.2026

RPC-3 ✅ закрыт 01.08.2026
upsert_workout_logs(p_workout_exercise_id uuid, p_logs jsonb):
SECURITY DEFINER + проверка auth.uid() + INSERT ON CONFLICT + удаление отсутствующих
Закрывает SEC-2 + SEC-6

## Данные упражнений

Таблица exercises — 870+ записей, названия на русском.

КРИТИЧНО: Колонки description в таблице НЕТ — не включать в select (ошибка 42703).

- Категории (category): strength, stretching, plyometrics, olympic weightlifting, powerlifting, cardio
- Мышцы (primary_muscles, secondary_muscles — массивы) на русском
- Оборудование (equipment — массив) на русском (68 значений)
- can_be_activation (boolean) — тип «Активация» (62 упражнения)
- media_url — одиночный URL; клиент генерирует пару 0.jpg + 1.jpg

Справочник: пагинация 40/страница (useInfiniteQuery), лёгкий select, серверные фильтры, debounce 300 мс, staleTime: Infinity для словарей.

## Периодизация программ

### Модель данных

    programs → program_phases (phase_number, name, phase_type, weeks_count, position)
             → program_days (phase_id, week_number, day_number)
             → program_exercises
    user_programs: current_phase / current_week / current_day, is_active, started_at, completed_at
    workouts: phase_number / week_number / day_index, started_at / finished_at / duration_seconds

program_days.id, program_exercises.id — uuid; programs.id, program_phases.id — text.
gen_random_uuid() для дней/упражнений, gen_random_uuid()::text для программ/фаз.

### Типы фаз

constants/phaseTypes.ts: hypertrophy, strength, power, deload, custom.
Цвет/иконка/подпись — через getPhaseMeta / getPhaseColor (без хардкода).

### Создание тренировок

- Upfront (канонический путь): RPC create_workouts_for_program при старте программы
- Точечное: workoutService.startProgramWorkout — текущий день, идемпотентно
- Повтор: workoutService.repeatWorkout — копия как ad-hoc

### Активация программ (FIT-1 закрыто)

- activateProgram(programId, userId, reset?) — деактивирует все → активирует выбранную
- getUserProgramsStatus(userId) — один запрос на весь список
- deactivateAllPrograms(userId) — 0 активных
- deleteProgram(programId, userId) — отвязка тренировок + удаление user_programs + каскад (FIT-3)

### Синхронизация правок (FIT-2 закрыто)

syncProgramChanges(programId) → RPC sync_program_changes_to_workouts: атомарно обновляет будущие тренировки (started_at IS NULL AND finished_at IS NULL). Вызывается после saveProgram().

### Прогрессия

advanceProgramProgress: день → неделя → фаза → завершение программы.

### Готовые программы (6, засеяны, created_by IS NULL)

| Программа | Уровень | Дней/нед | Фазы |
|---|---|---|---|
| Full Body — Старт | beginner | 3 | Адаптация (4) → Прогрессия (3) → Дилоуд (1) |
| StrongLifts 5×5 | beginner | 2 | База 5×5 (8) → Интенсификация (3) → Дилоуд (1) |
| PPL Классический | intermediate | 3 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| Upper/Lower | intermediate | 4 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPLUL | intermediate | 5 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |
| PPL 6-day | advanced | 6 | Гипертрофия (4) → Сила (3) → Дилоуд (1) |

## Шаринг программ по коду

- programs.share_code (text, nullable)
- RPC generate_share_code(p_program_id) — только для своих программ
- programSharingService: generateShareCode, importProgramByCode, formatShareCode
- UI: ShareProgramSheet в program/[id].tsx; ImportProgramSheet в programs.tsx

## Дизайн-система

### Канонический способ

    const { colors } = useTheme();
    <View style={{ backgroundColor: colors.primary }} />
    <Text style={{ color: colors.textPrimary }}>Hello</Text>

### СТРОГО ЗАПРЕЩЁН хардкод

    backgroundColor: '#7c3aed'    // нельзя
    color: 'white'                // нельзя
    backgroundColor: '#4CAF50'    // нельзя
    backgroundColor: 'rgba(0,0,0,0.5)'  // нельзя

### Правильные токены

| Задача | Токен |
|---|---|
| Акцентный цвет | colors.primary |
| Текст на тёмном фоне | colors.textInverse |
| Основной текст | colors.textPrimary |
| Вторичный текст | colors.textSecondary |
| Оверлей шторки | colors.overlay |
| Ошибка / Предупреждение / Успех | colors.error / colors.warning / colors.success |

### Канонические цвета для доменов

- Уровни программы: LEVEL_COLORS[level] из semanticColors.ts
- Мышцы: getMuscleColor(muscle) из muscleColors.ts
- Фазы: getPhaseColor(type) из phaseTypes.ts

### Остаточный хардкод (ARCH-5, tech debt)

| Файл | Проблема |
|---|---|
| ProgramProgressCard.tsx | color="white" → colors.textInverse |
| ExerciseSettingsSheet.tsx | #4CAF50/#FFC107/#F44336 → токены |
| ExercisePickerSheet.tsx | getGroupColor '#6B7280' → colors.textTertiary |
| Оверлеи шторок | rgba(0,0,0,0.5) → colors.overlay |

Правило: не добавлять новый хардкод, постепенно вычищать старый.

### Иконки оборудования

    <EquipmentIcon name="barbell" size={24} primaryMuscles={['chest']} />
    // проп name, НЕ type

Рассинхрон EQUIPMENT_SVG_MAP ↔ ICON_MAP: partner.svg не замаплен, support.svg недостижим.

### Отступы и радиусы

    import { SPACING, BORDER_RADIUS } from '@/constants/theme';
    padding: SPACING.md   // 16
    borderRadius: BORDER_RADIUS.lg  // 12

### Фабрики стилей

    // ПРАВИЛЬНО: useMemo на уровне экрана
    const styles = useMemo(() => createCardStyles(colors), [colors]);

    // НЕПРАВИЛЬНО: внутри renderItem

### Единый дизайн-язык карточки упражнения

- Живая обводка: avoid → colors.error, caution → colors.warning, заменено → colors.primary, все подходы заполнены → colors.success + '60', по умолчанию → colors.border
- Аккордеоны: без контурных обводок, цветной значок + uppercase-заголовок + шеврон; pointerEvents="none" в свёрнутом состоянии
- Баблы мышц: primary — насыщенный цвет, secondary — нейтральный фон с цветной обводкой
- Слайдеры техники: ленивый монтаж (everOpened), автоплей 3с только в раскрытом аккордеоне

## Производительность (ОБЯЗАТЕЛЬНО)

- Никогда не вкладывай VirtualizedLists в ScrollView. Исключение: DraggableFlatList с scrollEnabled={false}
- Никаких console.log в PanResponder, onScroll, анимациях
- QueryClient создаётся ВНЕ компонента
- Файлы не должны превышать 500 строк (God Objects запрещены)
- Использовать expo-image вместо Image из RN
- Фабрики стилей — только через useMemo на уровне экрана
- Колбэки в карточки — только useCallback
- Карточки списков — React.memo
- Тяжёлые данные — не тянуть в списки; грузить по требованию
- useFocusEffect для обновления данных при возврате на вкладку
- Серверные данные — через React Query

## Анти-паттерны (НЕ ДЕЛАЙ ТАК)

- Хранить серверные данные в Zustand
- N+1 запросов (используй вложенные select('*, days(*, exercises(*))'))
- supabase.from() в UI (выноси в services/)
- Math.random() в keyExtractor
- LayoutAnimation (no-op в New Architecture)
- Image из react-native (используй expo-image)
- description в select из exercises (колонки нет)
- email в profiles (колонки нет)
- Монтировать слайдеры в свёрнутых аккордеонах
- gen_random_uuid()::text в program_days.id / program_exercises.id (они uuid)
- supabase.auth.* в UI (только через authService)
- Сырые ошибки Postgres пользователю
- Неатомарные операции (delete + insert без транзакции)
- VirtualizedLists в ScrollView без scrollEnabled={false}
- Дублирующиеся RLS-политики
- SECURITY DEFINER без проверки auth.uid()
- Хранить/коммитить service_role / secret-ключи
- RPC без SECURITY INVOKER + SET search_path (если должны подчиняться RLS)
- Маскировать сбой бизнес-логики под «Успех»
- Регенерировать типы через --project-id / --linked (падают после SEC-1)

## PRE-FLIGHT (перед изменением файла)

Перед написанием кода AI обязан выполнить:

1. Подтвердить версию файла. Если файл прислан в двух вариантах или в refactoring_guide.md есть пометка «разнобой версий» — спросить пользователя, какая версия актуальна на диске. НЕ угадывать.
2. Grep по импортам. grep -r "имя_файла" src/ app/ — найти всех потребителей. Изменение экспорта = проверка всех импортов.
3. Проверить мёртвость. Если файл в списке SCALE-3 (useActiveProgram.ts, AnimatedButton, SwipeableCard, BottomSheet.tsx, Frame*.svg) — сначала подтвердить мёртвость grep'ом, потом удалить.
4. Проверить лимит строк. Если файл > 450 строк — отказаться от добавления функционала, предложить разбиение (SCALE-5).
5. Проверить tech debt. Если файл в FILE_INVENTORY.md помечен как tech debt — не усугублять долг.
6. Проверить database.types.ts. Если задача касается новой RPC — предупредить, что types рассинхронизированы; вызов делать строковый.
7. Проверить RLS. Если задача касается новой таблицы — убедиться, что она есть в списке RLS.

## База симптомов

### Postgres / Supabase

| Симптом | Причина | Решение |
|---|---|---|
| Postgres error 42703 | Колонки нет в таблице | Проверить schema; НЕ добавлять description в exercises, email в profiles |
| Postgres error 23505 | Unique violation | Использовать ON CONFLICT; в ensureProfile — игнорировать |
| ENOTFOUND db.<ref>.supabase.co | Новый стек не резолвит прямой хост | Использовать pooler aws-0-eu-central-1.pooler.supabase.com |
| Legacy API keys are disabled | SEC-1 отключил legacy JWT | Использовать --db-url + Out-File -Encoding utf8 |
| supabase.rpc<'name'> type error | Types рассинхронизированы с БД | Вызывать строковый supabase.rpc('name', {...}) |
| .single() бросает на 0 строк | Пустая выборка | .maybeSingle() + guard |
| RLS policy violation | Нет политики или не тот auth.uid() | Проверить pg_policies, использовать ALL-политики |
| Promise.all не прерывается на ошибке | supabase-js резолвит с {error} | Использовать RPC с транзакцией |
| Файл в UTF-16 с BOM | PowerShell > без -Encoding utf8 | Перегенерировать через Out-File -Encoding utf8 |

### React Native / Expo

| Симптом | Причина | Решение |
|---|---|---|
| Nested VirtualizedList warning | ScrollView + FlatList | scrollEnabled={false} или ListHeaderComponent |
| LayoutAnimation no-op | New Architecture | Использовать Reanimated v3 |
| Dimensions.get('window').width не реагирует на Split View | Читается один раз (PERF-5) | useWindowDimensions() |
| Краш = потеря тренировки | SEC-2: updateSet локальный | debounce + RPC upsert_workout_logs |

## Правила работы с документацией

### Актуальность
- Каждый документ содержит дату среза в шапке (Срез: DD.MM.YYYY)
- После изменения кода AI обязан обновить соответствующие секции в CLAUDE.md / TASKS_STATUS.md / FILE_INVENTORY.md
- Если задача закрыта — обновить статус в TASKS_STATUS.md в том же ответе

### Читабельность
- Код в ответах — только в блоках с подсветкой синтаксиса
- Таблицы — для структурированных данных (статусы, инвентарь, сравнения)
- Длинные перечисления — маркированными списками, не сплошным текстом
- Имена файлов, функций, переменных — в обратных кавычках

### Своевременность обновления
- После рефакторинга файла → обновить FILE_INVENTORY.md (примечание/долг)
- После закрытия задачи → обновить TASKS_STATUS.md (статус + дата)
- После изменения архитектуры → обновить CLAUDE.md (соответствующая секция)
- Если изменение затрагивает несколько документов → обновить все в одном ответе

## Известный tech debt

Известный tech debt
- supabase.from() в UI: history.tsx, injuries.tsx (выносить в services/ + React Query)
- Серверные данные в Zustand: useStore.workouts/logs/alternativesCache
- Хардкод градиентов: history.tsx (getWorkoutGradient)
- useWorkoutSession cleanup-эффект на deps (лишний UPDATE) — medium-term
- dashboardService: PR-bias + формула калорий * 300 vs profileService
- Превышение 500 строк: goals.tsx, program/[id].tsx, ExerciseCard.tsx, WarmupBlock.tsx

## ФОРМАТ ОТВЕТА AI (СТРОГО СОБЛЮДАТЬ)

При генерации кода или рефакторинге AI обязан использовать следующий формат ответа:

### 1. Основное решение / Код

[Здесь сам код, архитектура или объяснение]
Код должен быть либо целиком, либо в формате было/стало, если исправления точечные.

### 2. Самопроверка и сверка с контекстом

- Стейт: Серверные данные через React Query, UI через Zustand.
- Архитектура: Запросы вынесены в src/services/, в UI нет supabase.from().
- UI/UX: Использован useTheme(), атомарные компоненты (AppButton), нет хардкода цветов.
- Производительность: Нет FlatList в ScrollView, нет console.log в жестах/анимациях.
- Лимиты: Файл не превышает 500 строк.

### 3. Поиск галлюцинаций и ошибок

- API/Библиотеки: Проверено, что используются только методы из Expo SDK 54+, RN 0.81+, Reanimated v3.
- Типизация: Проверено соответствие типам Supabase (database.types.ts), нет кастов к any.
- Логика: Проверены edge-cases (пустые списки, состояния loading/error, обработка null/undefined).

### 4. Отчёт о сохранении функционала (Чек-лист)

Критически важно при рефакторинге. AI явно показывает, что ни одна фича не потеряна.

| Исходный функционал / Поведение | Статус | Комментарий |
|---|---|---|
| Например: Drag & Drop упражнений | ОК | Перенесено в useProgramEditor, DraggableFlatList |

## Дополнительные документы

- TASKS_STATUS.md — сводная таблица всех задач SEC/ARCH/PERF/SCALE/FIT со статусами
- FILE_INVENTORY.md — инвентарь файлов проекта с назначением и пометками долга
- refactoring_guide.md — Master Refactoring Guide (детальные инструкции с примерами кода)

Последнее обновление: 01.08.2026