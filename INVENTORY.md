# FitTracker — Code & Screen Inventory

Срез: 22.08.2026 (main)

Этот файл отвечает только на вопросы **«где находится код?»**, **«что он делает?»** и **«что затронет изменение?»**. Статусы задач находятся в `STATUS.md`, технические правила — в `CLAUDE.md`, продуктовая модель — в `PRODUCT.md`.

## 0. Navigation: where to look for what

Этот раздел помогает находить код с MCP или без. Первичный источник — code search; здесь — направления и поисковые шаблоны.

| Что ищем | Где искать |
|---|---|
| Экраны/роуты | `app/`, табы — `app/(tabs)/` (Expo Router, file-based) |
| Компоненты фич | `src/components/<feature>/`: `workout/`, `program/`, `dashboard/`, `exercises/`, `profile/` |
| Shared UI | `src/components/ui/` (`AppButton`, `AppCard`, `SheetShell`, `Skeleton`, …) |
| Хуки | `src/hooks/`, feature-подпапки (`hooks/workout/`, `hooks/program/`, …) |
| Supabase boundary | `src/services/` (единственное место для `supabase.from/auth/rpc`) |
| Тема/токены/константы | `src/constants/` (`theme.ts`, `semanticColors.ts`, `phaseTypes.ts`, `injuries.ts`, …) |
| Чистые утилиты | `src/utils/` |
| Типы | `src/types/` (`database.types.ts` — generated, не редактируется вручную) |
| Схема/RPC/migrations | `supabase/migrations/` |
| Expo config | `app.config.ts` + `src/lib/config.ts` |

### Search patterns

Типовые запросы для code search / grep:

- **Потребители компонента/хука**: `from '.*<name>'` или `import.*<name>` в `src/` и `app/`.
- **Нарушения Supabase boundary**: `supabase.from(` и `supabase.auth.` вне `src/services/` и root auth flow.
- **RPC вызовы**: `rpc('` в `src/services/`.
- **React Query**: `useQuery|useMutation|useInfiniteQuery|queryOptions` в `src/hooks/`, `src/services/`.
- **Hardcoded colors**: `#[0-9a-fA-F]{3,8}`, `rgba?(` в `src/` вне `src/constants/`.
- **Использование темы**: `useTheme(`.
- **Анимации**: `useSharedValue|useAnimatedStyle|withTiming|withSpring`.
- **Migrations таблиц/RPC**: поиск в `supabase/migrations/` + проверка в `types/database.types.ts`.

### Без MCP

Этот файл и таблица выше дают направление. Не выдумывать содержимое файлов: запросить у пользователя текущий файл или явно пометить предположение. Роли, blast-radius, грабли — в разделах ниже.

### С MCP

Code search — первичный источник фактов; этот файл — вторичный. Поиск потребителей перед изменением обязателен (CLAUDE.md §10).

## 1. Screen map

| Экран | Роль | Основные зависимости |
|---|---|---|
| `app/(tabs)/index.tsx` | Dashboard / Today | `useDashboard`, dashboard services/widgets, readiness |
| `app/(tabs)/programs.tsx` | каталог программ | `usePrograms`, ProgramCard, import |
| `app/(tabs)/workouts.tsx` | список/план тренировок | `useWorkouts`, phases/weeks |
| `app/(tabs)/progress.tsx` | Progress hub («Как я меняюсь?») | `useHistory`, `useProgress`, `useWeeklySummary`; единый экран: Hero → Stats → Insights → Activity → Strength → Weight → PR → RecentWorkouts |
| `app/(tabs)/progress/[id].tsx` | Workout Report (детали тренировки) | `historyService.getWorkoutDetail`, мышцы, сводка, подходы |
| `app/(tabs)/exercises.tsx` | exercise library | `useExercises`, filters, pagination |
| `app/(tabs)/exercise/[id].tsx` | exercise detail | `useExerciseDetail` |
| `app/(tabs)/program/[id].tsx` | Program Detail (просмотр) | `useProgramEditor` (read-only), phases, days, `ProgramDetailModals` |
| `app/program/[id]/edit.tsx` | Program Editor (редактирование) | `useProgramEditor` (mutations), `ProgramEditorModals`, breadcrumb, save/cancel flow |
| `app/(tabs)/workout/[id].tsx` | active workout | `useWorkoutSession`, ExerciseCard, SetsGrid, RestTimer, Warmup, Pain |
| `app/(tabs)/workout/create.tsx` | create/repeat workout | workoutService |
| `app/(tabs)/profile.tsx` | profile | `useProfile` |
| `app/(tabs)/profile/goals.tsx` | goals / macros | goalsService, macroCalculator |
| `app/(tabs)/profile/injuries.tsx` | injuries | `useInjuries`, injury warnings |
| `app/(tabs)/profile/metrics.tsx` | body metrics | `useBodyMetrics`, trend charts |
| `app/(tabs)/profile/settings.tsx` | settings | timer/theme/unit/profile settings |
| `app/profile/progress.tsx` | **УДАЛЁН**: функциональность перенесена в `app/(tabs)/progress.tsx` |

## 2. Highest-priority UX surfaces

### Workout

`app/(tabs)/workout/[id].tsx`

Main components:
- `src/components/workout/ExerciseCard.tsx` — thin orchestrator, рендерит секции по displayMode
- `ExerciseSlider.tsx`
- `SetsGrid.tsx`
- `RecommendationCard.tsx` — COACH-1 recommendation card: suggested weight × reps, Принять/Изменить, Почему?; presentation-only, управляется `SetsGrid`
- `SetFeedbackControl.tsx`
- `RestTimer.tsx`
- `WorkoutTimer`
- `WorkoutTabs`
- `UnitToggle`
- `ExerciseInfoAccordion`
- `TechniqueMediaSlider`
- `WarmupBlock`
- `WarmupExerciseCard`
- `PainSheet`
- `WorkoutDisplayModePicker.tsx` — segmented control выбора display mode (в settings)
- `sections/ExerciseCardHeader.tsx` — название + Settings + actions-bubbles («Боль» / «⚠ Боль отмечена», «Другие варианты») с PR6 pain affordance
- `sections/ExerciseWarningBanner.tsx` — caution/avoid warning
- `sections/ExerciseCardEquipment.tsx` — EquipmentBubbles (вынесено из accordion)
- `sections/ExerciseCardMuscles.tsx` — primary/secondary muscle bubbles
- `sections/ExerciseCardTechnique.tsx` — техника + media + настройки (доступна во всех display modes)
- `sections/ExerciseCardKnowledge.tsx` — benefits/risks/injuries accordion; подзаголовки через SectionSubheading (PR7)
`AlternativeExerciseCard.tsx` — облегчённая карточка выбора замены (PR5): Польза/Риски/Противопоказания видимы, Техника в аккордеоне; ENG-5: бейджи relation_type (Прогрессия/Упрощение/Вариант)
- `WorkoutScreenHeader.tsx` — nav header workout screen: back, program context, name, UnitToggle, TimerPill/Panel (PR8)
- `WorkoutInjuryBanner.tsx` — injury warnings: compact chip + expanded banner, state инкапсулирован (PR8)
- `WorkoutScreenFooter.tsx` — «Начать тренировку» / «Завершить» с LinearGradient (PR8)

Main hooks/services:
- `useWorkoutSession.ts` — thin wrapper, композиция модулей ниже
- `workout/useWorkoutSession.types.ts` — внутренние типы join-структур
- `workout/useWorkoutSession.mapper.ts` — чистые функции маппинга
- `workout/useWorkoutSession.rest.ts` — rest timer логика
- `workout/useWorkoutSession.loader.ts` — загрузка workout + alternatives
- `useWorkoutDisplayMode.ts` — display mode preference (AsyncStorage persist)
- `useInjuryWarnings.ts`
- `useWarmup.ts`
- `useTimerSettings.ts`
`useUnitPreferences.ts`
`useRpeSettings.ts` — RPE prompt frequency (always/last-set/off, AsyncStorage persist)
- `workoutService.ts`
- `warmupService.ts`
- `painService.ts`

UX audit focus:
- progressive disclosure;
- display modes (training/balanced/learn);
- amount of information visible per exercise;
- alternative exercise access;
- temporary vs program replacement;
- lazy mounting;
- RPE clarity;
- recommendation placement;
- performance during logging.
- exercise item visual hierarchy (container + scheme pill) ✅;

### Programs / Editor

`app/(tabs)/programs.tsx` — catalog.

`app/(tabs)/program/[id].tsx` — detail/editor.

Main components:
- `ProgramCard.tsx`
- `ProgramProgressCard.tsx`
- `program/ProgramHero.tsx`
- `program/ProgramFabs.tsx`
- `program/ProgramDetailModals.tsx`
- `program/PhaseCard.tsx`
- `program/DayCard.tsx`
- `program/sheets/PhaseSettingsSheet.tsx`
- `program/sheets/DaySettingsSheet.tsx`
- `program/sheets/ExerciseSettingsSheet.tsx`
- `program/sheets/ScheduleEditorSheet.tsx`
- `program/sheets/ExercisePickerSheet.tsx`
- `program/sheets/ImportProgramSheet.tsx`
- `program/sheets/ShareProgramSheet.tsx`

Main hooks/services:
- `useProgramEditor.ts`
- `useProgramPhases.ts`
- `usePrograms.ts`
- `programsService.ts`
- `programSharingService.ts`

UX audit focus:
- ready-made vs personal programs;
- Program Card;
- Detail vs Editor mental model;
- Program → Phase/Week → Workout/Day → Exercise hierarchy (✅ упрощена: строка упражнения в редакторе показывает только название, мышцы и подходы; детали вынесены в sheet);
- context/breadcrumb (✅ добавлен в edit.tsx);
- save/sync semantics;
- drag & drop;
- sheet complexity (🟡 остаток: замена Modal на SheetShell).

### History

`app/(tabs)/history.tsx` — Calendar/List toggle (UX-9/UX-10)

Main components:

`history/HistoryCalendar.tsx` — месяц с отметками тренировок, навигация по месяцам, выбор дня (UX-9)
`history/DaySummaryCard.tsx` — sheet выбранного дня через SheetShell, тап по тренировке → Workout Report (L3, `progress/[id]`) (UX-9)
`history/HistoryViewToggle.tsx` — segmented control Calendar/List (UX-10)

Main dependencies:

`useHistory.ts`
`useHistoryView.ts` — persist выбора Calendar/List (AsyncStorage, default calendar)
`historyService.ts`

UX direction (реализовано UX-9/UX-10):

Calendar with workout marks ✅;
List alternative ✅;
selected day → workout details ✅;
keep Progress as separate mental model (UX-11 открыт).

## 3. Dashboard

`app/(tabs)/index.tsx`

Components:
- `dashboard/StreakCard.tsx`
- `dashboard/DashboardNutritionCard.tsx` (AUDIT-1: L1-summary питания, 2 страницы (swipe + точки): кольца + 🔥 burned / недельная таблица lazy; «+» → NutritionAddModal, state модалки в `index.tsx`)
- `dashboard/CircularNutritionChart.tsx` (AUDIT-1: SVG-кольца — макросы-сегменты снаружи / калории / вода внутри при >0; центр: ккал + осталось + 🔥-бейдж)
- `dashboard/NutritionWeekTable.tsx` (AUDIT-1: стр. 2 карточки — таблица КБЖУ+вода за 7 дней; lazy mount после первого свайпа, performance gate §8)
- `dashboard/NutritionAddModal.tsx` (AUDIT-1: L2-модалка ввода приёма пищи: meal type picker + КБЖУ+вода; `Modal` + `SheetShell`)
- `dashboard/NutritionLogListModal.tsx` (NUTRI-2: L2-модалка списка записей за день: тап → редактирование, удаление с подтверждением; SheetShell)
- `dashboard/StatusCard.tsx` (AUDIT-6: «Состояние сегодня» — readiness мини-кольцо + tappable pips 1–5 (haptics), чипы активных травм (SEVERITY_COLORS, tap → `/profile/injuries`), «⚠ Боль сегодня», строка-следствие; owns ReadinessSheet)
- `dashboard/ContextInsightCard.tsx` (COACH-4: компактный инсайт L1)
- `ActivityCalendar`
- `WeeklyStatsCard`
- `ExerciseProgressCard`
- `PersonalRecordsCard`
- `LastWorkoutCard`
- `ProgramProgressCard`
- `ReadinessSheet`

Hooks/services:
- `useDashboard.ts`
- `dashboardService.ts`
- `readinessService.ts`
- `useDailyNutrition` / `useWeeklyNutrition` / `useBurnedCalories` (AUDIT-1)
- `useTodayReadiness` / `useInjuries` / `useTodayPain` (AUDIT-6)

UX focus:
- Today first;
- fast start;
- active program context;
- compact insights;
- readiness must remain optional.

## 4. Exercises

Screen:
- `app/(tabs)/exercises.tsx`
- `app/(tabs)/exercise/[id].tsx`

Components:
- `exercises/CategoryStrip`
- `exercises/EquipmentSheet`
- `EquipmentIcon`

Hooks/services:
- `useExercises.ts`
- `useExerciseDetail.ts`
- `exercisesService.ts`

Current behavior:
- infinite pagination 40/page;
- server-side filters;
- debounce search;
- dictionaries with long stale time;
- main list: FlashList (PERF-9); horizontal category strip — plain FlatList.

## 5. Profile / Context

Screens:
- `app/(tabs)/profile.tsx`
- `app/(tabs)/profile/goals.tsx`
- `app/(tabs)/profile/injuries.tsx`
- `app/(tabs)/profile/metrics.tsx`
- `app/(tabs)/profile/settings.tsx`

*(Progress hub перенесён в отдельный bottom-tab: `app/(tabs)/progress.tsx`, см. раздел 1)*

Dependencies:
- `useProfile.ts`
- `useBodyMetrics.ts`
- `useInjuries.ts`
- `goalsService.ts`
- `metricsService.ts`
- `profileService.ts`
- `macroCalculator.ts`
- `WeightTrendChart.tsx`
- `MetricSparkline.tsx`

## 6. Shared UI

`src/components/ui/`

Important components:
- `AppButton`
- `AppCard`
- `AppBadge`
- `AppInput`
- `SheetShell`
- `SectionHeader`
- `FadeIn`
- `Skeleton`
- `Toast`

`SheetShell` is the canonical sheet surface. New sheets should use it unless a clear reason exists not to.

## 7. Hooks dependency map

| Hook | Main consumers |
|---|---|
| `useProgramEditor` | program/[id], phases/cards, programsService |
| `useProgramPhases` | useProgramEditor |
| useWorkoutSession | workout/[id], ExerciseCard, SetsGrid, SetFeedbackControl, WorkoutTimer; thin wrapper над workout/useWorkoutSession.* модулями |
| `usePrograms` | programs, program/[id], dashboard/workouts |
| `useWorkouts` | workouts |
| `useDashboard` | Dashboard |
| `useExercises` / `useExerciseDetail` | exercise screens |
| `useInjuryWarnings` | useWarmup, ExerciseCard, workout |
| `useWarmup` | WarmupBlock, workout |
| `useHistory` | `app/(tabs)/history.tsx`, `app/(tabs)/progress.tsx` (RecentWorkouts) |
| `useHistoryView` | `app/(tabs)/history.tsx` |
| `useProgress` | `app/(tabs)/progress.tsx` (Progress hub) |
| `useInjuries` | injuries + StatusCard (AUDIT-6: чипы активных травм) |
| `useProfile` | profile/settings |
| `useBodyMetrics` | metrics |
| `useRecommendationFeedback` | SetsGrid (COACH-3: fire-and-forget запись accepted/rejected + причина). `userId` автоматически берётся из `useStore`, чтобы не передавать его через цепочку пропсов. |
| `useTimerSettings` | RestTimer/settings |
| `useUnitPreferences` | UnitToggle, ExerciseCard, SetsGrid |
| `useTheme` | all UI |
| `useToast` | all screens |
| `useDailyNutrition` |Dashboard (AUDIT-1)|
| `useWeeklyNutrition` |NutritionWeekCard (profile), NutritionWeekTable (Dashboard, AUDIT-1)|
| `useBurnedCalories` |DashboardNutritionCard (AUDIT-1: 🔥-бейдж)|
| `useTodayReadiness`|workout/[id] (ENG-3 readiness context) + StatusCard (AUDIT-6) + ContextInsightCard (readinessWarning, COACH-4)|
| `useWeeklySummary`|Dashboard («Коротко о неделе», COACH-4/COACH-5) + Progress hub|
| `useTodayPain`|StatusCard (AUDIT-6: «⚠ Боль сегодня»)|
| `useNutritionLogs` |NutritionLogListModal (NUTRI-2: CRUD записей за день, инвалидация daily/weekly/burned)|

## 8. Service dependency map

| Service | Main consumers |
|---|---|
| `programsService` | usePrograms, programs, program/[id], editor, workouts, dashboard |
| `programSharingService` | ShareProgramSheet, ImportProgramSheet |
| `workoutService` | workout/create |
| `workoutsService` | workouts/useWorkouts |
| `dashboardService` | Dashboard/useDashboard |
| `historyService` | `app/(tabs)/history.tsx`, `app/(tabs)/progress.tsx` (RecentWorkouts: duration, program_name, avg_rpe), `app/(tabs)/progress/[id].tsx` (Workout Report) |
| `profileService` | profile/settings/injuries + nutrition-хуки Dashboard (useDailyNutrition, useWeeklyNutrition, useBurnedCalories) |
| `authService` | root auth flow + auth screens |
| `exercisesService` | exercise library/detail |
| `goalsService` / `metricsService` | goals/metrics |
| `warmupService` | useWarmup |
| `readinessService` | ReadinessSheet (owns StatusCard, AUDIT-6) + quick-set pips StatusCard |
| `painService` | PainSheet/ExerciseCard + StatusCard (AUDIT-6: getPainEventsToday) |
| `recommendationFeedbackService` | SetsGrid (COACH-3: inline-чипы причин после «Скрыть») |
| `progressService` | `useProgress`, `progress` (режим Аналитика/Обзор) |
| `weeklySummaryService`|useWeeklySummary (ENG-6); UI — COACH-5|

## 9. Core types / constants / utilities

| Location | Role |
|---|---|
| `types/database.types.ts` | generated Supabase types |
| `types/workout.ts` | ExerciseData, AlternativeExercise, SetData, feedback types |
| `constants/semanticColors.ts` | level/macro/severity/body-part semantics |
| `constants/phaseTypes.ts` | phase metadata/color |
| `constants/theme.ts` | theme, spacing, radius |
| `constants/injuries.ts` | injury rules/warnings |
| `constants/equipmentIcons.ts` | equipment SVG map |
| `utils/rpe.ts` | RPE descriptions/derived values |
| `utils/e1rm.ts` | e1RM calculations |
| `utils/streak.ts` | streak calculations |
| `utils/trend.ts` | trend/moving average/slope |
| `utils/plates.ts` | plate calculation logic; UI pending |
| `utils/csv.ts` | CSV builder; service/UI pending |
| `utils/errorMapper.ts` | user-facing error mapping |
| `utils/intensityInfo.tsx` |getIntensityInfo: label/color/bgColor/icon для intensity badge (PR8)|
| `utils/macroCalculator.ts` | macro calculations |
| `utils/intensityInfo.tsx` |getIntensityInfo: label/color/bgColor/icon для intensity badge (PR8)|
| `engine/progression.ts` |calculateProgression (ENG-1); explainProgression (ENG-2); applySafetyPrecedence (ENG-4); applyReadinessContext (ENG-3: readiness 1–2 + increase → hold, null = no-op; применяется после safety). Чистые функции|
| `engine/alternatives.ts` |rankAlternatives (ENG-5): hard exclusion (avoid + severity high) + scoring (мышцы/pattern/оборудование/уровень/боль/injury load) + relation-type bonuses. Чистая функция|
| `engine/weeklySummary.ts` |buildWeeklyInsights (ENG-6): 9 детерминированных инсайтов недели; типы WeeklySummaryData/Insight. Чистая функция|

## 10. Database / migrations

Important migrations include:
- duplicate RLS cleanup;
- RPC security invoker;
- program-change sync;
- workout log upsert;
- other current schema migrations under `supabase/migrations/`.
Reference data migration (15.08.2026):
- legacy columns `exercises.equipment`, `exercises.injuries`, `exercises.alternatives` dropped;
- `search_exercises` and `get_exercise_filter_counts` now use `exercise_equipment` + `equipment` tables;
- `exerciseReferenceService` is the single source of truth for equipment/injuries/alternatives in runtime;
- `injury_exercise_warnings` is the hard-constraint source for safety layer (ARCH-8).
-`20260819_backfill_movement_pattern (ENG-5 prep)`: 15 idempotent UPDATE rules заполняют 143/149 strength/olympic упражнений 14 новыми значениями movement_pattern (TEXT, без ENUM); 6 честных NULL в strength (баланс, баттл-ропы, гибриды), 80 stretching/cardio NULL намеренно не тронуты;
-`20260820_recommendation_feedback (COACH-3)`: таблица recommendation_feedback для записи acceptance/rejection feedback; upsert по UNIQUE(user_id, workout_id, exercise_id, set_number); RLS auth.uid() = user_id;
-`20260820_drop_unused_session_tables (ARCH-10)`: удаление экспериментальных таблиц `workout_sessions` и `session_sets` (0 строк данных, 0 упоминаний в коде). `workout_logs` зафиксирован как единственный source of truth для подходов;
-other current schema migrations under `supabase/migrations/`.


Before changing a DB operation, inspect the current migration and generated `database.types.ts`.

## 11. Blast-radius rules

### Change `useWorkoutSession.ts`

Inspect:
`workout/[id].tsx`, `ExerciseCard`, `SetsGrid`, `SetFeedbackControl`, `WorkoutTimer`, workout types.

### Change `useProgramEditor.ts`

Inspect:
`program/[id].tsx`, `useProgramPhases`, `PhaseCard`, `DayCard`, all program sheets, `programsService`.

### Change `programsService.ts`

Inspect:
`usePrograms`, programs screen, Program Detail/Editor, workouts, Dashboard, sync/delete/activation flows.

### Change `historyService.ts`

Inspect:
`useHistory`, history list, history detail, future Calendar/List model.

### Change `useTheme.tsx` / theme constants

Assume entire UI is affected.

### Change `types/workout.ts`

Inspect all workout components and `useWorkoutSession` before changing exports.

Расположение кода — code search (MCP); INVENTORY.md — роли, blast-radius и грабли.

## 12. Current known implementation notes

- RPE is already tappable 1–10; do not reintroduce draggable RPE as default.
- ExerciseSlider already uses lazy mounting/performance safeguards.
- SetsGrid contains per-set previous data; progression chips are hidden by default and revealed by RecommendationCard «Изменить» (COACH-1). COACH-3: после «Скрыть» inline-чипы причин (устал/слишком тяжело/боль/хочу легче/другое) + пропустить; запись через useRecommendationFeedback (fire-and-forget, ошибки глотаются тихо). Таблица recommendation_feedback (upsert по user+workout+exercise+set). `useRecommendationFeedback` автоматически берёт `userId` из `useStore`, что устраняет необходимость пробрасывать его через пропсы компонента.
- RestTimer has auto-start and manual fallback.
- PainSheet and ReadinessSheet exist.
- WeightTrendChart and MetricSparkline exist.
- Program editing is already split into multiple components/sheets, but the UX hierarchy remains a major audit target.
- **Display modes (training/balanced/learn)** реализованы через `useWorkoutDisplayMode` + `WorkoutDisplayModePicker` в settings (feature branch).
- **ExerciseCard разбит на секции в `sections/`**; порядок секций: Header → Equipment → Warning → [Muscles] → SetsGrid → Technique → [Knowledge]. SetsGrid — главный рабочий блок, всегда выше справочной информации (Technique/Knowledge). Muscles/Knowledge скрыты в training mode.
- **Equipment вынесен из accordion** в отдельную секцию `ExerciseCardEquipment`.
- **Technique accordion доступна во всех display modes** (safety: правильная техника = безопасность).
- **Media/slider content монтируется только при раскрытии accordion** (CLAUDE.md §8).
- **Header variant D**: Settings справа от названия, metadata слева, actions-bubbles («Боль» / «⚠ Боль отмечена», «Другие варианты») 
справа.
- AlternativeExerciseCard (PR5): Польза/Риски/Противопоказания — видимые блоки ПЕРЕД CTA (PRODUCT.md §8: safety до принятия решения); Техника выполнения — lazy-mount аккордеон через ExerciseCardTechnique; Противопоказания рендерятся только при наличии записей в injury_exercise_warnings.
- **Pain persistent state (PR6)**: painService.getPainEventsForWorkout загружает pain_events при fetchWorkoutSession; painState маппится в ExerciseData через buildPainStateMap; savePainState/clearPainState с оптимистичным обновлением + откат; PainSheet prefill из painState + «Боль прошла» для delete; visual affordance «⚠ Боль отмечена» в header bubble; UNIQUE constraint (user_id, workout_id, exercise_id) предотвращает дубли.
- **workout/[id].tsx split (PR8)**: WorkoutScreenHeader / WorkoutInjuryBanner / WorkoutScreenFooter + utils/intensityInfo; showInjuryBanner state инкапсулирован в WorkoutInjuryBanner; файл уменьшен с ~673 до ~400 строк (CLAUDE.md §2).
- **Knowledge disclosure cleanup (PR7)**: ExerciseCardKnowledge использует SectionSubheading из ExerciseCardTechnique; единообразие подзаголовков между «Техника выполнения» и «Важно знать»; lazy mount через everOpened в ExerciseInfoAccordion.
- **UX-3 decision (закрыто)**: warm-up реализован через вкладку WorkoutTabs + WarmupBlock (useWarmup), отдельного sheet не требуется. History per-exercise частично закрыт per-set previous data в SetsGrid (FEAT-1.1) + вкладка History с деталями тренировок (historyService.getWorkoutDetail). Notes отложены — нет таблицы exercise_notes, не подтверждена потребность; вернуться после сбора feedback от пользователей.
- **RPE frequency settings (UX-7)**: useRpeSettings — 3 опции (always / last-set default / off); SetsGrid проверяет predicate shouldShowRpeChip: уже введённые значения (rpe != null) показываются всегда, новые запросы — по настройке. Picker в profile/settings.tsx с segmented control и живым описанием.
- **RPE quick-skip (UX-6)**: SetFeedbackEditor показывает кнопку «Пропустить» когда rpe == null (без onChange, просто onClose); при rpe != null — «Сбросить» (с onChange). Дефолт 7 — типичный рабочий RPE.
- **Skip workout (FIT-7)**: пропуск = finished_at + skipped_at заполнены, started_at NULL, подходов нет. onlyCurrentDay: пропускается только тренировка, на которую указывает прогресс-поинтер user_programs (day→week→phase не рассинхронизируется). advanceProgramProgress вызывается sequential с retry (паттерн saveWorkout). Пропуск не попадает в History (historyService фильтрует по наличию логов). Программа без active program — пропуск недоступен.
- **Program replacement (UX-5 Feature 1)**: replaceExerciseInProgram в programsService — 7 шагов (workout → workout_exercise → program_day → program_exercise → UPDATE program_exercises + exercise_name → UPDATE текущей workout_exercises.exercise_id для защиты от orphaned row в sync → syncProgramChanges). Alert в workout/[id].tsx через handleReplaceChoice: 3 кнопки при наличии программы (Отмена / Только сегодня / В программе destructive) или мгновенная temp-замена для ad-hoc тренировок. Rollback при ошибке sync (например, seeded программы с created_by IS NULL).
- **Sync safety insight (UX-5 Feature 1)**: RPC sync_program_changes_to_workouts удаляет workout_exercises с exercise_id, которого нет в program_exercises (orphaned by exercise_id). Поэтому перед вызовом sync обязательно обновляем текущую workout_exercises.exercise_id — иначе для не начатых тренировок sync пересоздал бы строку с новым id и осиротил бы pending workout_logs.
- **History calendar (UX-9/UX-10)**: workoutDates вычисляются локально из HistoryWorkout.created_at через useMemo — ноль новых запросов, данные уже загружены getHistory. HistoryCalendar: навигация от самого раннего месяца с тренировками до текущего (в будущее нельзя), неделя с понедельника, точки на днях с тренировками. Тап по дню → DaySummaryCard (SheetShell) со списком тренировок дня; несколько тренировок в день поддерживаются. Выбор вида Calendar/List персистится в AsyncStorage (useHistoryView), default — Calendar. Пропущенные тренировки (skipped_at) в календаре НЕ отображаются — Вариант A, консистентно с FIT-7: History = фактически выполненное (historyService фильтрует по наличию логов).
- **Progress hub (UX-11)**: `app/(tabs)/progress.tsx` — отдельный bottom-tab, единый экран «Как я меняюсь?» (PRODUCT.md §11). Последовательный поток: Hero → Stats → Insights → Activity → Strength (с интерактивным селектором упражнений и explainability e1RM) → Weight → PR → RecentWorkouts. Карточки RecentWorkouts используют детерминированный градиент (на основе RPE) и показывают program_name, duration, volume, sets, avg_rpe. Грабли: `workout_exercises` не имеет `exercise_name` (только через embed); skip-тренировки (FIT-7) исключаем через `.is('skipped_at', null)`.
- **Progression rules (ENG-1)**: src/engine/progression.ts — чистая функция calculateProgression({sets, repsRange, stepKg}). 8 правил в порядке приоритета: MAX_EFFORT (RPE 10 → decrease), READY_TO_PROGRESS (allAtMax + RPE ≤ 7 → increase), ALL_MAX_REPS (allAtMax без RPE → increase), HIGH_RPE_HOLD (RPE ≥ 9), CONSOLIDATE (allAtMin), OVERREACHED (allBelowMin → decrease), MISSED_REPS (anyBelowMin), INCONCLUSIVE (fallback hold). Reason codes machine-readable (ENG-2/B5 foundation). SetsGrid рендерит one-liner recommendation + подсвечивает smallest chip при increase. Данные: previous session (SetData.previousWeight/Reps/Rpe) + текущие завершённые сеты (live recompute). repsRange парсится из ExerciseData.reps_range. Step: 2.5 кг / 5 lb.
- **Progression engine (ENG-1/ENG-2)**: src/engine/progression.ts — чистые функции без React/Supabase. calculateProgression: 8 правил по приоритету, данные = previous session (SetData.previousWeight/Reps/Rpe) + завершённые сеты текущей сессии (live recompute). explainProgression: массив ExplanationItem (input/signal/conclusion) по reason.code — engine отдаёт сырые данные, UI форматирует. SetsGrid: RecommendationCard c one-liner reason/override в header; тап → expanded «Почему?» + «Скрыть» (dismissed локально; persistence отложен до COACH-3). Директория src/engine/ — архитектурный задел для B2 readiness, B4 alternatives ranking, B5 explainability.
- **Safety precedence (ENG-4)**: src/engine/progression.ts — applySafetyPrecedence(base, safety) применяет PRODUCT.md §8 priority: injury/pain constraints > training constraints > recommendation > AI. 4 правила в порядке приоритета: stopExercise → PAIN_STOPPED (suppress, no_data); warning.level=avoid → INJURY_AVOID (suppress); hasPain + base.increase → PAIN_RECORDED (downgrade to hold); warning.level=caution + base.increase → INJURY_CAUTION (downgrade to hold). SetsGrid получает safetyContext из ExerciseCard (painState + warning.level, стабильная ссылка через useMemo). Safety downgrade визуально отделён: warning color + выключенный chip highlight (не предлагаем +2.5 при боли). Injury_exercise_warnings hard constraint — Engine никогда не обходит. ExerciseWarningBanner на L1 не затронут — показывает причину параллельно.
- **Alternatives ranking (ENG-5)**: src/engine/alternatives.ts — rankAlternatives(candidates, source, activeInjuries, contraindications) применяет PRODUCT.md §4.4 приоритет: мышечная группа (+2 primary / +1 secondary), movement_pattern (+3 при совпадении, NULL = нет сигнала), оборудование (+2 совпадение / −1 несовпадение), уровень (−3 beginner→advanced, −2 advanced→beginner), боль в группе источника (−3), нагрузка на травму medium/low (−5/−2). Hard exclusion (PRODUCT.md §8, ARCH-8): injury_exercise_warnings level=avoid при совпадении с активной травмой; targetsInjuredMuscle severity high. Relation-type bonuses: regression +5 при hasPain/activeInjuries (recovery-friendly), −1 без; progression −3 при hasPain (не предлагаем усложнение при боли). Бейджи в AlternativeExerciseCard: «↗ Прогрессия» (primary color) / «↘ Упрощение» (warning) / «Вариант» (neutral); alternative = default без бейджа (PRODUCT.md §3.1 один акцент на блок). fetchAlternatives добавляет movement_pattern/difficulty в select (один запрос); activeInjuries — один запрос на сессию через ref. Progression-boost при ENG-1 increase отложен: после COACH-1 нужна отдельная реализация/решение, чтобы не инвалидировать кэш alternatives при live recompute. (нужен единый recommendation-контекст; иначе инвалидация кэша при live recompute в SetsGrid).
- **Weekly summary (ENG-6)**: getWeeklySummary(userId, weekOffset) агрегирует неделю локально — 3 параллельных запроса (workouts+logs, pain_events, daily_readiness) + один pre-week запрос workout_logs для PR-detection (PR = e1rm недели > pre-week best, только при наличии baseline — «первый раз в упражнении» рекордом не считается). Skip-тренировки исключены через .is('skipped_at','null') (FIT-7); имена упражнений через embed exercises(name) (workout_exercises не имеет exercise_name — грабля progressService). Инсайты срабатывают только при выполненном условии: VOLUME_UP/DOWN/STABLE (±10% к прошлой неделе), NEW_PR, PAIN_SPIKE (≥3 событий или ≥2 в одной зоне), LOW/HIGH_READINESS (среднее <3 / ≥4.5 при ≥3 записях), HIGH_RPE_WEEK (средний RPE ≥8.5 при ≥5 сетах), CONSISTENT_WEEK (≥4 тренировок). UI — COACH-5.
- **Alternatives ranking (ENG-5)**: engine/alternatives.ts — rankAlternatives(candidates, source, activeInjuries, contraindications). Hard exclusion зеркалит warmupService (ARCH-8, два уровня): avoid-противопоказание при совпадении с активной травмой; targetsInjuredMuscle severity high. Scoring: PRIMARY_MATCH +2/мышца, SECONDARY_MATCH +1, PATTERN_MATCH +3 (только когда оба movement_pattern известны — NULL = честный «нет сигнала»), EQUIPMENT_MATCH +2 / MISMATCH −1, LEVEL_JUMP −3 (beginner→advanced) / LEVEL_DROP −2, PAIN_ON_SOURCE_GROUP −3, INJURY_MEDIUM −5 / LOW −2. Relation-type: regression +5 при hasPain/activeInjuries, −1 без; progression −3 при hasPain. Progression-boost при ENG-1 increase отложен: после COACH-1 нужна отдельная реализация/решение, чтобы не инвалидировать кэш alternatives при live recompute. (иначе инвалидация кэша при live recompute). fetchAlternatives: движение/difficulty в том же select (+exerciseId источника), relationTypeMap из exercise_relationships (первая связь по status/confidence), противопоказания — только при активных травмах, activeInjuries — один запрос на сессию (ref).
- **Weekly summary (ENG-6)**: getWeeklySummary(userId, weekOffset) — 3 параллельных запроса на неделю (workouts+logs, pain_events, daily_readiness) + один pre-week запрос для PR-detection (PR = e1rm недели > pre-week best, только при наличии baseline). Skip-тренировки исключены через .is('skipped_at','null') (FIT-7); имена через embed exercises(name). Инсайты срабатывают только при выполненном условии: VOLUME_UP/DOWN/STABLE (±10%), NEW_PR, PAIN_SPIKE (≥3 или ≥2 в одной зоне), LOW/HIGH_READINESS (<3 / ≥4.5 при ≥3 записях), HIGH_RPE_WEEK (≥8.5 при ≥5 сетах), CONSISTENT_WEEK (≥4). UI — COACH-5.
- **Readiness in engine (ENG-3)**: applyReadinessContext применяется в SetsGrid цепочкой base → applySafetyPrecedence → applyReadinessContext. Приоритет PRODUCT.md §8 закреплён порядком + guard'ом: если safetyOverride установлен — readiness no-op. Правила: readiness null (нет check-in) → no-op (§7); readiness 1–2 + base increase → hold с readinessOverride LOW_READINESS; readiness 3–5 → no-op. Визуально system downgrade (safety или readiness) делит warning color; текст one-liner в RecommendationCard: safetyOverride ?? readinessOverride ?? reason.ruText. useTodayReadiness: staleTime 1h; данные собираются ReadinessSheet (FEAT-1.8).
- **Burned calories (AUDIT-1)**: profileService.getBurnedCalories(userId, days) сам читает вес из profiles и возвращает number | null (null — вес не задан, UI скрывает 🔥-бейдж, не выдумывая данные). Feature существует только на Dashboard; из профиля блок удалён. dashboardService coerces null → 0 для недельной статистики.
- **SheetShell принимает visible?: boolean (false → null)**. Модалки Dashboard (ReadinessSheet, DaySummaryCard, NutritionAddModal, NutritionLogListModal) рендерятся в конце экрана вне ScrollView — рендер внутри ScrollView ломает overlay (грабля AUDIT-1).
- **StatusCard (AUDIT-6)**: readiness мини-кольцо (SVG, consistency с `CircularNutritionChart`) + 5 pips для quick-set через `readinessService.upsertToday` с null-полями (не выдумываем данные); haptics на tap. Чипы травм: ≤2 + «+N», tap → `/profile/injuries` (href без `(tabs)` — route group не входит в URL). Строка-следствие с приоритетом safety > recommendation (PRODUCT.md §8): боль/травма → «Замены и нагрузка учтут ограничения», иначе readiness ≤ 2 → «Сегодня без повышения нагрузки», иначе «Нагрузка по плану». Травмы и readiness — независимые сигналы (травма руки не снижает готовность ног); `injury_exercise_warnings` — hard constraint на уровне тренировки. ReadinessSheet инвалидирует `['todayReadiness', userId]` после сохранения; quick-set также инвалидирует — кэш не stale. «⚠ Боль сегодня» — информационный чип (не кликабельный, отдельного экрана боли нет; боль фиксируется per-exercise через PainSheet).
- **src/components/dashboard/NutritionLogListModal.tsx** — NUTRI-2: список/редактирование/удаление записей питания за день
- **src/hooks/useNutritionLogs.ts** — NUTRI-2: React Query список + мутации, инвалидация питания и сожжённых калорий
- **Exercise library (PERF-9)**: основной список в `app/(tabs)/exercises.tsx` — FlashList 2.x (`@shopify/flash-list`). Грабли: в 2.x удалён проп `estimatedItemSize` (был в 1.x) — не добавлять, упадёт tsc. `windowSize`/`removeClippedSubviews` — пропы FlatList, FlashList их не принимает. Горизонтальная полоса групп мышц намеренно оставлена на FlatList (короткий список, ~10–15 элементов).

## 13. Inventory maintenance

When adding/removing/renaming a meaningful screen, hook, service, shared component, or migration:
1. update this inventory;
2. update `STATUS.md` if task status changed;
3. do not copy technical rules from `CLAUDE.md` here;
4. do not copy product decisions from `PRODUCT.md` here.

### Recent additions (COACH-4 / COACH-5 / UX-11 / AUDIT-1 / AUDIT-6)
- `src/components/dashboard/ContextInsightCard.tsx` — COACH-4: компактный инсайт на Dashboard (L1)
- `src/components/dashboard/StatusCard.tsx` — AUDIT-6: «Состояние сегодня» (readiness мини-кольцо + tappable pips, чипы травм, «⚠ Боль сегодня»)
- `src/components/dashboard/CircularNutritionChart.tsx` — AUDIT-1: SVG-кольца питания
- `src/components/dashboard/NutritionWeekTable.tsx` — AUDIT-1: недельная таблица КБЖУ+вода (стр. 2 pager)
- `src/components/dashboard/NutritionAddModal.tsx` — AUDIT-1: L2-модалка ввода приёма пищи
- `src/hooks/useDailyNutrition.ts` — AUDIT-1: daily + targets для Dashboard
- `src/hooks/useWeeklyNutrition.ts` — AUDIT-1: недельная агрегация питания (также для NutritionWeekCard в профиле)
- `src/hooks/useBurnedCalories.ts` — AUDIT-1: 🔥-бейдж в центре диаграммы
- `src/hooks/useTodayPain.ts` — AUDIT-6: «⚠ Боль сегодня»
- `src/components/progress/ProgressHero.tsx` — UX-11: главный ответ «Что сейчас происходит с моим прогрессом?»
- `src/components/progress/ProgressStats.tsx` — UX-11: 3 ключевых показателя (тренировки, объём, серия)
- `src/components/progress/ProgressInsights.tsx` — UX-11: детерминированные инсайты (сила, объём, вес, PR) без AI
- `src/components/progress/RecentWorkouts.tsx` — UX-11: последние 3–5 тренировок с информативными карточками (детерминированный градиент, program_name, duration, avg_rpe)
- `src/components/progress/StrengthTrendChart.tsx` — UX-11: тренд e1RM с интерактивным селектором упражнений и explainability
