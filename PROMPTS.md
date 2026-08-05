PROMPTS.md — Дополнительные промты для AI-ассистента
Срез: 05.08.2026. Подключать по требованию, чтобы не раздувать CLAUDE.md.
Основные правила — в CLAUDE.md. Статусы задач — в TASKS_STATUS.md. Инвентарь — в FILE_INVENTORY.md.

🔗 Карта зависимостей модулей
Подключать: ПЕРЕД изменением файла, чтобы понять blast radius.
Приоритет: 🥉 СРЕДНЕ — предотвращает частичные рефакторинги.

Правила чтения карты
Изменение файла X → проверить ВСЕ файлы в колонке «Зависимые модули»
Удаление файла X → сначала grep -r "X" по репо, потом обновить импорты
Изменение экспорта → проверить всех потребителей

Хуки (src/hooks/)
| Файл|Зависимые модули|
| ---|---|
| useProgramEditor.ts|program/[id].tsx, useProgramPhases.ts, PhaseCard.tsx, DayCard.tsx, programsService.ts|
| useProgramPhases.ts|useProgramEditor.ts|
| useWorkoutSession.ts|workout/[id].tsx, ExerciseCard.tsx, SetsGrid.tsx, SetFeedbackControl.tsx, WorkoutTimer.tsx, saveWorkout|
| usePrograms.ts|programs.tsx, program/[id].tsx, useProgramEditor.ts, index.tsx (Dashboard)|
| useActiveProgram.ts|⚠️ МЁРТВЫЙ (SCALE-3) — programs.tsx использует getUserProgramsStatus напрямую|
| useWorkouts.ts|workouts.tsx|
| useDashboard.ts|index.tsx (Dashboard)|
| useExercises.ts|exercises.tsx, exercise/[id].tsx|
| useExerciseDetail.ts|exercise/[id].tsx|
| useInjuryWarnings.ts|useWarmup.ts, ExerciseCard.tsx, workout/[id].tsx|
| useWarmup.ts|WarmupBlock.tsx, workout/[id].tsx|
| useProfile.ts|profile.tsx, settings.tsx|
| useBodyMetrics.ts|metrics.tsx|
| useTheme.tsx|ВСЕ UI-компоненты|
| useTimerSettings.ts|RestTimer.tsx, settings.tsx|
| useUnitPreferences.ts|UnitToggle.tsx, ExerciseCard.tsx, SetsGrid.tsx|
| useToast.ts|ВСЕ экраны (канонический toast)|

Сервисы (src/services/)
| Файл|Зависимые модули|
| ---|---|
| programsService.ts|usePrograms.ts, programs.tsx, program/[id].tsx, useProgramEditor.ts, workouts.tsx, index.tsx|
| programSharingService.ts|program/[id].tsx (ShareProgramSheet), programs.tsx (ImportProgramSheet)|
| workoutService.ts|workout/create.tsx|
| workoutsService.ts|workouts.tsx, useWorkouts.ts|
| dashboardService.ts|index.tsx, useDashboard.ts|
| profileService.ts|profile.tsx, settings.tsx, useProfile.ts, injuries.tsx|
| authService.ts|app/_layout.tsx, login.tsx, reset-password.tsx, update-password.tsx, settings.tsx|
| exercisesService.ts|exercises.tsx, exercise/[id].tsx, useExercises.ts|
| goalsService.ts|goals.tsx|
| metricsService.ts|metrics.tsx, goals.tsx|
| warmupService.ts|useWarmup.ts|

Экраны (app/)
| Файл|Зависимые модули|
| ---|---|
| app/_layout.tsx|КОРНЕВОЙ — QueryClient, auth-гейт, провайдеры|
| (tabs)/index.tsx|useDashboard, ProgramProgressCard, виджеты Dashboard|
| (tabs)/programs.tsx|usePrograms, ProgramCard, ImportProgramSheet, getUserProgramsStatus|
| (tabs)/workouts.tsx|useWorkouts, workoutsService, SectionHeader|
| (tabs)/workout/[id].tsx|useWorkoutSession, ExerciseSlider, ExerciseCard, SetsGrid, WarmupBlock, WorkoutTimer, getWorkoutProgramInfo|
| (tabs)/program/[id].tsx|useProgramEditor, PhaseCard, ProgramHero, ProgramFabs, ProgramDetailModals, все sheets/|
| (tabs)/exercises.tsx|useExercises, CategoryStrip, EquipmentSheet|
| (tabs)/exercise/[id].tsx|useExerciseDetail, TechniqueMediaSlider, MuscleBubbles|
| (tabs)/history.tsx|useHistory, historyService|
| (tabs)/history/[id].tsx|⚠️ tech debt: supabase.from в UI (SEC-10)|
| (tabs)/profile/settings.tsx|✅ SEC-10 закрыт (чистый)|
| (tabs)/profile/goals.tsx|goalsService, metricsService, GoalsStep1/2/3, GoalsComponents, macroCalculator|

Константы и типы
| Файл|Зависимые модули|
| ---|---|
| theme.ts / useTheme.tsx|ВСЕ UI-компоненты|
| semanticColors.ts|ProgramCard, ProgramProgressCard, phaseTypes, все компоненты с цветами уровней/фаз|
| phaseTypes.ts|ProgramProgressCard, workouts.tsx, program/[id].tsx, workout/[id].tsx|
| muscleColors.ts|MuscleBubbles, EquipmentBubbles, EquipmentIcon|
| equipmentIcons.ts|EquipmentIcon (ICON_MAP синхронизирован, 73 файла)|
| injuries.ts|useInjuryWarnings, useWarmup, ExerciseCard|
| database.types.ts|ВСЕ services, все typed-запросы (✅ UTF-8, синхронизирован с БД)|
| types/workout.ts|ExerciseCard, ExerciseSlider, SetsGrid, SetFeedbackControl, useWorkoutSession (SetData, Difficulty, SetFeedbackPatch)|

Утилиты и компоненты тренировки (src/components/workout/, src/utils/)
| Файл|Зависимые модули|
| ---|---|
| SetsGrid.tsx|ExerciseCard.tsx, SetFeedbackControl.tsx, utils/rpe.ts, hooks/useUnitPreferences.ts|
| SetFeedbackControl.tsx|SetsGrid.tsx, utils/rpe.ts, types/workout.ts|
| utils/rpe.ts|SetsGrid.tsx, SetFeedbackControl.tsx (чистые функции: RPE_DESCRIPTIONS, rpeZone, deriveRir, deriveDifficulty, DIFFICULTY_LABELS)|
| ExerciseSlider.tsx|ExerciseCard.tsx, types/workout.ts|
| ExerciseCard.tsx|SetsGrid.tsx, ExerciseInfoAccordion, TechniqueMediaSlider, EquipmentIcon|

⚠️ Особые случаи
Изменение theme.ts → проверить ВСЕ компоненты (используют useTheme)
Изменение database.types.ts → перегенерировать через --db-url + utf8 (см. ниже)
Изменение types/workout.ts → проверить ExerciseCard, ExerciseSlider, SetsGrid, SetFeedbackControl, useWorkoutSession
Удаление хука → проверить usePrograms, useWorkouts, useDashboard — они потребляются в нескольких экранах
Изменение programsService → проверить programs.tsx, program/[id].tsx, useProgramEditor, workouts.tsx, Dashboard
Изменение utils/rpe.ts → проверить SetsGrid, SetFeedbackControl (кандидаты под SCALE-1 тесты)

️ Усиленные правила работы с Supabase RPC
Подключать: при создании/изменении RPC-функций и регенерации типов.
Приоритет: 🎖 НИЗКО-СРЕДНЕ — предотвращает ошибки с типами/legacy.

Создание новой RPC
Структура файла:
Путь: supabase/migrations/YYYYMMDD_name.sql
Ревью наравне с клиентским кодом (SCALE-6)

Security model:
Обходит RLS (модифицирующие, агрегации):
CREATE OR REPLACE FUNCTION my_rpc(p_user_id uuid, ...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- обходит RLS
SET search_path TO 'public'
AS $$
BEGIN
  -- ОБЯЗАТЕЛЬНАЯ проверка владельца
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- бизнес-логика
END;
$$;

Подчиняется RLS (read-only, position updates):
CREATE OR REPLACE FUNCTION update_position(...)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER  -- подчиняется RLS
SET search_path TO 'public'
AS $$
BEGIN
  -- бизнес-логика (RLS применится автоматически)
END;
$$;

Обязательные требования
Идемпотентность: IF EXISTS / ON CONFLICT DO NOTHING
Транзакционность: единый PL/pgSQL-блок (не клиентский Promise.all)
Батчинг: INSERT INTO ... SELECT вместо вложенных циклов
Проверка владельца: для SECURITY DEFINER — явная проверка auth.uid()
search_path: всегда SET search_path TO 'public'

Примеры из проекта
| RPC|Security|Назначение|
| ---|---|---|
| copy_program_for_user|DEFINER + проверка auth.uid()|Копирование программы|
| create_workouts_for_program|DEFINER + проверка auth.uid()|Создание тренировок upfront|
| sync_program_changes_to_workouts|DEFINER + проверка владельца|Синхронизация правок (FIT-2)|
| generate_share_code|DEFINER + проверка владельца|Генерация кода шаринга|
| search_exercises|DEFINER, STABLE|Нечёткий поиск|
| update_day_position|INVOKER + search_path|Drag & drop|
| update_exercise_position|INVOKER + search_path|Drag & drop|
| handle_new_user|DEFINER|Триггер создания профиля|
| upsert_workout_logs|DEFINER + проверка auth.uid()|Атомарный upsert логов (SEC-2 + SEC-6 + FEAT-7)|

⚠️ RPC-3 закрыт 01.08.2026, обновлён FEAT-7 05.08.2026
upsert_workout_logs(p_workout_exercise_id uuid, p_logs jsonb) — обновлён
Персистит: set_number, weight_kg, reps, completed_at, rpe, rir, difficulty
Использование: supabase.rpc('upsert_workout_logs', { p_workout_exercise_id, p_logs })
Закрывает SEC-2 + SEC-6 + FEAT-7

Регенерация типов (после миграции)
⚠️ КРИТИЧНО: legacy-ключи отключены (SEC-1). Команды --project-id и --linked падают.
Правильная команда:
$env:PG = "postgresql://postgres.[ref]:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
npx supabase gen types typescript --db-url $env:PG --schema public | Out-File -FilePath src/types/database.types.ts -Encoding utf8
$env:PG = $null

Где взять параметры:
Пароль: Dashboard → кнопка Connect → Session/Direct pooler
НЕ светить в чат/git
Точную pooler-строку брать дословно из Dashboard (префикс региона может отличаться)
Прямой хост db.<ref>.supabase.co на новом стеке НЕ резолвится (ENOTFOUND) — только pooler

Проверка после регенерации:
Файл в UTF-8 (не UTF-16)
В секции Functions есть новая RPC
tsc --noEmit чист
Нет BOM в начале файла

Вызов RPC из клиента
Типизированный вызов (если types синхронизированы):
const { data, error } = await supabase.rpc('my_rpc', {
  p_user_id: userId,
  p_program_id: programId,
});

Строковый вызов (если types рассинхронизированы):
// ⚠️ Использовать, когда RPC нет в database.types.ts
const { data, error } = await supabase.rpc('sync_program_changes_to_workouts', {
  p_program_id: programId,
});

🚨 Анти-паттерны
❌ SECURITY DEFINER без проверки auth.uid() внутри
❌ Клиентский Promise.all для атомарных мульти-операций — использовать RPC
❌ Регенерация через --project-id / --linked (падают после SEC-1)
❌ PowerShell > без -Encoding utf8 (пишет UTF-16)
❌ Хранение пароля в .env для регенерации (использовать переменную окружения)
❌ Коммит database.types.ts с BOM (битый diff)
❌ Читать .value SharedValue в JSX-рендерере (Reanimated 3 strict mode) — только useAnimatedStyle/worklet
❌ Gesture Handler без simultaneousWithExternalGesture в ScrollView — блокирует родительские скроллы

🎨 Усиленная дизайн-система
Подключать: при написании/изменении UI-компонентов.
Приоритет:  НИЗКО — предотвращает хардкод цветов.

Канонический способ
const { colors } = useTheme();
<View style={{ backgroundColor: colors.primary }} />
<Text style={{ color: colors.textPrimary }}>Hello</Text>

❌ СТРОГО ЗАПРЕЩЁН хардкод
// НЕ ДЕЛАТЬ ТАК:
backgroundColor: '#7c3aed'
color: 'white'
color: '#333'
backgroundColor: '#4CAF50'
backgroundColor: 'rgba(0,0,0,0.5)'

✅ Правильные токены
| Задача|Токен|
| ---|---|
| Акцентный цвет|colors.primary|
| Текст на тёмном фоне|colors.textInverse|
| Основной текст|colors.textPrimary|
| Вторичный текст|colors.textSecondary|
| Третичный текст|colors.textTertiary|
| Оверлей шторки|colors.overlay|
| Ошибка|colors.error|
| Предупреждение|colors.warning|
| Успех|colors.success|
| Граница|colors.border|

Альфа-суффиксы (паттерн проекта)
colors.warning + '12'   // предупреждение с прозрачностью
colors.primary + '15'   // акцент с прозрачностью (FEAT-7 чип RPE)
colors.success + '60'   // успех с прозрачностью
colors.error + '15'     // ошибка с прозрачностью (баннер травм)
colors.textSecondary + '20'  // бейдж интенсивности

🎯 Канонические цвета для доменов
Уровни программы:
import { LEVEL_COLORS } from '@/constants/semanticColors';
type LevelKey = 'beginner' | 'intermediate' | 'advanced';
const color = LEVEL_COLORS[level as LevelKey];
✅ ProgramCard.tsx — уже на LEVEL_COLORS (ARCH-3 закрыт 31.07)
⚠️ ProgramFormSheet.tsx — не подтверждено, добить

Мышцы:
import { getMuscleColor } from '@/constants/muscleColors';
const color = getMuscleColor(muscle);

Фазы:
import { getPhaseColor, getPhaseMeta } from '@/constants/phaseTypes';
const color = getPhaseColor(phaseType);
const { icon, label } = getPhaseMeta(phaseType);

Оверлеи:
// ✅ ПРАВИЛЬНО:
backgroundColor: colors.overlay
// ❌ НЕПРАВИЛЬНО:
backgroundColor: 'rgba(0,0,0,0.5)'

📊 Остаточный хардкод (ARCH-5, tech debt)
| Файл|Проблема|Статус|
| ---|---|---|
| ProgramCard.tsx|Уровни|✅ ЗАКРЫТО (LEVEL_COLORS)|
| ProgramProgressCard.tsx|color="white"|✅ ЗАКРЫТО (colors.textInverse)|
| ExerciseSettingsSheet.tsx|#4CAF50 / #FFC107 / #F44336|✅ ЗАКРЫТО (colors.success/warning/error)|
| ExercisePickerSheet.tsx|getGroupColor '#6B7280'|✅ ЗАКРЫТО (colors.textTertiary)|
| EquipmentIcon.tsx|#6B7280 fallback|✅ ЗАКРЫТО (colors.textTertiary)|
| Оверлеи шторок|rgba(0,0,0,0.5)|✅ ЗАКРЫТО (EquipmentSheet → colors.overlay)|
| badge.ts / button.ts / common.ts / dashboard.ts / history.tsx|Разное| не добавлять новый|

Правило: не добавлять новый хардкод, постепенно вычищать старый.

🎭 Иконки оборудования
Правильный API:
<EquipmentIcon
  name="barbell"           // ✅ проп name
  size={24}
  primaryMuscles={['chest']}
/>

Неправильный API:
<EquipmentIcon type="barbell" />  // ❌ пропа type НЕТ

Цвет иконки определяется по первой целевой мышце через getMuscleColor автоматически.
EQUIPMENT_SVG_MAP ↔ ICON_MAP синхронизированы (73 файла). Dev-time assert в EquipmentIcon.tsx проверяет рассинхрон.
Нормализация названий: EQUIPMENT_SVG_MAP_LOWER (toLowerCase + trim) в EquipmentIcon.tsx закрывает case-sensitivity из БД.

📐 Отступы и радиусы
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
// Отступы
padding: SPACING.xs   // 4
padding: SPACING.sm   // 8
padding: SPACING.md   // 16
padding: SPACING.lg   // 24
padding: SPACING.xl   // 32
padding: SPACING.xxl  // 48

// Радиусы
borderRadius: BORDER_RADIUS.sm    // 4
borderRadius: BORDER_RADIUS.md    // 8
borderRadius: BORDER_RADIUS.lg    // 12
borderRadius: BORDER_RADIUS.xl    // 16
borderRadius: BORDER_RADIUS.full  // 9999

 Фабрики стилей
// ✅ ПРАВИЛЬНО: useMemo на уровне экрана
const styles = useMemo(() => createCardStyles(colors), [colors]);
// ❌ НЕПРАВИЛЬНО: внутри renderItem
const renderItem = ({ item }) => {
  const styles = createCardStyles(colors);  // ← пересоздаётся на каждый элемент
  return <View style={styles.container} />;
};

Доступные фабрики:
createCardStyles(colors) — карточки (base/program/workout/exercise/filter/sheet/profile/empty/dynamic)
createDashboardStyles(colors) — Dashboard
createWorkoutStyles(colors) — тренировка

🎮 Reanimated + Gesture Handler (FEAT-7)
Подключать: при работе с анимациями и жестами.
Приоритет: 🎖 СРЕДНЕ — предотвращает конфликты жестов и strict mode ошибки.

Правила Reanimated v3
✅ Чтение .value SharedValue — ТОЛЬКО внутри useAnimatedStyle или worklet-функций
✅ Анимация на UI-потоке — useSharedValue + useAnimatedStyle (не вызывает ре-рендер JS)
✅ Коммит в React-стейт из worklet — через runOnJS
✅ Помечать worklet-функции строкой 'worklet'
❌ НЕ читать .value в JSX-рендерере (strict mode error)
❌ НЕ вызывать setState/Haptics напрямую из worklet — только через runOnJS

Правила Gesture Handler
✅ Разрешение конфликтов со ScrollView — simultaneousWithExternalGesture(Gesture.Native())
✅ Коммит в стейт — только onEnd (не onUpdate), чтобы не дёргать родителя на каждый пиксель
✅ Оптимизация: обновлять локальный стейт только при изменении целого значения (не на каждый тик)
❌ НЕ использовать Gesture.Pan() без simultaneousWithExternalGesture в ScrollView — блокирует скролл
❌ НЕ вызывать setState на onUpdate без троттлинга — фризы UI

Пример паттерна FEAT-7 (ползунок RPE):
const [local, setLocal] = useState<number>(rpe ?? 6);
const translateX = useSharedValue((rpe ?? 6) - 1);

const updateLocalIfNeeded = useCallback((value: number) => {
  setLocal((prev) => {
    const rounded = Math.round(value);
    if (prev !== rounded) return rounded;
    return prev;  // не обновляем, если значение не изменилось
  });
}, []);

const commitValue = useCallback((value: number) => {
  const v = Math.round(value);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  onChange({ rpe: v, rir: deriveRir(v), difficulty: deriveDifficulty(v) });
}, [onChange]);

const panGesture = Gesture.Pan()
  .simultaneousWithExternalGesture(Gesture.Native())  // ✅ разрешает скролл
  .onUpdate((event) => {
    'worklet';
    const clampedX = Math.max(0, Math.min(event.x, sliderWidth));
    translateX.value = clampedX / stepWidth;
    const value = Math.round(clampedX / stepWidth) + 1;
    runOnJS(updateLocalIfNeeded)(value);  // ✅ только при изменении целого
  })
  .onEnd(() => {
    'worklet';
    const snappedX = Math.round(translateX.value);
    translateX.value = withSpring(snappedX);
    const value = snappedX + 1;
    runOnJS(commitValue)(value);  // ✅ коммит только при отпускании
  });

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value * stepWidth }],  // ✅ .value только здесь
}));

🚨 Анти-паттерны
❌ Хардкод hex-цветов (#7c3aed, #4CAF50, rgba(...))
❌ color="white" — использовать colors.textInverse
❌ Проп type у EquipmentIcon — правильный проп name
❌ Фабрики стилей внутри renderItem — только useMemo на уровне экрана
❌ Новый хардкод сверх зафиксированного долга (ARCH-5)
❌ Дублирование маппингов (уровень→цвет, фаза→цвет) — использовать канонические константы
❌ Читать .value SharedValue в JSX-рендерере (Reanimated 3 strict mode)
❌ Gesture Handler без simultaneousWithExternalGesture в ScrollView
❌ setState на onUpdate без троттлинга — фризы UI

🩺 База симптомов (дополнения)
Reanimated / Gesture Handler
| Симптом|Причина|Решение|
| ---|---|---|
| [Worklets] Tried to synchronously call a non-worklet function|Чтение .value в JSX или вызов JS из worklet|Вынести в useAnimatedStyle, использовать runOnJS|
| Gesture Handler блокирует ScrollView|Конфликт жестов|simultaneousWithExternalGesture(Gesture.Native())|
| Reanimated strict mode warning|Чтение .value в рендере|Только useAnimatedStyle/worklet|
| Фризы при перетаскивании ползунка|setState на onUpdate без троттлинга|Обновлять только при изменении целого значения, коммит в onEnd|

Последнее обновление: 05.08.2026