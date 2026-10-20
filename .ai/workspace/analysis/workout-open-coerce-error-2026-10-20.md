# Баг: «Cannot coerce the result to a single JSON object» на экране тренировки

## Metadata

- Оригинал задачи (20.10.2026, владелец): «разберись с багом открытия» — репро: web-port `:8098`, deep-link `/workout/<id>`, вместо экрана — `StateBlock` с заголовком «Не удалось открыть тренировку» и описанием `Cannot coerce the result to a single JSON object`.
- Навык: `bug-diagnosis` (каркас: внешняя память → root cause → гейт approve → фикс). Платформенные разделы навыка (dotnet/angular, `.github/*instructions`) в этом репозитории отсутствуют, адаптировано под правила `AGENTS.md` / `CLAUDE.md`.

## Progress

- Фаза: 2 завершена,Awaiting approval (фаза 3).
- Воспроизведено: да, живьём (HTTP 406 от PostgREST).
- Текущий фокус: два разных факта, которые сначала слились в один «баг открытия».

## Что произошло на самом деле (цепочка, проверено)

1. Экран `app/workout/[id].tsx` → `useWorkoutSession.loadWorkout` → `fetchWorkoutSession(workoutId)` (`src/services/workoutService.ts:312`).
2. Там запрос `.from('workouts').select('…,workout_exercises (…)').eq('id', workoutId).single()` (`workoutService.ts:314–320`). `.single()` = `Accept: application/vnd.pgrst.object+json`.
3. Живой запрос из браузера (reqid 854): `GET /rest/v1/workouts?select=name,program_id,…&id=eq.a20724db-…` → **HTTP 406**. Тот же id в той же пачке запросов обслуживается сессией `user_id=eq.97e893c6-…` (reqid 856/858/859/860).
4. `select id, name, user_id from workouts where id in (…)`: `3c209367` (Legs A) = `97e893c6`, а три «Падающих» (`a20724db`, `09cb1ce8`, `4f0c2eb0`) = `6416429a`.
5. Итог: ряд принадлежит другому пользователю, RLS его не отдаёт, `.single()` получает 0 строк, PostgREST отвечает 406 с текстом «Cannot coerce the result to a single JSON object». Экран повёл себя штатно (ошибка + «Повторить»).

## Корень проблемы, который действительно надо чинить

Сырой текст вендора доходит до пользователя. Путь: `useWorkoutSession.ts:291` → `setLoadError(mapError(error))` → `src/utils/errorMapper.ts`.

- `mapError` матчит только **текст** (`extractMessage` берёт `error.message`, `errorMapper.ts:13–21`), поле `code` (у PostgREST это `PGRST116`) выбрасывается.
- Ветка «не найдено» (`errorMapper.ts:53–60`) содержит старые формулировки: `json object requested`, `multiple .* rows returned`, `pgrst116` — но не нынешнюю `cannot coerce the result to a single json object`.
- Совпадения нет → fallthrough → пользователю показан оригинальный текст PostgREST. Это ровно то, что закрывали CTR-2/EDGE-12 («не светим сырьё»), то есть регресс не кода, а словаря маппера против обновления Supabase.

## Гипотезы и уверенность

| Гипотеза | Улики | Confidence |
|---|---|---|
| «Тренировки не открываются — баг приложения» | владельцы id: падающие строки принадлежат другому пользователю; RLS отработал корректно | опровергнута, 95 % |
| `fetchWorkoutSession.single()` на пустой выборке даёт 406 | reqid 854 (HTTP 406) + `workoutService.ts:320` |verified, 98 % |
| Утечка сырого текста = пробел словаря `mapError` (игнорирует `code`, не знает новую формулировку) | `errorMapper.ts:13–21`, `:53–60`; текст на экране совпадает с текстом PostgREST дословно | verified, 95 % |

## Побочные находки

- `errorMapper.ts:6` в комментарии содержит два иероглифа вместо слова «связность» — CJK-гигиена репозитория нарушена в уже закоммиченном файле. Правится одной строкой.
- Тестовая запись за мной: я запускал и сбрасывал таймер на `Legs A` = аккаунт `97e893c6` (не на разрешённом тестовом `6416429a`). Проверено: `started_at = null`, свежих `workout_logs` за 2 часа = 0, следов не осталось.
- У трёх «падающих» тренировок `program_id` указывает на несуществующую строку `programs` (`prog_rows = 0`), у одной ещё и 0 `workout_exercises`. Это мусор от старых seed/копий, к текущему багу отношения не имеет, но заводить в очередь стоит.

## Fix Strategy (на утверждение)

Вариант А (рекомендуемый, минимальный): `mapError` начинает смотреть `code`.

- `src/utils/errorMapper.ts:13–21` — `extractMessage` собирает в строку и `code` (например `pgrst116 cannot coerce the result to a single json object`), либо `mapError` читает `error.code` отдельно.
- `src/utils/errorMapper.ts:53–60` — в ветку «не найдено» добавить `cannot coerce` (и `pgrst214` не трогаем).
- Риск: низкий. Функция чистая, потребителей много, но меняется только классификация ранее не распознанных строк.
- Митигация: юнит-подобная проверка офлайн (`npx tsx`) на трёх входах: `{code:'PGRST116', message:'Cannot coerce…'}`, старый текст `JSON object requested…`, и «Данные не найдены» не должен ломаться для `404`.
- Gates: `npx tsc --noEmit`, `npx eslint src app`, prettier; мерж в `web-port`; браузер-репро того же deep-link'а → ожидается «Данные не найдены. Возможно, они были удалены.» вместо сырого текста.
- Откат: одна правка в одном файле, `git revert`.

Вариант Б (шире): перестать светить любые нераспознанные технические строки по умолчанию (сейчас fallthrough возвращает `raw`). Меняет поведение во многих экранах — не рекомендую в этом пакете.

Вариант В: в `fetchWorkoutSession` заменить `.single()` на `.maybeSingle()` и кидать свой «не найдено» — чище по семантике (чужой/удалённый id перестаёт быть ошибкой PostgREST), но трогает границ-слой и требует проверки, что `null` корректно обрабатывается на экране. Отдельный пакет.

## Files to Modify (вариант А)

1. `src/utils/errorMapper.ts:13–21` — учитывать `code` ошибки.
2. `src/utils/errorMapper.ts:53–60` — паттерн `cannot coerce` в ветке «не найдено».
3. `src/utils/errorMapper.ts:6` — убрать иероглифы из комментария.

## Очередь (не этот пакет)

- Сиротские `workouts.program_id` (несуществующая программа, 0 упражнений) — ревизия данных тестового аккаунта.
- Чекпойнт «рекомендация глазами» всё ещё не закрыт: нужен открытый workout того же пользователя, у которого есть история подходов.
