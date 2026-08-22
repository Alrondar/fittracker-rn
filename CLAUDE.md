# FitTracker RN — Development Guide

Срез: 16.08.2026

## 0. Source of truth

В репозитории используются пять рабочих документов:

| Файл | Владелец информации |
| --- | --- |
| CLAUDE.md | технические правила, архитектура, security, performance |
| PRODUCT.md | продуктовая философия и UX-инварианты |
| ROADMAP.md | последовательность работы |
| STATUS.md | фактический статус задач |
| INVENTORY.md | карта кода, роли экранов, blast-radius, известные грабли |

Не создавать отдельные документы для тех же тем без необходимости. Архивные `refactoring_guide.md` и `UX_AUDIT_PLAN.md` не обновлять.

### Код через MCP

Агент имеет доступ к локальным файлам проекта. Код — источник фактов (файлы, RPC, поля схемы, сигнатуры); документы — источник правил и решений.

- Перед изменением файл читается, его потребители ищутся code search'ом.
- При конфликте документа и кода побеждает код; документ исправляется в том же изменении.
- Карта кода, роли экранов, blast-radius и грабли принадлежат INVENTORY.md (единственный владелец); в остальные документы списки из кода не копируются — вместо них указатель, где проверять.

## 1. Стек

| Слой | Решение |
| --- | --- |
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

- Server data хранится только через React Query.
- `supabase.from()` и `supabase.auth.*` запрещены в UI; запросы идут через `src/services/`.
- Auth — единый `authService.ts`; auth redirects контролирует root `_layout.tsx`.
- Profile создаётся DB trigger `handle_new_user`; `ensureProfile` идемпотентен.
- Config — `src/lib/config.ts`, значения приходят из Expo config.
- User-facing errors — `mapError/extractMessage` или `mapAuthError`.
- Файл не должен разрастаться выше 500 строк; при >450 сначала рассмотреть split.
- `database.types.ts` должен соответствовать текущей схеме.
- Новая логика не должна ломать persistence, safety или program-sync semantics.

## 3. Data / Security

Клиент использует publishable key под RLS. Secret/service-role keys не хранятся в клиенте.

Основные RLS группы:

| Таблицы | Правило |
| --- | --- |
| user-owned tables | `auth.uid() = user_id` |
| profiles | `auth.uid() = id` |
| programs | seeded readable; private — owner |
| program/workout children | доступ через owner relationship |
| exercise reference tables | read access |

Новая таблица требует RLS.

### RPC

- RLS bypass → `SECURITY DEFINER` + явная проверка `auth.uid()`.
- RLS-respecting → `SECURITY INVOKER` + `SET search_path TO 'public'`.
- Idempotency: `IF EXISTS` / `ON CONFLICT`.
- Transactional operations — внутри одного RPC, не через client `Promise.all`.
- Новая RPC создаётся в `supabase/migrations` и требует проверки generated types.

Полный актуальный список RPC — `supabase/migrations` и `types/database.types.ts` (проверять через MCP, не по документам). Ориентиры: program sync (`sync_program_changes_to_workouts`), upfront workout creation (`create_workouts_for_program`), program copy (`copy_program_for_user`), логи (`upsert_workout_logs`), profile bootstrap (`handle_new_user`).

## 4. Важные schema constraints

Это известные грабли схемы; перед работой со схемой сверяться с `types/database.types.ts` и `supabase/migrations`.

- `exercises` не имеет `description`.
- `profiles` не имеет `email`.
- `program_days.id` / `program_exercises.id` — uuid.
- `programs.id` / `program_phases.id` — text.
- `workout_logs.rpe` — smallint 1–10; `rir` — 0–5.
- `difficulty` — `easy/moderate/hard/max`.
- Exercise catalog содержит 870+ записей.

## 5. Training model

programs
→ program_phases
→ program_days
→ program_exercises

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
- РPE — одна tappable шкала 1–10;
- readiness — optional signal;
- alternatives доступны без перегрузки workout;
- temporary replacement и program replacement — разные операции;
- recommendation не блокирует тренировку;
- safety rules независимы от AI;
- существенные изменения требуют подтверждения пользователя.

## 7. Design system

Канон:

```ts
const { colors } = useTheme();
style={{ backgroundColor: colors.primary }}
```

Использовать semantic tokens: primary, textPrimary, textSecondary, textTertiary, textInverse, overlay, error, warning, success, LEVEL_COLORS, getMuscleColor, getPhaseColor.

Не добавлять hardcoded colors. Spacing/radius — canonical constants.

Визуальные правила и дизайн-скилл — `PRODUCT.md §3.1–3.5`.

## 8. Performance

- Не вкладывать VirtualizedList в ScrollView; исключение — DraggableFlatList с scrollEnabled={false}.
- QueryClient создаётся вне компонента.
- List cards — React.memo; callbacks — useCallback.
- Не тянуть тяжёлые данные в списки.
- useWindowDimensions() вместо Dimensions.get('window'), кроме осознанного theme exception.
- Reanimated .value — в worklet/animated style; JS commit — через runOnJS.
- Gesture Handler — simultaneousWithExternalGesture(Gesture.Native()) при необходимости.
- Не монтировать media/slider content в collapsed accordion.
- Не логировать в animation/onScroll/gesture loops.
- Workout screen — приоритетная зона performance profiling.
- Длинные списки (сотни элементов, напр. каталог упражнений) — `@shopify/flash-list`; короткие и горизонтальные списки — `FlatList`.

### Performance gate (перед завершением задачи, затрагивающей UI или данные)

- Нет новых источников re-render в core flow: карточки списков — `React.memo`, хэндлеры — `useCallback`, нет новых inline-объектов/массивов в props мемоизированных детей.
- Тяжёлый контент (media, slider, charts, pickers) монтируется только при открытии.
- Новые server data — через React Query; запросы сгруппированы/вложены, без N+1.
- Списки: стабильные keys, нет `Math.random()` в keyExtractor, `VirtualizedList` не внутри `ScrollView`.
- Reanimated: `.value` в worklet/animated style; JS-эффекты — через `runOnJS`; нет логирования в циклах анимаций.
- Для изменений `workout/[id].tsx` и `useWorkoutSession` — явно оценить mount/render impact в описании задачи.

## 9. Anti-patterns

Запрещено:

- server data в Zustand;
- Supabase напрямую из UI;
- N+1 вместо вложенных queries/RPC;
- Math.random() в keyExtractor;
- RN Image;
- LayoutAnimation в New Architecture;
- raw DB errors пользователю;
- неатомарные delete+insert для транзакционных операций;
- duplicate RLS;
- insecure SECURITY DEFINER;
- secrets/service-role keys в client code/git;
- LLM keys на клиенте;
- AI bypass injury/safety rules;
- PII/pharmacology в LLM без explicit consent;
- дублирование canonical color/phase/level mappings.

## 10. Pre-flight

Перед изменением:

- Работать с актуальным main.
- Прочитать изменяемый файл и найти потребителей code search'ом через MCP — первичный источник.
- INVENTORY.md — роль экрана, blast-radius, известные грабли (вторичный источник).
- Проверить текущий статус задачи — STATUS.md.
- Проверить продуктовый intent — PRODUCT.md.
- Для RPC проверить migration + RLS + generated types.
- Для Program Editor проверить sync semantics.
- Для Workout проверить mount/render/performance impact.
- После изменения обновить STATUS.md / INVENTORY.md, если изменились статус, роль, blast-radius или грабли. Если по ходу работы обнаружен конфликт документа с кодом — исправить документ в этом же изменении.
- Перед завершением обязательно: `tsc --noEmit` и `eslint` (см. §14).

## 11. Database types

Legacy --project-id / --linked не использовать. Для текущего Supabase использовать pooler connection string и генерировать UTF-8 types. Пароль не вставлять в чат или git. После генерации проверить RPC в database.types.ts и tsc --noEmit.

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

Документация обновляется в пяти source-of-truth файлах; один факт должен иметь одного владельца. Факты о коде не документируются — они читаются через MCP; документируются только правила, решения, роли и грабли.

## 14. Agent workflow: spec → code → review

Любое существенное изменение проходит три стадии. Детали для агента — в `AGENTS.md`; здесь — технические gates.

### UI/UX задача

1. **Spec без кода**: user goal, уровни информации L1/L2 (PRODUCT.md §3.2), состояния (loading/error/empty/data), варианты (minimal / balanced).
2. **Подтверждение spec** пользователем (или явное «делай»).
3. **Реализация**: существующие компоненты/токены, lazy mount, минимальный diff.
4. **Review**: PRODUCT.md §3.1–3.5, performance gate §8, обновление STATUS.md / INVENTORY.md.

### Кодовая задача

1. **Читаем файл**, ищем потребителей через code search (MCP). Без MCP — карта зависимостей в INVENTORY.md; предположения обязаны быть явно помечены.
2. **План impact и риски**: re-render, mount cost, запросы, sync/safety semantics.
3. **Минимальный diff**; файл >450 строк — рассмотреть split.
4. **Review**: инварианты §2, антипаттерны §9, performance gate §8.

### Обязательные проверки перед «готово»

- `tsc --noEmit` проходит.
- `eslint` проходит; новые нарушения недопустимы.
- loading / error / empty / null states обработаны.
- Существующий функционал не сломан.
- STATUS.md / INVENTORY.md обновлены, если изменились статус / роль / blast-radius; drift документа исправлен в том же изменении.

## 15. Навигация (без MCP и с MCP)

### Без MCP

Агент не должен выдумывать содержимое файлов. Порядок:

1. Прочитать `AGENTS.md` — порядок чтения.
2. `PRODUCT.md` — продуктовый intent; §3.1–3.5 — дизайн-скилл.
3. `CLAUDE.md` — инварианты §2, performance §8, workflow §14.
4. `INVENTORY.md` — роли, blast-radius, **секция «§0 Navigation» даёт карту директорий и поисковые шаблоны**.
5. `STATUS.md` — статус задачи; §12 — метрики; §13 — tech debt.
6. Запросить текущие файлы у пользователя, явно пометить предположения.

### С MCP

Код — первичный источник фактов. Перед любым изменением:

- прочитать файл;
- найти потребителей code search'ом;
- проверить RPC в `supabase/migrations/` и `types/database.types.ts`.

Поисковые шаблоны — в `INVENTORY.md §0`.
