# FitTracker RN — Development Guide

Срез: 11.08.2026

## 0. Source of truth

В репозитории используются пять рабочих документов:

| Файл | Владелец информации |
|---|---|
| `CLAUDE.md` | технические правила, архитектура, security, performance |
| `PRODUCT.md` | продуктовая философия и UX-инварианты |
| `ROADMAP.md` | последовательность работы |
| `STATUS.md` | фактический статус задач |
| `INVENTORY.md` | карта файлов, экранов и зависимостей |

Не создавать отдельные документы для тех же тем без необходимости. Архивный `refactoring_guide.md` не обновлять.

## 1. Стек

| Слой | Решение |
|---|---|
| Язык | TypeScript ~5.9, strict |
| Runtime | Expo SDK ~54, React Native 0.81.5, React 19.1 |
| Navigation | Expo Router ~6, file-based |
| Backend | Supabase: PostgreSQL + RLS + RPC + Auth |
| Server state | TanStack React Query 5 — все server data |
| UI state | Zustand 5 — только UI/auth state |
| Styling | `useTheme()` + atomic UI components |
| Animation | Reanimated 3 + Gesture Handler |
| Images | `expo-image`, не RN Image |

## 2. Архитектурные инварианты

1. Server data хранится только через React Query.
2. `supabase.from()` и `supabase.auth.*` запрещены в UI; запросы идут через `src/services/`.
3. Auth — единый `authService.ts`; auth redirects контролирует root `_layout.tsx`.
4. Profile создаётся DB trigger `handle_new_user`; `ensureProfile` идempotent.
5. Config — `src/lib/config.ts`, значения приходят из Expo config.
6. User-facing errors — `mapError/extractMessage` или `mapAuthError`.
7. Файл не должен разрастаться выше 500 строк; при >450 сначала рассмотреть split.
8. `database.types.ts` должен соответствовать текущей схеме.
9. Новая логика не должна ломать persistence, safety или program-sync semantics.

## 3. Data / Security

Клиент использует publishable key под RLS. Secret/service-role keys не хранятся в клиенте.

Основные RLS группы:

| Таблицы | Правило |
|---|---|
| user-owned tables | `auth.uid() = user_id` |
| `profiles` | `auth.uid() = id` |
| `programs` | seeded readable; private — owner |
| program/workout children | доступ через owner relationship |
| exercise reference tables | read access |

Новая таблица требует RLS.

### RPC

- RLS bypass → `SECURITY DEFINER` + явная проверка `auth.uid()`.
- RLS-respecting → `SECURITY INVOKER` + `SET search_path TO 'public'`.
- Idempotency: `IF EXISTS` / `ON CONFLICT`.
- Transactional operations — внутри одного RPC, не через client `Promise.all`.
- Новая RPC создаётся в `supabase/migrations` и требует проверки generated types.

Ключевые RPC: `copy_program_for_user`, `create_workouts_for_program`, `sync_program_changes_to_workouts`, `generate_share_code`, `search_exercises`, `get_exercise_filter_counts`, `save_program_snapshot`, `upsert_workout_logs`, `update_day_position`, `update_exercise_position`, `handle_new_user`.

## 4. Важные schema constraints

- `exercises` не имеет `description`.
- `profiles` не имеет `email`.
- `program_days.id` / `program_exercises.id` — uuid.
- `programs.id` / `program_phases.id` — text.
- `workout_logs.rpe` — smallint 1–10; `rir` — 0–5.
- `difficulty` — `easy/moderate/hard/max`.
- Exercise catalog содержит 870+ записей.

## 5. Training model

```text
programs
  → program_phases
    → program_days
      → program_exercises
```

Workout lifecycle:
- upfront creation через `create_workouts_for_program`;
- точечное создание через `workoutService.startProgramWorkout`;
- repeat через `workoutService.repeatWorkout`;
- progression: day → week → phase → completion.

Program changes синхронизируются только с будущими/не начатыми workouts (`started_at IS NULL AND finished_at IS NULL`). История не переписывается.

## 6. Product/UX technical rules

Подробная продуктовая модель — `PRODUCT.md`.

Core principles:
- Tracker first;
- progressive disclosure;
- workout logging важнее аналитики;
- RPE — одна tappable шкала 1–10;
- readiness — optional signal;
- alternatives доступны без перегрузки workout;
- temporary replacement и program replacement — разные операции;
- recommendation не блокирует тренировку;
- safety rules независимы от AI;
- существенные изменения требуют подтверждения пользователя.

## 7. Design system

Канон:

```tsx
const { colors } = useTheme();
style={{ backgroundColor: colors.primary }}
```

Использовать semantic tokens: `primary`, `textPrimary`, `textSecondary`, `textTertiary`, `textInverse`, `overlay`, `error`, `warning`, `success`, `LEVEL_COLORS`, `getMuscleColor`, `getPhaseColor`.

Не добавлять hardcoded colors. Spacing/radius — canonical constants.

## 8. Performance

1. Не вкладывать VirtualizedList в ScrollView; исключение — DraggableFlatList с `scrollEnabled={false}`.
2. QueryClient создаётся вне компонента.
3. List cards — `React.memo`; callbacks — `useCallback`.
4. Не тянуть тяжёлые данные в списки.
5. `useWindowDimensions()` вместо `Dimensions.get('window')`, кроме осознанного theme exception.
6. Reanimated `.value` — в worklet/animated style; JS commit — через `runOnJS`.
7. Gesture Handler — `simultaneousWithExternalGesture(Gesture.Native())` при необходимости.
8. Не монтировать media/slider content в collapsed accordion.
9. Не логировать в animation/onScroll/gesture loops.
10. Workout screen — приоритетная зона performance profiling.

## 9. Anti-patterns

Запрещено:
- server data в Zustand;
- Supabase напрямую из UI;
- N+1 вместо вложенных queries/RPC;
- `Math.random()` в keyExtractor;
- RN `Image`;
- LayoutAnimation в New Architecture;
- raw DB errors пользователю;
- неатомарные delete+insert для транзакционных операций;
- duplicate RLS;
- insecure `SECURITY DEFINER`;
- secrets/service-role keys в client code/git;
- LLM keys на клиенте;
- AI bypass injury/safety rules;
- PII/pharmacology в LLM без explicit consent;
- дублирование canonical color/phase/level mappings.

## 10. Pre-flight

Перед изменением:

1. Работать с актуальным `main`.
2. Найти потребителей изменяемого файла — `INVENTORY.md` и code search.
3. Проверить размер файла и текущий статус — `STATUS.md`.
4. Проверить продуктовый intent — `PRODUCT.md`.
5. Для RPC проверить migration + RLS + generated types.
6. Для Program Editor проверить sync semantics.
7. Для Workout проверить mount/render/performance impact.
8. После изменения обновить `STATUS.md` / `INVENTORY.md`, если фактическое состояние изменилось.

## 11. Database types

Legacy `--project-id` / `--linked` не использовать. Для текущего Supabase использовать pooler connection string и генерировать UTF-8 types. Пароль не вставлять в чат или git. После генерации проверить RPC в `database.types.ts` и `tsc --noEmit`.

## 12. AI rules

AI — optional clarification layer, не источник истины для core training logic.

```text
User context
    ↓
Training Engine + Safety
    ↓
Recommendation
    ↓
Optional AI clarification
    ↓
User confirmation
```

LLM keys — только server/Edge Function. AI foundation требует consent, PII filtering, rate limits и безопасный adapter.

## 13. При технической работе

Проверять:
- state architecture;
- Supabase boundary;
- UI/design tokens;
- performance;
- schema/API compatibility;
- loading/error/empty/null states;
- сохранение существующего функционала.

Документация обновляется в пяти source-of-truth файлах; один факт должен иметь одного владельца.
