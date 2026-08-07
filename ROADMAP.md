# ROADMAP.md — план разработки

Срез: 06.08.2026 (rev.4 — статусы вынесены в TASKS_STATUS.md) · Владелец темы: план
Фактическое состояние задач — только TASKS_STATUS.md. Правила — CLAUDE.md. Архив аудита — refactoring_guide.md.

## 0. Где мы

Фаза аудита/рефакторинга завершена (треки SEC / ARCH / PERF / SCALE / RPC — см. TASKS_STATUS.md), проект в фазе развития продукта.
Дифференциаторы: injury-aware тренинг, периодизация с upfront-созданием тренировок, фармакология в макросах (с дисклеймерами), шаринг программ кодом + 6 засеянных программ.

## 1. Позиционирование

Не логгер, а тренер: ведёт по периодизации, берёжет от травм, предлагает прогрессию, отвечает на вопросы, замыкает цикл «тренинг + питание + восстановление» и адаптирует нагрузку под состояние человека.
Конкурентное поле: Hevy/Strong (логирование), Alpha Progression (автопрогрессия), MFP (питание). Наш зазор — безопасность + периодизация + AI-коучинг + петля обратной связи в одном приложении.

## 2. Принципы AI-трека

| № | Принцип |
|---|---|
| 1 | AI = советник, не врач и не судья безопасности. injury_exercise_warnings и фарма-дисклеймеры — жёсткие ограничения: AI не предлагает avoid-упражнение, не «назначает» фармакологию, не отменяет противопоказание |
| 2 | Ключи LLM — только серверно (Supabase Edge Functions) |
| 3 | Приватность: минимум PII; фармакология — абстрактным флагом и только при явном согласии; дисклеймер «AI не заменяет врача» |
| 4 | Model-agnostic + Russian-first: адаптер провайдеров (GPT-4o-mini / Claude Haiku / GigaChat / YandexGPT) |
| 5 | Экономика: малые модели для рутины, большие для генерации программ; кэш похожих запросов; лимиты на пользователя в день |
| 6 | Петля качества: 👍/👎 на каждый AI-ответ + анонимизированный лог → еженедельное ревью |
| 7 | AI должен видеть не только «что сделано», но и «как перенесено»: readiness, RPE, боль, питание, сон |

Критерий приоритизации = влияние на retention/активацию ÷ трудозатраты. Порядок: данные для AI (этапы 1–2) → AI-фундамент (3) → умная адаптация (3.5) → крупные ставки (4). Социалка — только после здоровых D7/D30.

## Этап 0 — Релизная готовность

| № | Задача | Зависимости |
|---|---|---|
| 0.1 | EAS: dev-client + production-билд (Android first) | eas.json настроен |
| 0.2 | Sentry (SCALE-2): DSN в config.ts, Sentry.wrap в _layout, sourcemaps в EAS | 0.1 |
| 0.3 | Store-ассеты: privacy policy (данные в Supabase + AI-согласие), скриншоты | — |
| 0.4 | Возврат SCALE-1: тесты macroCalculator/errorMapper/rpe/streak/e1rm, затем сервисы с моком supabase | — |

## Этап 1 — Данные для AI и качество логирования

| № | Задача | ID | Зачем |
|---|---|---|---|
| 1.1 | prefill подходов + подсказка прогрессии | FEAT-1.1 | скорость логирования |
| 1.2 | автостарт таймера отдыха | FEAT-1.2 | удержание в сессии |
| 1.3 | streak на Dashboard | FEAT-1.3 | retention |
| 1.4 | e1RM в PR-карточке и прогрессе | FEAT-1.4 | видимый прогресс |
| 1.5 | Plate-калькулятор (визуал блинов) | FEAT-1.5 | дифференциатор, виральность |
| 1.6 | CSV-экспорт истории | FEAT-1.6 | бэклог: отчёты позже |
| 1.7 | RPE/RIR feedback | FEAT-1.7 | критично для AI-прогрессии |
| 1.8 | daily readiness check-in | FEAT-1.8 | адаптация нагрузки |
| 1.9 | pain flag | FEAT-1.9 | безопасность и контекст |

## Этап 2 — Контекст пользователя

| № | Задача | Зачем | Реализация |
|---|---|---|---|
| 2.1 | дневник питания + вода поверх готового бэкенда (nutrition_logs, getDailyNutrition) + агрегация по неделям и тренд отклонения от целей КБЖУ | замыкает цели КБЖУ, AI видит питание | UI поверх сервисов |
| 2.2 | график тренда веса (metricsService, лёгкий SVG) | визуальная обратная связь | — |
| 2.3 | onboarding-профиль: availableDays, sessionLengthMinutes, location, equipment, experienceLevel, dislikedExercises, forbiddenExercises, medicalFlags?, goalDeadline?, trainingTimePreference? | AI обязан знать ограничения | ALTER TABLE profiles ADD COLUMN onboarding_data jsonb + пошаговый онбординг |
| 2.4 | контрольные точки (assessments): 3–5 RM на базовые, тесты мобильности, повтор раз в 4–6 недель | AI понимает исходный уровень | CREATE TABLE assessments (id, user_id, type, data jsonb, created_at) + RLS + экран «Тесты» |
| 2.5 | ачивки/бейджи (первая тренировка, streak 7, PR) | retention | — |

## Этап 3 — AI-тренер

| № | Задача | ID | Реализация |
|---|---|---|---|
| 3.1 | AI-фундамент: Edge Function llm-proxy (адаптер провайдеров, rate limit, кэш, PII-фильтр), экран согласия + дисклеймер | AI-1 | src/services/aiService.ts; supabase functions deploy llm-proxy; supabase secrets set |
| 3.2 | AI-прогрессия по динамике логов + RPE/readiness | AI-2 | rule-based базис + LLM-уточнение: RPE < 7 и readiness ≥ 4 → +2.5 кг; RPE > 8 или readiness < 3 → повторить/снизить; чип «🤖 +2,5 кг» в ExerciseCard |
| 3.3 | чат-коуч с контекстом (цель, травмы, активная программа, последние тренировки, readiness, pain, питание) + RAG | AI-3 | pgvector: create extension vector, alter table exercises add column embedding vector(1024), RPC match_exercises_semantic (INVOKER + STABLE); хард-фильтр avoid |
| 3.4 | генератор программ из естественного языка | AI-4 | скелет фаз правилами (паттерн warmupService) + LLM наполняет; валидация по injury_exercise_warnings и onboarding_data.equipment ДО сохранения |
| 3.5 | объяснимость: «почему эта разминка», «почему дилоуд», «почему снижена нагрузка сегодня» | AI-5 | дешёвая генерация на готовых данных, малая модель |

## Этап 3.5 — Петля обратной связи

| № | Задача | Реализация |
|---|---|---|
| 3.6 | лог принятых/отклонённых рекомендаций | ai_recommendations (id, user_id, feature, recommendation jsonb, accepted boolean, feedback text, created_at) + RLS; 👍/👎 после каждого предложения; недельный отчёт по acceptance rate |
| 3.7 | недельный обзор: агрегация readiness, RPE, pain, nutrition, volume by muscle → LLM-саммари + корректировка плана | RPC get_weekly_summary(user_id, week_start) (INVOKER + STABLE); экран «Итоги недели» |
| 3.8 | причины пропуска тренировки | ALTER TABLE workouts ADD COLUMN missed_reason text, missed_notes text; модалка при возврате в приложение |

Индексы для этапов 3–3.5: daily_readiness(user_id, date), pain_events(user_id, occurred_at), workout_logs(rpe, created_at).

## Этап 4 — Расширение трекинга

| № | Задача | Реализация |
|---|---|---|
| 4.1 | суперсеты/дроп-сеты | миграция workout_logs.set_type + RPC-ревью (RPE уже есть) |
| 4.2 | кардио-логирование (время/дистанция) | — |
| 4.3 | локальные push-напоминания | expo-notifications |
| 4.4 | HealthKit/Google Fit: сон, HRV, шаги, пульс → автоматический readiness | expo-health-connect (Android) + react-native-health (iOS), агрегация в daily_readiness |
| 4.5 | AI-видео анализ техники (pose estimation, серверно) | long-term |

## Этап 5 — После здоровых метрик

| № | Задача | Условие |
|---|---|---|
| 5.1 | социалка (лента, kudos) | D7 ≥ целевого |
| 5.2 | i18n (EN) | стабильный RU-retention |
| 5.3 | Web/PWA | аудит нативных модулей |

## Метрики успеха

| Этап | Ключевая метрика |
|---|---|
| 0 | сборка в сторах; 0 crash-недель в Sentry |
| 1 | D7 retention +п.п.; доля тренировок с prefill; % тренировок с RPE/readiness ≥ 70% |
| 2 | % пользователей с дневником питания; возвраты ≥ 3/нед; % с onboarding-профилем ≥ 80% |
| 3 | ≥ 30% принятых AI-прогрессий; чат ≥ 15% WAU; 👍 ≥ 70%; 0 нарушений безопасности (avoid не предложен никогда, автопроверка в тестах); % рекомендаций с учётом readiness/pain ≥ 90% |
| 3.5 | acceptance rate ≥ 40%; 0 рекомендаций, игнорирующих pain flag; недельный обзор ≥ 20% WAU |
| 4 | доля сгенерированных программ; NPS; % с HealthKit/Google Fit ≥ 15% |

## Регламент обновления

| № | Правило |
|---|---|
| 1 | Старт этапа → задачи получают ID в TASKS_STATUS.md (AI-фичи — AI-N, данные для AI — FEAT-N) |
| 2 | Здесь фиксируется только план и зависимости; статусы и даты — в TASKS_STATUS.md |
| 3 | Новые RPC — только supabase/migrations + ревью; после миграций регенерация типов (PROMPTS.md) |
| 4 | Новая таблица → добавить в список RLS в CLAUDE.md §4 |
| 5 | refactoring_guide.md не обновляется |