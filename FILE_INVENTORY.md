FILE_INVENTORY.md — Инвентарь файлов проекта с назначением

Срез: 04.08.2026. «Инспект.» = файл инспектировался в этой сессии (статус достоверен);
«структ.» = известно по структуре CLAUDE.md, содержимое в этой сессии не читалось.

## app/ — экраны (Expo Router)

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| _layout.tsx | корневой layout: QueryClient, провайдеры, auth-гейт, onAuthStateChange | структ. | |
| (auth)/_layout.tsx | Stack headerShown:false | структ. | |
| (auth)/login.tsx | вход/регистрация | структ. | |
| (auth)/reset-password.tsx|запрос письма сброса|✅|SEC-8 ✅ (redirectTo fittracker://reset-password)|
| (auth)/update-password.tsx | смена пароля по recovery | структ. | |
| (tabs)/_layout.tsx | таб-бар layout | структ. | |
| (tabs)/index.tsx | Dashboard | ✅ | FEAT-1.3 (StreakCard); FEAT-1.8 (ReadinessSheet + requireReadiness) |
| (tabs)/exercises.tsx | справочник упражнений (infinite scroll) | структ. | |
| (tabs)/history.tsx | история тренировок | ✅|SEC-10 ✅ (useHistory + historyService); градиенты на цветах темы|
| (tabs)/programs.tsx | список программ + активация + импорт по коду (FIT-1) | ✅ | statusMap/activeProgramId/сортировка |
| (tabs)/workouts.tsx | тренировки по фазам/неделям + «Следующая» (FIT-5) | ✅ | useWorkouts + workoutsService |
| (tabs)/profile.tsx | профиль | структ. | |
| (tabs)/exercise/[id].tsx | детальный экран упражнения | структ. | |
| (tabs)/history/[id].tsx | детали истории | структ. | ✅ |SEC-10 ✅ (historyService.getWorkoutDetail)|
| (tabs)/profile/goals.tsx|цели/макросы|✅|SCALE-5 ✅ (вынесены goals constants/macroCalculator/GoalsComponents/GoalsStep1-3)|
| (tabs)/profile/injuries.tsx | травмы | ✅ |SEC-10 ✅ (useInjuries хук)|
| (tabs)/profile/metrics.tsx | замеры тела | структ. | |
| (tabs)/profile/settings.tsx | настройки (тема/профиль/таймер) | ✅ | SEC-10 ✅ (profileService + sendPasswordReset) |
| (tabs)/program/[id].tsx|редактор программы + шаринг|✅|SCALE-5 ✅ (вынесены ProgramHero/ProgramFabs/ProgramDetailModals)|
| (tabs)/workout/[id].tsx | сессия тренировки | ✅ | UX-1: UnitToggle в шапке; FEAT-1.9: painIndex + PainSheet |
| (tabs)/workout/create.tsx | создание тренировки (programId/repeatId) | ✅ | |

## src/components/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| ui/AppButton, AppCard, AppBadge, AppInput | атомарный UI-кит | ✅(Card/Badge) | |
| ui/SheetShell | каноническая шторка (colors.overlay) | структ. | ARCH-1: 1 потребитель |
| ProgramCard.tsx | карточка программы (бейдж «Текущая», «Активировать») | ✅ | ARCH-3 ✅ (LEVEL_COLORS), memo |
| ProgramFormSheet.tsx | модалка создания/редактирования программы | структ. |✅|ARCH-3 ✅ (LEVEL_COLORS), KAV ✅, colors.overlay ✅|
| ProgramProgressCard.tsx | виджет активной программы на Dashboard | ✅ | ARCH-5 ✅ (colors.textInverse) |
| ActivityCalendar / WeeklyStatsCard / ExerciseProgressCard / PersonalRecordsCard / LastWorkoutCard | виджеты Dashboard | структ. | |
| SectionHeader / FadeIn / Skeleton / Toast|общие|✅|ARCH-4 ✅ (FadeIn/Skeleton/Toast → Reanimated v3); ARCH-2 ✅ (ToastProvider удалён)|
| program/DayCard.tsx | карточка дня (DraggableFlatList scrollEnabled=false) + баблы мышц | ✅ | SEC-3 ✅ |
| program/sheets/PhaseSettingsSheet.tsx|настройки фазы (на SheetShell)|✅| |
| program/ProgramHero.tsx|hero-секция программы (градиент + бейджи + расписание)|✅|SCALE-5 (вынесено из program/[id].tsx)|
| program/ProgramFabs.tsx|FAB «Поделиться» + FAB редактирования|✅|SCALE-5 (вынесено из program/[id].tsx); shadowColor → colors.shadow|
| program/ProgramDetailModals.tsx|6 модалок программы (Phase/Exercise/Day/Picker/Schedule/Share)|✅|SCALE-5 (вынесено из program/[id].tsx)|
| ExercisePickerSheet.tsx|пикер упражнений (useExercises)|✅|ARCH-1: кастомный оверлей (сортировка); ARCH-5 ✅ (colors.overlay/textTertiary); KAV ✅|
| ExerciseSettingsSheet.tsx|настройки упражнения|✅|ARCH-1 ✅ (SheetShell); ARCH-5 ✅ (colors.success/warning/error); KAV ✅|
| DaySettingsSheet.tsx|настройки дня|✅|ARCH-1 ✅ (SheetShell); KAV ✅|
| ScheduleEditorSheet.tsx|редактор расписания|✅|ARCH-1 ✅ (SheetShell)|
| ImportProgramSheet.tsx|импорт программы|✅|ARCH-5 ✅ (colors.overlay)|
| ShareProgramSheet.tsx|поделиться программой|✅|ARCH-5 ✅ (colors.overlay)|
| workout/ExerciseSlider / ExerciseCard / ExerciseInfoAccordion / MuscleBubbles / EquipmentBubbles / TechniqueMediaSlider / WarmupBlock / WarmupExerciseCard / RestTimer / WorkoutTimer / WorkoutTabs / UnitToggle / ExerciseSettingsModal|компоненты тренировки|✅|ExerciseCard + WarmupBlock → ExerciseInfoAccordion; WarmupExerciseCard вынесен|
| ExerciseSlider.tsx | горизонтальный слайдер упражнения (основная + альтернативы) | ✅ | 05.08.2026 (PERF): removeClippedSubviews={true} + stagger-загрузка альтернатив (500мс + index*100мс); lazy-монтаж через InteractionManager FEAT-1.9: проброс onOpenPain |
| exercises/CategoryStrip / EquipmentSheet | фильтры справочника | ✅ | EquipmentSheet ARCH-5 ✅ (colors.overlay) |
| EquipmentIcon.tsx|иконка оборудования | ✅ | ARCH-5 ✅ (colors.textTertiary); ICON_MAP синхронизирован с EQUIPMENT_SVG_MAP (73 файла); dev-time assert; EQUIPMENT_SVG_MAP_LOWER | EQUIPMENT_SVG_MAP_LOWER|
| goals/GoalsComponents.tsx|вспомогательные компоненты (StepDots/CheckMark/GenderCard/SelectableRow/MacroCard)|✅|SCALE-5 (вынесено из goals.tsx)|
| goals/GoalsStep1.tsx|шаг «О тебе»|✅|SCALE-5|
| goals/GoalsStep2.tsx|шаг «Твоя цель» + фармакология|✅|SCALE-5|
| goals/GoalsStep3.tsx|шаг «Твоя норма»|✅|SCALE-5|
| SetsGrid.tsx | сетка подходов + чипы RPE + прогрессия (SCALE-5) | ✅ | FEAT-7 + FEAT-1.1 v2 (06.08.2026): хинт активного сета; чипы пер-сет и по единицам (кг +2.5…+20 / lb +5…+45) |
| SetFeedbackControl.tsx | SetFeedbackChip + SetFeedbackEditor (тапабельная шкала RPE 1–10) | ✅ | FEAT-7 v2 (05.08.2026): драг-ползунок → тапабельная шкала: дефолт 7, кнопка «Готово», закрыт рассинхрон меток (sliderWidth=280) и фризы драга; без Reanimated/GH |
| RestTimer.tsx | таймер отдыха (круговой SVG + Pill-режим + пресеты) | ✅ | v2 05.08.2026: Pill-режим, пресеты +30/+60, вибрация до сброса, sticky-оверлей в [id].tsx |
| components/dashboard/StreakCard.tsx | карточка стрика (🔥 текущий + 🏆 рекорд) | ✅ | FEAT-1.3 |
| ExerciseCard.tsx | карточка упражнения | ✅ | FEAT-1.9: кнопка «Боль» (HeartPulse, только isMain) |
| PersonalRecordsCard.tsx | виджет PR на Dashboard | ✅ | FEAT-1.4: строка «1RM ≈ N кг»; дата только при непустой recordDate |
| PainSheet.tsx | шторка боли (Modal + SheetShell): уровень 0–3 / тип / часть тела / тумблеры / заметка | ✅ | FEAT-1.9 |
| components/dashboard/StreakCard.tsx | карточка стрика (🔥 текущий + 🏆 рекорд) | ✅ | FEAT-1.3 |
| ReadinessSheet.tsx | чек-ин состояния (Modal + SheetShell): сон/усталость/боль/стресс, readiness = среднее инверсий | ✅ | FEAT-1.8 |



## src/hooks/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| useDashboard.ts | Dashboard (React Query ['dashboard',userId]) | структ. | |
| usePrograms.ts | список программ (useInfiniteQuery) + мутации | ✅ | deleteMutation(id,userId!) + invalidate dashboard/workouts |
| useProgramEditor.ts|редактор программы (CRUD/drag &drop/фазы) + syncProgramChanges в save|✅|SCALE-5 ✅ разбит; ARCH-6 ✅ (handleAddExerciseFromPicker типизирован)|
| useProgramPhases.ts | фазовая логика редактора (вынесена) | ✅(импорт) | SCALE-5 |
| useWorkouts.ts | тренировки (React Query) | ✅(импорт) | |
| useWorkoutSession.ts | сессия тренировки (SEC-2 ✅, SEC-6 ✅, SEC-7 ✅, FEAT-1.1 ✅) | ✅ | FEAT-1.1 v2 (06.08.2026): пер-сет маппинг previous* по set_number |
| useExerciseDetail.ts | детальное упражнение (staleTime Infinity) | структ. | |
| useInjuryWarnings.ts | avoid/caution (React Query + memo по warningKey) | ✅ | |
| useWarmup.ts|авторазминка с учётом травм|✅(импорт)|
| useProfile.ts | профиль (profileService) | ✅ | |
| useTimerSettings.ts|настройки таймера (AsyncStorage)|✅|FEAT-1.2: добавлено поле autoStartRest|
| useUnitPreferences.ts | единицы веса кг/фунты | ✅(импорт) | |
| useTheme.tsx | тема | структ. | |
| useToast.ts|toast (канонический)|✅|ARCH-2 ✅ (канон)|
| useBodyMetrics.ts | замеры | структ. | |

## src/services/

| Файл | Назначение | Инспект. | Примечание / долг |
|---|---|---|---|
| authService.ts | Supabase Auth единый слой | структ. | |
| historyService.ts|агрегация истории + getWorkoutDetail|✅|SEC-10 ✅; ARCH-6 ✅ (getHistory/getWorkoutDetail типизированы)|
| programsService.ts|CRUD программ + активация + syncProgramChanges + getWorkoutProgramInfo + getActiveProgram|✅|activateProgram(+reset), getUserProgramsStatus, deactivateAllPrograms, getActiveProgramId. PERF-1 ✅; ARCH-6 ✅ (мапперы типизированы локальными row-интерфейсами)|
| programSharingService.ts | generateShareCode / importProgramByCode / formatShareCode | ✅ | |
| workoutService.ts | startProgramWorkout / repeatWorkout | ✅ | |
| workoutsService.ts | getWorkoutsData (секции по фазам/неделям + прогресс) | ✅ | |
| dashboardService.ts | агрегации Dashboard (React Query) | ✅ | FEAT-1.3: streak; FEAT-1.4: personalRecords.e1rm |
| exercisesService.ts|упражнения: список/словари/по ID|✅|PERF-2 ✅; ARCH-6 ✅ (getExercises/getExercisesByIds/getExerciseRecords типизированы)|
| goalsService.ts | цели (upsert) | структ. | |
| metricsService.ts | замеры тела | структ. | |
| warmupService.ts|генерация разминки|✅|PERF-3 ✅; ARCH-6 ✅ (getWarmupAlternatives типизирован)|
| profileService.ts | профиль, КБЖУ, травмы, личные рекорды | ✅ | FEAT-1.4: PersonalRecord.e1rm (best Epley по всем сетам) |
| painService.ts | logPainEvent (pain_events) + addCautionInjury (user_injuries, injury_type 'pain') | ✅ | FEAT-1.9 |
| readinessService.ts | getToday / upsertToday (daily_readiness) | ✅ | FEAT-1.8 |

## src/constants/

| Файл | Назначение | Инспект. | Примечание |
|---|---|---|---|
| semanticColors.ts | LEVEL/MACRO/SEVERITY/BODY_PART/PHARMA/BODY_ZONE цвета | ✅ | канон уровней |
| phaseTypes.ts | типы фаз + getPhaseMeta/getPhaseColor | ✅ | |
| theme.ts | 5 акцентов × 2 режима, SPACING, BORDER_RADIUS, GRADIENTS | структ. | PERF-5 |
| muscleColors.ts / muscleGroups.ts | цвета/группы мышц | ✅(частично) | |
| equipmentIcons.ts|EQUIPMENT_SVG_MAP|✅|синхронизирован с ICON_MAP (73 файла); дубли по регистру убраны; нормализация через EQUIPMENT_SVG_MAP_LOWER|
| exerciseCategories.ts | категории упражнений | структ. | |
| injuries.ts|BODY_PARTS/INJURY_TYPES + computeExerciseWarnings|✅|ARCH-8 ✅ (уровень 1 → lookup по таблице)|
| goals.ts|константы целей (GOALS/GENDERS/ACTIVITY_LEVELS/PHARMA_TYPES)|✅|SCALE-5 (вынесено из goals.tsx)|

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
| workout.ts|типы тренировки (ExerciseData, AlternativeExercise, SetData)|✅|ARCH-7 ✅; FEAT-1.1: добавлены previousWeight/previousReps/previousRpe в SetData|
| index.ts|🗑 удалён 01.08.2026 (ARCH-7)|—|мёртвый (0 импортов), дублировал workout.ts|
| metrics.ts|замеры|структ.| |

## src/lib/

| Файл | Назначение | Инспект. | Примечание |
|---|---|---|---|
| config.ts|единый источник конфигов (Constants.expoConfig.extra)|✅|SCALE-4 ✅|
| supabase.ts|клиент + хелперы|✅|SCALE-4 ✅ (читает из config.ts)|
| timerSounds.ts | WAV-бипы (expo-audio) | структ. | |

## supabase/ + корень

| Файл | Назначение | Инспект. |
|---|---|---|
| cleanup_duplicate_policies.sql | RLS 34→12 (RPC-2) | структ. |
| rpc_add_security_invoker.sql | RPC-1 | структ. |
| миграция sync_program_changes_to_workouts | RPC синхронизации правок (FIT-2) | ✅(применена в SQL Editor) |
| .env / .env.example | секреты вне git / шаблон | структ. |
| CLAUDE.md / refactoring_guide.md | инструкции AI / аудит | ✅ |

## src/utils/
| macroCalculator.ts|расчёт КБЖУ (calculateAge/calculateMacros)|✅|SCALE-5 (вынесено из goals.tsx)|
| errorMapper.ts|единый маппер user-facing ошибок (mapError/extractMessage)|✅|SEC-9|
| rpe.ts|утилиты RPE: RPE_DESCRIPTIONS, rpeZone, deriveRir, deriveDifficulty, DIFFICULTY_LABELS|✅|FEAT-7; чистые функции — кандидаты под SCALE-1 тесты|
| utils/streak.ts | computeStreaks: недельный стрик (current/best/activeThisWeek), чистые функции | ✅ | FEAT-1.3, кандидат SCALE-1 |
| utils/streak.ts | computeStreaks: недельный стрик (current/best/activeThisWeek) | ✅ | FEAT-1.3, кандидат SCALE-1 |
| utils/e1rm.ts | epley/bestE1rm/roundE1rm | ✅ | FEAT-1.4, кандидат SCALE-1 |


## src/store/
| store/useStore.ts|глобальный UI-стейт (auth)|✅|SEC-10 остаток ✅ (workouts/logs/alternativesCache убраны)|