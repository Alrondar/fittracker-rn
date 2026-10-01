# WEB-BUG-12 — диагностика (01.10.2026)

## Metadata
- Запрос владельца: «идём к WEB-BUG-12» — «PR-баннер не срабатывает на вебе, `personalBest` не доходит до `SetsGrid`; подозрение — тот же 400 на `workouts?select=…programs(name)` при открытии тренировки».
- Источник находки: браузерный прогон 29.09 (web-port, аккаунт margaux4095, localhost:8090).
- Метод: живой repro на web-порту (localhost:8099) + read-only SQL к проду + чтение кода.

## Вердикт: исходная гипотеза неверна, но рядом есть реальный баг

### 1. PR-баннер на вебе РАБОТАЕТ (WEB-BUG-12 не воспроизводится)
Evidence (браузер, сегодня):
- `getPersonalBests` (`profileService.ts:423`) ушёл и вернулся **200** — `reqid=210`:
  `workout_exercises?select=exercise_id,workouts!inner(user_id),workout_logs(weight_kg,is_warmup)…` — это запрос карты PR, он успешен.
- `personalBest` долёг до `SetsGrid`: баннер пойман MutationObserver'ом — «Новый рекорд PR · 15 кг» (set2=15 при all-time best 12; set1=13 тоже тикнул ранее).
- read-only SQL подтвердил: для упражнений этой сессии все-time max = Жим сидя 28, Махи перед собой 12, … — данные для карты реальны.
Цепочка (`useWorkoutSession.ts:234-246` → merge `setExercises` → `ExerciseCard.tsx:286` prop → `SetsGrid.tsx:703-732` триггер) цела и на вебе, и на нативе.

Почему 29.09 не сработало: вероятно, тест на наборе 20/25/30 был на упражнении, чей all-time best уже ≥ этих весов (то есть «PR» не было по данным), либо карта не успела догрузиться до коммита. Код общего назначения — не веб-специфичен; отдельного веб-дефекта в PR-пути нет.

### 2. Настоящий дефект: `getWorkoutProgramInfo` падает в 400 (веб И натив)
Evidence:
- `reqid=196/201`: `workouts?select=program_id,phase_number,week_number,programs(name)&id=eq…` → **400**.
- read-only SQL: единственнный FK на `workouts` — `workouts_user_id_fkey → profiles(id)`. Колонка `program_id` — **text**, внешнего ключа на `programs(id)` (uuid) НЕТ. PostgREST не может разрешить embed `programs(name)` без FK → 400.
- Код `programsService.ts:935-962`: при ошибке `return null` (ошибка проглочена).

Impact: `workoutProgramInfo` = null на обоих платформах при открытии любой тренировки. Потребители:
- `app/workout/[id].tsx:128-136` `progressionContext.currentPhaseType = workoutProgramInfo?.phaseType` и `weeksInBlock = weekNumber` → движок прогрессии теряет фазу/неделю блока (deload/peak правила по `weeksInBlock` деградируют);
- шапка карточки: `programName`/`phaseName` не отображаются.
Прогрессия НЕ ломается целиком (есть fallback `currentPhaseType='unknown'`, см. RPE-1 «не с первого занятия»), но контекст фазы теряется молча.

### Root cause (2, высокая уверенность)
Embed `programs(name)` из `workouts` нерезолвимен: нет FK `workouts.program_id → programs.id`. Ошибка проглатывается `return null`, поэтому 29.09 её спутали с причиной PR-баннера.

## Fix Strategy (на approval, код НЕ менялся)
Вариант A (минимальный, рекомендую): в `getWorkoutProgramInfo` не эмбить `programs` из `workouts` (FK нет и не будет — text). Вместо `programs(name)` — второй запрос к `programs` по `program_id` (как уже делается для `program_phases` строкой ниже), либо JOIN через `user_programs`. Правка локальна в одной функции, error-ветку оставить, но добавить `console.warn` (не глотать молча).
- Risk: Low. Только чтение, один сервис, потребителей двое, поведение при успехе прежнее, при отказе — прежний null но с логом.
- Rollback: один revert-коммит.
- Тест: открыть тренировку на вебе и на нативе → запрос к programs 200, в шапке видны программа/фаза, `progressionContext.currentPhaseType` не null для seeded-программы.

Вариант B: добавить FK `workouts.program_id → programs.id` миграцией. Отклонён: program_id text (потребует cast), денормализованная колонка, прод-DDL + риск на исторических строках; не стоит cosmetic-заголовка.

## Status
- WEB-BUG-12 (PR-баннер) → не баг: работает, evidence выше.
- Новая находка (getWorkoutProgramInfo 400) → зафиксировать как WEB-BUG-12b / Programs-находку и починить по варианту A после approval.
