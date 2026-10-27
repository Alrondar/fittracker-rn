// src/lib/logsOutbox.ts
// CONN-1 (27.10): журнал незаписанных подходов в хранилище. Память экрана
// (pendingLogsRef в src/hooks/useWorkoutSession.ts:85) умирает вместе с процессом,
// поэтому каждая пачка, ждущая отправки, дублируется в документ: на телефоне —
// файл в документной директории, в браузере — IndexedDB (оба через localStore).
//
// Здесь только байты: правила разрешения конфликтов и счётчик живут в
// src/utils/outboxMerge.ts (он не тянет react-native и поэтому проверяется
// офлайн-харнесом). Объём скромный: день из 10 упражнений по 12 подходов —
// около 20 КБ, то есть на порядок меньше снимка программы.
import { readLocalDoc, writeLocalDoc, removeLocalDoc, type LocalDocMeta } from './localStore';
import {
  OUTBOX_VERSION,
  mergeOutboxDoc,
  removeOutboxKeys,
  removeOutboxWorkout,
  keepOutboxWorkouts,
  type OutboxDoc,
  type OutboxEntry,
} from '../utils/outboxMerge';

const TAG = '[logsOutbox]';
const DOC_PREFIX = 'workout-outbox-';

export function outboxDocName(userId: string): string {
  return `${DOC_PREFIX}${userId}.json`;
}

/**
 * Последний владелец журнала в этом запуске. Нужен для стирания по logout: в
 * момент события SIGNED_OUT сессия уже пустая, а имя документа строится по id
 * пользователя (тот же приём, что lastUserId в src/lib/programSnapshot.ts:55).
 */
let lastUserId: string | null = null;

/**
 * Все операции с документом — одной цепочкой. Без неё параллельные
 * «записать пачку», «выкинуть ключ после отправки» и «прочитать при входе»
 * делают read-modify-write друг поверх друга и теряют записи.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const result = writeChain.then(run);
  writeChain = result.then(
    () => undefined,
    (error) => console.warn(TAG, 'операция с журналом не прошла:', error)
  );
  return result;
}

/** Чтение документа. Битый или прежней версии — удаляем и считаем журнал пустым. */
async function readDoc(userId: string): Promise<OutboxDoc> {
  lastUserId = userId;
  const doc = await readLocalDoc<OutboxDoc>(outboxDocName(userId));
  if (!doc || doc.meta?.v !== OUTBOX_VERSION || !Array.isArray(doc.data?.entries)) {
    if (doc) await removeLocalDoc(outboxDocName(userId));
    return { entries: [] };
  }
  return doc.data;
}

/** Пустой журнал не оставляем нулевой файл: нет записей — нет и документа. */
async function writeDoc(userId: string, doc: OutboxDoc): Promise<void> {
  if (doc.entries.length === 0) {
    await removeLocalDoc(outboxDocName(userId));
    return;
  }
  const meta: Omit<LocalDocMeta, 'bytes'> = {
    v: OUTBOX_VERSION,
    takenAt: new Date().toISOString(),
    count: doc.entries.length,
  };
  await writeLocalDoc(outboxDocName(userId), doc, meta);
}

/** Кладёт пачку подходов в журнал (перезапись по `workout_exercise_id`). */
export async function saveOutboxEntries(userId: string, entries: OutboxEntry[]): Promise<void> {
  if (!userId || entries.length === 0) return;
  await enqueue(async () => {
    const doc = await readDoc(userId);
    await writeDoc(userId, mergeOutboxDoc(doc, entries));
  });
}

/** Выбрасывает строки, которые сервер подтвердил. */
export async function dropOutboxEntries(
  userId: string,
  workoutExerciseIds: string[]
): Promise<void> {
  if (!userId || workoutExerciseIds.length === 0) return;
  await enqueue(async () => {
    const doc = await readDoc(userId);
    const next = removeOutboxKeys(doc, workoutExerciseIds);
    if (next.entries.length === doc.entries.length) return;
    await writeDoc(userId, next);
  });
}

/** Удаляет журнал одного занятия: сброс сессии («↺») и удачный финиш. */
export async function clearWorkoutOutbox(userId: string | null, workoutId: string): Promise<void> {
  if (!userId || !workoutId) return;
  await enqueue(async () => {
    const doc = await readDoc(userId);
    const next = removeOutboxWorkout(doc, workoutId);
    if (next.entries.length === doc.entries.length) return;
    await writeDoc(userId, next);
  });
}

/** Стирание по SIGNED_OUT, когда идентификатор пользователя уже недоступен. */
export async function clearLastOutbox(): Promise<void> {
  const userId = lastUserId;
  lastUserId = null;
  if (!userId) return;
  await enqueue(() => removeLocalDoc(outboxDocName(userId)));
}

/** Записи журнала одного занятия — по ним экран восстанавливает введённое. */
export async function readWorkoutOutbox(
  userId: string | null,
  workoutId: string
): Promise<OutboxEntry[]> {
  if (!userId || !workoutId) return [];
  return enqueue(async () => keepOutboxWorkouts(await readDoc(userId), workoutId).entries).catch(
    (error) => {
      // Журнал не имеет права ломать вход в тренировку: жёсткий гейт экрана
      // остаётся только у отказа загрузки данных (app/workout/[id].tsx:553-572).
      console.warn(TAG, 'журнал не читается, вход продолжаем без него:', error);
      return [] as OutboxEntry[];
    }
  );
}
