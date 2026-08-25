# FitTracker — Product Roadmap

Срез: 24.08.2026

Source of truth: `STATUS.md` — статусы, `CLAUDE.md` — technical rules, `PRODUCT.md` — product/UX principles, `INVENTORY.md` — code map.

## 0. Новая точка отсчёта

Основной технический аудит SEC / ARCH / PERF / SCALE / RPC в текущем состоянии в основном закрыт. В текущем `main` уже есть рабочая tracker-основа: progression/prefill, RPE 1–10, readiness, pain, warm-up, injury warnings, rest timer, history, programs, body metrics/trends и performance improvements.

Roadmap меняется с AI-first на:

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

Design polish (Stage H) и performance measurement (Stage I) — параллельные этапы, которые стартуют после стабилизации core Tracker UX.

## 1. Product North Star

> **FitTracker помогает тебе лучше тренироваться и объясняет свои рекомендации.**

Пользователь остаётся главным. Система помогает ему тренироваться, вести дневник, понимать рекомендации и принимать решения.

## 2. Этап A — Tracker UX 🔴

### A1. Workout

Цель: во время тренировки пользователь видит только то, что нужно для текущего действия.

- core: exercise → sets → rest → RPE;
- previous results раскрывать по запросу;
- recommendation — компактная card/chip;
- history / technique / warm-up / notes / pain — sheets/modals;
- alternatives доступны без перегрузки;
- temporary replacement и program replacement различаются;
- тяжёлый контент монтируется по требованию;
- проверить `workout/[id].tsx` на UX и performance.

### A2. RPE

Канон — одна tappable шкала 1–10.

Улучшения:
- динамическая короткая расшифровка;
- быстрый skip;
- настройка частоты запроса;
- RIR/difficulty остаются производными значениями, а не отдельными UX-шкалами.

### A3. History

History отвечает: «когда и что я делал?»

- календарь с отметками тренировок;
- Calendar/List toggle;
- выбранный день → детали тренировки;
- не смешивать History с Progress.

### A4. Progress

Progress отвечает: «как я меняюсь?»

- сила;
- объём;
- PR/e1RM;
- body metrics;
- тренды;
- coaching insights.

Пока не добавлять отдельную bottom-tab только ради Progress.

## 3. Этап B — Training Engine 🔴

Базовые тренерские решения должны работать без AI.

### B1. Progression

- формализовать повышение/сохранение/снижение;
- учитывать sets/reps/RPE;
- использовать per-set previous data;
- хранить структурированные причины recommendation.

### B2. Context

- readiness — optional signal;
- отсутствие check-in не блокирует тренировку;
- pain/injury имеют больший приоритет.

### B3. Safety

`injury_exercise_warnings` — hard constraint. AI не может его обойти.

### B4. Alternatives

Ранжировать варианты по:
- muscle group;
- movement pattern;
- equipment;
- level;
- injury/pain constraints.

Различать временную замену и изменение программы.

### B5. Explainability

Существенные системные решения должны иметь структурированное «Почему?» без обязательного LLM.

## 4. Этап C — Coaching Layer 🔴

Цель: сделать приложение полезнее, не превращая его в навязчивого тренера.

### C1. Recommendation card

```text
Рекомендуем
85 кг × 8

[ Принять ] [ Изменить ]
[ Почему? ]
```

### C2. User control

При изменении можно зафиксировать причину:
- устал;
- слишком тяжело;
- боль;
- хочу легче;
- другое.

Acceptance/rejection может использоваться как feedback для системы.

### C3. Contextual tips

Только при полезном сигнале: progression, recovery, unusual fatigue, PR, deload, consistency.

### C4. Weekly review — baseline

Базовый deterministic summary уже определяет направление: тренировки, объём, RPE, PR, pain/readiness signals. LLM не обязателен.

Следующий этап — расширить этот baseline до полноценного **Coaching Intelligence**, не заменяя существующий Tracker или Training Engine.

### C5. Coaching Intelligence — общий принцип

Цель: научить существующие данные приложения работать вместе и отвечать пользователю:

> что происходит → почему это происходит → что можно учитывать дальше.

Порядок ответственности:

```text
Tracker
  └─ хранит факты и историю

Training Engine
  └─ принимает детерминированные тренировочные решения

Coaching Intelligence
  └─ анализирует тенденции и формирует insights

Coaching Layer
  └─ показывает и объясняет insights

Optional AI
  └─ только уточняет и объясняет структурированные факты
```

AI не является источником фактов и не может самостоятельно обходить safety или deterministic training decisions.

Новые coaching-решения должны иметь:
- понятный тип сигнала;
- severity;
- summary;
- structured reason codes / факторы;
- исходные метрики или факты, на которых основан вывод;
- понятное объяснение;
- recommendation только при наличии достаточного сигнала;
- действие пользователя только там, где оно действительно полезно.

### C6. CI-1 — Weekly Training Review 🔴

**Цель:** создать полноценный детерминированный недельный обзор, который превращает существующие данные Tracker и Training Engine в понятный ответ:

> что произошло за неделю → почему это важно → что стоит учитывать дальше.

Использовать существующие данные, где они доступны:
- completed/planned workouts;
- effective workout date (`finished_at ?? started_at ?? created_at`);
- workout volume и frequency;
- exercise performance;
- RPE;
- readiness;
- pain/injury/safety signals;
- PR/e1RM и progress metrics;
- program context.

Минимальные блоки обзора:

1. **Consistency**
   - выполненные / запланированные тренировки, если есть program context;
   - frequency;
   - сравнение с предыдущим сопоставимым периодом.

2. **Performance**
   - упражнения с улучшением;
   - стабильные результаты;
   - повторяющееся ухудшение только при достаточном количестве данных.

3. **Training load**
   - изменение объёма;
   - изменение частоты;
   - изменение субъективной сложности (RPE).

4. **Recovery / safety context**
   - readiness trend;
   - сочетание readiness и RPE;
   - повторяющиеся pain/injury signals;
   - safety всегда имеет приоритет над обычной рекомендацией.

5. **Next-step context**
   - не обязательная команда, а объяснимая рекомендация или observation;
   - пользователь может продолжить текущий план, рассмотреть сохранение нагрузки или открыть подробности.

**Не делать:**
- не использовать LLM для расчёта фактов;
- не менять программу автоматически;
- не ставить медицинские диагнозы;
- не объявлять плато по нескольким случайным тренировкам;
- не показывать recommendation без причин.

**Definition of Done:**
- обзор работает на реальных данных пользователя;
- empty / insufficient-data states понятны;
- каждый важный insight объясним;
- рекомендации имеют structured reasons;
- нет зависимости от AI;
- existing weekly summary не ломается и может использоваться как baseline/data source;
- effective workout date соблюдается во всех новых расчётах.

### C7. CI-2 — Training Load Context 🔴

**Цель:** дать пользователю понятный контекст накопленной тренировочной нагрузки без «магического» непрозрачного fatigue score.

Система анализирует относительно собственной недавней нормы пользователя:
- volume trend;
- frequency trend;
- RPE / subjective intensity trend;
- readiness trend, если данные есть;
- pain/safety context как отдельный сигнал.

Выводимые уровни:
- normal;
- elevated;
- high.

Каждый уровень обязан иметь объяснение:

> «Повышенная нагрузка, потому что объём вырос на X%, тренировок стало больше, а средний RPE выше твоего обычного уровня».

Правила:
- отсутствие readiness не блокирует анализ;
- один плохой сигнал не должен автоматически означать fatigue;
- safety/pain не маскируются общим load score;
- не выдавать ложную точность в виде необъяснимого 0–100 score на первом этапе.

**Definition of Done:**
- baseline сравнения определён и документирован в коде;
- уровни строятся из нескольких сигналов;
- причины доступны UI;
- insufficient-data state не превращается в fake certainty;
- расчёт deterministic и тестируемый.

### C8. CI-3 — Plateau Detection 🟠

**Цель:** выявлять устойчивое замедление прогресса, а не реагировать на одну неудачную тренировку.

Анализировать достаточное окно истории (ориентир: несколько тренировок и/или 3–6 недель, точный порог определяется реализацией и данными).

Основные сигналы:
- performance не улучшается;
- при этом RPE растёт или остаётся непропорционально высоким;
- тренд повторяется;
- контекст readiness/load не противоречит выводу.

Результат должен быть observation:

> «Похоже, прогресс в упражнении замедлился».

Возможные варианты:
- сохранить нагрузку;
- временно не повышать вес;
- изменить rep range;
- рассмотреть альтернативное упражнение;
- рассмотреть deload при наличии дополнительных сигналов.

**Не делать:**
- не менять программу автоматически;
- не объявлять plateau при недостатке данных;
- не подменять plateau медицинской или recovery-диагностикой.

### C9. CI-4 — Muscle Volume Analysis 🟠

**Цель:** показать распределение тренировочной работы по мышечным группам и его тренды.

Основа:
- completed working sets;
- exercise → primary/secondary muscles;
- единые внутренние правила учёта косвенной нагрузки.

Пользователь должен видеть:
- weekly muscle volume;
- изменение относительно собственного baseline;
- заметный дисбаланс или необычное изменение как insight, а не как абсолютный медицинский норматив.

Важно:
- коэффициенты primary/secondary muscles — внутренняя модель, а не «абсолютная истина»;
- UI не должен перегружать Dashboard;
- основной смысл — тренд и контекст.

### C10. CI-5 — Goal-aware Insights 🟠

**Цель:** связать цель пользователя с тем, какие показатели и coaching insights действительно важны.

Приоритеты:

- **strength:** e1RM, основные lifts, intensity, progression;
- **hypertrophy:** weekly sets, muscle distribution, progression, consistency;
- **body composition / fat loss:** weight trend, activity, consistency, nutrition context при наличии данных;
- **general fitness:** consistency, frequency, gradual progression, activity.

Правила:
- не создавать отдельный набор экранов для каждой цели;
- адаптировать приоритеты Dashboard / Progress / Coaching;
- отсутствие nutrition data не должно ломать тренировочные рекомендации.

### C11. CI-6 — Deload Recommendations 🟡

**Зависит от:** CI-2 + CI-3.

**Цель:** предлагать разгрузку только при сочетании нескольких устойчивых сигналов, например:
- повышенная накопленная нагрузка;
- ухудшение readiness trend;
- замедление progress;
- рост RPE при отсутствии улучшения.

Результат:

> «Рассмотри разгрузочную неделю».

Пользователь может:
- узнать «Почему?»;
- посмотреть возможный план;
- продолжить текущий план.

Автоматически изменять программу или нагрузку нельзя.

### C12. CI-7 — Optional AI Explanations 🟡

**Зависит от:** стабильного Coaching Intelligence и этапа E.

AI получает структурированные facts/reason codes и помогает:
- объяснить recommendation;
- ответить на вопрос о weekly review;
- пояснить plateau/load context;
- предложить варианты для обсуждения.

Канонический поток:

```text
Database / Tracker
        ↓
Training Engine
        ↓
Structured facts + reason codes
        ↓
Coaching Intelligence
        ↓
Optional AI explanation
```

AI:
- не создаёт факты вместо deterministic analysis;
- не обходит safety constraints;
- не принимает молчаливые изменения за пользователя;
- явно сообщает об ограниченности данных, если structured analysis не уверен.

## 5. Этап D — Programs / Program Editor 🔴

Programs — полноценный каталог и управление:

```text
Programs
├── Готовые
├── Мои
├── Импорт
└── Создать
```

### D1. Program Card

Карточка отвечает: «что это и что я могу сделать?»

Готовая: открыть/начать. Личная: открыть/редактировать/активировать.

### D2. Program Detail

Detail отвечает: «как устроена программа и подходит ли она мне?»

Editor отвечает: «как её изменить?»

### D3. Program Editor

Главный UX-риск — вложенность:

```text
Program
  ↓
Phase / Week
  ↓
Workout / Day
  ↓
Exercise
```

Данные сохраняют структуру, но UI не показывает все уровни одновременно.

Нужно проверить:
- `useProgramEditor.ts`;
- `useProgramPhases.ts`;
- `program/[id].tsx`;
- `PhaseCard`;
- `DayCard`;
- все editor sheets;
- drag & drop;
- save/sync UX;
- breadcrumb/context.

### D4. Sync

Сохранять текущую семантику: изменения программы применяются только к будущим/не начатым тренировкам.

## 6. Этап E — Optional AI Coach 🟡

AI появляется после того, как Tracker + Engine + Coaching уже дают самостоятельную ценность.

### E1. Foundation

- Edge Function `llm-proxy`;
- server-side keys;
- consent;
- PII filtering;
- rate limits;
- model-agnostic adapter.

### E2. уточнение нагрузки

AI может уточнить рекомендацию, если пользователь сообщает контекст вроде плохого сна, усталости или необычной нагрузки. Результат проходит Training Engine/Safety и подтверждается пользователем.

### E3. Explain / Analyze

- почему предложен вес;
- как идёт прогресс;
- почему неделя тяжёлая;
- что можно изменить.

### E4. Optional Coach chat

Отдельная точка входа, не обязательная для workout.

### E5. Program generation

Только после стабильного Editor. LLM предлагает, Engine + Safety проверяют, пользователь подтверждает.

## 7. Этап F — Release / Quality 🟢

> **Отложено до появления конкретного плана публикации.**

- production build;
- Sentry;
- tests чистых функций;
- smoke/regression workout/program flows;
- UX/performance profiling;
- store/privacy readiness;
- quality gates: `tsc --noEmit` + `eslint` mandatory (CLAUDE.md §14).

## 8. Этап H — Design system polish 🟠

Стартует после стабилизации tracker UX (A). Цель — довести визуальную часть до уровня продуктовой модели, не ломая существующую design system.

### H1. Visual audit

Аудит по `PRODUCT.md §3.1–3.5`: hierarchy, состояния (loading/error/empty), spacing, тёмная тема. Решение о переходе на новый UI kit — **только после H**, если текущей design system недостаточно.

### H2. Workout surfaces

- Recommendation card hierarchy (COACH-1).
- RPE clarity (UX-6/7).
- Остаток progressive disclosure (UX-2…UX-5).

### H3. Program surfaces

Detail / Editor mental models (PROG-1…PROG-7).

### H4. Accessibility basics

- Dynamic Type;
- contrast ratios (WCAG 2.1 AA);
- tap targets ≥ 44pt;
- VoiceOver/TalkBack sanity checks.

## 9. Этап I — Performance and measurement 🟠

Стартует параллельно с H после стабилизации A.

### I1. Baseline metrics

Снять первые метрики (`STATUS.md §12`): cold start, workout screen mount, set logging, list scroll. Без метрик оптимизация — догадка.

### I2. Profiling

Профилирование workout flow после UX-изменений; исправление регрессий (связано с REL-5).

### I3. Long lists audit

Применимость виртуализации/FlashList в длинных списках (PERF-9).

### I4. Quality gates

`tsc --noEmit` + `eslint` обязательны перед «готово» (`CLAUDE.md §14`).

## 10. Этап G — Long-term 🔵

После подтверждения core retention **и прохождения этапов H/I**:

- supersets/drop sets;
- cardio;
- notifications;
- HealthKit/Google Fit;
- social;
- i18n;
- Web/PWA;
- AI video analysis.

## 11. Conscious non-priorities

- **релиз в сторы и финальные quality gates (Этап F)** — отложено до появления конкретного плана публикации;
- обязательный AI chat;
- AI-generated program как основной onboarding;
- молчаливое изменение нагрузки/программы;
- перегруженный Workout dashboard;
- отдельная вкладка для каждого типа аналитики;
- social до подтверждения core retention;
- сложные новые workout entities до стабилизации tracker UX;
- новый UI kit до прохождения этапа H (если текущей design system достаточно).

## 12. Definition of Done

Feature готова, если:
1. core tracker flow не стал медленнее;
2. основной экран не перегружен;
3. сложная информация раскрывается по запросу;
4. понятна граница Tracker / Engine / Coaching / AI;
5. существенную рекомендацию можно отклонить;
6. safety rules не зависят от AI;
7. архитектурные инварианты `CLAUDE.md` соблюдены;
8. `tsc --noEmit` и `eslint` проходят;
9. изменённые факты отражены в `STATUS.md` / `INVENTORY.md`;
10. UI-изменения сверены с `PRODUCT.md §3.1–3.5`.

## 13. Roadmap update rules

- Roadmap содержит план и зависимости, а не детальные статусы.
- Статус каждой задачи — `STATUS.md`.
- Расположение кода — `INVENTORY.md`.
- Архитектурное правило — `CLAUDE.md`.
- Продуктовое решение — `PRODUCT.md`.
- Один факт должен иметь одного владельца.
