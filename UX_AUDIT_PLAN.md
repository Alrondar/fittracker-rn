# FitTracker — UX/UI Audit Plan (архив)

Срез: 11.08.2026 · **архивирован 19.08.2026**

> ⚠️ **Архив.** Документ заменён статусами в `STATUS.md` (секция 4: AUDIT-1…AUDIT-4) и ROADMAP Этап H. Не обновлять (CLAUDE.md §0).

Это рабочая карта будущего постраничного UX/UI-аудита. Она не заменяет `ROADMAP.md` и не содержит кодовых статусов.

## Принципы аудита

Каждый экран оценивается по одинаковой схеме:

1. Цель экрана.
2. Главный пользовательский сценарий.
3. Информационная нагрузка.
4. Progressive disclosure.
5. Навигация и контекст.
6. UI hierarchy.
7. Тренерская логика.
8. Performance/TTI.
9. Что оставить.
10. Что убрать/перенести.
11. Что сделать sheet/modal.
12. Что отдать Training Engine.
13. Где AI уместен/неуместен.
14. Приоритет: 🔴 / 🟠 / 🟡 / 🟢.

## Приоритетный порядок

### 1. Workout — `app/(tabs)/workout/[id].tsx` 🔴

Главный риск: перегрузка во время тренировки.

Проверить:
- sets/reps/weight;
- RPE;
- rest timer;
- previous performance;
- progression;
- alternatives;
- warm-up;
- pain/injury;
- technique/media;
- notes.

Целевой принцип: core остаётся на экране, дополнительный контекст раскрывается по запросу.

### 2. Program Editor — `app/(tabs)/program/[id].tsx` 🔴

Главный риск: трёхуровневая/многоуровневая вложенность и сложный CRUD.

Проверить отдельно:
- Program;
- Phase/Week;
- Workout/Day;
- Exercise;
- sheets;
- drag & drop;
- save/sync;
- back/up navigation.

Цель: не убрать структуру, а сделать её понятной и постепенно раскрываемой.

### 3. Programs — `app/(tabs)/programs.tsx` 🟠

Проверить:
- готовые программы;
- личные программы;
- activation;
- import/share;
- create;
- Program Card.

Цель: каталог должен сразу объяснять разницу между готовыми и личными программами.

### 4. History — `app/(tabs)/history.tsx` 🟠

Проверить возможность календарного представления с отметками тренировок + список + детали.

### 5. Dashboard — `app/(tabs)/index.tsx` 🟠

Цель: быстро понять, что делать сегодня.

AI не должен занимать центральное место. Coaching tips — только при наличии полезного сигнала.

### 6. Workouts — `app/(tabs)/workouts.tsx` 🟠

Проверить навигацию по фазам/неделям и связь с активной программой.

### 7. Progress / metrics 🟠

Проверить, как разделить «историю событий» и «тренд/изменение».

### 8. Exercise Detail — `app/(tabs)/exercise/[id].tsx` 🟡

Проверить технику, оборудование, мышцы, alternatives и связь с workout.

### 9. Exercises — `app/(tabs)/exercises.tsx` 🟡

Проверить поиск, фильтры, infinite scroll и скорость нахождения упражнения.

### 10. Profile / Goals / Injuries / Metrics 🟡

Проверить, что пользователь понимает зачем заполнять данные и что из них реально используется.

## Сквозные вопросы

### Progressive disclosure

Можно ли скрыть второстепенную информацию до момента, когда она нужна?

### Training Engine

Можно ли решить задачу детерминированно и объяснимо без AI?

### AI

Если AI используется, зачем он нужен именно здесь? Можно ли вызвать его по запросу?

### User control

Может ли пользователь принять/изменить/отклонить рекомендацию?

### Safety

Может ли любой путь UI привести к обходу injury/pain constraints?

### Performance

Есть ли тяжёлый mount, лишний запрос, nested virtualized list или unnecessary rerender?

## Definition of a good screen

```text
Я понимаю, где я нахожусь.
Я понимаю, что могу сделать сейчас.
Я вижу только нужную информацию.
Остальное доступно по запросу.
Рекомендации понятны.
Я могу их отклонить.
Приложение не заставляет меня общаться с AI.
```

## 2026 Design Trends Checklist (для каждого экрана)

Этот блок — расширение аудита. Каждый экран сверяется с этими трендами, но решение принимается через `PRODUCT.md §3.1–3.5` и `CLAUDE.md §8`.

### Spatial / adaptive readiness

- Компонент адаптируется к разным размерам экрана (нет hardcoded widths/heights).
- Используется `useWindowDimensions()` или процентные размеры, где уместно.
- Layout не ломается на планшете / foldable.

### Gesture-first (без принуждения)

- Swipe to delete/dismiss там, где уместно.
- Long-press для контекстного меню.
- Pull to refresh для списков.
- Drag to reorder — для программ/упражнений.
- Haptic feedback для важных действий.
- **Важно**: у любого жеста есть tap-альтернатива.

### AI collaboration interfaces

- Для каждой рекомендации есть «Почему?».
- Явный «Не нравится это предложение» feedback.
- Consent перед анализом; PII filtering.

### Progressive disclosure score

Для каждого экрана оценить три уровня:

- **L1 (always visible)**: то, что пользователь видит сразу. Должно быть минимальным (для workout logging — L1 ≤ 3–4 элемента).
- **L2 (on demand)**: раскрывается по тапу (bottom sheet, accordion).
- **L3 (deep dive)**: требует отдельного экрана (details, history).

Цель: L1 не перегружает, L2 содержит тяжёлый контент, L3 не используется для частых действий.

### Bottom Sheet vs Modal

Для каждого sheet/modal задать вопрос:

- Контекстное действие? → **Bottom sheet** (выше engagement, ниже когнитивная нагрузка).
- Критическое решение? → **Modal** (требует полного внимания).
- Длинный контент? → **Bottom sheet с scroll**.
- Форма ввода? → **Modal для сложных форм, bottom sheet для простых**.

## Fitness App Specific Audit

### Workout Logging Flow

- [ ] Set → Rest → Next — минимум тапов.
- [ ] Previous results по запросу, не always visible.
- [ ] Recommendation card: вес × повторы — primary, Принять/Изменить — secondary, «Почему?» — tertiary (collapsible).
- [ ] RPE tappable 1–10, не draggable.
- [ ] Rest timer auto-start, но можно отменить.

### Recommendation Card Hierarchy

```text
┌─────────────────────────────┐
│ Рекомендуем                 │
│ 85 кг × 8                   │ ← Primary (крупный шрифт)
│                             │
│ [Принять] [Изменить]        │ ← Secondary (кнопки)
│                             │
│ [Почему?] ▼                 │ ← Tertiary (collapsible)
└─────────────────────────────┘
```

### Context Without Overload

- [ ] История упражнения — по тапу (bottom sheet).
- [ ] Альтернативы — по тапу (slider или bottom sheet).
- [ ] Техника — по тапу (accordion или bottom sheet).
- [ ] Warm-up — по тапу (bottom sheet).
- [ ] Pain/Safety — всегда visible если есть warning.
