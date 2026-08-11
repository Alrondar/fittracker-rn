# FitTracker — Code & Screen Inventory

Срез: 11.08.2026

Этот файл отвечает только на вопросы **«где находится код?»**, **«что он делает?»** и **«что затронет изменение?»**. Статусы задач находятся в `STATUS.md`, технические правила — в `CLAUDE.md`, продуктовая модель — в `PRODUCT.md`.

## 1. Screen map

| Экран | Роль | Основные зависимости |
|---|---|---|
| `app/(tabs)/index.tsx` | Dashboard / Today | `useDashboard`, dashboard services/widgets, readiness |
| `app/(tabs)/programs.tsx` | каталог программ | `usePrograms`, ProgramCard, import |
| `app/(tabs)/workouts.tsx` | список/план тренировок | `useWorkouts`, phases/weeks |
| `app/(tabs)/history.tsx` | история | `useHistory`, historyService |
| `app/(tabs)/history/[id].tsx` | детали тренировки | historyService.getWorkoutDetail |
| `app/(tabs)/exercises.tsx` | exercise library | `useExercises`, filters, pagination |
| `app/(tabs)/exercise/[id].tsx` | exercise detail | `useExerciseDetail` |
| `app/(tabs)/program/[id].tsx` | Program Detail + Editor | `useProgramEditor`, phases, days, sheets |
| `app/(tabs)/workout/[id].tsx` | active workout | `useWorkoutSession`, ExerciseCard, SetsGrid, RestTimer, Warmup, Pain |
| `app/(tabs)/workout/create.tsx` | create/repeat workout | workoutService |
| `app/(tabs)/profile.tsx` | profile | `useProfile` |
| `app/(tabs)/profile/goals.tsx` | goals / macros | goalsService, macroCalculator |
| `app/(tabs)/profile/injuries.tsx` | injuries | `useInjuries`, injury warnings |
| `app/(tabs)/profile/metrics.tsx` | body metrics | `useBodyMetrics`, trend charts |
| `app/(tabs)/profile/settings.tsx` | settings | timer/theme/unit/profile settings |

## 2. Highest-priority UX surfaces

### Workout

`app/(tabs)/workout/[id].tsx`

Main components:
- `src/components/workout/ExerciseCard.tsx`
- `ExerciseSlider.tsx`
- `SetsGrid.tsx`
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

Main hooks/services:
- `useWorkoutSession.ts`
- `useInjuryWarnings.ts`
- `useWarmup.ts`
- `useTimerSettings.ts`
- `useUnitPreferences.ts`
- `workoutService.ts`
- `warmupService.ts`
- `painService.ts`

UX audit focus:
- progressive disclosure;
- amount of information visible per exercise;
- alternative exercise access;
- temporary vs program replacement;
- lazy mounting;
- RPE clarity;
- recommendation placement;
- performance during logging.

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
- Program → Phase/Week → Workout/Day → Exercise hierarchy;
- context/breadcrumb;
- save/sync semantics;
- drag & drop;
- sheet complexity.

### History

`app/(tabs)/history.tsx`

`app/(tabs)/history/[id].tsx`

Main dependencies:
- `useHistory.ts`
- `historyService.ts`

Planned UX direction:
- Calendar with workout marks;
- List alternative;
- selected day → workout details;
- keep Progress as separate mental model.

## 3. Dashboard

`app/(tabs)/index.tsx`

Components:
- `dashboard/StreakCard.tsx`
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
- dictionaries with long stale time.

## 5. Profile / Context

Screens:
- `profile.tsx`
- `profile/goals.tsx`
- `profile/injuries.tsx`
- `profile/metrics.tsx`
- `profile/settings.tsx`

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
| `useWorkoutSession` | workout/[id], ExerciseCard, SetsGrid, SetFeedbackControl, WorkoutTimer |
| `usePrograms` | programs, program/[id], dashboard/workouts |
| `useWorkouts` | workouts |
| `useDashboard` | Dashboard |
| `useExercises` / `useExerciseDetail` | exercise screens |
| `useInjuryWarnings` | useWarmup, ExerciseCard, workout |
| `useWarmup` | WarmupBlock, workout |
| `useHistory` | history |
| `useInjuries` | injuries |
| `useProfile` | profile/settings |
| `useBodyMetrics` | metrics |
| `useTimerSettings` | RestTimer/settings |
| `useUnitPreferences` | UnitToggle, ExerciseCard, SetsGrid |
| `useTheme` | all UI |
| `useToast` | all screens |

## 8. Service dependency map

| Service | Main consumers |
|---|---|
| `programsService` | usePrograms, programs, program/[id], editor, workouts, dashboard |
| `programSharingService` | ShareProgramSheet, ImportProgramSheet |
| `workoutService` | workout/create |
| `workoutsService` | workouts/useWorkouts |
| `dashboardService` | Dashboard/useDashboard |
| `historyService` | history/useHistory/history detail |
| `profileService` | profile/settings/injuries |
| `authService` | root auth flow + auth screens |
| `exercisesService` | exercise library/detail |
| `goalsService` / `metricsService` | goals/metrics |
| `warmupService` | useWarmup |
| `readinessService` | ReadinessSheet/Dashboard |
| `painService` | PainSheet/ExerciseCard |

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
| `utils/macroCalculator.ts` | macro calculations |

## 10. Database / migrations

Important migrations include:
- duplicate RLS cleanup;
- RPC security invoker;
- program-change sync;
- workout log upsert;
- other current schema migrations under `supabase/migrations/`.

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

## 12. Current known implementation notes

- RPE is already tappable 1–10; do not reintroduce draggable RPE as default.
- ExerciseSlider already uses lazy mounting/performance safeguards.
- SetsGrid contains per-set previous data and progression chips.
- RestTimer has auto-start and manual fallback.
- PainSheet and ReadinessSheet exist.
- WeightTrendChart and MetricSparkline exist.
- Program editing is already split into multiple components/sheets, but the UX hierarchy remains a major audit target.

## 13. Inventory maintenance

When adding/removing/renaming a meaningful screen, hook, service, shared component, or migration:
1. update this inventory;
2. update `STATUS.md` if task status changed;
3. do not copy technical rules from `CLAUDE.md` here;
4. do not copy product decisions from `PRODUCT.md` here.
