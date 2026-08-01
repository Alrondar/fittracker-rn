FILE_INVENTORY.md — Инвентарь файлов проекта с назначением

Срез: 31.07.2026. «Инспект.» = файл инспектировался в этой сессии (статус достоверен);
«структ.» = известно по структуре CLAUDE.md, содержимое в этой сессии не читалось.

## app/ — экраны (Expo Router)

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| _layout.tsx | корневой layout: QueryClient, провайдеры, auth-гейт, onAuthStateChange | структ. | |
| (auth)/_layout.tsx | Stack headerShown:false | структ. | |
| (auth)/login.tsx | вход/регистрация | структ. | |
| (auth)/reset-password.tsx | запрос письма сброса | структ. | |
| (auth)/update-password.tsx | смена пароля по recovery | структ. | |
| (tabs)/_layout.tsx | таб-бар layout | структ. | |
| (tabs)/index.tsx | Dashboard (useDashboard) + плейсхолдер «нет активной программы» (FIT-4) | ✅ | |
| (tabs)/exercises.tsx | справочник упражнений (infinite scroll) | структ. | |
| (tabs)/history.tsx | история тренировок | структ. | tech debt: supabase в UI? (SEC-10) |
| (tabs)/programs.tsx | список программ + активация + импорт по коду (FIT-1) | ✅ | statusMap/activeProgramId/сортировка |
| (tabs)/workouts.tsx | тренировки по фазам/неделям + «Следующая» (FIT-5) | ✅ | useWorkouts + workoutsService |
| (tabs)/profile.tsx | профиль | структ. | |
| (tabs)/exercise/[id].tsx | детальный экран упражнения | структ. | |
| (tabs)/history/[id].tsx | детали истории | структ. | tech debt: supabase.from в UI (SEC-10) |
| (tabs)/profile/goals.tsx | цели/макросы | структ. | SCALE-5 кандидат (>500 строк) |
| (tabs)/profile/injuries.tsx | травмы | структ. | tech debt (SEC-10) |
| (tabs)/profile/metrics.tsx | замеры тела | структ. | |
| (tabs)/profile/settings.tsx | настройки (тема/профиль/таймер) | ✅ | SEC-10 ✅ (profileService + sendPasswordReset) |
| (tabs)/program/[id].tsx | редактор программы + шаринг | структ. | SCALE-5 кандидат |
| (tabs)/workout/[id].tsx | сессия тренировки + шапка программы (FIT-6) | ✅ | getWorkoutProgramInfo |
| (tabs)/workout/create.tsx | создание тренировки (programId/repeatId) | ✅ | |

## src/components/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| ui/AppButton, AppCard, AppBadge, AppInput | атомарный UI-кит | ✅(Card/Badge) | |
| ui/SheetShell | каноническая шторка (colors.overlay) | структ. | ARCH-1: 1 потребитель |
| ProgramCard.tsx | карточка программы (бейдж «Текущая», «Активировать») | ✅ | ARCH-3 ✅ (LEVEL_COLORS), memo |
| ProgramFormSheet.tsx | модалка создания/редактирования программы | структ. | ARCH-3 (хардкод уровней?) |
| ProgramProgressCard.tsx | виджет активной программы на Dashboard | структ. | ARCH-5: color="white" |
| ActivityCalendar / WeeklyStatsCard / ExerciseProgressCard / PersonalRecordsCard / LastWorkoutCard | виджеты Dashboard | структ. | |
| SectionHeader / FadeIn / Skeleton / Toast | общие | структ. | ARCH-4 (FadeIn=Animated), ARCH-2 (Toast) |
| program/PhaseCard.tsx | карточка фазы (DraggableFlatList scrollEnabled=false) | ✅ | |
| program/DayCard.tsx | карточка дня (DraggableFlatList scrollEnabled=false) + баблы мышц | ✅ | SEC-3 ✅ |
| program/sheets/PhaseSettingsSheet.tsx | настройки фазы (на SheetShell) | ✅ | |
| program/sheets/DaySettingsSheet.tsx | настройки дня (свой оверлей, без затемнения) | ✅ | ARCH-1 |
| program/sheets/ExerciseSettingsSheet.tsx | настройки упражнения (свой оверлей) | ✅ | ARCH-1 + ARCH-5 (#4CAF50/#FFC107/#F44336) |
| program/sheets/ExercisePickerSheet.tsx | пикер упражнения (хардкод rgba) | ✅ | ARCH-1 |
| program/sheets/ImportProgramSheet.tsx | импорт по коду (хардкод rgba) | ✅ | ARCH-1 |
| program/sheets/ShareProgramSheet.tsx | шаринг кода (хардкод rgba) | ✅ | ARCH-1 |
| workout/ExerciseSlider / ExerciseCard / ExerciseInfoAccordion / MuscleBubbles / EquipmentBubbles / TechniqueMediaSlider / WarmupBlock / RestTimer / WorkoutTimer / WorkoutTabs / UnitToggle / ExerciseSettingsModal | компоненты тренировки | структ. | SCALE-5 (ExerciseCard/WarmupBlock) |
| exercises/CategoryStrip / EquipmentSheet | фильтры справочника | ✅(частично) | EquipmentSheet — хардкод rgba (ARCH-1) |
| EquipmentIcon.tsx | иконка оборудования | структ. | ARCH-5 (#6B7280?), рассинхрон ICON_MAP (ref-guide 2.F) |

## src/hooks/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| useDashboard.ts | Dashboard (React Query ['dashboard',userId]) | структ. | |
| usePrograms.ts | список программ (useInfiniteQuery) + мутации | ✅ | deleteMutation(id,userId!) + invalidate dashboard/workouts |
| useProgramEditor.ts | редактор программы (CRUD/drag&drop/фазы) + syncProgramChanges в save | ✅ | SCALE-5 ✅ разбит |
| useProgramPhases.ts | фазовая логика редактора (вынесена) | ✅(импорт) | SCALE-5 |
| useActiveProgram.ts | хук активной программы | ✅ | SCALE-3: МЁРТВЫЙ (не импортируется; programs.tsx использует getUserProgramsStatus напрямую) — кандидат на удаление |
| useWorkouts.ts | тренировки (React Query) | ✅(импорт) | |
| useWorkoutSession.ts|сессия тренировки (SEC-2 ✅, SEC-6 ✅, SEC-7 ✅)|✅|debounce-автосохранение (500мс) + RPC upsert_workout_logs + flush при размонтировании|| useExercises.ts | справочник (useInfiniteQuery, debounce, фильтры) | структ. | |
| useExerciseDetail.ts | детальное упражнение (staleTime Infinity) | структ. | |
| useInjuryWarnings.ts | avoid/caution (React Query + memo по warningKey) | ✅ | |
| useWarmup.ts | авторазминка с учётом травм | структ. | PERF-3 |
| useProfile.ts | профиль (profileService) | ✅ | |
| useTimerSettings.ts | настройки таймера (AsyncStorage) | структ. | |
| useUnitPreferences.ts | единицы веса кг/фунты | ✅(импорт) | |
| useTheme.tsx | тема | структ. | |
| useToast.ts | toast (канонический) | структ. | ARCH-2 |
| useBodyMetrics.ts | замеры | структ. | |

## src/services/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| authService.ts | Supabase Auth единый слой | структ. | |
| programsService.ts | CRUD программ + активация + syncProgramChanges + getWorkoutProgramInfo + getActiveProgram | ✅ | activateProgram(+reset), getUserProgramsStatus, deactivateAllPrograms, getActiveProgramId |
| programSharingService.ts | generateShareCode / importProgramByCode / formatShareCode | ✅ | |
| workoutService.ts | startProgramWorkout / repeatWorkout | ✅ | |
| workoutsService.ts | getWorkoutsData (секции по фазам/неделям + прогресс) | ✅ | |
| dashboardService.ts | агрегация Dashboard (Promise.allSettled) | ✅ | PR-bias + формула калорий *300 (ref-guide 2.C) |
| profileService.ts | профиль/стат/КБЖУ/PR/травмы (объект + standalone getActiveInjuries/getInjuryWarningRules) | ✅ | |
| exercisesService.ts | упражнения: список/словари/по ID | структ. | PERF-2 |
| goalsService.ts | цели (upsert) | структ. | |
| metricsService.ts | замеры тела | структ. | |
| warmupService.ts | генерация разминки | структ. | PERF-3 |

## src/constants/

| Файл | Назначение | Инспект. | Примечание |
|---|---|---|---|
| semanticColors.ts | LEVEL/MACRO/SEVERITY/BODY_PART/PHARMA/BODY_ZONE цвета | ✅ | канон уровней |
| phaseTypes.ts | типы фаз + getPhaseMeta/getPhaseColor | ✅ | |
| theme.ts | 5 акцентов × 2 режима, SPACING, BORDER_RADIUS, GRADIENTS | структ. | PERF-5 |
| muscleColors.ts / muscleGroups.ts | цвета/группы мышц | ✅(частично) | |
| equipmentIcons.ts | EQUIPMENT_SVG_MAP | структ. | рассинхрон с ICON_MAP (ref-guide 2.F) |
| exerciseCategories.ts | категории упражнений | структ. | |
| injuries.ts | BODY_PARTS/INJURY_TYPES + computeExerciseWarnings | ✅(импорт) | ARCH-8 |

## src/styles/components/card/

| Файл | Назначение | Инспект. |
|---|---|---|
| index.ts | createCardStyles (агрегатор) | ✅ |
| base/program/workout/exercise/filter/sheet/profile/empty.ts | фабрики стилей по доменам | ✅ |
| dynamic.ts | динамические генераторы (баблы/обводки) | ✅ |

## src/types/

| Файл|Назначение|Инспект.|Примечание|
| ---|---|---|---|
| database.types.ts|типы Supabase (Tables/Functions/Enums)|✅|синхронизирован с БД (UTF-8, содержит sync_program_changes_to_workouts и upsert_workout_logs)|
| workout.ts|ExerciseData/AlternativeExercise/SetData|✅(импорт)| |
| metrics.ts|замеры|структ.| |

## src/lib/

| Файл | Назначение | Инспект. | Примечание |
|---|---|---|---|
| supabase.ts | клиент + хелперы | структ. | SCALE-4 (хардкод ключа) |
| timerSounds.ts | WAV-бипы (expo-audio) | структ. | |

## supabase/ + корень

| Файл | Назначение | Инспект. |
|---|---|---|
| cleanup_duplicate_policies.sql | RLS 34→12 (RPC-2) | структ. |
| rpc_add_security_invoker.sql | RPC-1 | структ. |
| миграция sync_program_changes_to_workouts | RPC синхронизации правок (FIT-2) | ✅(применена в SQL Editor) |
| .env / .env.example | секреты вне git / шаблон | структ. |
| CLAUDE.md / refactoring_guide.md | инструкции AI / аудит | ✅ |