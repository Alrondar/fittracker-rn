# Edge/States-аудит экранов FitTracker RN — 06.10.2026

Метод: только чтение кода (skill `product-design:edge`, матрица 6 состояний, адаптирована под RN). STATUS.md §15 (FZ/BUG/CTR), PRG-400, FD-SEED-2a, UX-2, PERF-11 — учтены, не дублируются. Скоуп: экраны `app/`, hooks/services, `src/lib/feedback.ts`, `src/engine/progression.ts`.

- Экранов в матрице: 20 · Находок: 17 (🔴 3 / 🟠 7 / 🟡 5 / 🟢 2)
- Состояния: empty · loading · error · boundary · permission(RLS/401) · offline

## (а) Матрица «экран × 6 состояний»

| Экран (файл) | empty | loading | error | boundary | permission | offline |
|---|---|---|---|---|---|---|
| Главная `(tabs)/index.tsx` | ✅ | ✅ skeleton+chip+PTR | ✅ StateBlock+retry | ✅ нет стрика/инсайтов — секции скрыты | ✅ no-auth StateBlock+CTA | ⚠️ EDGE-10 |
| Тренировки `(tabs)/workouts.tsx` | ✅ 3 варианта+CTA | ✅ | ❌ EDGE-1 | ✅ фильтр-пусто отличается от «нет данных» | ✅ (ошибка = EDGE-1) | ⚠️ |
| Программа-каталог `(tabs)/programs.tsx` | ✅ my/ready+CTA | ✅ skeleton | ✅ StateBlock | ⚠️ EDGE-17 | ⚠️ EDGE-8 (raw msg) | ⚠️ EDGE-10-класс |
| Программа-детали `program/[id]/index.tsx` | n/a | ✅ | ❌ EDGE-2 | ✅ | ❌ EDGE-2 (RLS = «не найдена» без выхода) | ⚠️ |
| Редактор программы `program/[id]/edit.tsx` | n/a | ❌ EDGE-3 | ❌ EDGE-3 | ✅ dirty-guard | ⚠️ EDGE-3 | n/a |
| Справка `(tabs)/exercises.tsx` | ✅ | ✅ + load-more | ✅ | ✅ fuzzy/40/page | n/a (публичные) | ⚠️ |
| Упражнение-детали `exercise/[id].tsx` | ✅ | ✅ DetailSkeleton | ✅ StateBlock-подобный+retry | ✅ media-fallback | ✅ not-found | ✅ cache-first |
| Прогресс-hub `(tabs)/progress.tsx` | ✅ без CTA (EDGE-15) | ✅ skeleton | ✅ retry (двойной refetch) | ✅ unknown-forecast | ✅ | ⚠️ EDGE-10 |
| Отчёт тренировки `progress/[id].tsx` | n/a | ⚠️ EDGE-11 | ✅ (без описания) | ⚠️ duration=? | через ошибку = «нет» | ⚠️ |
| Экран тренировки `workout/[id].tsx` | ⚠️ EDGE-14 | ✅ WorkoutSkeleton | ✅ loadError+retry | ⚠️ EDGE-12 | ✅ чужой id → «Данные не найдены» | ❌ EDGE-9 |
| Профиль `(tabs)/profile.tsx` | ✅ карточки | ✅ | ✅ retry | ✅ displayName-fallback | ✅ logout-ошибка тихая (низк.) | n/a |
| Календарь цикла (в Профиле) | ✅ CTA-отметка | ⚠️ EDGE-11 | ❌ EDGE-6 | ✅ delayed-фаза (CYC-2) | ❌ EDGE-6 (RLS тихий) | ❌ EDGE-6 |
| Цели `profile/goals.tsx` | n/a (форма) | ⚠️ EDGE-11 | ✅ save mapError | ⚠️ EDGE-7 | ⚠️ EDGE-7 | ⚠️ |
| Травмы `profile/injuries.tsx` | ✅ +filter-empty | ✅ | ❌ EDGE-5 | ✅ | ❌ EDGE-5 | ⚠️ |
| Замеры `profile/metrics.tsx` | ✅ | ⚠️ EDGE-11 | ❌ EDGE-4 | ✅ пагинация 30 | ❌ raw msg (EDGE-8-класс) | ⚠️ |
| Настройки `profile/settings.tsx` | n/a | n/a локальные | n/a | ✅ | n/a | ✅ всё локально |
| Онбординг `onboarding/index.tsx` | n/a | ✅ saving | ✅ mapError | ✅ skip-подсказка | n/a | ⚠️ save офлайн = retry-алерт |
| Логин/Регистрация `(auth)/login.tsx` | n/a | ✅ btn+spinner | ✅ mapAuthError | ✅ <6 симв. | ✅ confirmation-flow | ⚠️ fetch fail = generic |
| Восстановление/Смена пароля `(auth)/reset|update` | n/a | ✅ | ✅ mapAuthError | ✅ | ✅ email-enumeration-fallback | ⚠️ |
| Создание тренировки `workout/create.tsx` | n/a | ✅ BrandLoader | ⚠️ raw msg, нет «Повторить» | ✅ | ⚠️ RLS = сырая строка | ⚠️ |

## (б) Находки

**EDGE-1 | 🔴 | app/(tabs)/workouts.tsx:39, 296–341**
`useWorkouts` возвращает `isError` (query spread, src/hooks/useWorkouts.ts:14), экран его не деструктурирует. Доказательство: ветвление только `loading ?` / список; `data=undefined` → `sections=[]` → `renderEmpty()`. Пользователь при сетевой/БД/401-ошибке видит «Нет тренировок. Активируйте программу…» — правдоподобную ложь вместо retry. Исправление: добавить `isError && !data → <StateBlock tone="error" … onAction={refetch}/>` как в programs.tsx:274. Стоимость: S.

**EDGE-2 | 🔴 | app/program/[id]/index.tsx:95–108 + src/hooks/useProgramEditor.ts:98–99**
Загрузка программы: `catch → console.error('Ошибка загрузки программы')`, состояния error у хука нет. Экран при любом сбое (офлайн, RLS, 5xx) показывает «Программа не найдена» — одну строку текста, без retry/назад-CTA (dead-end, только системная навигация). Тот же класс молчаливой деградации, что PRG-400. Исправление: прокинуть `error` из useProgramEditor + StateBlock с различием «не найдена» vs «не загрузилась» + retry. Стоимость: S.

**EDGE-3 | 🔴 | app/program/[id]/edit.tsx:136–142**
`if (loading || !program || !editedProgram) → <ListSkeleton/>` — при ошибке/чужой программе (deep-link `/program/<чужой-id>/edit`) скелетон никогда не уходит: «вечный spinner» без сообщения. Запрет редактирования существует, но только на save (useProgramEditor.ts:188 «Нельзя редактировать чужую программу»). Исправление: отделить error/«не найдена» от loading, показать StateBlock с выходом. Стоимость: S.

**EDGE-4 | 🟠 | app/profile/metrics.tsx:46–54 + src/hooks/useBodyMetrics.ts:10–18**
Query не отдаёт `isError` наружу; `refetch` в хуке есть, но экраном не использован. Ошибка загрузки → `metrics=[]` → экран нового пользователя: «Пока нет записей о замерах…» (MetricsHistorySection.tsx:44), плюс «Текущий вес: Нет данных». Пользователь может решить, что данные потеряны/удалены. Исправление: error-branch со StateBlock+refetch. Стоимость: S.

**EDGE-5 | 🟠 | app/profile/injuries.tsx:280–288 + src/hooks/useInjuries.ts:45–52**
Аналогично: isError не экспортируется, `refetch` не подключён. При сбое — «У вас нет активных травм» при фактических активных травмах → safety-обманка: предупреждения в тренировке (`injury_exercise_warnings` через useInjuryWarnings — отдельный запрос, может тоже тихо упасть) исчезнут без следа. Это экран, где error ≠ cosmetic. Исправление: error+retry ветка. Стоимость: S.

**EDGE-6 | 🟠 | app/(tabs)/profile.tsx:75–92; src/components/cycle/CycleCheckInSheet.tsx:53–54, 68–69; CycleSettingsSheet.tsx:37–38**
Сохранение/удаление cycle-события и настроек: ошибки ловятся только в `console.error`, sheet не закрывается и не закрывается-с-ошибкой — тап «Сохранить» не даёт никакой видимой реакции (кнопка «сломана»). RLS-отказ/офлайн неотличимы от того, что «нажми ещё раз». Исправление: `feedback.alert('Не удалось сохранить', mapError(e))` в catch листов. Стоимость: XS–S.

**EDGE-7 | 🟠 | app/profile/goals.tsx:102–107**
При сохранении целей первый замер веса пишется best-effort: `catch (metricError) → console.warn`, затем безусловно показывается «Сохранено — Твои цели успешно обновлены!». Если замер не лёг (RLS/сеть), пользователь думает, что вес сохранён; график веса остаётся пустым — тихая потеря данных (класс PRG-400). Исправление: флажок и вторая строка в алерте «Замер веса сохранить не удалось…». Стоимость: XS.

**EDGE-8 | 🟠 | app/(tabs)/programs.tsx:150, 171; app/workout/create.tsx:64; src/hooks/useBodyMetrics.ts:60, 71**
Сырые `error.message` доходят до UI: тост активации, `setImportError(e.message)` в импорте по коду (чужой/невалидный share-code → строка вида «copy_program_for_user … P0001…» или RLS-текст), `e?.message` при старте тренировки, алерты создания/удаления замера. Против §9 «raw DB errors» и канона mapError (остатки CTR-2). Исправление: обернуть в `mapError()` (он уже покрывает RLS/JWT/404). Стоимость: XS.

**EDGE-9 | 🟠 | src/hooks/useWorkoutSession.ts:75, 270–283, 348–355; package.json (нет netinfo)**
Offline-модель тренировок: очередь `pendingLogsRef` — только память процесса; unmount делает один flush (:276), при неудаче сеты возвращаются в карту, которая вместе с экраном умирает. Периодического retry нет (комментарий «периодический flush» устарел — grep setInterval пуст), NetInfo/онлайн-индикатора в приложении нет вообще. Что видит пользователь: пишет веса офлайн — ячейки «зеленеют», ошибок нет; «Завершить» честно режет finished_at и просит повторить (VF-3, :920) — это хорошо; но kill приложения (или сворачивание в убитый процесс) = молча потеря всех подходов. Cold-start офлайн: сессия и персист-кэш читаются локально (UX-2b) — просмотр работает. Исправление: минимум — AppState→beforeUnload flush + «N подходов не сохранено» баннер; полноценно — AsyncStorage-очередь upsert_workout_logs. Стоимость: M.

**EDGE-10 | 🟠 | app/(tabs)/index.tsx:192; app/(tabs)/progress.tsx:191**
`if (isError || !data)` — в React Query v5 refetch неудачен = `isError`, даже когда свежие `data` в кэше (включая hydrated persisted-кэш UX-2b, maxAge 24 ч). То есть офлайн/слабый интернет на уже открытом когда-то приложении выбивает полностью рабочий экран в «Не удалось загрузить» вместо stale-данных с inline-предупреждением. Против обещания UX-2b («экраны получают данные мгновенно»). Исправление: показывать error-экран только при `!data`; при `isError && data` — инлайн-чип «данные могyт быть устаревшими / обновить». Стоимость: S.

**EDGE-11 | 🟡 | app/progress/[id].tsx:131–142; app/profile/metrics.tsx:46–54; app/profile/goals.tsx:199–207; app/(tabs)/profile.tsx:402–406**
За пределами паттерна UX-2 «Честная загрузка»: ActivityIndicator / «Загрузка...» текстом без skeleton и без anti-flash — 4 поверхности (из них 2 — drill-in с последующим layout-jump: полный экран → контент). Исправление: ListSkeleton/skeleton-секции + `useMinPending`. Стоимость: S (косметика-паттерн).

**EDGE-12 | 🟡 | src/components/workout/SetsGrid.tsx:144–237, 215–234; useWorkoutSession.ts:128–141**
Input не санитизируется: нет maxLength/диапазона/нормализации разделителя. `decimal-pad` в RU-локали Android вводит «82,5»; `parseFloat("82,5")=82` — молча теряется половина килограмма (шаг прогрессии как раз 2.5/1.25); «99999» приметс я и уйдёт в БД и в объём/PR/e1RM; мусор из paste → NaN-фильтр или failed-группа. Граница «0 сетов» (`sets.length===0`) просто скрывает сетку без CTA. Исправление: в commit — `v.replace(',', '.')` + regex `^[0-9]*[.,]?[0-9]?$`, clamp по sanity-пределу (напр. 500 кг / 200 повт.) с soft-предупреждением. Стоимость: M; обязательна device-проверка клавиатур.

**EDGE-13 | 🟡 | app/_layout.tsx:106–121 + authService (JWT refresh)**
Истёкшая сессия: supabase-js при неудачном refresh испускает SIGNED_OUT → `queryClient.clear()` + erase персиста → root-гейт тихо выбрасывает на login. Данных не утекает (хорошо), но пользователь без объяснения «сессия истекла, войдите заново» и с потерей несохранённого ввода. Статически точный триггер не подтвердить. Исправление: по событию (не INITIAL_SESSION) показывать на login причину. Стоимость: S.

**EDGE-14 | 🟡 | app/workout/[id].tsx:396–407**
Empty «В этой тренировке пока нет упражнений» — тупик без следующего шага (нет CTA в редактор программы / «Добавить подход»); маловероятен (создаётся из программы), но для ad-hoc/repeat-тренировок с 0 упражнений пользователь остаётся с заголовком и пустотой. Исправление: строка-подсказка + выход. Стоимость: XS.

**EDGE-15 | 🟡 | app/(tabs)/progress.tsx:253–303**
Empty первого запуска: заголовок + copy «Заверши первую тренировку…» без CTA-кнопки (в отличие от Главной/Программ, где CTA есть). Дёшево добавить «К тренировкам». Стоимость: XS.

**EDGE-16 | 🟢 | app/(tabs)/index.tsx:331–351**
Карточка питания: `nutritionData ? … : null` — при ошибке `useDailyNutrition` блок просто исчезает (ни ошибки, ни retry); аналогично `useWeeklySummary`/`useTodayReadiness`/`useHistory` — errors не читаются, виджеты тихо отсутствуют. Допустимо для optional-виджетов (PRODUCT: readiness optional), но против «у любого async-контента есть error» (PRODUCT.md §3.1). Исправление: inline-чип «не загрузилось · обновить». Стоимость: XS.

**EDGE-17 | 🟢 | app/(tabs)/programs.tsx:117–122**
`useQuery(['userProgramsStatus'])` без `error`-чтения: при сбое пропадают бейдж «Текущая», сортировка активной сверху и диалог «начать заново» — молчаливая деградация (низкий риск, данные восстановимы re-render'ом). Стоимость: XS.

## (в) Проверено и чисто (по состояниям)

- **empty**: различающиеся first-time vs filter-empty на Тренировках (3 текста + CTA «Показать все»), Справочнике (reset-фильтры), Программа (my/ready), Травмах (+зоны), Замерах (история), Профиле-цикле (CTA-чек-ин); Главная скрывает нулевые секции вместо фейков; forecast `<3 тренировок → 'unknown'`; burned-calories `null` → бейдж скрыт; StrengthLevelBadge null → не рендерится.
- **loading**: макетные skeleton + LoadingChip + `useMinPending(250ms)` anti-flash на 6 табах (PERF-11/UX-2); defer-mount Главной/Прогресса/Профиля; load-more футер в Справочнике/Программах; submit-состояния кнопок (`loading+disabled`) auth/goals/cycle-листы; BrandLoader в root-гейте и create.
- **error**: канон StateBlock+retry на Главная/Программы/Справочник/Прогресс/Экран тренировки (loadError — UX-L2); exercise detail — образцовый (message+retry+not-found); skip-тренировки — mapError+«Повторить»; saveWorkout — VF-3 «Подходы не сохранены… значения не потеряны» с ре-энтранс guard; finish-progress — retry-диалог advanceProgramProgress.
- **boundary**: длиннотекстовые truncation проверен (ProgramCard numberOfLines 2/3, ExerciseCardHeader 2, WorkoutScreenHeader 1); календарные даты — BUG-3/4/8 закрыты, `todayKey()` в MetricAddSheet:24 и goals:97; `toISOString().split` остался только как компонент query-ключа usePainTrend:21–22 (фильтрация по полным ISO — на данные не влияет; греп-шум); «30 сек» (FD-SEED-2a): серверная `progression_policy='time_based'` + ветки TIME_ALL_MAX/TIME_HOLD (progression.ts:301–306, policy в mapper :104) — семантика корректна; объёмы — k/M-format + toLocaleString; ед. кг↔lb — единый источник «всегда кг в стейте», конверсия на границе.
- **permission**: аноним — root-гейт → login; чужой workout id → PGRST116 → mapError «Данные не найдены» в StateBlock; чужая программа — save-block «Сначала скопируйте» (+ SEC-12 серверный guard); RLS-тексты mapError'ятся в «Недостаточно прав… войди заново» (кроме остатков EDGE-8); email-enumeration в reset — корректный нейтральный copy; auth-ошибки — mapAuthError.
- **offline (частично)**: просмотр с persisted-кэшем на холодном старте; finish при отсутствии сети не пишет finished_at и не теряет pending (в рамках живого экрана); повторная попытка «Завершить» отправляет pending повторно.

## (г) Что нельзя подтвердить статически — device-прогон

1. **EDGE-12 (ввод с запятой/огромные числа)**: RU-локаль Android → открыть тренировку → ввести «82,5» кг → сверить записанное (Проверка: перезаход в сессию — должно быть 82.5, а не 82); ввести «99999» → финиш → открыть Отчёт — не должно раздувать объём/PR.
2. **EDGE-9 (offline-сессия)**: включить авиарежим на середине тренировки (2–3 записанных сета) → убить приложение → включить сеть → зайти: подходов нет (ожидается потеря — фикс очереди меняет это); затем в том же офлайне «Завершить» → алерт «Подходы не сохранены» → вернуть сеть → повторить «Завершить» → всё легло один раз.
3. **EDGE-10 (stale vs error)**: закрыть приложение офлайн (>5 мин после последнего визита, > staleTime) → открыть: сейчас — полный error; после фикса — stale-контент + чип.
4. **EDGE-13 (истёкшая сессия)**: test-аккаунт, дождаться протухания refresh (или перевести время устройства) → убедиться, что редирект на login сопровождается внятным сообщением, а не пустым входом.
5. **EDGE-5/EDGE-1 (RLS/401)**: затронуть права (тестовая политика или второй аккаунт с подменой id в deep-link `/workout/<чужой>`, `/program/<чужой>/edit`) → проверить, что вместо «Нет тренировок»/«вечного skeleton» появился error+retry.
6. **EDGE-6 (цикл офлайн)**: авиарежим → отметить событие цикла → должен появиться алерт (сейчас — тишина), sheet не должен «съедать» тап.
7. **Loading-прыжки (EDGE-11)**: быстрый 3G-троттлинг → Отчёт тренировки/Замеры: замерить видимый скачок layout.
8. **FD-SEED-2a end-to-end**: открыть тренировку с «Планка на локтях» → записать «30» 3 подхода с RPE ≤ 7 → рекомендация должна быть TIME-ветки (усложнение варианта/время), а не «+вес».

---
Ограничения: read-only аудит, без сборок/сетевых вызовов; вывод `spark-output/context/edge.json` и обновление dashboard пропущены по запрету владельца на запись иных файлов, кроме этого отчёта.
