# FitTracker — Current Status

Срез: 28.08.2026 (main) [P1 Cycle added]

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
| ARCH-10 | Architecture | — | ✅ | Аудит и очистка workout data flow: удалены неиспользуемые таблицы `workout_sessions` и `session_sets`; `workout_logs` зафиксирован как единственный source of truth для подходов |
| PERF-1…PERF-7 | Performance | — | ✅ | Основные проблемы закрыты; Workout остаётся зоной profiling |
| SCALE-3…SCALE-7 | Scalability | — | ✅ | Основные пункты закрыты |
| SCALE-1 | Testing | 🟢 | 🔲 | Автотесты отложены до релиза; чистые функции готовы к покрытию |
| SCALE-2 | Monitoring | 🟢 | 🔲 | Sentry до production build (отложено) |
| RPC-1…RPC-3 | RPC | — | ✅ | Security/transaction RPC реализованы |
| DATA-1 | Data migration | — | ✅ | Reference data (equipment/injuries/alternatives) полностью на normalized tables; legacy columns dropped |
| PERF-8, PERF-10|Performance/Design | 🟠 |🔲|См. секции 12 и 13: baseline метрик, React Query audit. PERF-9 — ✅ (FlashList, §13)|
| DS-1 | Design system | 🟠 | ✅ | Аудит токенов/типографики/spacing/states завершён. Контраст textTertiary исправлен (WCAG 2.1 AA), добавлен fontScale и accessibilityRole/Label в AppButton и ProgramCard (Этап H4) |

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
| FIT-8 | History / Progress / Dashboard | ✅ | **effective date для тренировок** (bugfix 2026-08-23): исправлено использование `created_at` как даты тренировки в History/Progress/Dashboard/Streak/PR; effective date = `finished_at ?? started_at ?? created_at` (CLAUDE.md §4); хелпер `effectiveDate()` в historyService.ts, аналогичные inline-вычисления в dashboardService / progressService / weeklySummaryService |
| FEAT-1.1 | Tracker | ✅ | per-set previous data + progression chips; chips ручной корректировки доступны через «Изменить» в RecommendationCard (COACH-1) |
| FEAT-1.2 | Tracker | ✅ | rest timer + auto-start |
| FEAT-1.3 | Tracker | ✅ | streak |
| FEAT-1.4 | Progress | ✅ | e1RM / PR |
| FEAT-1.5 | Tracker | 🟡 | plate calculation logic есть, UI нет |
| FEAT-1.6 | History | 🟡 | CSV builder есть, service/UI отложены |
| FEAT-1.7 | Tracker | ✅ | RPE 1–10, tappable scale — канон |
| FEAT-1.8 | Context | ✅ | optional daily readiness (P0: expanded with sleep/stress details, auto-calculation, and L3 trends) |
| FEAT-1.9 | Safety | ✅ | pain sheet + injury caution + persistent state (PR6): prefill из pain_events, upsert/delete, «Боль прошла», visual affordance «⚠ Боль отмечена» |
| FEAT-2.2 | Progress | ✅ | WeightTrendChart + MetricSparkline + body metrics |
| FEAT-2.3 | Progress | ✅ | Разделение бедра на левое/правое (thigh_left_cm/thigh_right_cm) для консистентности с другими конечностями; thigh_cm — legacy (как arm_cm); миграция 20260823_split_thigh_cm.sql копирует данные в обе новые колонки; UI автоматически поддерживает через METRIC_FIELDS |
| UX-1 | Workout | ✅ | header разгружен, UnitToggle рядом с timer |
| UX-14 | Workout | ✅ | header variant D: Settings справа от названия, metadata слева, actions-bubbles справа |

## 4. Current UX work — Tracker

> Срез: Ветка `feature/workout-ux-rework` смержена в main; все ID закрыты.

| ID | Пр. | Статус | Цель |
| --- | --- | --- | --- |
| UX-2 | 🔴 | ✅ | пполный аудит workout/[id].tsx и progressive disclosure — выполнено: display modes + секционная структура + AlternativeExerciseCard (PR5) + pain persistent state (PR6) + knowledge subheadings (PR7) + split workout/[id].tsx (PR8) |
| UX-3 | 🔴 | ✅ | context sheets: history / technique / warm-up / pain / notes —  закрыто : technique через accordion с подзаголовками (PR7), pain persistent state с prefill и delete (PR6), warm-up через вкладку WorkoutTabs + WarmupBlock, history — per-set previous data + вкладка History с деталями тренировок; notes отложены (нет таблицы, не подтверждена потребность) |
| UX-4 | 🔴 | ✅ | доступные alternatives без перегрузки — выполнено: slider + text affordance + облегчённая AlternativeExerciseCard (PR5): Польза/Риски/Противопоказания видимы сразу, Техника в lazy-mount аккордеоне |
| UX-5 | 🔴 | ✅ | temporary vs program replacement + skip workout — закрыто: Alert 3 кнопок (Отмена/Только сегодня/В программе destructive) + rollback для seeded программ + graceful degradation; пропуск тренировки программы: long press на «Следующая», skipped_at + advanceProgramProgress, бейдж «Пропущена» (FIT-7) |
| UX-6 | 🟠 | ✅ | динамическая расшифровка RPE + быстрый skip — выполнено: «RPE N — description» в SetFeedbackEditor (FEAT-7 v2), кнопка «Пропустить» в редакторе (UX-6) |
| UX-7 | 🟠 | ✅ | настройка частоты запроса RPE — выполнено: useRpeSettings (always/last-set/off), picker в settings, conditional rendering чипа в SetsGrid (UX-7) |
| UX-8 | 🟠 | ✅ | lazy mount тяжёлого контента — media/slider монтируется только при раскрытии accordion; stagger в ExerciseSlider |
| UX-9 | 🟠 | ✅ | History calendar с отметками — выполнено: HistoryCalendar (месяц, навигация, точки, тап по дню → DaySummaryCard через SheetShell); даты вычисляются локально из уже загруженных данных (ноль новых запросов); пропущенные тренировки не отображаются (Вариант A, консистентно с FIT-7) |
| UX-10 | 🟠 | ✅ | Calendar/List toggle + day details — выполнено: HistoryViewToggle segmented control + useHistoryView (persist в AsyncStorage, default calendar); list view сохранён без изменений; day details: тап по дню → DaySummaryCard → history/[id] |
| UX-11 | 🟠 | ✅ | **Progress hub** (отдельный bottom-tab, единый экран «Как я меняюсь?»): убраны 4 режима; последовательный поток: Hero → Stats → Insights → Activity → Strength (с интерактивным селектором упражнений и explainability e1RM) → Weight → PR (в виде карточек-достижений) → RecentWorkouts (детерминированный градиент, program_name, duration, avg_rpe); History вынесен в отдельную ментальную модель (PRODUCT.md §11). |
| UX-12 | 🔴 | ✅ | display modes для workout cards (training/balanced/learn) + picker в settings |
| UX-13 | 🟠 | ✅ | секционная структура ExerciseCard + вынос Equipment из accordion + подзаголовки через SectionSubheading в «Техника выполнения» и «Важно знать» (единообразие, PR7) + финальная UX-корректировка: SetsGrid перемещён выше Technique/Knowledge (главный рабочий блок карточки) |

### Остаточные аудиты экранов (из архивного `UX_AUDIT_PLAN.md`, Этап H)

Экраны, не покрываемые другими секциями §4–§9. Ветка `feature/workout-ux-rework` закрыта полностью (UX-2…UX-13); ниже — остаток по архивному UX_AUDIT_PLAN.

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| AUDIT-1 | 🟠 | ✅ | **Dashboard упрощён и дополнен**: фокус на Today-first; L1-summary питания — карточка с 2 страницами (swipe + тапабельные точки): стр. 1 — 3 концентрических кольца (внешнее — макросы сегментами пропорционально целям, среднее — калории, внутреннее — вода только при >0) + 🔥 сожжённые калории в центре + модалка быстрого ввода (state в index.tsx, рендер вне ScrollView); стр. 2 — lazy-таблица КБЖУ+вода за неделю; сожжённые калории перенесены с профиля на Dashboard (getBurnedCalories достаёт вес из profiles сам, null при отсутствии веса — бейдж скрыт); блок «Коротко о неделе» (insights); readiness остаётся optional (PRODUCT.md §12) |
| AUDIT-2 | 🟡 | ✅ | аудит проведён, вердикт 🟢, кодовые правки не требуются: alternatives работают через exerciseReferenceService (normalized tables, INVENTORY §10); техника — текст, основной контент экрана; records staleTime 2 min — практического импакта нет. Не подтверждено (предположение): hero media autoPlay в TechniqueMediaSlider |
| AUDIT-5 | 🟠 | ✅ | **Workout Report**: создан `app/(tabs)/progress/[id].tsx` с детальной сводкой (время, объём, подходы, ср. RPE), задействованными мышцами и списком упражнений с логами |
| AUDIT-3 | 🟡 | ✅ | аудит библиотеки упражнений: sort sheet → SheetShell ✅ (INVENTORY §6); поиск/фильтры/infinite scroll/PERF-9 ✅; autofocus на поиске убран ✅; empty state улучшен (дружелюбный текст + четкий CTA «Сбросить фильтры») ✅ |
| AUDIT-4 | 🟡 | ✅ | аудит проведён (PRODUCT.md §15): Goals/Injuries/Metrics — 🟢; Profile — 🟢. Modal→SheetShell в profile/metrics/settings — ✅. Закрыто ✅: pharma tooltip (GoalsStep2), «Пересчитать» с иконкой RefreshCw (GoalsStep3), body zones-фильтр в injuries (arms/torso/legs с haptics), pagination истории в metrics (HISTORY_PAGE=30 + «Показать ещё»), кликабельные карточки статистики и PR в profile.tsx (router.push + ChevronRight), **chart chips tooltip в metrics** ✅ (long-press показывает inline-карточку с трендом, значением и датой). |
| AUDIT-6 | 🟠 | ✅ | **Блок «Состояние сегодня»** (`StatusCard`): readiness — мини-кольцо (consistency с `CircularNutritionChart`) + 5 tappable pips (quick-set с haptics, `ReadinessSheet` — детальный check-in); чипы активных травм (`SEVERITY_COLORS`, tap → `/profile/injuries`) + информационный чип «⚠ Боль сегодня» (`painService.getPainEventsToday`); строка-следствие с приоритетом safety > recommendation (PRODUCT.md §8); `ReadinessSheet` встроен в `StatusCard` и инвалидирует `['todayReadiness', userId]` после сохранения; травмы и readiness — независимые сигналы, травмы не переписывают самооценку |
| AUDIT-6 | 🟠 | ✅ | **Блок «Состояние сегодня»** (`StatusCard`): readiness — мини-кольцо (consistency с `CircularNutritionChart`) + 5 tappable pips (quick-set с haptics, `ReadinessSheet` — детальный check-in); чипы активных травм (`SEVERITY_COLORS`, tap → `/profile/injuries`) + информационный чип «⚠ Боль сегодня» (`painService.getPainEventsToday`); строка-следствие с приоритетом safety > recommendation (PRODUCT.md §8); `ReadinessSheet` встроен в `StatusCard` и инвалидирует `['todayReadiness', userId]` после сохранения; травмы и readiness — независимые сигналы, травмы не переписывают самооценку |
| NUTRI-1|🔴|✅|сожжённые калории на Dashboard: исправлен фильтр по finished_at (завершённые тренировки) вместо created_at; тренировка, завершённая вчера, теперь корректно учитывается|
| NUTRI-2|🟠|✅|CRUD записей питания: список за день в L2-модалке (NutritionLogListModal), редактирование через prefill NutritionAddModal, удаление с подтверждением; инвалидация daily/weekly/nutritionLogs кэшей|

## 5. Training Engine

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| ENG-1 | 🔴 | ✅ | формализовать progression rules — выполнено: src/engine/progression.ts, 8 правил (increase/hold/decrease/no_data), structured reason codes, live recompute в SetsGrid, chip highlight; фундамент для ENG-2 и COACH-1 |
| ENG-2 | 🔴 | ✅ | structured reasons для recommendations — выполнено: explainProgression (input/signal/conclusion факты по reason.code), тап по recommendation → inline-блок «Почему?» + «Скрыть» (session-local); детерминированно без LLM (ROADMAP B5); persistence причин — COACH-3 |
| ENG-3 | 🔴 | ✅ | readiness как optional signal — выполнено: applyReadinessContext (readiness 1–2 + base increase → downgrade до hold, LOW_READINESS; null = no-op по PRODUCT.md §7); применяется после applySafetyPrecedence (PRODUCT.md §8); useTodayReadiness (React Query, 1h); проброс workout/[id] → ExerciseSlider → ExerciseCard → SetsGrid; «Почему?» расширен readiness-сигналом |
| ENG-4 | 🔴 | ✅ | safety precedence: pain/injury > recommendation > AI — выполнено: applySafetyPrecedence (4 правила: PAIN_STOPPED/INJURY_AVOID suppress → no_data; PAIN_RECORDED/INJURY_CAUTION downgrade increase → hold); visual: safety-downgrade в warning color, chip highlight выключен; engine никогда не обходит injury_exercise_warnings (PRODUCT.md §8) |
| ENG-5 | 🔴 | ✅ | ranking exercise alternatives — выполнено: engine/alternatives.ts rankAlternatives (hard exclusion: avoid-противопоказания при совпадении с травмой + targetsInjuredMuscle severity high; scoring: мышцы +2/+1, pattern +3, оборудование +2/−1, уровень −3/−2, боль в группе −3, injury medium/low −5/−2; relation-type: regression +5 при боли/травме, −1 без, progression −3 при боли); fetchAlternatives: movement_pattern/difficulty в select + relationTypeMap; ExerciseSlider: подпись «N скрыто из-за травм» + all-excluded state; AlternativeExerciseCard: бейджи Прогрессия/Упрощение/Вариант; данные: бэкфилл 20260819 |
| ENG-6 | 🟠 | ✅ | deterministic weekly summary — выполнено (data layer): engine/weeklySummary.ts (buildWeeklyInsights, 9 детерминированных правил), weeklySummaryService.getWeeklySummary (3 параллельных запроса + pre-week PR query), useWeeklySummary (React Query, 5 min); без LLM (ROADMAP C4); UI — COACH-5. **Добавлен расчёт ACWR (Acute:Chronic Workload Ratio) в calculateTrainingLoadContext для оценки риска травм (sweet spot 0.8–1.3, >1.5 warning).** |
| ENG-7 | 🟠 | ✅ | P0 Formula Enhancements: **убраны жёсткие эвристики RPE по возрасту/фарме** (заменяют логику прогрессии, что противоречит PRODUCT.md §8). Вместо этого используются универсальные безопасные пороги (RPE ≤ 7 для прогресса, ≥ 9 для hold), а контекст (возраст, усталость) учитывается через сигналы SESSION_FATIGUE/SESSION_LIGHT_DAY и explainability. Плато 3+ недели → deload -10%, isDeloadWeek → -10%. Все параметры опциональны и берутся из профиля пользователя. |
| ENG-8 | 🟠 | ✅ | P1.1 КБЖУ через сухой вес: формула Кэтча-МакАрдла (370 + 21.6 × сухой_вес) в macroCalculator.ts; UI — toggle «Знаю свой % жира» + раскрывающееся поле в GoalsStep1 (валидация 1–60), сохранение в profiles.body_fat_percentage; GoalsStep3 показывает формулу Кэтча-МакАрдла в «Как рассчитано». Fallback на Миффлин-Сан Жеор при null. **Критическое исправление безопасности (PRODUCT.md §14): удалены опасные фармакологические множители (3 г/кг белка, 0.8 г/кг жиров). Добавлены научно обоснованные потолки: белок max 2.4 г/кг (MPS plateau), жиры min 1.0 г/кг (гормональный минимум).** |
| ENG-9 | 🟠 | ✅ | P1.2 Периодизация в программах: добавлены currentPhaseType и weeksInBlock в progression.ts. Deload фаза, авто-deload при >6 недель, корректировка шага (strength 2.5, hypertrophy 1.25, endurance 1.0). |
| ENG-10 | 🟠 | ✅ | P1.3 Раздельный учёт типов тренировок: добавлен volumeByType в weeklySummary.ts. Разные пороги объёма (силовая ±15%, гипертрофия ±10%, кардио ±20%) и инсайт TYPE_IMBALANCE. Требует SQL-миграции для поля workout_type. |
| ENG-11 | 🟠 | ✅ | P2.1 E1RM для high-rep сетов: переключение формул в e1rm.ts (reps ≤ 10 → Epley, reps 11–12 → Brzycki, **reps > 12 → Wathan**). Формула Wathan предотвращает завышение 1ПМ на 10–20%, которое дают Epley/Brzycki при мышечной выносливости (>12 повторений). |
| ENG-12 | 🟠 | ✅ | P2.3 Прогрессия весов в разминке: функция generateWarmupSets в warmupService.ts. **Исправлено для изоляции**: вместо неврологической активации (3 повтора на 80%) теперь используется blood flow протокол (40% x 12, 60% x 6), что предотвращает микротравмы холодных сухожилий и обеспечивает приток синовиальной жидкости без утомления ЦНС. Compound: 4 подхода (50%x5, 70%x3, 85%x1, 100%x1). |
| ENG-13 | 🔴 | ✅ | Per-set recommendation + warmup chip + current-session context + analytics filtering: `targetSetIndex` в progression.ts (base = previousWeight целевого сета, работает для пирамид); `isWarmup` сеты исключены из оценки; усталость оценивается по завершённым рабочим сетам текущей сессии (reps/RPE/вес, а не previousReps); новые сигналы SESSION_FATIGUE (текущий вес <90% от прошлого → decrease до текущего уровня) и SESSION_LIGHT_DAY (90–100% → hold без повышения). UI: чип «Разминка» под RPE в SetsGrid, при toggle on на последнем сете автоматически добавляется новый пустой сет (addSet: workout/[id] → ExerciseSlider → ExerciseCard → SetsGrid). Schema: `workout_logs.is_warmup` + `is_estimated_reps` (миграция 20260828_workout_logs_is_warmup). Analytics filtering (закрыто): все сервисы (historyService, progressService, weeklySummaryService, dashboardService, exercisesServiceNormalized, profileService) фильтруют `is_warmup=false` при агрегации volume/sets/avg_rpe/PR/e1RM/muscle volume; `recentLogs` (previous data для прогрессии) тоже фильтруется по `is_warmup=false` в workoutService.ts. Workout Report (getWorkoutDetail) возвращает `is_warmup` в `WorkoutDetailLog` для UI маркера. Остаток: регенерация `database.types.ts` после применения миграции (колонка `is_warmup` + `is_estimated_reps`). |
| ENG-14 | 🟠 | ✅ | P0 Recovery Context (Сон/Стресс, Вариант B): добавлены поля `sleep_hours`, `sleep_quality`, `stress` в `daily_readiness` (миграция 20260828_daily_readiness_recovery_details). В `progression.ts` добавлены правила `LOW_SLEEP` (<6ч) и `HIGH_STRESS` (≥4), блокирующие повышение веса. Авто-расчёт readiness на основе деталей в `readinessService.ts`. L1 чипы сна/стресса в `StatusCard` с warning-цветом при отклонениях. L3 тренды восстановления через `useRecoveryTrend` **интегрированы в `app/profile/metrics.tsx`**. |
| ENG-15 | 🟠 | ✅ | P1 Menstrual Cycle (Balanced): добавлены таблицы `cycle_events` и `cycle_settings`. В `progression.ts` добавлены правила `LUTEAL_PHASE` и `OVULATION_RISK`. Чистые функции `calculateCyclePhases` и `getPhaseForDate` в `utils/cycle.ts`. Единый flow: L2 `CycleCheckInSheet` вызывается из `ReadinessSheet` (под блоком стресса) или по тапу на день календаря в режиме правки. L2: `CycleCalendar` (рассчитывает фазу для каждого дня) и `CycleSettingsSheet` (по шестерёнке) в `profile.tsx`. Используется поле `gender` из раздела «Мои цели» (колонка `sex` упразднена). Удалён прямой `supabase.from` из UI (CLAUDE.md §2).

## 6. Coaching Layer

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| COACH-1 | 🔴 | ✅ | Recommendation card: Accept / Change / Why — выполнено: `RecommendationCard` в `SetsGrid`: suggested weight × reps как primary, «Принять»/«Изменить» как secondary, collapsible «Почему?» как tertiary; progression chips скрыты до «Изменить»; Accept пишет suggestedWeight/suggestedReps в первый незавершённый сет через существующий `updateSet`; «Скрыть» session-local без persistence; safety/readiness overrides используют warning color и не подсвечивают increase-chip. Причина изменения/отклонения и feedback — COACH-3| 
| COACH-2 | 🔴 | ✅ | sstructured reasons — реализовано в рамках ENG-2 (explainProgression + «Почему?»/«Скрыть» в SetsGrid)|
| COACH-3 | 🟠 | ✅ | acceptance/rejection feedback — выполнено: таблица recommendation_feedback (upsert по user+workout+exercise+set), recommendationFeedbackService, useRecommendationFeedback (fire-and-forget useMutation, ошибки глотаются тихо); UI в SetsGrid: после «Скрыть» inline-чипы причин (устал/слишком тяжело/боль/хочу легче/другое) + пропустить (×); «Принять» записывает accepted без причины; PRODUCT.md §3.2 L2 inline-фидбек без sheet/modal; фактический вес при ручном изменении (changed) — вариант B отложен |
| COACH-4 | 🟠 | ✅ | contextual tips без спама (Dashboard L1 + readiness warning) |
| COACH-5 | 🟠 | ✅ | weekly review UI (Progress hub, deterministic insights) — закрыто через CI-1 |


### Coaching Intelligence — planned

> Базовый deterministic weekly summary (ENG-6 / COACH-5) уже реализован. Ниже — следующий этап: расширить существующие данные до полноценного explainable Coaching Intelligence. Полные функциональные спецификации и зависимости — `ROADMAP.md`, §4 C5–C12.

| ID | Пр. | Статус | Цель / зависимость |
|---|---:|---|---|
| CI-1 | 🔴 | ✅ | Weekly Training Review: consistency + performance + load + recovery/safety context + explainable next-step context; расширяет baseline ENG-6/COACH-5. UI реализован в Progress hub (WeeklyReviewSection + SheetShell). |
| CI-2 | 🔴 | ✅ | Training Load Context: normal/elevated/high на основе volume/frequency/RPE/readiness trends + **ACWR (4-недельное скользящее среднее)** для оценки риска травм; deterministic, без opaque score. UI интегрирован в WeeklyReviewSection (L1/L2). |
| CI-3 | 🟠 | ✅ | Plateau Detection: L2-блок с observation и вариантами действий при PLATEAU_DETECTED (ROADMAP C8) |
| CI-4 | 🟠 | ✅ | Muscle Volume Analysis: weekly sets, распределение по мышечным группам, тренды и explainable imbalance signals (L2-блок в WeeklyReviewSection) |
| CI-5 | 🟠 | ✅ | Goal-aware Insights (Вариант B: Balanced): цель из профиля (`profiles.goal`) учитывается в `buildWeeklyInsights` — приоритеты инсайтов и контекстная адаптация текста («почему это важно для твоей цели»). Чистая логика в `engine/weeklySummary.ts`, интеграция в `weeklySummaryService.ts`, UI доверяет отсортированному массиву. Без дублирования экранов. |
| CI-6 | 🟡 | ✅ | Deload Recommendations — выполнено (Вариант B, ROADMAP C11): `calculateDeloadContext` в `engine/weeklySummary.ts` (4 объяснимых сигнала: highLoad/plateau/readinessDecline/rpeRisingNoImprovement; рекомендация при ≥3 сигналах или highLoad+plateau/readinessDecline; insufficient-data guard для первой недели); `WeeklyReviewSection` L1-карточка с Moon/warning + session-local dismiss + «Почему?» → L2-блок в SheetShell (сигналы + типовой план −40–60% объёма, RPE ≤ 6–7, 1 неделя) с disclaimer «не меняет программу автоматически»; без автоизменения программы (PRODUCT.md §3.3 user control) |
| CI-7 | 🟡 | 🔲 | Optional AI Explanations: AI объясняет structured facts/reason codes; зависит от Coaching Intelligence и AI foundation |

Порядок реализации:

```text
CI-1 → CI-2 → CI-3 / CI-4 → CI-5 → CI-6 → CI-7
```

`CI-3` и `CI-4` могут выполняться параллельно после стабилизации CI-2. `CI-7` не является условием ценности базового продукта.

## 7. Programs / Program Editor

| ID | Пр. | Статус | Цель |
|---|---:|---|---|
| PROG-1 | 🔴 | ✅ | аудит каталога готовых/личных программ: sort menu → SheetShell, copyProgramForUser вынесен в programsService, LayoutAnimation убран (CLAUDE.md §9 anti-pattern), empty state ready-tab — кнопка «Импортировать по коду» |
| PROG-2 | 🔴 | ✅ | аудит Program Card: бейджи (Моя/Уровень/Длительность/Текущая), цветная полоса уровня, акцентная рамка для активной, расписание, footer с Edit/Активировать/Подробнее; Alert для ready-programs сохранён (деталь экрана не имеет CTA «Скопировать») |
| PROG-3 | 🔴 | ✅ | разделить Program Detail и Editor: создан отдельный маршрут `/program/[id]/edit`, убран toggle `editMode` из Detail, вынесены editor-модалки в `ProgramEditorModals` |
| PROG-4 | 🔴 | ✅ | вложенность программы: карточки упражнения получили собственный контейнер и явную L1-схему (подходы × повторы пилюлей); визуальный шум снижен |
| PROG-5 | 🔴 | ✅ | progressive disclosure в Program Editor: детали упражнения (отдых/интенсивность) — L2 через sheet, на карточке только схема и мышцы |
| PROG-6 | 🟠 | ✅ | context/breadcrumb: добавлен компактный breadcrumb в шапку экрана редактирования |
| PROG-7 | 🟠 | ✅ | sheets + save/sync UX: убран блокирующий `Alert`, добавлен спокойный `Toast`; все editor-листы переведены на каноничный `SheetShell` (INVENTORY.md §6) |

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
| REL-1 | 🟢 | 🔲 | production build (отложено) |
| REL-2 | 🟢 | 🔲 | Sentry (отложено) |
| REL-3 | 🟢 | 🔲 | tests чистых функций (отложено) |
| REL-4 | 🟢 | 🔲 | smoke/regression workout/program flows (отложено) |
| REL-5 | 🟢 | 🔲 | UX/performance profiling после изменений (отложено) |

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
| PERF-9 | 🟡 | ✅ | библиотека упражнений: основной список переведён на @shopify/flash-list 2.x (ROADMAP I3) |
| PERF-10 | 🟡 | 🔲 | Аудит React Query `staleTime` / `gcTime` и N+1 в загрузчиках workout/history |
| DS-1 | 🟠 | ✅ | Аудит design system завершён: шкала типографики/spacing/состояния проверены. Контраст textTertiary исправлен (WCAG 2.1 AA), добавлен fontScale и accessibilityRole/Label в AppButton и ProgramCard (Этап H4) |
| LINT-1|🟠|🟡|ESLint настроен (eslint-config-expo + TS v8); baseline: ~74 warnings (unused vars, react-hooks/exhaustive-deps, Array<T> syntax, console statements) — не блокируют merge; исправлять по мере рефакторинга соответствующих файлов|

## 14. Update rule

После изменения кода:
1. закрыть/изменить соответствующий ID;
2. добавить новый ID, если работа появилась впервые;
3. не копировать сюда архитектурные правила — они принадлежат `CLAUDE.md`;
4. не копировать сюда карту файлов — она принадлежит `INVENTORY.md`;
5. дату среза обновлять при существенном изменении статуса;
6. Performance metrics обновляются после каждого замера (секция 12).
