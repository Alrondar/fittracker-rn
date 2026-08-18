# FitTracker — Current Status

Срез: 18.08.2026 (feature/workout-ux-rework)

Источник фактического состояния — текущий `main`. Если документ расходится с кодом, код имеет приоритет, после чего документ актуализируется.

## 1. Легенда

- ✅ готово
- 🟡 частично / есть остаток
- 🔲 открыто
- ⏸️ сознательно отложено

Приоритет: 🔴 критичный · 🟠 высокий · 🟡 средний · 🟢 низкий.

---

## 2. Technical baseline

| ID | Трек | Пр. | Статус | Комментарий |
|---|---|---:|---|---|
| SEC-1…SEC-10 | Security | — | ✅ | Основные security-проблемы закрыты |
| ARCH-1…ARCH-9 | Architecture | — | ✅ | Основные архитектурные проблемы закрыты; ARCH-8 (injury warnings) полностью на normalized tables |
| PERF-1…PERF-7 | Performance | — | ✅ | Основные проблемы закрыты; Workout остаётся зоной profiling |
| SCALE-3…SCALE-7 | Scalability | — | ✅ | Основные пункты закрыты |
| SCALE-1 | Testing | 🟠 | 🔲 | Автотесты отложены; чистые функции готовы к покрытию |
| SCALE-2 | Monitoring | 🟠 | 🔲 | Sentry до production build |
| RPC-1…RPC-3 | RPC | — | ✅ | Security/transaction RPC реализованы |
| DATA-1 | Data migration | — | ✅ | Reference data (equipment/injuries/alternatives) полностью на normalized tables; legacy columns dropped |
| PERF-8…PERF-10 | Performance/Design | 🟠 | 🔲 | См. секции 12 и 13: baseline метрик, аудит длинных списков, React Query audit |
| DS-1 | Design system | 🟠 | 🔲 | Аудит токенов/типографики/spacing/states перед Этапом H (ROADMAP) |

## 3. Existing product baseline

| ID | Область | Статус | Что уже есть |
|---|---|---|---|
| FIT-1 | Programs | ✅ | activation/deactivation/status |
| FIT-2 | Programs | ✅ | sync правок в будущие workouts |
| FIT-3 | Programs | ✅ | robust delete + invalidation |
| FIT-4 | Dashboard | ✅ | выбор программы при отсутствии active program |
| FIT-5 | Workouts | ✅ | следующая фаза/неделя |
| FIT-6 | Workout | ✅ | program + phase context |
| FIT-7 | Workouts | ✅ |пропуск тренировки программы: long press на «Следующая» → подтверждение, skipped_at + advanceProgramProgress, бейдж «Пропущена», в историю не попадает|
| FEAT-1.1 | Tracker | ✅ | per-set previous data + progression chips |
| FEAT-1.2 | Tracker | ✅ | rest timer + auto-start |
| FEAT-1.3 | Tracker | ✅ | streak |
| FEAT-1.4 | Progress | ✅ | e1RM / PR |
| FEAT-1.5 | Tracker | 🟡 | plate calculation logic есть, UI нет |
| FEAT-1.6 | History | 🟡 | CSV builder есть, service/UI отложены |
| FEAT-1.7 | Tracker | ✅ | RPE 1–10, tappable scale — канон |
| FEAT-1.8 | Context | ✅ | optional daily readiness |
| FEAT-1.9 | Safety | ✅ | pain sheet + injury caution + persistent state (PR6): prefill из pain_events, upsert/delete, «Боль прошла», visual affordance «⚠ Боль отмечена» |
| FEAT-2.2 | Progress | ✅ | WeightTrendChart + MetricSparkline + body metrics |
| UX-1 | Workout | ✅ | header разгружен, UnitToggle рядом с timer |
| UX-14 | Workout | ✅ | header variant D: Settings справа от названия, metadata слева, actions-bubbles справа |

## 4. Current UX work — Tracker

> Срез: работа в feature branch `feature/workout-ux-rework` (не смержена в main).

| ID | Пр. | Статус | Цель |
| --- | --- | --- | --- |
| UX-2 | 🔴 | ✅ | пполный аудит workout/[id].tsx и progressive disclosure — выполнено: display modes + секционная структура + AlternativeExerciseCard (PR5) + pain persistent state (PR6) + knowledge subheadings (PR7) + split workout/[id].tsx (PR8) |
| UX-3 | 🔴 | ✅ | context sheets: history / technique / warm-up / pain / notes —  закрыто : technique через accordion с подзаголовками (PR7), pain persistent state с prefill и delete (PR6), warm-up через вкладку WorkoutTabs + WarmupBlock, history — per-set previous data + вкладка History с деталями тренировок; notes отложены (нет таблицы, не подтверждена потребность) |
| UX-4 | 🔴 | ✅ | доступные alternatives без перегрузки — выполнено: slider + text affordance + облегчённая AlternativeExerciseCard (PR5): Польза/Риски/Противопоказания видимы сразу, Техника в lazy-mount аккордеоне |
| UX-5 | 🔴 | ✅ | temporary vs program replacement + skip workout — закрыто: Alert 3 кнопок (Отмена/Только сегодня/В программе destructive) + rollback для seeded программ + graceful degradation; пропуск тренировки программы: long press на «Следующая», skipped_at + advanceProgramProgress, бейдж «Пропущена» (FIT-7) |
| UX-6 | 🟠 | ✅ | |динамическая расшифровка RPE + быстрый skip — выполнено: «RPE N — description» в SetFeedbackEditor (FEAT-7 v2), кнопка «Пропустить» в редакторе (UX-6) |
| UX-7 | 🟠 | ✅ | |настройка частоты запроса RPE — выполнено: useRpeSettings (always/last-set/off), picker в settings, conditional rendering чипа в SetsGrid (UX-7) |
| UX-8 | 🟠 | ✅ | lazy mount тяжёлого контента — media/slider монтируется только при раскрытии accordion; stagger в ExerciseSlider |
| UX-9 | 🟠 | ✅ | History calendar с отметками — выполнено: HistoryCalendar (месяц, навигация, точки, тап по дню → DaySummaryCard через SheetShell); даты вычисляются локально из уже загруженных данных (ноль новых запросов); пропущенные тренировки не отображаются (Вариант A, консистентно с FIT-7) |
| UX-10 | 🟠 | ✅ | Calendar/List toggle + day details — выполнено: HistoryViewToggle segmented control + useHistoryView (persist в AsyncStorage, default calendar); list view сохранён без изменений; day details: тап по дню → DaySummaryCard → history/[id] |
| UX-11 | 🟠 | ✅ | Progress hub «Как я меняюсь?»: compact-итоги + e1RM-тренд (top-3) + объём (8 нед.) + вес + PR с датами + регулярность строкой; entry из profile.tsx, без bottom-tab (PRODUCT.md §11) |
| UX-12 | 🔴 | ✅ | display modes для workout cards (training/balanced/learn) + picker в settings |
| UX-13 | 🟠 | ✅ | секционная структура ExerciseCard + вынос Equipment из accordion + подзаголовки через SectionSubheading в «Техника выполнения» и «Важно знать» (единообразие, PR7) + финальная UX-корректировка: SetsGrid перемещён выше Technique/Knowledge (главный рабочий блок карточки) |
## 5. Training Engine

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| ENG-1 | 🔴 | 🔲 | формализовать progression rules |
| ENG-2 | 🔴 | 🔲 | structured reasons для recommendations |
| ENG-3 | 🔴 | 🔲 | readiness как optional signal |
| ENG-4 | 🔴 | 🔲 | safety precedence: pain/injury > recommendation > AI |
| ENG-5 | 🔴 | 🔲 | ranking exercise alternatives |
| ENG-6 | 🟠 | 🔲 | deterministic weekly summary |

## 6. Coaching Layer

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| COACH-1 | 🔴 | 🔲 | Recommendation card: Accept / Change / Why |
| COACH-2 | 🔴 | 🔲 | structured reasons |
| COACH-3 | 🟠 | 🔲 | acceptance/rejection feedback |
| COACH-4 | 🟠 | 🔲 | contextual tips без спама |
| COACH-5 | 🟠 | 🔲 | weekly review UI |

## 7. Programs / Program Editor

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| PROG-1 | 🔴 | 🔲 | аудит каталога готовых/личных программ |
| PROG-2 | 🔴 | 🔲 | аудит Program Card |
| PROG-3 | 🔴 | 🔲 | разделить Program Detail и Editor |
| PROG-4 | 🔴 | 🔲 | полный аудит вложенности Program → Phase/Week → Workout → Exercise |
| PROG-5 | 🔴 | 🔲 | progressive disclosure в Editor |
| PROG-6 | 🟠 | 🔲 | context/breadcrumb |
| PROG-7 | 🟠 | 🔲 | sheets + save/sync UX |

## 8. Optional AI Coach

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| AI-1 | 🟡 | 🔲 | server/Edge llm-proxy + consent + PII filter |
| AI-2 | 🟡 | 🔲 | уточнение нагрузки поверх Training Engine |
| AI-3 | 🟡 | 🔲 | Explain / Analyze |
| AI-4 | 🟡 | 🔲 | optional Coach chat |
| AI-5 | 🟢 | ⏸️ | AI-assisted program generation после стабилизации Editor |

## 9. Release / Quality

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| REL-1 | 🟠 | 🔲 | production build |
| REL-2 | 🟠 | 🔲 | Sentry |
| REL-3 | 🟠 | 🔲 | tests чистых функций |
| REL-4 | 🟠 | 🔲 | smoke/regression workout/program flows |
| REL-5 | 🟠 | 🔲 | UX/performance profiling после изменений |

## 10. Conscious backlog

Пока не делать главным приоритетом:
- обязательный AI chat;
- AI-generated program как основной onboarding;
- автоматическое молчаливое изменение нагрузки/программы;
- social;
- отдельную bottom-tab для каждого типа аналитики;
- сложные новые workout-сущности до стабилизации core tracker UX;
- HealthKit/Google Fit до подтверждения core retention.

## 11. Active feature branches

Активные WIP-ветки с работой, ещё не смерженной в `main`. Детали по задачам — в соответствующих секциях §4–§9; здесь — сводка.

| Ветка | Область | Основные ID |
|---|---|---|
| `feature/workout-ux-rework` | Tracker UX | UX-2…UX-13 |

После merge ветки строка удаляется; соответствующие ID в §4–§9 закрываются.

## 12. Performance metrics

Baseline — после первого замера (REL-5 / PERF-9). Любая оптимизация начинается с измерения, а не с предположения.

| Метрика | Цель | Текущее |
|---|---|---|
| Dashboard cold start → interactive | baseline после первого замера | не измерено |
| Mount workout screen (`workout/[id].tsx`) | baseline после первого замера | не измерено |
| Set logging (tap → save) | no dropped frames | не измерено |
| Scroll списка упражнений (pagination 40/page) | no dropped frames | не измерено |

## 13. Open technical debt (design / performance)

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| PERF-8 | 🟠 | 🔲 | Baseline-метрики workout screen и logging (см. секцию 12) |
| PERF-9 | 🟡 | 🔲 | Аудит длинных списков (exercises, history): применимость виртуализации/FlashList |
| PERF-10 | 🟡 | 🔲 | Аудит React Query `staleTime` / `gcTime` и N+1 в загрузчиках workout/history |
| DS-1 | 🟠 | 🔲 | Аудит design system: шкала типографики/spacing, состояния, тёмная тема — перед Этапом H (ROADMAP) |

## 14. Update rule

После изменения кода:
1. закрыть/изменить соответствующий ID;
2. добавить новый ID, если работа появилась впервые;
3. не копировать сюда архитектурные правила — они принадлежат `CLAUDE.md`;
4. не копировать сюда карту файлов — она принадлежит `INVENTORY.md`;
5. дату среза обновлять при существенном изменении статуса;
6. Performance metrics обновляются после каждого замера (секция 12).
