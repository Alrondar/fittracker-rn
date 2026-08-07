# FILE_INVENTORY.md — инвентарь файлов

Срез: 06.08.2026 · Владелец темы: файлы и их текущий долг
Статусы задач → TASKS_STATUS.md (здесь только ID-ссылки). Карта зависимостей → PROMPTS.md.
Колонка «Долг» пустая = долгов нет.

## app/

| Файл | Назначение | Долг / ID |
|---|---|---|
| _layout.tsx | QueryClient вне компонента, провайдеры, auth-гейт, onAuthStateChange, deep links | ARCH-2, SEC-8 |
| (auth)/_layout.tsx | Stack headerShown: false | |
| (auth)/login.tsx | вход/регистрация | |
| (auth)/reset-password.tsx | запрос письма сброса | SEC-8 |
| (auth)/update-password.tsx | смена пароля по recovery | |
| (tabs)/_layout.tsx | таб-бар | |
| (tabs)/index.tsx | Dashboard | FEAT-1.3 (StreakCard), FEAT-1.8 (ReadinessSheet + requireReadiness) |
| (tabs)/exercises.tsx | справочник (infinite scroll) | |
| (tabs)/history.tsx | история тренировок | SEC-10; градиенты на цветах темы |
| (tabs)/history/[id].tsx | детали тренировки | SEC-10 (через historyService.getWorkoutDetail) |
| (tabs)/programs.tsx | список программ + активация + импорт по коду | FIT-1 |
| (tabs)/workouts.tsx | тренировки по фазам/неделям + «Следующая» | FIT-5 |
| (tabs)/profile.tsx | профиль | |
| (tabs)/profile/goals.tsx | цели/макросы | SCALE-5 (goals constants, macroCalculator, GoalsComponents, GoalsStep1-3) |
| (tabs)/profile/injuries.tsx | травмы | SEC-10 (useInjuries) |
| (tabs)/profile/metrics.tsx | замеры тела | ✅ | FEAT-2.2: тренд веса, графики замеров с тумблерами (AsyncStorage), форма по группам Тело/Руки/Ноги |
| (tabs)/exercise/[id].tsx | детальное упражнение | |
| (tabs)/program/[id].tsx | редактор программы + шаринг | SCALE-5 (ProgramHero, ProgramFabs, ProgramDetailModals) |
| (tabs)/workout/[id].tsx | сессия тренировки | UX-1, FEAT-1.9, PERF-7 |
| (tabs)/workout/create.tsx | создание тренировки (programId/repeatId) | |

## src/components/

| Файл | Назначение | Долг / ID |
|---|---|---|
| ui/AppButton, AppCard, AppBadge, AppInput | атомарный UI-кит | |
| ui/SheetShell | каноническая шторка (colors.overlay) | ARCH-1; потребители: DaySettingsSheet, ExerciseSettingsSheet, ScheduleEditorSheet, PhaseSettingsSheet, PainSheet, ReadinessSheet |
| SectionHeader / FadeIn / Skeleton / Toast | общие | ARCH-2, ARCH-4 |
| ProgramCard.tsx | карточка программы | ARCH-3 (LEVEL_COLORS), memo |
| ProgramFormSheet.tsx | создание/редактирование программы | ARCH-3, KAV, colors.overlay |
| ProgramProgressCard.tsx | активная программа на Dashboard | ARCH-5 (textInverse) |
| dashboard/StreakCard.tsx | стрик (🔥 текущий + 🏆 рекорд) | FEAT-1.3 |
| ActivityCalendar / WeeklyStatsCard / ExerciseProgressCard / PersonalRecordsCard / LastWorkoutCard | виджеты Dashboard | PersonalRecordsCard — FEAT-1.4 (строка «1RM ≈ N кг», дата только при непустой recordDate) |
| program/DayCard.tsx | карточка дня (DraggableFlatList scrollEnabled=false) + баблы мышц | SEC-3 |
| program/PhaseCard.tsx | карточка фазы | |
| program/ProgramHero.tsx | hero-секция программы | SCALE-5 |
| program/ProgramFabs.tsx | FAB «Поделиться» + FAB редактирования | SCALE-5; shadowColor → colors.shadow |
| program/ProgramDetailModals.tsx | 6 модалок программы | SCALE-5 |
| program/sheets/PhaseSettingsSheet.tsx | настройки фазы | ARCH-1 |
| program/sheets/DaySettingsSheet.tsx | настройки дня | ARCH-1, KAV |
| program/sheets/ExerciseSettingsSheet.tsx | настройки упражнения | ARCH-1, ARCH-5, KAV |
| program/sheets/ScheduleEditorSheet.tsx | редактор расписания | ARCH-1 |
| program/sheets/ExercisePickerSheet.tsx | пикер упражнений (useExercises) | ARCH-1 (кастомный оверлей — сортировка), ARCH-5, KAV |
| program/sheets/ImportProgramSheet.tsx | импорт программы | ARCH-5 |
| program/sheets/ShareProgramSheet.tsx | шаринг программы | ARCH-5 |
| workout/ExerciseCard.tsx | карточка упражнения | FEAT-1.9 (HeartPulse, только isMain), PERF-7 |
| workout/ExerciseSlider.tsx | слайдер «основная + альтернативы» | PERF-7 (removeClippedSubviews, stagger 500 мс + index×100 мс, ленивый монтаж через InteractionManager), FEAT-1.9 (onOpenPain) |
| workout/SetsGrid.tsx | сетка подходов + чипы RPE + прогрессия | ✅ | FEAT-7, FEAT-1.1 v2 (чипы по единицам кг/lb), FEAT-1.2 (ручная кнопка «Отдых N с» — фолбэк автостарта), SCALE-5 |
| workout/SetFeedbackControl.tsx | SetFeedbackChip + SetFeedbackEditor (тапабельная шкала 1–10) | FEAT-7 v2 |
| workout/RestTimer.tsx | таймер отдыха (круговой SVG + Pill + пресеты) | FEAT-1.2 v2 |
| workout/WorkoutTimer / WorkoutTabs / UnitToggle / ExerciseInfoAccordion / MuscleBubbles / EquipmentBubbles / TechniqueMediaSlider / WarmupBlock / WarmupExerciseCard / ExerciseSettingsModal | компоненты тренировки | SCALE-5 (WarmupExerciseCard вынесен) |
| workout/PainSheet.tsx | шторка боли: уровень 0–3 / тип / часть тела / тумблеры / заметка | FEAT-1.9 |
| dashboard/ReadinessSheet.tsx | чек-ин состояния (сон/усталость/боль/стресс → readiness) | FEAT-1.8 |
| exercises/CategoryStrip / EquipmentSheet | фильтры справочника | ARCH-5 (colors.overlay) |
| EquipmentIcon.tsx | иконка оборудования | ARCH-5, ARCH-9 (73 файла, dev-assert, EQUIPMENT_SVG_MAP_LOWER) |
| goals/GoalsComponents.tsx | StepDots/CheckMark/GenderCard/SelectableRow/MacroCard | SCALE-5 |
| goals/GoalsStep1-3.tsx | шаги «О тебе» / «Твоя цель» + фармакология / «Твоя норма» | SCALE-5 |
| components/profile/WeightTrendChart.tsx | SVG-график: пунктир сырых замеров + сглаженная линия + точка последнего замера; нейтральный цвет (оценка «хорошо/плохо» — после FEAT-2.3, когда известна цель) | ✅ | FEAT-2.2 |
| components/profile/MetricSparkline.tsx | спарклайн замера в своём масштабе | ✅ | FEAT-2.2 |



## src/hooks/

| Файл | Назначение | Долг / ID |
|---|---|---|
| useDashboard.ts | Dashboard (['dashboard', userId]) | |
| usePrograms.ts | список программ (useInfiniteQuery) + мутации | FIT-3 (инвалидация dashboard/workouts) |
| useProgramEditor.ts | редактор программы (CRUD, drag&drop, фазы) + syncProgramChanges | SCALE-5, ARCH-6 |
| useProgramPhases.ts | фазовая логика редактора | SCALE-5 |
| useWorkouts.ts | тренировки (React Query) | |
| useWorkoutSession.ts | сессия тренировки | SEC-2, SEC-6, SEC-7, FEAT-1.1 v2 (пер-сет previous*), PERF-7 |
| useHistory.ts | история (React Query) | SEC-10 |
| useInjuries.ts | травмы пользователя | SEC-10 |
| useExercises.ts / useExerciseDetail.ts | справочник / деталь (staleTime: Infinity) | |
| useInjuryWarnings.ts | avoid/caution (memo по warningKey) | ARCH-8 |
| useWarmup.ts | авторазминка с учётом травм | |
| useProfile.ts / useBodyMetrics.ts | профиль / замеры | |
| useTimerSettings.ts | настройки таймера (AsyncStorage) | FEAT-1.2 (autoStartRest) |
| useUnitPreferences.ts | кг/фунты | |
| useTheme.tsx | тема | |
| useToast.ts | toast (канон) | ARCH-2 |

## src/services/

| Файл | Назначение | Долг / ID |
|---|---|---|
| authService.ts | единый слой Supabase Auth | SEC-5, SEC-8 |
| programsService.ts | CRUD + активация + syncProgramChanges + getWorkoutProgramInfo + getActiveProgram | PERF-1, PERF-4, PERF-6, ARCH-6, FIT-1…3 |
| programSharingService.ts | generateShareCode / importProgramByCode / formatShareCode | |
| workoutService.ts | startProgramWorkout / repeatWorkout | |
| workoutsService.ts | getWorkoutsData (секции по фазам/неделям + прогресс) | FIT-5 |
| historyService.ts | агрегация истории + getWorkoutDetail | SEC-10, ARCH-6 |
| dashboardService.ts | агрегации Dashboard | FEAT-1.3 (streak), FEAT-1.4 (personalRecords.e1rm) |
| exercisesService.ts | список/словари/по ID | PERF-2, ARCH-6 |
| profileService.ts | профиль, КБЖУ, травмы, личные рекорды | FEAT-1.4 |
| goalsService.ts / metricsService.ts | цели (upsert) / замеры тела | |
| warmupService.ts | генерация разминки | PERF-3, ARCH-6, ARCH-8 |
| readinessService.ts | getToday / upsertToday (daily_readiness) | FEAT-1.8 |
| painService.ts | logPainEvent (pain_events) + addCautionInjury (user_injuries, injury_type 'pain') | FEAT-1.9 |

## src/constants, styles, types, lib, utils, store

| Файл | Назначение | Долг / ID |
|---|---|---|
| constants/semanticColors.ts | LEVEL/MACRO/SEVERITY/BODY_PART/PHARMA/BODY_ZONE | ARCH-3 (канон уровней) |
| constants/phaseTypes.ts | типы фаз + getPhaseMeta/getPhaseColor | |
| constants/theme.ts | 5 акцентов × 2 режима, SPACING, BORDER_RADIUS, GRADIENTS | PERF-5 (portrait-only — осознанно) |
| constants/muscleColors.ts / muscleGroups.ts | цвета/группы мышц | |
| constants/equipmentIcons.ts | EQUIPMENT_SVG_MAP | ARCH-9 |
| constants/injuries.ts | BODY_PARTS/INJURY_TYPES + computeExerciseWarnings | ARCH-8 |
| constants/goals.ts | GOALS/GENDERS/ACTIVITY_LEVELS/PHARMA_TYPES | SCALE-5 |
| styles/index.ts | createCardStyles (агрегатор) | |
| styles/base|program|workout|exercise|filter|sheet|profile|empty.ts | фабрики по доменам | ARCH-5 (остаточный хардкод — не добавлять новый) |
| styles/dynamic.ts | динамические генераторы (баблы/обводки) | |
| types/database.types.ts | типы Supabase | синхронизирован (UTF-8, содержит sync_program_changes_to_workouts, upsert_workout_logs) |
| types/workout.ts | ExerciseData, AlternativeExercise, SetData, Difficulty, SetFeedbackPatch | ARCH-7 (единственный источник), FEAT-1.1 (previousWeight/Reps/Rpe) |
| utils/trend.ts | buildWeightTrend + buildTrend (generic) | ✅ | FEAT-2.2, кандидат SCALE-1 |
| lib/config.ts | единый источник конфигов (Constants.expoConfig.extra) | SCALE-4 |
| lib/supabase.ts | клиент + хелперы (getList/getString) | SCALE-4 |
| lib/timerSounds.ts | WAV-бипы (expo-audio) | |
| utils/errorMapper.ts | mapError / extractMessage | SEC-9, кандидат SCALE-1 |
| utils/macroCalculator.ts | calculateAge / calculateMacros | SCALE-5, кандидат SCALE-1 |
| utils/rpe.ts | RPE_DESCRIPTIONS, rpeZone, deriveRir, deriveDifficulty, DIFFICULTY_LABELS | FEAT-7, кандидат SCALE-1 |
| utils/streak.ts | computeStreaks (current/best/activeThisWeek) | FEAT-1.3, кандидат SCALE-1 |
| utils/e1rm.ts | epley / bestE1rm / roundE1rm | FEAT-1.4, кандидат SCALE-1 |
| utils/plates.ts | жадный расчёт блинов по сторонам | FEAT-1.5 (UI нет) |
| utils/csv.ts | билдер CSV | FEAT-1.6 (сервис и UI нет) |
| utils/trend.ts | buildWeightTrend / movingAverage / linearSlopePerWeek | ✅ | FEAT-2.2, кандидат SCALE-1 |
| store/useStore.ts | глобальный UI-стейт (auth) | SEC-10 (серверные срезы убраны) |

## supabase/ и корень

| Файл | Назначение |
|---|---|
| migrations/cleanup_duplicate_policies.sql | RLS 34 → 12 (RPC-2) |
| migrations/rpc_add_security_invoker.sql | RPC-1 |
| migrations/*sync_program_changes_to_workouts* | RPC синхронизации правок (FIT-2) |
| .env / .env.example | секреты вне git / шаблон (SEC-1) |
| AGENTS.md | точка входа для агента |
| CLAUDE.md | правила разработки |
| PROMPTS.md | рецепты и справочники |
| TASKS_STATUS.md | статусы задач |
| FILE_INVENTORY.md | этот файл |
| ROADMAP.md | план этапов |
| refactoring_guide.md | архив аудита, заморожен 04.08.2026 |

Удалённые файлы (SCALE-3, ARCH-4, ARCH-7): hooks/useActiveProgram.ts, components/ui/AnimatedButton, SwipeableCard, BottomSheet.tsx, types/index.ts, Frame*.svg.