# FitTracker — Current Status

Срез: Срез: 15.08.2026

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
+ | ARCH-1…ARCH-9 | Architecture | — | ✅ | Основные архитектурные проблемы закрыты; ARCH-8 (injury warnings) полностью на normalized tables |
| PERF-1…PERF-7 | Performance | — | ✅ | Основные проблемы закрыты; Workout остаётся зоной profiling |
| SCALE-3…SCALE-7 | Scalability | — | ✅ | Основные пункты закрыты |
| SCALE-1 | Testing | 🟠 | 🔲 | Автотесты отложены; чистые функции готовы к покрытию |
| SCALE-2 | Monitoring | 🟠 | 🔲 | Sentry до production build |
| RPC-1…RPC-3 | RPC | — | ✅ | Security/transaction RPC реализованы |
| DATA-1 | Data migration | — | ✅ | Reference data (equipment/injuries/alternatives) полностью на normalized tables; legacy columns dropped |

## 3. Existing product baseline

| ID | Область | Статус | Что уже есть |
|---|---|---|---|
| FIT-1 | Programs | ✅ | activation/deactivation/status |
| FIT-2 | Programs | ✅ | sync правок в будущие workouts |
| FIT-3 | Programs | ✅ | robust delete + invalidation |
| FIT-4 | Dashboard | ✅ | выбор программы при отсутствии active program |
| FIT-5 | Workouts | ✅ | следующая фаза/неделя |
| FIT-6 | Workout | ✅ | program + phase context |
| FEAT-1.1 | Tracker | ✅ | per-set previous data + progression chips |
| FEAT-1.2 | Tracker | ✅ | rest timer + auto-start |
| FEAT-1.3 | Tracker | ✅ | streak |
| FEAT-1.4 | Progress | ✅ | e1RM / PR |
| FEAT-1.5 | Tracker | 🟡 | plate calculation logic есть, UI нет |
| FEAT-1.6 | History | 🟡 | CSV builder есть, service/UI отложены |
| FEAT-1.7 | Tracker | ✅ | RPE 1–10, tappable scale — канон |
| FEAT-1.8 | Context | ✅ | optional daily readiness |
| FEAT-1.9 | Safety | ✅ | pain sheet + injury caution |
| FEAT-2.2 | Progress | ✅ | WeightTrendChart + MetricSparkline + body metrics |
| UX-1 | Workout | ✅ | header разгружен, UnitToggle рядом с timer |

## 4. Current UX work — Tracker

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| UX-2 | 🔴 | 🔲 | полный аудит `workout/[id].tsx` и progressive disclosure |
| UX-3 | 🔴 | 🔲 | context sheets: history / technique / warm-up / pain / notes |
| UX-4 | 🔴 | 🔲 | доступные alternatives без перегрузки |
| UX-5 | 🔴 | 🔲 | temporary vs program replacement |
| UX-6 | 🟠 | 🔲 | динамическая расшифровка RPE + быстрый skip |
| UX-7 | 🟠 | 🔲 | настройка частоты запроса RPE |
| UX-8 | 🟠 | 🔲 | lazy mount тяжёлого контента |
| UX-9 | 🟠 | 🔲 | History calendar с отметками |
| UX-10 | 🟠 | 🔲 | Calendar/List toggle + day details |
| UX-11 | 🟠 | 🔲 | Progress как отдельная mental model, не History |

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

## 11. Update rule

После изменения кода:
1. закрыть/изменить соответствующий ID;
2. добавить новый ID, если работа появилась впервые;
3. не копировать сюда архитектурные правила — они принадлежат `CLAUDE.md`;
4. не копировать сюда карту файлов — она принадлежит `INVENTORY.md`;
5. дату среза обновлять при существенном изменении статуса.
