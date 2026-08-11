# TASKS_STATUS.md — актуальные статусы

Срез: 11.08.2026

Легенда: ✅ закрыто · 🟡 частично · 🔲 открыто. Приоритет: 🔴 критично · 🟠 высокий · 🟡 средний · 🟢 низкий.

> Источник текущего состояния — код `main`. Этот файл не должен содержать старые AI-first задачи как главный план.

## Технический долг

| ID | Трек | Пр. | Описание | Статус | Комментарий |
|---|---|---:|---|---|---|
| SEC-1…SEC-10 | Безопасность | — | Исторический security audit | ✅ | Основные пункты закрыты к 04.08.2026 |
| ARCH-1…ARCH-9 | Архитектура | — | Исторический architecture audit | ✅ | Основные пункты закрыты; остаточный hardcode не расширять |
| PERF-1…PERF-7 | Производительность | — | Исторический performance audit | ✅ | Основные проблемы закрыты; Workout остаётся зоной UX/perf-проверки |
| SCALE-3…SCALE-7 | Масштабируемость | — | Исторический scale audit | ✅ | Основные пункты закрыты |
| SCALE-1 | Масштабируемость | 🟠 | Автотесты | 🔲 | Отложено до стабилизации; приоритет — чистые функции + smoke flows |
| SCALE-2 | Масштабируемость | 🟠 | Sentry / crash monitoring | 🔲 | До production build |
| RPC-1…RPC-3 | RPC | — | Security/transaction RPC | ✅ | Реализовано |

## Текущий продуктовый baseline

| ID | Трек | Пр. | Описание | Статус | Комментарий |
|---|---|---:|---|---|---|
| FIT-1 | Product | 🟠 | Активация программ | ✅ | activate/deactivate/status |
| FIT-2 | Product | 🟠 | Синхронизация правок программы → будущие тренировки | ✅ | RPC sync_program_changes_to_workouts |
| FIT-3 | Product | 🟠 | Робастное удаление программы | ✅ | deleteProgram + invalidation |
| FIT-4 | Product | 🟢 | Нет активной программы → выбрать программу | ✅ | Dashboard |
| FIT-5 | Product | 🟢 | Следующая фаза/неделя | ✅ | Workouts |
| FIT-6 | Product | 🟢 | Программа + фаза в workout header | ✅ | getWorkoutProgramInfo |
| FEAT-1.1 | Tracker | 🔴 | Prefill подходов + progression chips + previous data | ✅ | v2: per-set previous* |
| FEAT-1.2 | Tracker | 🟡 | Rest timer + auto-start | ✅ | RestTimer v2 |
| FEAT-1.3 | Tracker | 🟢 | Streak | ✅ | Dashboard |
| FEAT-1.4 | Tracker | 🟢 | e1RM / PR | ✅ | dashboardService + utils/e1rm |
| FEAT-1.5 | Tracker | 🟡 | Plate calculator | 🟡 | Logic есть, UI отсутствует |
| FEAT-1.6 | Tracker | 🟢 | CSV export | 🟡 | Builder есть, service/UI позже |
| FEAT-1.7 | Tracker | 🔴 | RPE 1–10 | ✅ | Tappable scale; это канон |
| FEAT-1.8 | Context | 🟠 | Daily readiness | ✅ | Опциональный check-in; текущий flow требует UX-проверки на навязчивость |
| FEAT-1.9 | Safety | 🔴 | Pain flag | ✅ | PainSheet + injury caution |
| FEAT-2.2 | Progress | 🟠 | Weight/metrics trends | ✅ | WeightTrendChart + MetricSparkline |
| UX-1 | UX | 🟠 | Разгрузка workout header | ✅ | UnitToggle рядом с timer |

## Новая продуктовая программа

### TRACKER UX

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| UX-2 | 🔴 | Полный UX-аудит `workout/[id].tsx`: progressive disclosure | 🔲 |
| UX-3 | 🔴 | Context sheets для history / technique / warm-up / pain / notes | 🔲 |
| UX-4 | 🔴 | Доступные альтернативы без перегрузки workout | 🔲 |
| UX-5 | 🔴 | Различать temporary replacement и program replacement | 🔲 |
| UX-6 | 🟠 | RPE: динамическая расшифровка 1–10 + быстрый skip | 🔲 |
| UX-7 | 🟠 | Настройка частоты запроса RPE | 🔲 |
| UX-8 | 🟠 | Не монтировать тяжёлый дополнительный контент до открытия | 🔲 |
| UX-9 | 🟠 | History: календарь с отметками тренировок | 🔲 |
| UX-10 | 🟠 | History: Calendar/List toggle + day details | 🔲 |
| UX-11 | 🟠 | Отдельная модель Progress без смешения с History | 🔲 |

### TRAINING ENGINE

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| ENG-1 | 🔴 | Формализовать progression rules | 🔲 |
| ENG-2 | 🔴 | Структурированные причины recommendation | 🔲 |
| ENG-3 | 🔴 | Readiness как optional signal, не обязательный gate | 🔲 |
| ENG-4 | 🔴 | Safety precedence: injury/pain > AI suggestion | 🔲 |
| ENG-5 | 🔴 | Ранжирование exercise alternatives | 🔲 |
| ENG-6 | 🟠 | Weekly deterministic training summary | 🔲 |

### COACHING LAYER

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| COACH-1 | 🔴 | Recommendation card: Accept / Change / Why | 🔲 |
| COACH-2 | 🔴 | Причины изменения рекомендации | 🔲 |
| COACH-3 | 🟠 | Лог принятых/отклонённых рекомендаций | 🔲 |
| COACH-4 | 🟠 | Контекстные tips без спама | 🔲 |
| COACH-5 | 🟠 | Weekly review UI | 🔲 |

### PROGRAMS / EDITOR

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| PROG-1 | 🔴 | UX-аудит каталога готовых/личных программ | 🔲 |
| PROG-2 | 🔴 | UX-аудит Program Card | 🔲 |
| PROG-3 | 🔴 | Разделить Program Detail и Editor mental models | 🔲 |
| PROG-4 | 🔴 | Полный аудит Program Editor: Program → Phase/Week → Workout → Exercise | 🔲 |
| PROG-5 | 🔴 | Упростить редактор через progressive disclosure | 🔲 |
| PROG-6 | 🟠 | Контекст/breadcrumb для текущего уровня | 🔲 |
| PROG-7 | 🟠 | Проверить sheets и save/sync UX | 🔲 |

### OPTIONAL AI COACH

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| AI-1 | 🟡 | Edge Function llm-proxy + consent + PII filter | 🔲 |
| AI-2 | 🟡 | AI уточняет нагрузку поверх Training Engine | 🔲 |
| AI-3 | 🟡 | Explain/Analyze контекста | 🔲 |
| AI-4 | 🟡 | Отдельный optional Coach chat | 🔲 |
| AI-5 | 🟢 | AI-assisted program generation после стабилизации Editor | 🔲 |

### RELEASE / QUALITY

| ID | Пр. | Задача | Статус |
|---|---:|---|---|
| REL-1 | 🟠 | Production build | 🔲 |
| REL-2 | 🟠 | Sentry | 🔲 |
| REL-3 | 🟠 | Tests чистых функций | 🔲 |
| REL-4 | 🟠 | Smoke/regression workout/program flows | 🔲 |
| REL-5 | 🟠 | UX/performance profiling после новых UI-изменений | 🔲 |

## Сознательно отложено

- обязательный AI chat;
- AI-generated program как основной onboarding;
- автоматическое молчаливое изменение нагрузки/программы;
- social;
- отдельная bottom-tab для каждого типа аналитики;
- сложные новые workout-сущности до стабилизации core tracker UX.
