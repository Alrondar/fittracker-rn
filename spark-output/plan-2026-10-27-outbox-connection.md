# Журнал незаписанных подходов и признак связи — План реализации

**Цель:** введённый подход не пропадает, если приложение закрылось без сети, а пользователь видит «нет сети», «не записано N подходов» и «записано» вместо молчаливой консоли.

**Архитектура:** каждая пачка ожидающих отправки подходов, которая сейчас живёт в памяти экрана, параллельно пишется в документ локального хранилища (`src/lib/localStore.ts` — файл на телефоне, IndexedDB в браузере). При входе в занятие журнал накладывается на серверные строки по правилу меток, а неудачные группы возвращаются в очередь отправки. Состояние связи — один слушатель в корневом макете через контекст; его читают экран тренировки (плашка + автодосылка) и вкладки (разные тексты «нет сети» / «сервер не ответил»).

**Технологический стек:** Expo 54 / React Native 0.81.5, `@react-native-community/netinfo` (новая зависимость), `expo-file-system` и IndexedDB через существующий `localStore`, `lucide-react-native` для значка.

## Глобальные ограничения

- Права продукта (`PRODUCT.md §1`, `§3.1–3.2`): приложение остаётся трекером; решение о записи принимает пользователь — автоматическая досылка не меняет и не удаляет то, что он вбил, без его ведома. Новая сущность интерфейса требует причины; если сценарий решается существующим компонентом — использовать существующий (поэтому плашка — расширение `StaleBanner`, а не новый компонент).
- У любого асинхронного контента есть состояния: загрузка / ошибка / пусто / данные (`PRODUCT.md §3.1`).
- Tap targets ≥ 44pt, только семантические токены из `src/constants/theme.ts`, хардкод цветов запрещён (`CLAUDE.md §7`).
- Экран тренировки — приоритетная зона профилирования; для изменений `workout/[id].tsx` и `useWorkoutSession` оценивать mount/render impact (`CLAUDE.md §8`, performance gate).
- Запрещено: Supabase напрямую из UI (только `src/services/`), `server data` в Zustand, N+1, логи в animation/onScroll-циклах, raw DB errors пользователю (`CLAUDE.md §9`, `§2`).
- Правило синхронизации программы (`CLAUDE.md §5`) в пакет не входит: журнал касается только записанных подходов.
- Журнал не должен пережить выход из аккаунта: очистка по `SIGNED_OUT`.
- Формулировки в интерфейсе: тексты плашки — русские, без внутренних прозвищ, с правильной формой числа («1 подход», «2 подхода», «5 подходов»).
- В проекте нет jest: проверяющие скрипты живут в `scripts/check-*.ts` и запускаются `npx tsx` (выход 0 = зелёные).
- `useWorkoutSession.ts` — 1450+ строк, стоит в очереди на нарезку (CTR-3): новые механики выносить в отдельные модули, в хуке оставлять только точки вызова.

---

## Структура файлов

| Файл | Ответственность |
|---|---|
| Создать `src/hooks/useOnline.tsx` | один слушатель состояния сети на приложение, контекст `{ online }`, стартовое значение из `NetInfo.fetch()` |
| Изменить `app/_layout.tsx` | обернуть дерево в `OnlineProvider` рядом с существующими провайдерами; на `SIGNED_OUT` — чистка журнала |
| Изменить `src/components/ui/StaleBanner.tsx` | добавить `tone` (вид и текст по умолчанию) и `actionable` (плашка без тапа-повтора); существующие вызовы не меняются |
| Создать `src/utils/outboxMerge.ts` | чистый слой журнала: тип записи, правило меток, наложение на серверные строки, счётчик неподтверждённых подходов. Импортируется харнесом, поэтому не должен тянуть `react-native` и `expo-file-system` |
| Создать `src/lib/logsOutbox.ts` | слой хранилища: имя документа, чтение/запись/очистка через `localStore`, сериализация изменений одного документа |
| Создать `scripts/check-outbox.ts` | офлайн-харнес чистой части журнала (правило меток, сравнение значений, счётчик) |
| Изменить `src/hooks/useWorkoutSession.ts` | записи в журнал в пяти точках мутации, удаление ключа после удачной отправки (и из памяти буфера), очистка при сбросе и финише, восстановление при входе, автодосылка при появлении связи, состояния `unsavedSets` и `saveState` |
| Изменить `src/services/workoutService.ts` | `completed_at` в выборке логов занятия (нужен для правила меток) |
| Изменить `app/workout/[id].tsx` | плашка под шапкой; монтируется только когда есть что показать |
| Изменить `app/(tabs)/index.tsx`, `workouts.tsx`, `progress.tsx`, `app/profile/injuries.tsx` | разные тексты «нет сети» и «сервер не ответил» в существующих `StaleBanner` |
| Изменить `STATUS.md`, `INVENTORY.md` | закрыть EDGE-9, добавить роли новых модулей в навигацию §0 |

Вне объёма (зафиксировать в `STATUS.md` как остаток): вкладки «Программы» и «Справочник» сейчас не показывают плашку об осечке фонового обновления вовсе; локальный черновик тренировки, чтобы начать день без сети; сервис-воркер для веба.

---

### Задача 1: Состояние связи одним слушателем

**Файлы:**
- Создать: `src/hooks/useOnline.tsx`
- Изменить: `app/_layout.tsx` (провайдеры — рядом с `QueryClientProvider`, обработка `SIGNED_OUT` уже есть около `:127`)
- Проверить потребителей: `grep -rn "useOnline" app src` (до правки — 0)

**Интерфейсы:**
- Потребляет: `@react-native-community/netinfo`
- Производит: `OnlineProvider` (без пропсов), `useOnline(): boolean` — `true`, пока состояние связи не получено, чтобы не пугать плашкой до первого события.

- [ ] Поставить зависимость каноническим для Expo способом (подберёт версию под RN 0.81):

```bash
npx expo install @react-native-community/netinfo
```

- [ ] Реализовать хук: одно подписание на приложение, значение меняется только при реальном переходе.

```tsx
// src/hooks/useOnline.tsx
const OnlineContext = createContext<boolean>(true);

export function OnlineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    void NetInfo.fetch().then((s) => setOnline(s.isConnected === true));
    // 11.4.1: addEventListener возвращает функцию отписки (не объект с remove()) —
    // проверено типами, `subscription.remove()` не проходит tsc.
    return NetInfo.addEventListener((s) => setOnline(s.isConnected === true));
  }, []);
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useOnline(): boolean {
  return useContext(OnlineContext);
}
```

- [ ] В `app/_layout.tsx` поставить `OnlineProvider` внутри корневого, но снаружи `QueryClientProvider` — порядок относительно существующих провайдеров не менять; дерево не перемонтировать (Splash-гейт остаётся как есть).
- [ ] На `SIGNED_OUT` (`app/_layout.tsx:125-131`) вызвать `clearLastOutbox()` из задачи 3 — журнал не должен пережить смену аккаунта. Аргумента у функции нет намеренно: в момент этого события сессия уже пустая, `user.id` там неоткуда взять (появляется только на `:133`), поэтому модуль журнала сам держит id последнего пользователя — тот же приём, что `clearLastProgramSnapshot()` в `src/lib/programSnapshot.ts:77-80`.

**Как проверить:**

```bash
npx tsc --noEmit && npx eslint . --max-warnings 0
```

Ручная: включить режим полёта → `NetInfo` должен отдать `isConnected: false` (пока проверить через `console.log` в dev-сборке, UI появится в задаче 6); выключить → `true`. На вебе — выключить сеть в инструментах браузера, `navigator.onLine` даёт тот же переход.

---

### Задача 2: Плашка с состояниями на существующем носителе

**Файлы:**
- Изменить: `src/components/ui/StaleBanner.tsx:14-24` (сигнатура) и тело (иконка, цвет, наличие тапа)
- Проверить потребителей: `grep -rn "<StaleBanner" app` — 4 места (`app/(tabs)/index.tsx:234`, `app/(tabs)/workouts.tsx:336`, `app/(tabs)/progress.tsx:336`, `app/profile/injuries.tsx:343`), все должны остаться рабочими без изменений вызова

**Интерфейсы:**
- Производит:

```ts
type StaleTone = 'stale' | 'offline' | 'unsaved' | 'saved';
StaleBanner({
  tone?: StaleTone,            // по умолчанию 'stale' — поведение сегодняшнего дня
  label?: string,              // перебивает текст по умолчанию
  actionLabel?: string,
  onRetry?: () => void,        // нужен только когда actionable
  actionable?: boolean,        // по умолчанию true
  style?: StyleProp<ViewStyle>,
})
```

- [ ] Тексты по умолчанию: `stale` — «Не удалось обновить данные», `offline` — «Нет сети», `unsaved` — «Не записано», `saved` — «Записано». Иконки: `AlertTriangle` для `stale`/`unsaved`, `CloudOff` для `offline`, `Check` для `saved` (все из `lucide-react-native`; `CloudOff`, а не `WifiOff` — в проекте отсутствие связи уже отмечается этим значком в `src/components/workout/ActiveProgramHeaderCard.tsx:5,120`).
- [ ] Цвета только существующими токенами: `offline` и `unsaved` — `colors.warning`, `saved` — `colors.success`, `stale` — как сейчас. Никаких новых значений.
- [ ] `actionable === false` — рендерить тот же блок без `PressableScale` и без кнопки, с `accessibilityRole="text"`; при `actionable === true` поведение и размеры не меняются (высота ≥ 44pt сохраняется).
- [ ] Компонент не владеет никакими таймерами: срок жизни «Записано» задаёт единственный владелец — хук из задачи 6. Иначе баннер сам исчезает, а `saveState` ещё «saved», и таймер в разделяемом компоненте получил бы шесть носителей на вкладках.
- [ ] Один согласованный набор текстов для всего пакета (проверить, что в коде задач 6 и 7 дословно он): «Нет сети · не записано N подходов», «Не записано N подходов», «Записано», «Нет сети · показаны сохранённые данные».

**Как проверить:** `npx tsc --noEmit && npx eslint . --max-warnings 0`; визуально — временно поставить `tone` по очереди на экране тренировки (из задачи 6) и снять кадры до/после на 360 px по ширине: текст «Не записано 12 подходов» и кнопка «Записать» должны помещаться в одну строку, плашка — не сдвигать список упражнений прыжком layout.

---

### Задача 3: Журнал на устройстве и чистое правило слияния

**Файлы:**
- Создать: `src/utils/outboxMerge.ts` — чистый слой (правило меток, слияние, счётчик)
- Создать: `src/lib/logsOutbox.ts` — слой хранилища (имя документа, чтение/запись/очистка)
- Создать: `scripts/check-outbox.ts`
- Проверить потребителей: `src/lib/localStore.ts:78-126` (`readLocalDoc`/`writeLocalDoc`/`removeLocalDoc`), `src/types/workout.ts:10-30` (`SetData`); образец разделения — чистый `pickFromCache` в `src/utils/programCache.ts` против IO в `src/lib/programSnapshot.ts`

**Интерфейсы:**
- Потребляет: `writeLocalDoc`, `readLocalDoc`, `removeLocalDoc`, `LocalDocMeta` (`{ v, takenAt, bytes, count }`), `SetData`
- Производит:

```ts
// src/utils/outboxMerge.ts — сюда нельзя импортировать react-native и expo-file-system
export const OUTBOX_VERSION = 1;
export interface OutboxEntry {
  workout_id: string;
  workout_exercise_id: string;
  sets: SetData[];
  updated_at: number;            // epoch ms момента ввода
}
export interface OutboxDoc { entries: OutboxEntry[] }
export interface ServerLogStamp { set_number: number; completed_at?: string | null }

countFilledSets(sets: SetData[]): number
countUnsentSets(entries: Iterable<[string, SetData[]]>): number
buildOutboxEntries(workoutId: string, buffer: Map<string, SetData[]>, now: number): OutboxEntry[]
overlayOutboxSets(
  sets: SetData[],
  serverLogs: ServerLogStamp[],
  entry: OutboxEntry | null
): { sets: SetData[]; keep: boolean }
mergeOutboxDoc(existing: OutboxDoc, incoming: OutboxEntry[]): OutboxDoc
removeOutboxKeys(doc: OutboxDoc, workoutExerciseIds: string[]): OutboxDoc
removeOutboxWorkout(doc: OutboxDoc, workoutId: string): OutboxDoc
```

```ts
// src/lib/logsOutbox.ts — только хранилище и последовательность операций с ним
outboxDocName(userId: string): string                       // `workout-outbox-${userId}.json`
saveOutboxEntries(userId: string, entries: OutboxEntry[]): Promise<void>
dropOutboxEntries(userId: string, workoutExerciseIds: string[]): Promise<void>
clearWorkoutOutbox(userId: string, workoutId: string): Promise<void>
clearLastOutbox(): Promise<void>                            // для SIGNED_OUT
readWorkoutOutbox(userId: string | null, workoutId: string): Promise<OutboxEntry[]>
```

- [ ] Разделение на чистый слой и слой храниливания — обязательный шаг, а не стиль: `npx tsx` не может импортировать модуль, который тянет `react-native` и `expo-file-system` (проверено на `src/lib/localStore.ts:13-14` — падает на `Unexpected "typeof"`). Без отдельного `src/utils/outboxMerge.ts` пять проверок правила меток не запускаются вообще, а это единственный автоматический контроль задачи.
- [ ] Документ: `meta = { v: OUTBOX_VERSION, takenAt, bytes: 0, count: entries.length }`, `data = { entries: OutboxEntry[] }`. Прочитали документ другой версии или сломанный JSON — `readLocalDoc` уже вернёт `null` (`src/lib/localStore.ts:88-91`), журнал считаем пустым и пишем заново. Размер зафиксировать комментарием в модуле: день из 10 упражнений по 12 сетов ≈ 20 КБ, на порядок меньше снимка программы.
- [ ] Все изменения одного документа — через одну цепочку промисов внутри `logsOutbox.ts` (модульная `let writeChain: Promise<void>`, каждый вызов `writeChain = writeChain.then(run).catch(warn)`). Иначе параллельные «запись пачки», «удаление ключа после отправки» и «чтение при входе» делают read-modify-write друг поверх друга и теряют записи.
- [ ] `logsOutbox` запоминает id последнего прочитанного/записанного пользователя в модульной переменной и отдаёт `clearLastOutbox()` без аргумента — ровно как `src/lib/programSnapshot.ts:55` и `:77-80`. Причина: в обработчике `SIGNED_OUT` (`app/_layout.tsx:125-131`) сессия уже пустая, `user.id` там взять неоткуда (он появляется только на `:133`).
- [ ] `overlayOutboxSets` — правило, согласованное владельцем 27.10: «побеждает более поздняя метка».

```ts
if (!entry) return { sets, keep: false };
const newestServer = maxCompletedAt(serverLogs);            // локальная служебная функция
if (newestServer != null && newestServer > entry.updated_at) return { sets, keep: false };
// иначе перекрываем индексы, где журнал заполнен; если отличий нет — keep = false
```

Сравнение значения — по полям `weight`, `reps`, `reps_left`, `reps_right`, `rpe`, `rir`, `difficulty`, `isWarmup`, `estimatedReps`; пустая строка и `null` считаются одинаково незаполненными, иначе каждая досылка будет выглядеть изменением.
- [ ] Слот журнала, пустой по `countFilledSets`, серверное значение не перетирает (иначе досылка «очистила» бы подход).
- [ ] Журнал шире сетки — случай, который иначе молча теряет подходы: офлайн добавили подход через `addSet` (`src/hooks/useWorkoutSession.ts:634`), а `persistExerciseSettings` без сети не доехал (`:107-114`), поэтому на входе маппер построил сетку уже. `overlayOutboxSets` дополняет результат записями журнала до `entry.sets.length`. Это то же правило, по которому маппер уже расширяет сетку под серверные логи: ширина считается как `max(target_sets, сохранённый максимум)` (`src/hooks/workout/useWorkoutSession.mapper.ts:72-73`).
- [ ] `countFilledSets(sets)` — критерий «подход засчитан» ровно один и тот же, что у отправки (`src/hooks/useWorkoutSession.ts:152-166`): заполнен вес, повторы, левые/правые повторы, RPE, RIR или сложность. `countUnsentSets` = сумма `countFilledSets` по значениям очереди; отдельно нигде не пересчитывать.
- [ ] `buildOutboxEntries(workoutId, buffer, now)` превращает память очереди в записи журнала: `updated_at` приходит параметром (не `Date.now()` внутри — иначе харнес не задаёт время детерминированно), `workout_id` из аргумента, `workout_exercise_id` из ключа, пустые по `countFilledSets` наборы в журнал не кладутся.

**Как проверить:** харнес `scripts/check-outbox.ts` по образцу `scripts/check-workout-resume.ts` (тот же стиль: импорт чистых функций из `src/`, выход 1 при провале, название проверки в выводе).

```bash
npx tsx scripts/check-outbox.ts
```

1. `entry = null` → исходные `sets`, `keep: false`;
2. серверная строка свежее метки журнала → значения не изменились, `keep: false`;
3. журнал свежее → значения перекрыты, `keep: true`;
4. журнал и сервер совпадают по всем полям → `keep: false` (не плодим повторную отправку);
5. журнал шире сетки (сервер дал 3 строки, в журнале 4 заполненных) → длина результата 4, все четыре значения из журнала, `keep: true`;
6. `countUnsentSets` на двух упражнениях (3 заполненных сета + 1 пустой + 1 только с RPE) даёт 4 — пустой не считается, только-с-RPE считается (правило F3 от 17.10);
7. `mergeOutboxDoc` + `removeOutboxKeys` + `removeOutboxWorkout` на документе с двумя разными `workout_id`: upsert по ключу не дублирует строку, удаление ключа не задевает чужое занятие, очистка занятия не трогает другое.

---

### Задача 4: Журнал в пути записи подхода

**Файлы:**
- Изменить: `src/hooks/useWorkoutSession.ts` — точки записи в `pendingLogsRef` (`:433` `updateSet`, `:497` `updateSetFeedback`, `:546` `addWarmupRampSets`, `:566`, `:624`), удаление после удачной отправки (`:170-182` внутри `flushPendingLogs`), очистка при сбросе (`:714`) и после финиша (`:1399` участок успеха `finishWorkoutAndAdvance`), уход в фон (`:307-329`)
- Проверить потребителей: `grep -n "pendingLogsRef.current.set" src/hooks/useWorkoutSession.ts` — все найденные точки обязаны попасть в журнал

**Интерфейсы:**
- Потребляет: `saveOutboxEntries`, `dropOutboxEntries`, `clearWorkoutOutbox` из задачи 3, `userId` и `workoutId` из аргументов хука
- Производит: ничего для других модулей; поведение — каждый ключ, оказавшийся в памяти очереди, оказывается и на диске

- [ ] Служебная функция внутри хука; вызывается рядом с каждой точкой, которая кладёт набор в память очереди:

```ts
const queueOutboxWrite = useCallback(
  (workoutExerciseId: string, sets: SetData[]) => {
    if (!userId) return;
    outboxBufferRef.current.set(workoutExerciseId, sets);
    if (outboxTimerRef.current) return;          // уже запланировано — не плодим запись на каждое поле
    outboxTimerRef.current = setTimeout(() => {
      outboxTimerRef.current = null;
      const entries = buildOutboxEntries(workoutId, outboxBufferRef.current, Date.now());
      saveOutboxEntries(userId, entries).catch((e) => console.warn('[outbox] write failed:', e));
    }, 400);
  },
  [userId, workoutId]
);
```

- [ ] Вызов ставится **наружу** из апдейтеров — в файле это зафиксированное правило («Наружу updaters (апдейтер остаётся чистым — CLAUDE.md §9)», `:609-611`, оно же в `:544-545` и `:661`). Сейчас `pendingLogsRef.current.set` лежит внутри апдейтера в трёх из пяти точек: `updateSet` (`:433`), `updateSetFeedback` (`:497`) и `applyProgression` (`:566`). Форма правки — как в `addSet` (`:637`) и `updateExerciseSettings` (`:612-624`): следующий набор считается снаружи из `exercisesRef.current[exerciseIndex]` (реф синхронизируется на `:100-102`), апдейтер получает уже готовый массив, а `pendingLogsRef.current.set(...)` и `queueOutboxWrite(...)` идут после `setExercises`. Наружу остаются и `:546`, и `:624` — там сайд-эффект уже снаружи.
- [ ] Ограничение этого выноса зафиксировать комментарием: два ввода в один тик используют один и тот же снимок `exercisesRef`, то есть второй ввод перетрёт первый в журнале. Ровно так же уже ведёт себя `updateSetFeedback` (`:448`); дебаунс 350 мс в `src/components/workout/SetsGrid.tsx:203-206` означает, что на практике тик один.
- [ ] 400 мс вместо ожидания сетевого ответа: при закрытии вкладки браузера асинхронную запись дождаться нельзя, поэтому журнал отстаёт максимум на одно окно ввода; на телефоне при уходе в фон запись делается принудительно до `joinFlush()` в обработчике `AppState` (`:315-319`) — там же `clearTimeout(outboxTimerRef)` и `outboxTimerRef = null`.
- [ ] После удачной отправки группы — `dropOutboxEntries(userId, [workoutExerciseId])` рядом с `:172` **и** `outboxBufferRef.current.delete(workoutExerciseId)`. Без второго следующий же ввод по другому упражнению перезапишет уже отправленный ключ целиком (`saveOutboxEntries` пишет весь буфер) с новой меткой, свежее серверной, и правило меток его не отбросит — то есть успешно записанный подход воскреснет.
- [ ] Сброс сессии (`↺`, `:714`) — `outboxBufferRef.current.clear()` + `clearWorkoutOutbox(userId, workoutId)`.
- [ ] Финиш — `outboxBufferRef.current.clear()` + `clearWorkoutOutbox(userId, workoutId)` в `doFinish` (`:1398`) после удачного `finish_workout_and_advance`, а не в ветке до него: тогда и кнопка «Повторить» (`:1424`) не оставит журнал, из которого подходы вернутся после успешного завершения.
- [ ] Веб: в том же хуке слушатель `pagehide` только для `Platform.OS === 'web'`, который делает принудительную запись журнала перед `void joinFlush()`. `useWebPageHidden.ts:16-27` не подходит — он ставит на паузу таймеры и о смерти вкладки не сообщает.
- [ ] Оценка по performance gate (`CLAUDE.md §8`, `§14` требует явной оценки для этого файла): новых сетевых запросов нет; одна запись файла на пачку ввода, не на символ; запись идёт вне пути ввода и не ждёт (`saveOutboxEntries` не в `async`-цепочке `updateSet`); состояние хука в этом пакете не меняется — `unsavedSets` появляется только в задаче 6; апдейтеры становятся чище, чем были (сайд-эффект уходит из `setExercises`), перерисовок не добавляется.

**Как проверить:** `npx tsc --noEmit && npx eslint . --max-warnings 0`. Ручная проверка факта записи — восстановлением при входе (задача 5), потому что она работает и на телефоне, и в браузере. Для Android дополнительно можно посмотреть файл напрямую (на iOS прямого пути в хранилище приложения из консоли нет — там ориентируемся на восстановление):

```bash
adb -s <device> shell "run-as <applicationId> ls -l /data/data/<applicationId>/files"   # ждать workout-outbox-*.json
```

---

### Задача 5: Восстановление при входе и метка времени сервера

**Файлы:**
- Изменить: `src/services/workoutService.ts:389-411` (в `select` логов добавить `completed_at`) и inline-форму `WorkoutSessionData['logsByWorkoutExercise']` (`:287-303`), из которой выводится `SessionLog` (`:385-387`)
- Изменить: `src/hooks/useWorkoutSession.ts:258-268` (между `injectPreviousData` и `setExercises`)
- Проверить потребителей: `grep -rn "logsByWorkoutExercise" src`, `grep -n "interface LogRow" -A 14 src/hooks/workout/useWorkoutSession.mapper.ts:16-29` — снимок программы выбирает `workout_logs` через `select('*')` (`src/services/programSnapshotService.ts:155-167`), значит офлайн-ветка `completed_at` уже отдаёт: версия снимка не меняется, перекачивать ничего не нужно

**Интерфейсы:**
- Потребляет: `readWorkoutOutbox`, `overlayOutboxSets`, `dropOutboxEntries`, `countFilledSets` из задачи 3, `pendingLogsRef` и `scheduleFlush` из хука
- Производит: ничего нового наружу. Число восстановленных подходов в состояние не пишется: наложение ставит их в очередь и вызывает `scheduleFlush()`, а задача 6 публикует счётчик на границах отправки — то есть счётчик появляется сам.

- [ ] Добавить `completed_at` в выборку логов занятия **и** в inline-форму типа: `SessionLog` (`src/services/workoutService.ts:385-387`) выводится не из `Row<'workout_logs'>`, а из `WorkoutSessionData['logsByWorkoutExercise']` (`:287-303`), где поля нет, а сетевой результат приводится через `as unknown as SessionLog[]` (`:401`). Без правки типа поле приедет в рантайме, но не будет проверяться — опечатка в имени столбца не поймается (`CLAUDE.md §11`). Пустой ответ сети отказом не считается, `networkOrProgram` остаётся как есть.
- [ ] Между `injectPreviousData` (`:267`) и `setExercises` (`:268`) — результат наложения обязан уйти в `setExercises`, а ранний выход из `loadWorkout` недопустим (нет журнала — обычный путь, экран обязан отрисоваться как раньше):

```ts
const outbox = await readWorkoutOutbox(userId, workoutId);
let finalExercisesData = injectPreviousData(exercisesData, prevLogsByExerciseId);
if (outbox.length > 0 && userId) {
  const staleKeys: string[] = [];
  let restored = 0;
  const next = finalExercisesData.map((ex) => {
    const entry = outbox.find((e) => e.workout_exercise_id === ex.workout_exercise_id) ?? null;
    if (!entry) return ex;
    const merged = overlayOutboxSets(
      ex.sets,
      (logsByWorkoutExercise[ex.workout_exercise_id] ?? []) as ServerLogStamp[],
      entry
    );
    if (!merged.keep) { staleKeys.push(entry.workout_exercise_id); return ex; }
    restored += countFilledSets(merged.sets);
    pendingLogsRef.current.set(ex.workout_exercise_id, merged.sets);
    return { ...ex, sets: merged.sets };
  });
  if (staleKeys.length) void dropOutboxEntries(userId, staleKeys);
  if (restored > 0) {
    finalExercisesData = next;
    scheduleFlush();
  }
}
setExercises(finalExercisesData);
```

- [ ] Ошибку чтения журнала не показывать: `readWorkoutOutbox` обёрнут в `try/catch` с `console.warn` и пустым результатом — вход в тренировку не должен ломаться из-за хранилища (жёсткий гейт экрана остаётся только у отказа загрузки данных, `app/workout/[id].tsx:553-572`).
- [ ] Очередь отправки после восстановления стартует сразу (`scheduleFlush`), но не перекрывает то, что сервер уже содержит: это обеспечивает правило меток из задачи 3.
- [ ] Отдельно проверить ветку «флаг разминки» (`:497` и `:546` пишут в журнал): восстановленный набор не должен вернуть снятый флаг. Правила здесь два разных: снятие флага убирает незаполненный слот — `src/hooks/useWorkoutSession.ts:441-468`, а ширину сетки задаёт `max(target_sets, сохранённый максимум)` — `src/hooks/workout/useWorkoutSession.mapper.ts:68-73` (это F2, не ENG-13).

**Как проверить:** `npx tsc --noEmit && npx eslint . --max-warnings 0`, затем `npx tsx scripts/check-outbox.ts` (наложение уже покрыто). Ручная на телефоне — полный круг: вбить подходы офлайн → убить приложение → не включая сеть открыть это же занятие → значения на месте → включить сеть → через секунду журнал пуст, серверные строки совпадают с вбитым.

---

### Задача 6: Плашка на экране тренировки и автодосылка

**Файлы:**
- Создать: `src/utils/plural.ts`
- Изменить: `src/hooks/useWorkoutSession.ts` — состояния `unsavedSets` и `saveState`, эффект на `online`, экспорт в возвращаемом объекте
- Изменить: `app/workout/[id].tsx` — рендер баннера под `WorkoutScreenHeader` (шаблоны: `:613-623` шапка, гейт ошибки `:553-572`, скелетон `:574-588`)
- Проверить потребителей: `grep -rn "useWorkoutSession(" app src/components`

**Интерфейсы:**
- Потребляет: `useOnline()` (задача 1), `StaleBanner` с `tone`/`actionable` (задача 2), `countUnsentSets` (задача 3)
- Производит: `useWorkoutSession(...)` возвращает дополнительно `{ unsavedSets: number, saveState: 'idle' | 'saved', retryUnsaved(): void }`

- [ ] Состояние два: `unsavedSets: number` и `saveState: 'idle' | 'saved'`. Публиковать число неподтверждённых подходов только на границах отправки — в начале `flushPendingLogs` (сразу после `:133`, значение `countUnsentSets(pendingLogsRef.current.entries())`) и в её конце (после `:185`, уже с вернувшимися при неудаче группами), плюс после записи журнала в задаче 4. Между двумя нажатиями подряд счётчик может отстать на одно окно дебаунса — это осознанно: иначе каждый символ вызывал бы перерисовку всего экрана.
- [ ] `saveState` становится `'saved'` ровно в момент перехода `unsavedSets` с `>0` на `0` по удачной отправке, и гаснет через 1500 мс — таймер живёт в хуке (`savedTimerRef`, `clearTimeout` в очистке эффекта и при новой неудачной отправке), как и договорено в задаче 2.
- [ ] `retryUnsaved()` — `joinFlush()` без ожиданий и без условий на состояние сети; вызывается только когда кнопка видна (`actionable`), то есть сеть есть. При офлайн-тапе кнопки нет, и просить её не о чем: отправка всё равно упадёт.
- [ ] Эффект автодосылки: `useEffect` на `online`, шлёт `joinFlush()` только на реальном переходе `false → true` (сравнение с `previousOnlineRef`) и только когда `pendingLogsRef.current.size > 0`. Первый рендер с `online === true` запрос не порождает.
- [ ] Рендер баннера на экране тренировки (тексты — дословно те, что зафиксированы в задаче 2):

```tsx
{unsavedSets > 0 || saveState === 'saved' ? (
  <StaleBanner
    tone={!online ? 'offline' : saveState === 'saved' ? 'saved' : 'unsaved'}
    label={!online
      ? `Нет сети · не записано ${pluralWord(unsavedSets, ['подход', 'подхода', 'подходов'])}`
      : saveState === 'saved'
        ? 'Записано'
        : `Не записано ${pluralWord(unsavedSets, ['подход', 'подхода', 'подходов'])}`}
    actionLabel="Записать"
    actionable={online && unsavedSets > 0}
    onRetry={retryUnsaved}
  />
) : null}
```

Новый файл `src/utils/plural.ts` даёт один общий шаг склонения (отдельной обёртки под текст не заводим — экран подставляет `pluralWord` прямо в `label`):

```ts
// src/utils/plural.ts
export function pluralWord(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.round(n));
  const last2 = abs % 100;
  const last = abs % 10;
  const form = last2 >= 11 && last2 <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
  return `${Math.round(n)} ${forms[form]}`;
}
```

Существующие `pluralizeSets` и `pluralizeDays` в `src/utils/muscleLoad.ts:136,157` не переносим и не трогаем — рефактор без причины. В `scripts/check-outbox.ts` этим же шагом добавляем четыре проверки склонения: 1 → «1 подход», 2 → «2 подхода», 5 → «5 подходов», 21 → «21 подход».
- [ ] Баннер вне скролла и не двигает layout-прыжками: появляется между шапкой и списком упражнений, высота фиксированная из существующих токенов отступов; когда не нужен — не монтируется вообще.
- [ ] Ограничение, которое надо написать в `STATUS.md`: «Начать день» и «Завершить» без сети по-прежнему недоступны — `startProgramWorkout` идёт через цепочку сетевых запросов (`src/services/workoutService.ts:37`), а финиш сознательно запрещён при непрошедшей отправке (правило VF-3, `src/hooks/useWorkoutSession.ts:1326-1335`).

**Как проверить:** `npx tsc --noEmit && npx eslint . --max-warnings 0`; на устройстве — включить режим полёта, вбить подход, убедиться, что плашка появилась и не исчезает, затем снять режим полёта: без единого тапа плашка должна смениться на «Записано» и уйти, а подход — оказаться в БД:

```sql
select we.exercise_id, l.set_number, l.weight_kg, l.reps, l.completed_at
from workout_logs l join workout_exercises we on we.id = l.workout_exercise_id
where we.workout_id = '<id занятия>' order by l.completed_at desc limit 5;
```

---

### Задача 7: Разные тексты на вкладках

**Файлы:**
- Изменить: `app/(tabs)/index.tsx:234`, `app/(tabs)/workouts.tsx:336`, `app/(tabs)/progress.tsx:336`, `app/profile/injuries.tsx:343`
- Проверить потребителей: `grep -rn "<StaleBanner" app`

**Интерфейсы:**
- Потребляет: `useOnline()` (задача 1), `StaleBanner` (задача 2)
- Производит: ничего; меняются только подписи плашек

- [ ] Везде по одному шаблону: при `online === false` — `tone="offline"`, `label` вида «Нет сети · показаны сохранённые данные», `actionable={false}`; при `online === true` — как сейчас (`tone` по умолчанию, кнопка «Обновить»).
- [ ] На «Прогрессе» условие `isStale` (`app/(tabs)/progress.tsx:177`) не менять: там уже различают «данных нет вовсе» и «не удалось обновить»; сеть влияет только на текст.
- [ ] Грабля из `src/hooks/useInjuries.ts:49-53` («пустой кэш ≠ сбой»): на вкладке травм плашку показывать по `isError && loaded`, как сейчас, а не по одной `isError`.
- [ ] «Программы» и «Справочник» в этом пакете не трогаем — плашки там нет вовсе, это отдельный вердикт; записать остатком в `STATUS.md`.

**Как проверить:** `npx tsc --noEmit && npx eslint . --max-warnings 0`; на устройстве — офлайн заход на каждую из четырёх вкладок: текст должен говорить про сеть, а не «Не удалось обновить данные», и не должно быть тапабельной кнопки, которая заведомо не сработает.

---

### Задача 8: Документы и перенос в веб-порт

**Файлы:**
- Изменить: `STATUS.md` (EDGE-9 в §13/§15, остаток по вкладкам и по «начать день офлайн»)
- Изменить: `INVENTORY.md` §0 (новые модули `src/lib/logsOutbox.ts`, `src/hooks/useOnline.tsx` и роль `StaleBanner`)
- Изменить в `web-port`: merge `main`, затем `npm install`, плюс чисто вебская проверка `expo export`

**Интерфейсы:**
- Потребляет: задачи 1–7
- Производит: задокументированное состояние и работающий веб

- [ ] Правила двух деревьев (`AGENTS.md`, WEB-CTR-9): весь этот пакет — общие файлы, поэтому правка один раз в `main` и перетекание через `git merge main`; веб-клонов не заводим. Отличия порта: `pagehide` (задача 4) уже защищён `Platform.OS === 'web'`, журнал на вебе ложится в IndexedDB `fittracker-local` через тот же `localStore`, а persist React Query в порту выключён (`web-port/src/lib/queryPersistence.ts` — `WEB_PERSIST_ENABLED = false`), так что журнал — единственный способ пережить перезагрузку вкладки.
- [ ] В `STATUS.md` закрыть EDGE-9 формулировкой «очередь незаписанных подходов пишется в `workout-outbox-<user>.json` и восстанавливается при входе; правило конфликтов — метка времени» и выписать оставшееся: «начать день без сети нельзя», «завершить без сети нельзя», «у «Программ» и «Справочника» нет плашки об осечке обновления», «перекачка журнала при смене аккаунта не делается — он стирается».
- [ ] Гейты в `main`:

```bash
npx tsc --noEmit && npx eslint . --max-warnings 0
```

- [ ] Гейты в `web-port` после мержа (каждое — отдельной командой, без пайпа, чтобы код возврата не съедался):

```bash
cd ../fittracker-rn-web && npm install
npx tsc --noEmit
npx eslint . --max-warnings 0
npx expo export --platform web
```

- [ ] Прогон в браузере (владелец просил его включить): вбить два подхода → `Ctrl+R` (перезагрузка вкладки) → значения должны восстановиться из журнала; затем то же с выключенной сетью в инструментах браузера → после включения сети подходы доезжают сами. Отдельно проверить, что `Ctrl+W`/закрытие вкладки не оставляет в журнале строку, которая потом «воскресит» уже удалённый подход (правило меток из задачи 3).

---

## Карта проверок после пакета

| Где | Что должно быть видно |
|---|---|
| Экран тренировки, режим полёта, вбит подход | плашка «Нет сети · N подходов не записано», кнопки нет |
| Экран тренировки, связь вернулась | тот же текст меняется на «Записано» и исчезает через 1,5 с, тапов не было |
| Убийство приложения офлайн → вход в то же занятие | значения на месте, после появления сети доезжают |
| Перезагрузка вкладки браузера | то же самое (IndexedDB) |
| «↺» сброс сессии | плашка исчезает, журнал занятия пуст, старые подходы не воскресают |
| «Завершить» успешно | журнал занятия очищен |
| Вкладки Главная/Тренировки/Прогресс/Травмы офлайн | текст про сеть вместо «Не удалось обновить данные» |
| Выход из аккаунта и вход в другой | чужой журнал не подмешивается (файл удалён при `SIGNED_OUT`) |
| Скорость | медиана записи подхода и блокировки списка не хуже baseline §12: 145 мс и 24 блока по 165–379 мс (замер на dev-сборке, то же окно, что и раньше) |

## Реверс

Задача 1–2 убираются удалением зависимости и откатом `StaleBanner` (вызовы на вкладках не менялись по составу пропсов). Задача 3–6 — откат файлов; журнал остаётся лежать в хранилище файлом, который никто не читает, и стирается вручную через `removeLocalDoc` или чистку данных приложения. Серверная часть пакета отсутствует: миграций, RPC и изменений схемы нет, типы базы не регенерируются.
