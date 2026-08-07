# PROMPTS.md — рецепты, карты и команды

Срез: 06.08.2026 · Владелец темы: справочники и шаблоны
Правила — CLAUDE.md. Статусы — TASKS_STATUS.md. Файлы — FILE_INVENTORY.md.
Здесь нет правил и статусов: только то, что применяют «по месту».

## 1. Карта зависимостей (blast radius)

Подключать ПЕРЕД изменением файла. Изменение файла X → проверить всё в колонке «Потребители».

### Хуки

| Файл | Потребители |
|---|---|
| useProgramEditor.ts | program/[id].tsx, useProgramPhases.ts, PhaseCard.tsx, DayCard.tsx, programsService.ts |
| useProgramPhases.ts | useProgramEditor.ts |
| useWorkoutSession.ts | workout/[id].tsx, ExerciseCard.tsx, SetsGrid.tsx, SetFeedbackControl.tsx, WorkoutTimer.tsx |
| usePrograms.ts | programs.tsx, program/[id].tsx, useProgramEditor.ts, Dashboard |
| useWorkouts.ts | workouts.tsx |
| useDashboard.ts | Dashboard |
| useExercises.ts / useExerciseDetail.ts | exercises.tsx, exercise/[id].tsx |
| useInjuryWarnings.ts | useWarmup.ts, ExerciseCard.tsx, workout/[id].tsx |
| useWarmup.ts | WarmupBlock.tsx, workout/[id].tsx |
| useHistory.ts | history.tsx |
| useInjuries.ts | profile/injuries.tsx |
| useProfile.ts | profile.tsx, settings.tsx |
| useBodyMetrics.ts | metrics.tsx |
| useTimerSettings.ts | RestTimer.tsx, settings.tsx |
| useUnitPreferences.ts | UnitToggle.tsx, ExerciseCard.tsx, SetsGrid.tsx |
| useTheme.tsx | ВСЕ UI-компоненты |
| useToast.ts | ВСЕ экраны (канон) |

### Сервисы

| Файл | Потребители |
|---|---|
| programsService.ts | usePrograms.ts, programs.tsx, program/[id].tsx, useProgramEditor.ts, workouts.tsx, Dashboard |
| programSharingService.ts | ShareProgramSheet (program/[id]), ImportProgramSheet (programs.tsx) |
| workoutService.ts | workout/create.tsx |
| workoutsService.ts | workouts.tsx, useWorkouts.ts |
| dashboardService.ts | Dashboard, useDashboard.ts |
| historyService.ts | useHistory.ts, history.tsx, history/[id].tsx |
| profileService.ts | profile.tsx, settings.tsx, useProfile.ts, injuries.tsx |
| authService.ts | app/_layout.tsx, login.tsx, reset-password.tsx, update-password.tsx, settings.tsx |
| exercisesService.ts | exercises.tsx, exercise/[id].tsx, useExercises.ts |
| goalsService.ts / metricsService.ts | goals.tsx, metrics.tsx |
| warmupService.ts | useWarmup.ts |
| readinessService.ts | ReadinessSheet, Dashboard |
| painService.ts | PainSheet, ExerciseCard |

### Константы и типы

| Файл | Потребители |
|---|---|
| theme.ts / useTheme.tsx | ВСЕ UI-компоненты |
| semanticColors.ts | ProgramCard, ProgramProgressCard, phaseTypes, всё с цветами уровней |
| phaseTypes.ts | ProgramProgressCard, workouts.tsx, program/[id].tsx, workout/[id].tsx |
| muscleColors.ts | MuscleBubbles, EquipmentBubbles, EquipmentIcon |
| equipmentIcons.ts | EquipmentIcon (ICON_MAP, 73 файла) |
| injuries.ts | useInjuryWarnings, useWarmup, ExerciseCard |
| database.types.ts | ВСЕ сервисы и typed-запросы |
| types/workout.ts | ExerciseCard, ExerciseSlider, SetsGrid, SetFeedbackControl, useWorkoutSession |
| utils/rpe.ts | SetsGrid, SetFeedbackControl |

## 2. Инвентарь RPC

| Функция | Security | Назначение |
|---|---|---|
| copy_program_for_user | DEFINER + auth.uid() | копирование программы |
| create_workouts_for_program | DEFINER + auth.uid() | upfront-создание тренировок |
| sync_program_changes_to_workouts | DEFINER + проверка владельца | синхронизация правок (FIT-2) |
| generate_share_code | DEFINER + проверка владельца | код шаринга |
| search_exercises | DEFINER, STABLE | нечёткий поиск (pg_trgm) |
| get_exercise_filter_counts | INVOKER, STABLE | счётчики фильтров (PERF-2) |
| save_program_snapshot | DEFINER + auth.uid() | атомарное сохранение программы (PERF-4/6) |
| upsert_workout_logs(p_workout_exercise_id uuid, p_logs jsonb) | DEFINER + auth.uid() | атомарный upsert логов; персистит set_number, weight_kg, reps, completed_at, rpe, rir, difficulty |
| update_day_position / update_exercise_position | INVOKER + search_path | drag & drop |
| handle_new_user | DEFINER | триггер создания профиля |

## 3. Шаблоны RPC

Обходит RLS (модифицирующие, агрегации):

CREATE OR REPLACE FUNCTION my_rpc(p_user_id uuid, ...)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  -- бизнес-логика
END; $$;

Подчиняется RLS (read-only, позиции):

CREATE OR REPLACE FUNCTION update_position(...)
RETURNS void LANGUAGE plpgsql
SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  -- бизнес-логика, RLS применится автоматически
END; $$;

Вызов из клиента: типизированный supabase.rpc('my_rpc', { p_user_id, p_program_id }); если RPC ещё нет в database.types.ts — строковый вызов.

## 4. Регенерация типов

Legacy-ключи отключены (SEC-1): --project-id и --linked падают. Прямой хост db.<ref>.supabase.co не резолвится — только pooler.

$env:PG = "postgresql://postgres.[ref]:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
npx supabase gen types typescript --db-url $env:PG --schema public | Out-File -FilePath src/types/database.types.ts -Encoding utf8
$env:PG = $null

Пароль: Dashboard → Connect → Session/Direct pooler; pooler-строку брать дословно; в чат/git не светить.
Проверка после: UTF-8 без BOM, новая RPC в секции Functions, tsc --noEmit чист.

## 5. Значения токенов

| Токен | Значение |
|---|---|
| SPACING xs | 4 |
| SPACING sm | 8 |
| SPACING md | 16 |
| SPACING lg | 24 |
| SPACING xl | 32 |
| SPACING xxl | 48 |
| BORDER_RADIUS sm | 4 |
| BORDER_RADIUS md | 8 |
| BORDER_RADIUS lg | 12 |
| BORDER_RADIUS xl | 16 |
| BORDER_RADIUS full | 9999 |

Фабрики: createCardStyles(colors) (base/program/workout/exercise/filter/sheet/profile/empty/dynamic), createDashboardStyles(colors), createWorkoutStyles(colors) — вызывать через useMemo на уровне экрана.

## 6. Паттерн «жест + Reanimated» (референс)

const panGesture = Gesture.Pan()
  .simultaneousWithExternalGesture(Gesture.Native())
  .onUpdate((e) => {
    'worklet';
    const clampedX = Math.max(0, Math.min(e.x, sliderWidth));
    translateX.value = clampedX / stepWidth;
    runOnJS(updateLocalIfNeeded)(Math.round(clampedX / stepWidth) + 1);
  })
  .onEnd(() => {
    'worklet';
    const snappedX = Math.round(translateX.value);
    translateX.value = withSpring(snappedX);
    runOnJS(commitValue)(snappedX + 1);
  });

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value * stepWidth }],
}));

Примечание: в проекте RPE-шкала переведена на тапабельный вариант (FEAT-7 v2); паттерн оставлен как референс для новых жестов.

## 7. База симптомов

### Postgres / Supabase

| Симптом | Причина | Решение |
|---|---|---|
| 42703 | колонки нет | проверить схему; не добавлять description в exercises, email в profiles |
| 23505 | unique violation | ON CONFLICT; в ensureProfile — игнорировать |
| .single() бросает на 0 строк | пустая выборка | .maybeSingle() + guard |
| RLS policy violation | нет политики / чужой auth.uid() | проверить pg_policies, использовать ALL-политики |
| Promise.all не прерывается на ошибке | supabase-js резолвит с {error} | RPC с транзакцией |
| ENOTFOUND db.<ref>.supabase.co | новый стек | pooler-хост |
| «Legacy API keys are disabled» | SEC-1 | --db-url + Out-File -Encoding utf8 |
| ошибка типа в supabase.rpc<'name'> | types рассинхронизированы | строковый вызов |
| файл в UTF-16 с BOM | PowerShell > без кодировки | Out-File -Encoding utf8 |

### React Native / Expo / Reanimated

| Симптом | Причина | Решение |
|---|---|---|
| Nested VirtualizedList warning | ScrollView + FlatList | scrollEnabled={false} или ListHeaderComponent |
| LayoutAnimation no-op | New Architecture | Reanimated v3 |
| ширина не меняется в Split View | Dimensions.get('window') | useWindowDimensions() |
| краш = потеря тренировки | локальный updateSet | debounce + RPC upsert_workout_logs |
| «Tried to synchronously call a non-worklet function» | .value в JSX или JS-вызов из worklet | useAnimatedStyle, runOnJS |
| жест блокирует ScrollView | конфликт жестов | simultaneousWithExternalGesture(Gesture.Native()) |
| фризы при drag | setState на каждый тик | обновлять при смене целого, коммит в onEnd |