# ROADMAP.md — продуктовый roadmap FitTracker

Срез: 11.08.2026

Статусы: `TASKS_STATUS.md`. Архитектура: `CLAUDE.md`. Рецепты и зависимости: `PROMPTS.md`. Продуктовая философия: `PRODUCT_VISION.md`.

## 0. Новая точка отсчёта

Основной технический аудит SEC / ARCH / PERF / SCALE / RPC в текущем состоянии в основном закрыт. В Git уже есть рабочая tracker-основа: progression/prefill, RPE 1–10, readiness, pain, warm-up, injury warnings, rest timer, history, programs и performance improvements. fileciteturn21file0L2-L2

Roadmap меняется с **AI-first** на **tracker-first + coaching layer**.

```text
1. Отличный Tracker
        ↓
2. Training Engine
        ↓
3. Coaching Layer
        ↓
4. Optional AI Coach
        ↓
5. Расширение продукта
```

## 1. Product North Star

> **FitTracker помогает тебе лучше тренироваться и объясняет свои рекомендации.**

Не цель: «FitTracker знает, как тебе тренироваться».

Пользователь принимает решения. Система помогает ему делать это быстрее и осознаннее.

## 2. Этап A — базовый Tracker UX 🔴

### A1. Workout как главный сценарий

Цель: во время тренировки пользователь видит только то, что нужно для текущего подхода.

- разгрузить `workout/[id].tsx`;
- оставить core: упражнение → sets → rest → RPE;
- предыдущие результаты раскрывать по запросу;
- рекомендации показывать компактным coaching card/chip;
- историю, инструкцию, warm-up, заметки и pain открывать через sheet/modal;
- альтернативы сделать доступными без перегрузки основного экрана;
- различать «заменить сегодня» и «заменить в программе»;
- тяжёлые блоки монтировать по требованию.

### A2. RPE UX

Канон — одна шкала 1–10. Не возвращаться к нескольким шкалам.

Улучшить понятность:
- tappable scale;
- короткая динамическая расшифровка выбранного значения;
- быстрый skip;
- настройка частоты запроса RPE;
- RIR/difficulty остаются производными данными, а не отдельными UX-шкалами.

### A3. History / календарь

History отвечает на вопрос «когда и что я делал».

- календарь с отметками тренировок;
- список как альтернативное представление;
- день → детали тренировки;
- не смешивать History с Progress.

### A4. Progress

Progress отвечает на вопрос «как я меняюсь».

- сила;
- объём;
- PR/e1RM;
- body metrics;
- тренды;
- будущие coaching insights.

Пока не добавлять отдельную bottom-tab только ради Progress.

## 3. Этап B — Training Engine 🔴

Все базовые тренерские решения должны работать без AI.

### B1. Progression

- формализовать повышение/сохранение/снижение;
- учитывать sets/reps/RPE;
- использовать уже реализованный per-set previous data;
- хранить структурированные причины рекомендации.

### B2. Context / readiness

- readiness остаётся опциональным;
- не блокировать тренировку без check-in;
- readiness — дополнительный сигнал;
- pain и injury constraints имеют более высокий приоритет.

### B3. Safety

- `injury_exercise_warnings` — hard constraint;
- pain → caution/замена;
- AI не может обойти safety layer.

### B4. Alternatives

- ранжировать альтернативы по оборудованию, мышцам, паттерну и ограничениям;
- безопасные варианты выше;
- различать временную замену и изменение программы.

### B5. Explainability

Каждое существенное системное решение должно иметь структурированное «Почему?» без обязательного LLM.

## 4. Этап C — Coaching Layer 🔴

Цель: приложение становится полезнее, не становясь навязчивым.

### C1. Recommendation card

```text
Рекомендуем
85 кг × 8

[ Принять ] [ Изменить ]
[ Почему? ]
```

### C2. User control

При изменении предложить причины:
- устал;
- слишком тяжело;
- боль;
- хочу легче;
- другое.

Сохранять принятие/отклонение рекомендации как feedback.

### C3. Contextual tips

Только при полезном сигнале: progression, recovery, unusual fatigue, PR, deload, consistency.

Не превращать Dashboard/Workout в поток подсказок.

### C4. Weekly review

Сначала детерминированный summary: тренировки, объём, RPE, PR, pain/readiness signals. LLM для этого не обязателен.

## 5. Этап D — Programs и Editor 🔴

Programs — каталог и управление программами:

```text
Programs
├── Готовые
├── Мои
├── Импорт
└── Создать
```

### D1. Program Card

Карточка отвечает только на вопрос «что это и что можно сделать».

- готовая: открыть/начать;
- личная: открыть/редактировать/активировать.

### D2. Program Detail

Показывает структуру и контекст, но не обязан одновременно быть редактором.

### D3. Program Editor

Главная UX-проблема — вложенность и сложность.

```text
Program
  ↓
Phase/Week
  ↓
Workout
  ↓
Exercise
```

Данные сохраняют эту структуру, но UI не показывает все уровни одновременно.

Использовать:
- ясный текущий контекст;
- компактную иерархию/breadcrumb;
- отдельные sheets для настроек;
- постепенное раскрытие;
- понятный back/up flow.

Отдельно провести глубокий аудит `useProgramEditor.ts`, `program/[id].tsx`, `PhaseCard`, `DayCard` и sheets.

### D4. Sync semantics

Сохранить текущую модель: правки программы синхронизируются только с будущими/не начатыми тренировками.

## 6. Этап E — Optional AI Coach 🟡

AI появляется после того, как Tracker + Training Engine + Coaching Layer уже дают ценность сами по себе.

### E1. AI foundation

- Edge Function `llm-proxy`;
- серверные ключи;
- consent;
- PII filtering;
- rate limits;
- model-agnostic adapter.

### E2. AI уточняет нагрузку

Например: пользователь сообщает, что плохо спал, и спрашивает, стоит ли выполнять рекомендованный вес. AI может уточнить рекомендацию на основе контекста. Результат проходит safety/training constraints и подтверждается пользователем.

### E3. Explain / Analyze

- почему предложен вес;
- как идёт прогресс;
- почему неделя была тяжёлой;
- что можно изменить.

### E4. Chat Coach

Отдельная точка входа, не обязательная для тренировки.

### E5. Program generation

Только после стабильного Program Editor. LLM предлагает структуру; Training Engine и safety layer проверяют её до сохранения.

## 7. Этап F — Release / quality 🟠

- production build;
- Sentry;
- тесты чистых функций;
- smoke/regression для workout/program flows;
- UX performance profiling;
- store assets/privacy.

## 8. Этап G — расширение 🔵

После здоровых retention/activation:
- supersets/drop sets;
- cardio;
- notifications;
- HealthKit/Google Fit;
- social;
- i18n;
- Web/PWA;
- AI video analysis — long-term.

## 9. Что сознательно НЕ является ближайшим приоритетом

- обязательный AI chat;
- AI-generated program как основной onboarding;
- автоматическое молчаливое изменение программы;
- перегруженный Workout dashboard;
- отдельная вкладка для каждого типа аналитики;
- social до подтверждения core retention.

## 10. Definition of Done

Feature считается готовой, если:

1. Core tracker flow не стал медленнее.
2. Основной экран не перегружен.
3. Сложная информация раскрывается по запросу.
4. Понятно, что относится к Tracker / Engine / Coaching / AI.
5. Пользователь может отклонить существенную рекомендацию.
6. Safety rules не зависят от AI.
7. Изменение соблюдает архитектурные инварианты из `CLAUDE.md`.
