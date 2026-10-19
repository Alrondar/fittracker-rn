# CTR-3, волна 3: «опасная тройка» — замер на 19.10.2026

Режим: read-only (`wc -l`, grep по basename, полное чтение трёх файлов). Ветка `main`, база — коммит `87b33c4` (волна 1). Гейт и пороги — `CLAUDE.md §2` (500 — гейт по `wc -l` на день пакета, 450 — триггер). Предыверье: `dependency-impact-2026-10-06.md` по этому зерну мёртв, заменён этим файлом (строка CTR-3 в `STATUS.md §15`).

## 1. Факт на 19.10

Пересъём всего списка: `git ls-files 'app/**/*.tsx' 'src/**/*.ts*' | xargs wc -l` → **23 носителя >500**, совпадает с `STATUS.md §15`. Тройка:

| Файл | Строк (`wc -l`) | Экспортов | Реальных импортёров | Файлов с упоминанием только в комментарии |
|---|---:|---:|---:|---:|
| `src/components/workout/SetsGrid.tsx` | **1593** | 1 (`SetsGrid`) | **1** | 7 |
| `src/hooks/useWorkoutSession.ts` | **1399** | 1 (`useWorkoutSession`) | **1** | 9 |
| `src/services/workoutService.ts` | **796** | 18 (13 функций, 4 интерфейса, 1 type alias) | **4** | 1 |

Фоновые соседние носители (не в объёме этой задачи, но в той же зоне): `app/workout/[id].tsx` 694, `src/components/workout/ExerciseSlider.tsx` 579, `src/components/workout/ExerciseCard.tsx` 359, `src/components/workout/RestTimerContext.tsx` 316, `src/hooks/workout/useWorkoutSession.mapper.ts` 220, `src/hooks/workout/useWorkoutSession.types.ts` 55, `src/hooks/workout/useWorkoutSession.loader.ts` 9 (шим).

### 1.1 SetsGrid — кто и что берёт

Единственный реальный импорт: `src/components/workout/ExerciseCard.tsx:12` — `import { SetsGrid } from './SetsGrid'`, место использования — JSX `ExerciseCard.tsx:275–308`, 33 пропа, из них 3 — инлайн-стрелки (`onSavePainQuick`, `onClearPainQuick`, `onOpenPainDetail`).

`PrPop`, `SetInput`, `SetRow`, `getSetRowsConfig`, `REJECTION_REASONS`, `FeedbackState`, `SetInputProps`, `SetRowProps`, `SetsGridProps` — **не экспортируются**, вне файла не видны. Любой их вынос создаёт новый публичный surface, которого сегодня нет.

Упоминания в комментариях (не потребители, но носители граблей — 7 файлов):

| Файл:строка | Что зафиксировано |
|---|---|
| `app/workout/[id].tsx:542` | SetsGrid/чипы управляют отдыхом через `getRestActions()` (прокси в `useWorkoutSession`) |
| `app/workout/[id].tsx:620–623` | `removeClippedSubviews` убран: после детача ячейки SetsGrid теряли responder, blur не доставлялся. «Не возвращать» |
| `src/components/workout/ExerciseSlider.tsx:4–5` | `removeClippedSubviews` намеренно не ставим (SG-2) — детач роняет responder/blur у TextInput сетов |
| `src/components/workout/ExerciseSlider.tsx:437` | `removeClippedSubviews` убран, «TextInput, детач вью ронял responder/blur ячеек SetsGrid. Не возвращать.» |
| `src/components/workout/RecommendationCard.tsx:6,34` | карточка consumes данные, произведённые SetsGrid; `accentColor` уже вычислен SetsGrid |
| `src/components/workout/PainMorphEditor.tsx:3`, `RpeEditor.tsx:8`, `PlateMathRow.tsx:22`, `RestTimerContext.tsx:11` | ссылки на морф-механику / рамку / singleton |

### 1.2 useWorkoutSession — кто и что берёт

Единственный реальный импорт хука: `app/workout/[id].tsx:18`, деструктуризация `73–105` — **31 ключ из 34 возвращаемых**. Три ключа не читает никто (`grep` по `app/ src/`, кроме самого хука): `setIsWorkoutActive`, `currentTimeRef`, `alternativesCache` (единственное наружное упоминание `alternativesCache` — комментарий в `src/store/useStore.ts:10`). Возврат можно сузить на 3 позиции без единой правки потребителя — но `currentTimeRef` и `alternativesCacheRef` внутри хука живые, удалять надо из `return`, не из тела.

Упоминают имя в комментариях, не импортируя (9 файлов): `app/workout/[id].tsx:542`, `src/components/workout/PainSheet.tsx:100,160`, `src/components/workout/RestTimerContext.tsx:5,12`, `src/hooks/useWarmup.ts:218`, `src/hooks/workout/useWorkoutSession.mapper.ts:2,61`, `src/hooks/workout/useWorkoutSession.types.ts:2`, `src/services/weeklySummaryService.ts:364`, `src/store/useStore.ts:9`, `scripts/check-workout-resume.ts:2`.

Отдельно: `src/components/workout/ExerciseSlider.tsx:37` импортирует **тип** `FetchAlternativesResult` — но не из хука, а из шима `src/hooks/workout/useWorkoutSession.loader.ts`, который реэкспортирует его из `workoutService`. Хук этот тип не поставляет.

### 1.3 workoutService — кто и что берёт

| Импортёр | Строка | Забираемые экспорты |
|---|---|---|
| `src/hooks/useWorkoutSession.ts` | 35–49 | 13: `fetchWorkoutSession`, `fetchAlternatives`, `fetchExerciseHistory`, `type FetchAlternativesResult`, `updateWorkout`, `upsertWorkoutLogs`, `updateWorkoutExerciseId`, `updateWorkoutExerciseSettings`, `addWorkoutExerciseBelow`, `removeWorkoutExercise`, `clearWorkoutLogs`, `finishWorkoutAndAdvance`, `type WorkoutFinishResult` |
| `src/hooks/workout/useWorkoutSession.loader.ts` | 4–9 | 4 (чистый ре-экспорт, локального использования нет): `fetchWorkoutSession`, `fetchAlternatives`, `type WorkoutSessionData`, `type FetchAlternativesResult` |
| `src/services/workoutsService.ts` (именно множ. число — отдельный файл) | 2 | 1: `finishWorkoutAndAdvance` (путь «пропуск дня») |
| `app/workout/create.tsx` | 8 | 2: `startProgramWorkout`, `repeatWorkout` |

Комментарий-упоминание без импорта: `src/hooks/useWorkoutSession.ts` отсутствует; внутри `workoutService.ts` строки 278/421/540 — исторические пометки «перенесено из …», потребителями не считать.

Не востребовано снаружи (`не найдено`): `WorkoutFinishStatus` (только как поле `WorkoutFinishResult`), `NewWorkoutExercise` (только параметр `addWorkoutExerciseBelow`).

## 2. Что файлы тянут внутрь

### 2.1 Явные импорты

| Носитель | Хуки | Контексты/синглтоны | Сервисы и граница | Движок/утилиты |
|---|---|---|---|---|
| SetsGrid | `useTimerSettings`, `useRpeSettings`, `useBarbellSettings` (все три — AsyncStorage), `useRecommendationFeedback` (React Query `useMutation` + `useStore`) | — (контекстов нет) | прямого `supabase` нет; запись — только через `useRecommendationFeedback` | `engine/progression` (`calculateProgression`, `explainProgression`, `applySafetyPrecedence`, `applyReadinessContext` + 5 типов), `utils/numericInput`, `hooks/useUnitPreferences` (5 экспортов-функций), `utils/perf`, дети: `SetFeedbackControl`, `RpeEditor`, `PainMorphEditor`, `PlateMathRow`, `RecommendationCard`, `ui/Reveal`, `ui/PressableScale` |
| useWorkoutSession | `useQueryClient` (RQ) | `components/workout/RestTimerContext` → `getRestActions` (компонент-файл в хуке — DEP-7 жив), `lib/feedback` (`feedback.alert`), `react-native` `AppState` | `services/workoutService` (единственная supabase-граница), `services/programsService`, `services/profileService`, `services/painService`, `lib/queryInvalidation` | `utils/errorMapper`, `utils/perf`, `engine/alternatives` (только типы), `constants/injuries`, `hooks/workout/useWorkoutSession.mapper` (4 чистые функции) |
| workoutService | — | — | `lib/supabase`, `exerciseReferenceService`, `injuriesService`, `painService` | `engine/alternatives` (`rankAlternatives` + 5 типов), типы из `hooks/workout/useWorkoutSession.types` (сервис → хук-подмодуль, обратный слой) |

### 2.2 Скрытые связи без явного импорта

| Связь | Где | Суть | Что ломается при переносе |
|---|---|---|---|
| ref-зеркало `sets` | `SetsGrid.tsx:550–551` | `setsRef.current = sets` пишется **в теле рендера**; читают `shouldShowRpeChip` (578), `handleOpenFeedback` (1078, 1081), `handleToggleWarmup` (1118) — чтобы колбэки не теряли идентичность и `memo(SetRow)` не сбрасывался | Перенос колбэка в файл, принимающий `sets` пропсом, возвращает его в deps → компаратор FZ-2 (431–452) начинает видеть новый `updateSet` на каждый рендер и перерисовывает все строки при каждом коммите |
| ref-зеркало `exercises` | `useWorkoutSession.ts:83, 100–102` | синхронизация **эффектом**, не в рендере; читают синхронно `updateExerciseSettings` (531, 541), `addSet` (556), `hasLoggedSets` (607), `replaceExercise` (796), `saveWorkout` (1257) и др. | Вынос в модуль, читающий `exercises` из замыкания, даёт устаревшие данные. Отдельная тонкость: `updateExerciseSettings` читает `exercisesRef.current` **после** вызова `setExercises` (504–545) и полагается, что эффект ещё не отработал — `before` (541) это старый массив; при переносе этот порядок надо сохранить буквально |
| мутация внутри state-updater | `useWorkoutSession.ts:433`, `466`, `485` | `pendingLogsRef.current.set(...)` + `scheduleFlush()` вызываются **внутри** апдейтера `setExercises`, тогда как `addSet` (578–590) и `updateExerciseSettings` (528–533) вынесли persist наружу и комментируют это ссылкой на `CLAUDE.md §9` | Два стиля в одном файле. При выносе `updateSet` в общий модуль апдейтер остаётся нечистым (в StrictMode двойной вызов пишет тот же ключ карты — идемпотентно, но таймер debounce пересоздаётся дважды). Исправлять стиль в том же коммите, что и split, нельзя: это правка поведения, не перемещение |
| инлайн-пропсы, пробивающие memo | `ExerciseCard.tsx:305–307` | `onSavePainQuick`/`onClearPainQuick`/`onOpenPainDetail` — стрелки, создаваемые на каждый рендер карточки; `SetsGrid` обёрнут в `memo` без компаратора → сравнение по `===` всегда «изменилось», вся таблица перерисовывается вместе с карточкой | Это не дефект нарезки, а уже существующий дырявый край: любой новый memo-ребёнок внутри SetsGrid унаследует перерисовку. Сначала — стабилизация трёх колбэков в `ExerciseCard`, потом вынос JSX-блоков SetsGrid |
| Zustand без селектора | `useRecommendationFeedback.ts:18` (`const { userId } = useStore()`) | подписка на весь стор, вызывается из каждого экземпляра SetsGrid | Вынос COACH-3-обработчиков в отдельный компонент умножает число подписчиков и мутаций; при переносе — не терять `useStore`-подписку, иначе `userId` станет `undefined` и мутация бросит «User not authenticated» (тихо, `onError` глотает) |
| forward reference в хуке | `useWorkoutSession.ts:247` против объявления `358` | `loadWorkout` (206) пишет `startedSavedRef.current = true`, а `const startedSavedRef = useRef(false)` объявлен на 111 строк ниже. Не TDZ-баг только потому, что эффект стартует после завершения тела хука | Единственная реальная перестановка, которую **нельзя** делать «по частям»: если `loadWorkout` уедет в модуль, `startedSavedRef` обязан приехать параметром (или переехать к нему). Механический cut-paste без этого — `ReferenceError` на первом же открытии тренировки |
| двойной флаг активности | `useWorkoutSession.ts:68/71`, `116–122`, `70/72`, `120–122` | `isWorkoutActive`/`isWorkoutActiveRef`, `isFinishing`/`isFinishingRef`: состояние для рендера + ref для чтения из колбэков; `applySessionReset` (664–665) и `saveWorkout` (1232–1233, 1247–1248, 1330–1331, 1353–1354) пишут оба всегда парой | Разъединение пары = либо guard не срабатывает (двойной финиш, BUG-6), либо UI не видит состояния. Переносить только парами |
| глобальный реестр инвалидаций | `useWorkoutSession.ts:15, 671, 1268` | `invalidateWorkoutAffectedCaches(queryClient, userId)` — единственный владелец списка ключей (`src/lib/queryInvalidation.ts:15`); сам хук ключей не знает | При выносе `saveWorkout`/`applySessionReset` в разные модули надо не продублировать список где-нибудь ещё — `INVENTORY §10.1(3)` прямо запрещает |
| формат embed-запроса как контракт | `workoutService.ts:345–371` и `398–418` | `fetchExerciseHistory` обязан давать ту же форму, что `recentLogs` внутри `fetchWorkoutSession` (тот же embed `workout_exercises(exercise_id)`, те же `.neq(...workout_id)`, `.eq('is_warmup', false)`, `created_at DESC`, `limit(300)`) — иначе карточка после замены покажет «Прошлый» не тот, что при перезаходе | Перенос в разные файлы разводит две формы; урок PRG-400 (embed без FK) уже давал прод-баг. Держать в одном модуле рядом |
| неатомарность по решению | `workoutService.ts:716–728, 779–783` | `addWorkoutExerciseBelow` вставляет строку, затем параллельно `Promise.all` перенумеровывает `order_index`; при пропаже якоря — компенсирующий `delete` (767). Атомарность сознательно принесена в жертву (вердикт 16.10, прод-DDL не заводили) | Формально это близко к антипаттерну `CLAUDE.md §9` («неатомарные delete+insert»), но решение зафиксировано комментарием. При split **не «чинить»** — только переносить целиком, включая комментарий |

### 2.3 Синглтон `bindRestActions` / `getRestActions`

Факт по коду, `src/components/workout/RestTimerContext.tsx`: переменная модуля `restActions` (65), `bindRestActions` (67–72) с unbind по проверке идентичности (`if (restActions === actions) restActions = null`), `getRestActions` (75–77), bind происходит в **mount-эффекте провайдера** (191–201: сначала `publish(0,false)`, потом `bindRestActions(actions)`, в cleanup — `unbind()` + `clearInterval`).

Кто пользуется из тройки:

| Файл | Пользуется? | Как |
|---|---|---|
| `src/hooks/useWorkoutSession.ts` | **да, единственный** | импорт строка 34, вызов строка 92 внутри `startRestTimer` (91–93): `getRestActions()?.start(restSeconds, ownerIndex)`; `cleanupRestTimer` (94–97) — намеренный no-op |
| `src/components/workout/SetsGrid.tsx` | нет | вызов ищет не синглтон, а проп `startRestTimer` (объявление 494, деструкт 533, вызов 797 внутри эффекта автостарта 783–807). Цепочка: `useWorkoutSession` → `[id].tsx:438` → `ExerciseSlider:465` → `ExerciseCard:294` → `SetsGrid:797` |
| `src/services/workoutService.ts` | нет | связи с таймером нет вообще |

Что будет, если вызывающий код перенести в другой файл:

1. **Само местоположение вызова не важна** — рукопожатие по модульной переменной, а не по пропсам: перенос `startRestTimer` в любой модуль сохранит работу, если модуль импортирует `getRestActions` **по тому же пути**, что и провайдер.
2. **Критично число экземпляров модуля `RestTimerContext`.** Если после нарезки провайдер импортируется одним путём (`../../components/workout/RestTimerContext`), а вызывающий код — другим (например, через создаваемый баррель `components/workout/index` или через `../RestTimerContext` и `../../workout/RestTimerContext` одновременно), Metro может собрать **два экземпляра модуля** → две разные `restActions`. Результат тихий и худший из возможных: `getRestActions()` возвращает `null`, опциональная цепочка (92) делает no-op, автоотдых и чип таймера молчат, ошибок в консоли нет. Именно этот риск был зафиксирован как DEP-2 06.10 и он не закрыт.
3. **Критичен момент вызова относительно bind.** `RestTimerProvider` монтируется в `app/workout/[id].tsx:544`, то есть **родителем** по отношению к SetsGrid. React вызывает пассивные эффекты детей до эффектов родителя, поэтому на первом монтировании окно, когда `getRestActions()` ещё `null`, реально существует. Сегодня в него не попадаем случайно: эффект автостарта (`SetsGrid.tsx:783–807`) зовёт `startRestTimer` только при `completedSets > 0 && completedSets !== restStartedRef.current`, а на mount `completedSets` ещё не растёт. Если при нарезке вызов отдыха уедет в mount-эффект нового компонента или в `useLayoutEffect` — отдых перестанет запускаться на первом сете молча.
4. **Побочный эффект DEP-7 не лечится переносом вызова.** Хук импортирует компонент-файл, а тот тянет `react-native-svg`, `MiniRing` (222–262), `RestChip` (271–315), `expo-haptics`, `theme`, `typography`, `lib/timerSounds`, `useTimerSettings`, `useWebPageHidden`. Любой новый модуль хука, которому нужен `getRestActions`, наследует этот UI-граф в бандл хук-слоя. Единственный чистый путь — перенести `RestActions` + `bindRestActions`/`getRestActions` в `src/lib/restActions.ts` и реэкспортировать из контекста (пути существующих импортёров не меняются), тогда вызывающий код импортирует lib, а провайдер — lib. Это отдельный маленький шаг, который надо сделать **до** нарезки `useWorkoutSession`, иначе он переедет в три новых файла сразу.

## 3. Естественные швы нарезки

Оценка: 🔴 — перенос меняет наблюдаемое поведение или требует прогона на устройстве; 🟡 — механический перенос, но есть связанный контракт, который легко разорвать; 🟢 — чистое перемещение, офлайн-гейты доказательны.

### 3.1 SetsGrid.tsx (1593)

| Шов | Диапазон строк | Верхнеуровневое объявление | Риск | Почему |
|---|---|---|---|---|
| Константы и чистая функция конфигурации | 81–87, 92, 95–106 | `REJECTION_REASONS`, `type FeedbackState`, `getSetRowsConfig` | 🟢 | Нет хуков, нет React, нет замыканий. Только тип `UserRejectionReason` из `types/workout` |
| Scale-pop рекорда | 108–134 | `const PrPop = memo(...)` | 🟢 | Самодостаточен: `useSharedValue`/`withSequence`/`withTiming`/`Easing` + `FONT_FAMILIES`. Пропсов два, идентичность не участвует в компараторах |
| Ячейка ввода | 139–149, 151–247 | `interface SetInputProps`, `const SetInput = memo(...)` | 🟡 | Механически безопасно (тип элемента после переноса — тот же объект, ре-маунта ячеек нет, `key`-строки 309/334/350/369/385 не меняются). Но внутри живёт вся responder-механика: `focusedRef` (161), `lastSentRef` (162), `localRef`/`commitRef` (163–166), `debounceRef` (167), `commitNow` (171–184), `scheduleCommit` 350 мс (190–193), sync-эффект (195–202), финальный коммит на unmount (206), `sanitizeNumericInput` на вводе (229), `blurOnSubmit={false}` (243). Перенос — **байт в байт**; любая правка тела в том же коммите = 🔴 |
| Строка сетов + компаратор | 252–275, 277–453 | `interface SetRowProps`, `const SetRow = memo(...)`, внутренняя `function setRowPropsEqual` (431–452) | 🔴 | Компаратор — positional-контракт по 12 props + поэлементное сравнение `rowSets` (432–437). Он ссылается на `SetRowProps`, поэтому интерфейс обязан уехать **тем же куском**. Если разойдутся по разным файлам и кто-то добавит проп только в интерфейс — TypeScript не заметит (в компараторе нет `satisfies`/полного покрытия ключей), `memo` тихо деградирует до «всегда равны» или «всегда неравны»: регрессия ровно FZ-2 (перерисовка всей таблицы на каждый коммит). Требует прогона на устройстве |
| PR-момент (логика) | 726–772 | внутри компонента: `bestRef`, `seenCompletedRef`, `prTimerRef`, `prMoment`, эффекты 737–772 | 🟡 | Кандидат в `usePrMoment(sets, completedSets, personalBest, isSetCompleted, unit)` — чистый extract-hook, только React-примитивы. Порядок `useEffect` внутри нельзя менять (первый seedит `bestRef`, второй сравнивает с `seenCompletedRef`, третий чистит таймер) |
| Морф «таблица ⇄ редактор» | 587–717 | `morph`, `tableHSV`, `editorHSV`, `widthHSV`, `editingIdxSV`, `totalSetsSV`, `editorMounted`, `editorReady`, `editorSetIndex`, `closeRpeEditor`, `handleTableLayout`, `handleEditorLayout`, `morphStyle`, `tableFadeStyle`, `editorFadeStyle`, `editorWrapStyle`, `editorKind`, `painOpenPrev`, `closePainMorph`, `handlePainConfirm/Clear/Detail` | 🔴 | Семь shared-value + три useState + четыре animated style связаны с JSX 1169–1259 и 1546–1589 через `onLayout`-замеры и `pointerEvents`. Комментарий 590–591 («уроки SG-2/FX-2: не трогаем нативный responder», «таблица НЕ перемонтируется») — прямой запрет на любую перестановку порядка детей. Плюс четыре `eslint-disable-next-line react-hooks/exhaustive-deps` (614, 625, 633, 642, 690, 698) — депенденси-списки уже вручную урезаны, перенос в хук без них ломает анимацию закрытия (описано в комментарии 603–606) |
| Эффект автостарта отдыха | 774–807 | `timerSettings`, `restStartedRef`, эффект 778–781 и 783–807 | 🔴 | Это та самая граница с синглтоном (см. §2.3). Единственный в SetsGrid путь к `getRestActions()` — через проп `startRestTimer` |
| Рекомендация движка | 841–894 (+827, 829–839) | `PROGRESSION_STEPS`, `handleProgressionStep`, `recommendation` (useMemo 846–885), `highlightedChip` (889–894), `recommendationColor` (901–909) | 🟡 | Кандидат в `useWorkoutRecommendation(...)` из чистых входов: `sets`, `repsRange`, `targetRpe`, `safetyContext`, `readinessContext`, `progressionSetIndex`, `policy`, `equipmentKey`, `unit`, `barWeight`. Обязанности, которые нельзя размывать: `equipmentKey` (557) как стабильный деп вместо массива (PLATE-SNAP, комментарии 879–882) и `barWeightKg: unit === 'kg' ? barWeight : lbToKg(barWeight)` (864). Офлайн это проверяемо `scripts/check-loadables.ts`, он гоняет `calculateProgression`/`explainProgression` напрямую |
| COACH-1/COACH-3 обработчики | 911–938, 940–1071 | `expanded`, `recommendationCollapsed`, `dismissed`, `chipsOpen`, `feedbackState`, эффект сброса 928–933, `explanationItems`, `toggleExpanded`, `toggleRecommendation`, `handleDismiss`, `handleChipsToggle`, `handleAccept`, `handleReasonSelect`, `handleSkipReason` | 🟡 | Семь `useState` + эффект сброса по `exerciseIndex` + три fire-and-forget записи. Хорошо сворачивается в `useRecommendationFeedbackState` (свой файл), deps у `handleAccept` (1016–1024) переносить целиком: `submitFeedback` — стабильный `mutate` из React Query, его идентичность гарантирована вне файла |
| Заглушка «пустой рамки» | 1144–1160 | `plateWeight`, `hintVisible` | 🟢 | Чистое выражение из уже посчитанных значений; `plateMathVisible` импортируется из `PlateMathRow`. Кандидат в чистую функцию с офлайн-проверкой предиката |
| JSX блока подсказки | 1325–1516 (~192 строки разметки) | inline внутри `Animated.View` (1320–1324): прошлые данные 1340–1374, `RecommendationCard` 1376–1399, prompt причин 1403–1465, чипы прогрессии 1468–1505, `PlateMathRow` 1508–1514 | 🟡 | Самый большой дешёвый выигрыш по строкам. Родитель (`tableFadeStyle` + `onLayout={handleTableLayout}`) обязан остаться в SetsGrid — перенос только содержимого. Н memo-ребёнок делать не надо: он и так перерисовывается вместе с SetsGrid (см. инлайн-пропсы §2.2), поэтому memo-машинерии не добавляем |
| JSX баннера рекорда | 1261–1308 | inline внутри `Reveal origin="top-center"` | 🟢 | Пропсов два (`prMoment`, `unit`) плюс `toDisplay`/`colors`. Разметка без состояний и без анимационных shared-value, `PrPop` уже отдельное объявление |
| Редакторы в морф-слоте | 1546–1589 | inline `PainMorphEditor` / `RpeEditor` c `key` (1564, 1574) | 🔴 | Ключ `rpe-N` на редакторе (1574) — намеренный remount по сету; условие 1546 (`editorKind === 'pain'`, иначе берётся `sets[editorSetIndex]`) завязано на `editorSetIndex`, живущий до конца анимации (комментарий 603–606). Любая «оптимизация» при переносе открывает закрытый баг отмены закрытия |

### 3.2 useWorkoutSession.ts (1399)

Все объявления — **внутри одной функции** (`57–1399`), верхнеуровневых, кроме самой `useWorkoutSession`, в файле нет. Поэтому «швы» здесь — это extract-hook'и через параметр-контекст (refs + setState + колбэки), а не перенос свободных функций.

| Шов | Диапазон строк | Что выносим | Риск | Почему |
|---|---|---|---|---|
| Прокси отдыха | 87–97 (`startRestTimer`, `cleanupRestTimer`), импорт 34 | тонкий прокси к `getRestActions()` | 🟡 | 10 строк, но именно этот фрагмент удерживает hook→component импорт (DEP-7). Правильный порядок: сначала `lib/restActions.ts`, потом этот перенос, иначе слой-запах размножится по новым файлам |
| Flush-семейство | 124–201 (`flushPendingLogs` 130–187, `flushPromiseRef`/`joinFlush` 193–201) | `useSessionFlush(pendingLogsRef)` | 🔴 | Ядро persistence P0-B. Инварианты, которые обязан унести целиком: (а) `pendingLogsRef.current.clear()` **до** обхода (133) и возврат в карту только если ключа ещё нет (179–181) — «свежее побеждает»; (б) `set_number = index + 1` считается **до** фильтрации пустых (137–166), иначе сеты сдвигаются; (в) F3-условия фильтра, включающие RPE/RIR/difficulty-only (158–165); (г) третий аргумент `upsertWorkoutLogs(…, exerciseLogs.length)` — граница заменяемого диапазона F5 (172); (д) single-flight `joinFlush` (194–201) против **сырого** `flushPendingLogs()` на unmount (338) — намеренное различие, «завершить» подхватывает in-flight flush (BUG-7), а unmount обязан уйти без await |
| Загрузка сессии | 203–299 (`loadWorkout` 206–295, эффект 297–299) | extract-hook | 🔴 | Кроме forward reference `startedSavedRef` (247 против 358), внутри: правило восстановления времени F1 (233–250: `duration_seconds` приоритетнее `now − started_at`, guard `elapsed < 86400`), fire-and-forget `getPersonalBests` с идемпотентным слиянием через функциональный `setExercises` (273–285), четыре perf-метки, и `setLoading(false)` строго в `finally` (292–294) |
| Persistence на уходе | 301–347 (AppState 307–329, unmount 332–347) | `useSessionPersistence` | 🔴 | Порядок внутри одного обработчика: снять debounce → `void joinFlush()` → `updateWorkout({duration_seconds})`. Список состояний `background/inactive/hidden` (313) — кросс-платформенный контракт RNW, `Platform`-ветки здесь специально нет (комментарий 309–312). У unmount-эффекта намеренно пустой deps-массив + `eslint-disable` (346–347): при переносе в хук с deps он начнёт срабатывать на каждую смену `workoutId` и удвоит запись |
| Колбэки таймера | 349–376 | `handleTimerTick`, `startedSavedRef`, `handleTimerStart`, `handleTimerStop` | 🟡 | `handleTimerStop` — пустая функция (376): не «мёртвый код», а обязательный проп `WorkoutTimerProvider` (`[id].tsx`: onStop). Идемпотентность `started_at` по флагу (365–373) завязана на тот же `startedSavedRef`, что и `loadWorkout` |
| set-мутации | 407–593 (`scheduleFlush` 410–417, `updateSet` 419–439, `updateSetFeedback` 441–472, `applyProgression` 474–491, `isSetCompleted` 493–502, `updateExerciseSettings` 504–548, `addSet` 553–593) | `useSetMutations` | 🔴 | `VF-1` сравнение **всех** полей патча (450–455) — без него `{isWarmup}` на пустом сете отбрасывался. `isSetCompleted` (493–502) — общий предикат для SetsGrid, RecommendationCard, чипов RPE и автостарта отдыха: его идентичность (`useCallback []`) входит в deps `shouldShowRpeChip` (581) и `memo`-компараторы. `addSet` пакетный (VF-4) и считает `target_sets` от фактической длины сетки, а не от `target_sets` (585–589). Всё это — чистые перемещения, но любое упрощение = потеря сетов |
| RESET-T | 595–712 (`timerResetToken` 601, `hasLoggedSets` 606–619, `applySessionReset` 621–674, `resetSession` 676–712) | `useSessionReset` | 🔴 | Порядок внутри `applySessionReset` закомментирован как обязательный: снять debounce → (`clearLogs ? clearWorkoutLogs + обнуление сетов : await joinFlush`) → `updateWorkout({started_at:null, duration_seconds:0})` → **затем** погасить активность, затем токен (662–669) → затем инвалидация (671). Перестановка возвращает баг «автостарт по isActive или unmount-запись вернули started_at обратно». `clearWorkoutLogs` принимает список id явно (630–634), потому что PostgREST не фильтрует DELETE по вложенной таблице |
| Замена / возврат оригинала | 714–941 (`swapCardFields` 724–752, `reinjectExerciseHistory` 754–792, `replaceExercise` 794–850, `resetToOriginal` 858–941) | `useExerciseReplacement` | 🔴 | Три порядка обращений к серверу зафиксированы: (1) `painService.updatePainEventExerciseId` **до** `updateWorkoutExerciseId` (822–835) — зеркально при возврате (882–895); (2) запись в БД не блокирует локальный свап, ошибка глотается (832–835); (3) `void reinjectExerciseHistory(...)` после локального свапа (838) и гонка-гейт по `ex.id !== exerciseId` (769). Снимок оригинала (`originalsRef`, 82) живёт в памяти экрана и после перезахода исчезает — это решение 25.09, не баг |
| Замена в программе | 943–1010 (`replaceExerciseInProgramCb`) | тот же модуль, что выше | 🟡 | Оптимистичный локальный свап → `replaceExerciseInProgram` → при ошибке полный rollback карточки (995–1007). Единственная точка касания тройки с program-sync (`CLAUDE.md §2` прямой запрет ломать sync-семантику); RPC из этого файла не вызывается |
| ADD-BELOW | 1012–1132 (`buildAddedExercise` 1021–1055 — **единственное верхнеуровневое объявление внутри хука, не колбэк**, `addExerciseFromSearch` 1068–1120, `removeAddedExercise` 1123–1132) | `useAddExercise` | 🟡 | `buildAddedExercise` — чистая функция, выносится без контекста (нужен только `NEW_PROGRAM_EXERCISE_DEFAULTS`). Порядок «сначала строка тренировки, потом программа» (1061–1066) защищает от дубля через sync; при ошибке программы — двойной откат (фильтр стейта 1110 + `removeWorkoutExercise` 1112). Ошибку отдаём наверх без Alert |
| Боль | 1134–1202 (`savePainState` 1137–1173, `clearPainState` 1175–1202) | `useExercisePainState` | 🟢 | Два зеркальных оптимистичных апдейта с откатом к `previousPainState`; ни порядка запросов, ни refs кроме `exercisesRef`. Самый дешёвый кусок в файле, 68 строк |
| Финиш | 1204–1361 (`saveWorkout`) | `useWorkoutFinish` | 🔴 | Порядок и вложенность: guard `isFinishingRef` (1210) → гейт «не начата» (1211–1217) → `{ … }` блок 1226–1227 (см. находку NF-2) → повторный guard (1230) → снятие debounce → `await joinFlush()` и **аборт при failures > 0** (1244–1254) → подсчёт `totalLogs` (1256–1261) → `invalidateWorkoutAffectedCaches` **до** RPC (1268) → `finishWorkoutAndAdvance` → `reportFinish` (1275–1309) с четырьмя маршрутами → catch с ретраем `doFinish` **вне** `finally` (1324–1348), после которого `setSaving(false)` уже отработало. Инверсия «инвалидация после RPC» возвращает BUG-1 |
| Возвращаемый объект | 1363–1399 | — | 🟢 | 34 ключа; 3 не читает никто (§1.2). Сужение — отдельная микроправка, не split |

### 3.3 workoutService.ts (796)

Здесь швы механические (свободные функции), риск в формах запросов и в порядке вызовов.

| Шов | Диапазон строк | Объявления | Риск | Почему |
|---|---|---|---|---|
| Приватные помощники | 21–24, 26–32 | `interface ProgramDayRow`, `function parseTargetReps` | 🟡 | `parseTargetReps` вызывают **две далёкие секции**: 188 (`startProgramWorkout`) и 743 (`addWorkoutExerciseBelow`). При split обязан уехать в общий внутренний модуль (`workoutService/internal.ts`), дублирование тела запрещено `AGENTS.md` («один факт — один владелец») |
| Старт тренировки по программе | 34–213 | `startProgramWorkout` | 🟡 | Линейная цепочка из 7 последовательных `supabase.from` без RPC: идемпотентный возврат уже открытой тренировки (52–65) обязан остаться **до** вставки (161), иначе дубли. Порядок «сначала workouts, получаем id, потом workout_exercises» (160–201) — сознательный отказ от плейсхолдера. Фолбэк-каскад поиска дня (89–141, четыре ступени) трогать нельзя: он и есть покрытие дыр в каталоге программ |
| Повтор тренировки | 215–275 | `repeatWorkout` | 🟢 | Один embed `workout_exercises ( … )` (220–221), вставка (228–271). Не зависит от предыдущей секции |
| Загрузка сессии | 277–390 | `WorkoutSessionData`, `fetchWorkoutSession` | 🔴 | Три секвенции и один `Promise.all` (345–371). Инварианты: `limit(300)` + `created_at DESC` + `is_warmup=false` + `.neq(workout_id)` у recentLogs; `reps_left/reps_right` в select (VF-2, 359); два guard'а на пустые `in()`-списки (346, 355) — без них PostgREST отдаёт ошибку вместо пустоты |
| История одного упражнения | 392–418 | `fetchExerciseHistory` | 🔴 | Должен оставаться **рядом** с `fetchWorkoutSession`: контракт «форма = recentLogs» (393–397) иначе SWAP-1 показывает другой «Прошлый», чем перезаход экрана. Отличие `.or('weight_kg.not.is.null,...')` (413) — сознательная фильтрация F3-строк только с RPE, которую надо видеть в паре с `flushPendingLogs` |
| Аналогами движок | 420–537 | `FetchAlternativesResult`, `fetchAlternatives` | 🟡 | Пять последовательных источников: `exercise_relationships` (438), `exercises` (468), `getExerciseReferenceData` (477), `getExerciseContraindications` **условно** при `activeInjuries.length > 0` (505–506), `rankAlternatives` (508). Условность 505 — единственная защита от лишнего запроса, терять её нельзя. Единственный потребитель результата — `useWorkoutSession` + тип через шим |
| Мелкие updates | 539–561, 668–700 | `updateWorkout`, `updateWorkoutExerciseId`, `updateWorkoutExerciseSettings` | 🟢 | По одному запросу, без RPC. Семантика `null` = «очистить колонку» (549–555) обязательна к переносу вместе с комментарием — это контракт RESET-T |
| Финиш-транзакция | 563–613 | `WorkoutFinishStatus`, `WorkoutFinishResult`, `finishWorkoutAndAdvance` | 🔴 | ADV-atomic (18.10): единственный вызов `finish_workout_and_advance` (596) на весь клиент, два потребителя (`useWorkoutSession:1315` и `workoutsService` для скипа). Нормализация ответа через `Number(row.phase ?? 1)` и `alreadyFinished === true` (605–612) — защитная вёрстка под `SECURITY DEFINER`-возврат; при переносе не «упрощать» до прямых типов |
| Запись сетов | 615–666 | `upsertWorkoutLogs`, `clearWorkoutLogs` | 🔴 | `p_total_sets: totalSets ?? null` (645) — тот самый F5-диапазон, значение приходит из `exerciseLogs.length` в flush. `clearWorkoutLogs` требует **непустого** явного списка id (657–663) и опирается на RLS `workout_logs_delete`. Эти две функции обязаны лежать в одном модуле с flush-логикой, иначе атомарность записи перестаёт читаться в одном месте |
| Add-below | 702–796 | `NewWorkoutExercise`, `addWorkoutExerciseBelow`, `removeWorkoutExercise` | 🟡 | Вставка + параллельная перенумерация `order_index` + компенсирующий `delete` при пропавшем якорке (716–786). `position` у новой строки остаётся `null` намеренно (724–727) — его нельзя «дописать», потому что `replaceExerciseInProgram` матчит program_exercise по `position` |
| Shim-файл | `src/hooks/workout/useWorkoutSession.loader.ts` (9) | ре-экспорт | 🟢 | После split'а сервиса надо обновить список ре-экспортов (или объявить его мёртвым и перевести `ExerciseSlider:37` на прямые типы из `workoutService`) — но это правка пути импорта, её нельзя смешивать с нарезкой в одном коммите |

### 3.4 Три самых опасных шва (сводно)

1. `SetRow` + `interface SetRowProps` + `setRowPropsEqual` (`SetsGrid.tsx:252–453`) — 🔴, компаратор молча деградирует при малейшем расхождении с интерфейсом; регрессия = FZ-2 (перерисовка таблицы на каждый символ).
2. Flush-семейство + «сырой» flush на unmount (`useWorkoutSession.ts:124–201, 332–347`) и всё, что в него упирается (`301–329`, `657`, `1244`) — 🔴, это единственная защита от потери/двойной записи подходов (P0-B, VF-3, BUG-7).
3. Порядок `saveWorkout` (`useWorkoutSession.ts:1204–1361`), включая forward reference `startedSavedRef` (247 ↔ 358) и инверсию «инвалидация до RPC» — 🔴, BUG-6/BUG-1/ADV-atomic.

## 4. Proposed order

Общее правило: один шаг = один коммит в `main`, затем `git merge main` в `web-port` (WEB-CTR-9). Ни один шаг не совмещает перенос кода с правкой поведения.

| # | Шаг | Носитель | Офлайн-доказательство | Дополнительно обязательный прогон |
|---|---|---|---|---|
| 0 | Перенос `RestActions`/`bindRestActions`/`getRestActions` в `src/lib/restActions.ts` с ре-экспортом из `RestTimerContext.tsx`; пути потребителей не меняются | `RestTimerContext.tsx`, `useWorkoutSession.ts:34` | `tsc --noEmit`, `eslint src app`, `expo export --platform web` | **Устройство/браузер:** старт отдыха из ячейки и с чипа «Таймер» — проверка, что `getRestActions() !== null` (деградация тихая, §2.3) |
| 1 | `workoutService` → `src/services/workoutService/` c баррелем: `internal` (`parseTargetReps`, `ProgramDayRow`) / `lifecycle` (`startProgramWorkout`, `repeatWorkout`) / `session` (`fetchWorkoutSession` + `fetchExerciseHistory` **в одном модуле**) / `alternatives` / `writes` (`updateWorkout*`, `upsertWorkoutLogs`, `clearWorkoutLogs`) / `finish` / `order` (`addWorkoutExerciseBelow`, `removeWorkoutExercise`) | `workoutService.ts` | `tsc`, `eslint`, `expo export --platform web`; grep-контроль, что `supabase.rpc('upsert_workout_logs')` и `supabase.rpc('finish_workout_and_advance')` остались по **одной** точке вызова на RPC | Офлайн достаточен: файл не содержит React-состояния, формы `select`/embed не меняются. Ручная сверка diff'ом строк 345–371 и 398–418 обязательна |
| 2 | Механический вынос из SetsGrid без поведения: `getSetRowsConfig` + `REJECTION_REASONS` + `FeedbackState` (🟢), `PrPop` (🟢), `SetInput` (🟡, байт в байт), плюс `hintVisible`/`plateWeight` (🟢) | `SetsGrid.tsx` −~220 строк | `tsc`, `eslint` | **Устройство (Android в первую очередь):** ввод веса с RU-клавиатуры («82,5»), переход между полями без blur, свайп карточки во время ввода, выход с экрана сразу после набора, смена числа подходов (reflow строк) — все четыре сценария про `commitNow`/`scheduleCommit`/unmount-commit |
| 3 | JSX-блоки SetsGrid: баннер рекорда (1261–1308) и блок подсказки (1325–1516) в `components/workout/setsgrid/` | `SetsGrid.tsx` −~300 строк | `tsc`, `eslint` | **Устройство:** раскрытие 💡, «Принять», «Изменить» → чипы, «Скрыть» → причины, «Почему? …×», строка блинов при lb; высоты анимации `Reveal` не должны сдвинуться |
| 4 | `useRecommendationFeedbackState` (911–1071) и `usePrMoment` (726–772) | `SetsGrid.tsx` −~200 строк | `tsc`, `eslint`; `npx tsx scripts/check-loadables.ts` как регрессия контрактного слоя движка (хук сам не покрывается — см. примечание ниже) | **Устройство:** тот же прогон шага 3 + проверка, что состояние сбрасывается при смене упражнения (эффект 928–933) |
| 5 | `SetRow` вместе с `SetRowProps` и `setRowPropsEqual` (252–453), **одним куском**; отдельно в `ExerciseCard` стабилизировать три инлайн-колбэка (305–307) в `useCallback` | `SetsGrid.tsx` −~200 строк | `tsc`, `eslint` | **Устройство, обязательно и с замером:** печать по одному символу в сет 1 — строки 2–N не должны перерисовываться. Без этого шов считается недоказанным (`perf.ts` включён только в `__DEV__`, `perfMark('set:commit')` 180–182 даёт кадр-замер прямо на экране) |
| 6 | Осколки `useWorkoutSession`: `useExercisePainState` (1134–1202) 🟢, затем `useAddExercise` (1012–1132) 🟡 | `useWorkoutSession.ts` −~160 строк | `tsc`, `eslint` | **Устройство:** боль через чип и через PainSheet с откатом при офлайне; «Добавить сюда»/«Добавить в программу» + откат |
| 7 | `useSessionFlush` (124–201) + `useSessionPersistence` (301–347) — **одним пакетом** с шагом 8 | `useWorkoutSession.ts` | `tsc`, `eslint`; `npx tsx scripts/check-workout-resume.ts` (6/6) как регрессия mapper'а, к которому flush относится по данным | **Устройство + прод-аккаунт:** ввод → swift-закрытие приложения → возврат (Ф4), ввод → левое свайп-приложение → «Завершить» сразу (BUG-7 single-flight), офлайн-режим с «Завершить» (VF-3: `flushFailures > 0` обязан **не** писать `finished_at`), затем сверка строк `workout_logs` по set_number |
| 8 | `useWorkoutFinish` (1204–1361) + `useSessionReset` (595–712) — тем же пакетом, что 7 | `useWorkoutSession.ts` | `tsc`, `eslint` | **Устройство + прод:** полный финиш (adv/completed/already_advanced), повторный тап «Завершить» во время сети, ретрай после падения finish, RESET-T в трёх вариантах подтверждения; контроль, что инвалидация уходит **до** RPC |
| 9 | `useExerciseReplacement` (714–941) + `replaceExerciseInProgramCb` (943–1010) + `useSetMutations` (407–593) | `useWorkoutSession.ts` | `tsc`, `eslint`, `expo export --platform web` | **Устройство + прод:** замена движковая и из поиска, «Вернуть оригинал» до и после перезахода, «Заменить в программе» на готовой программе (rollback), warmup-toggle автодобавление (VF-4/F2/F5), сокращение числа сетов (F5-граница) |
| 10 | Финальный замер: `wc -l` тройки, сверка с гейтом 500; обновление `STATUS.md §15` (строка CTR-3), `INVENTORY.md` (§0 навигация, §12 blast-radius) в том же пуше | — | `tsc`, `eslint`, `prettier --check`, `expo export --platform web` в порту | Карта прогона на устройстве — как в `STATUS.md §4` для волны 1 |

Применимость офлайн-харнесов (`scripts/`), по факту прочитанного:

| Харнес | Импортирует | Применим к тройке? |
|---|---|---|
| `scripts/check-workout-resume.ts` | `buildExercisesData` из `hooks/workout/useWorkoutSession.mapper.ts` | **Косвенно.** Не трогает `useWorkoutSession.ts` вообще; годится как регрессия Ф2/Ф3 на шагах 7–9, потому что flush и `updateExerciseSettings` обязаны сходиться с тем же срезом сетки |
| `scripts/check-loadables.ts` | `engine/loadables`, `engine/progression` (`calculateProgression`, `explainProgression`) | **Косвенно.** Покрывает чистый слой, который SetsGrid только вызывает (шаги 4–5). Сам `recommendation`-useMemo, `equipmentKey` и `barWeightKg`-конверсию он не проверяет — новый харнес под них при необходимости писать не в этом пакете |
| `scripts/ux4-audit.js`, `ux4-codemod.js`, `web-alert-codemod.js`, `check-media-names.py`, `generate-types.ts`, `w1-docs.js`, `fix-equipment-svg.mjs`, `gen-app-icons.js`, `audit_utc_dates.sql` | — | Не применимы (аудит UI/медиа/токенов/типов/дат) |

Jest-инфраструктуры нет (`package.json` объявляет `"test": "jest"`, но конфиг и тесты отсутствуют; `scripts/check-workout-resume.ts:3–5` фиксирует это явно). Значит «офлайн ничего не доказывает» для интерактива — это не риторика, а режим работы.

Гейты по `CLAUDE.md §14`: `npx tsc --noEmit` и `npx eslint src app` — обязательны на **каждом** шаге. `npx expo export --platform web` — на шагах 0, 1, 9, 10 (меняются границы модулей/резолв) и всегда перед merge в `web-port`. Прогон на устройстве обязателен на шагах 0, 2, 3, 4, 5, 6, 7, 8, 9 — то есть на всех, кроме шага 1: в тройке нет ни одного куска, где TextInput/responder/blur, memo-компаратор, mount-order синглтона или атомарность записи не были бы затронуты.

## 5. Находки по ходу замера

| ID | Файл:строки | Находка |
|---|---|---|
| NF-1 | `useWorkoutSession.ts:247` против `358` | `startedSavedRef` используется в `loadWorkout` за 111 строк до объявления. Работает только потому, что эффект стартует после тела хука. Это не «мелочь стиля», а жёсткое ограничение на вынос `loadWorkout` в отдельный модуль |
| NF-2 | `useWorkoutSession.ts:1226–1227, 1359–1360` | Внутри `saveWorkout` остались два пустых блока `{ { … } }` — остаток удалённого confirm-Alert (комментарий UX-TIMER 1224–1225). Плюс дубль guard'а `isFinishingRef` (1210 и 1230). Убирать — отдельным пакетом, не в split'е: это изменение формы тела функции |
| NF-3 | `useWorkoutSession.ts:1363–1399` | 3 из 34 возвращаемых ключей не читаются никем: `setIsWorkoutActive`, `currentTimeRef`, `alternativesCache` |
| NF-4 | `useWorkoutSession.ts:433, 466, 485` против `528–533, 578–590` | Два стиля persist: часть мутаций пишет в `pendingLogsRef`/`scheduleFlush` **внутри** апдейтера, часть сознательно вынесла наружу со ссылкой на `CLAUDE.md §9` |
| NF-5 | `useWorkoutSession.ts:34` | `getRestActions` импортируется из **компонент-файла**, который тянет в хук-слой `react-native-svg`, `MiniRing`, `RestChip`, `expo-haptics`, `theme`, `timerSounds`. Слой-запах DEP-7 с 06.10 не лечился |
| NF-6 | `workoutService.ts:15–19` | Сервис импортирует типы из `hooks/workout/useWorkoutSession.types` — зависимое направление обратное к слоям (`services` → `hooks`); при split'ах сервиса этот импорт придётся дублировать в каждый модуль или разворачивать границу |
| NF-7 | `src/services/workoutsService.ts` vs `src/services/workoutService.ts` | Два разных файла с почти одинаковым именем, и оба работают с `finishWorkoutAndAdvance`. В старых документах они иногда сливаются; при нарезке величину blast-radius считать по точному имени |
| NF-8 | `INVENTORY.md:125` | Список навигации объявляет живым `workout/useWorkoutSession.rest.ts` — файл удалён 28.09 (FZ-1), в `src/hooks/workout/` лежат только `loader.ts` (9), `mapper.ts` (220), `types.ts` (55). `INVENTORY.md:122` называет `useWorkoutSession.ts` «thin wrapper» при фактических 1399 строках; `INVENTORY.md:93,118` перечисляют `RestTimer.tsx` и `RpeOverlay.tsx`, которых в `src/components/workout/` нет. Поправить в том же пуше, где это обнаружено (правило drift-fix в `AGENTS.md`) |

## 6. Чем этот замер отличается от 06.10

### 6.1 Цифры

| Носитель | 06.10 (`wc -l`) | 19.10 | Дельта |
|---|---:|---:|---:|
| `SetsGrid.tsx` | 1548 | 1593 | +45 (PLATE-SNAP/RPE-10, SG-PLATE 18.10; волна 1 его не трогала) |
| `useWorkoutSession.ts` | 1061 | 1399 | **+338** — главный расход артефакта: F1–F5 (17.10), RESET-T, ADD-BELOW (16.10), ADV-atomic (18.10) добавили три целые секции, которых в 06.10 не было ни в замерах, ни в списке seams |
| `workoutService.ts` | 616 | 796 | +180 (`fetchExerciseHistory` 27, `finishWorkoutAndAdvance` + типы 51, `addWorkoutExerciseBelow`/`removeWorkoutExercise` 95) |
| `engine/progression.ts` → `engine/progression/` | 1226 как файл | 1364 как 9 файлов (макс. `core.ts` 455) | закрыто волной 1 (`f14facb`) |
| `engine/weeklySummary.ts` → `engine/weeklySummary/` | 743 | 774 как 4 файла (макс. `insights.ts` 365) | закрыто (`23f12f7`) |
| `WorkoutTimer.tsx` → `WorkoutTimer/` | 545 | 641 как 6 файлов (макс. `Provider.tsx` 209) | закрыто (`ff92911`); boilerplate переноса добавил ~96 строк к сумме |
| `MuscleStatsSection.tsx` | 791 | 565 + `utils/muscleStats.ts` 245 | закрыто (`6c85943`); предложенное в 06.10 имя `utils/muscleStatsCompute.ts` **не использовалось** |
| `WeeklyReviewSection.tsx` | 1052 | 1052 | ±0 |
| `programsService.ts` | 1000 | 1022 | +22 |
| `ExercisePickerSheet.tsx` | 667 | 672 | +5 |
| `app/workout/[id].tsx` | 603 | 694 | +91 (SEARCH-ALT/NAV-INSET) |
| `StatusCard.tsx` | 611 | 611 | ±0 |
| `app/(tabs)/progress.tsx` | 659 | 647 | −12 |
| `app/(tabs)/profile.tsx` | 653 | 653 | ±0 |
| `ExerciseSlider.tsx` | 579 (в 06.10 не считался носителем) | 579 | **новый носитель >500**, в старом артефакте отсутствует полностью |
| `app/profile/injuries.tsx` 531, `engine/warmupPlan.ts` 543, `weeklySummaryService.ts` 567, `warmupService.ts` 566, `app/exercise/[id].tsx` 564, `programs.tsx` 573, `profileService.ts` 537, `dashboardService.ts` 514 | разброс | по факту | размеры сдвинулись у всех; полный список — 23 носителя (§1) |

### 6.2 Ссылки 06.10, которые сегодня не существуют

Файлы, по которым старый артефакт строил швы:

| Ссылка в 06.10 | Факт на 19.10 |
|---|---|
| `src/engine/progression.ts` (1226, «пилить волной 1») | **не существует** — директория `src/engine/progression/` (9 модулей), задача волны 1 выполнена |
| `src/engine/weeklySummary.ts` (743) | **не существует** — директория `src/engine/weeklySummary/` (4 модуля) |
| `src/components/workout/WorkoutTimer.tsx` (545) | **не существует** — директория `src/components/workout/WorkoutTimer/` (6 модулей) |
| `src/utils/muscleStatsCompute.ts` («вынести чистые compute-функции 89–293») | **не существует** — реализовано как `src/utils/muscleStats.ts` (245) |
| «`utils/reps` — потребитель `progression.ts`» | `src/utils/reps.ts` существует (20 строк), но ссылки на старый файл-движок внутри него поправлены волной 1 |
| «RPC `upsert_workout_logs` в workoutService:576» | **строки разошлись**: вызов сегодня на `:642`; в `:576` сейчас тело `updateWorkout` |
| «RPC `copy_program_for_user`:546, `save_program_snapshot`:605, `create_workouts_for_program`:618/:682/:694, `sync_program_changes_to_workouts`:756» | фактические строки `programsService.ts`: **448 / 507 / 520 / 584 / 596 / 658**. Точек `create_workouts_for_program` по-прежнему три — находка DEP-5 в силе, координаты нет |
| «секции `useWorkoutSession`: flush(115), load(185), timer(288), alternatives(317), set-mutations(346–517), replace/reset(518–741), program-replacement(742–805), pain(806–875), save(876–1028), return(1029)» | фактические: **130, 206, 352, 381, 410–593, 714–941, 952–1010, 1134–1202, 1204–1361, 1363–1399**; секций **RESET-T (595–712)** и **ADD-BELOW (1012–1132)** в 06.10 нет вообще |
| «`SetsGrid`: SetInput(144–241), SetRow(267–426), PrPop(104–131), морф-слот(554–692), PR-момент(693–740), FZ-2 компаратор SetRow(:395), ref-зеркало sets(:516)» | фактические: **151–247, 277–453, 108–134, 587–717, 726–772, компаратор :431–452, setsRef :550–551** |
| «грабли responder: `workout/[id]:531`, `ExerciseSlider:268`» | фактические комментарии: **`app/workout/[id].tsx:620–623`** и **`ExerciseSlider.tsx:4–5` + `:437`**; строки 531 и 268 сегодня занимают другой код (skeleton и snapOffsets-логика) |
| «`useWorkoutSession.ts:29` импортирует `RestTimerContext`» | строка **34**; `RestTimerContext.tsx:67–77` (bind/get) подтверждены, см. §2.3 |
| «DEP-3: `useQueryClient` импортирован, `invalidateQueries` в файле не найден — кандидат на удаление» | **опровергнуто.** `queryClient` жив и обязателен: `invalidateWorkoutAffectedCaches(queryClient, userId)` на `:671` (сброс) и `:1268` (финиш). Удалять импорт нельзя, это сломает BUG-1/BUG-6 |
| «`workoutService` section-load(312)/alternatives(428)/writers(542+)» | 312 / **432** / **546**; writers фактически занимают 546–796 |
| DEP-4 «реальный импортёр SetsGrid — 1, 7 файлов только комментарии» | **подтверждено и сегодня**: 1 (`ExerciseCard.tsx:12`) + 7 комментариев |
| DEP-6 «`upsert_workout_logs` — единственная запись подходов» | **устарело**: в `workoutService` два RPC — `finish_workout_and_advance` (`:596`, ADV-atomic 18.10) и `upsert_workout_logs` (`:642`). Утверждение «атомарный финиш — один вызов» теперь касается и закрытия тренировки, и сдвига указателя |
| §3 «циклов импортов не найдено» | **частично неактуально**: `services/workoutService.ts:15–19` импортирует типы из `hooks/workout/useWorkoutSession.types` (NF-6) — цикла нет, но направление зависимости «сервис → хук-подмодуль» появилось после 06.10 |
| §8 «веб-порт не инспектировался» | ограничение сохранено: этот замер тоже read-only по `main`, `../fittracker-rn-web` не открывали; права тройки — общие файлы и идут по WEB-CTR-9 |
