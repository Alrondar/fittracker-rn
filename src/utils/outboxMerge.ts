// src/utils/outboxMerge.ts
// CONN-1 (27.10): чистый слой журнала незаписанных подходов — правило конфликтов,
// счётчик и слияние документа. Здесь нет хранилища и нет react-native: слой
// импортирует офлайн-харнес `scripts/check-outbox.ts` через `npx tsx`, а тот не
// может тянуть `expo-file-system` (падает на трансформации). Байты лежат в
// src/lib/logsOutbox.ts, правила — здесь.
//
// Почему вообще нужен журнал: очередь отправки живёт в памяти экрана
// (`pendingLogsRef` в src/hooks/useWorkoutSession.ts:85), при неудаче возвращается
// туда же (:179-181) и умирает вместе с процессом.
import type { SetData } from '../types/workout';

export const OUTBOX_VERSION = 1;

export interface OutboxEntry {
  workout_id: string;
  workout_exercise_id: string;
  sets: SetData[];
  /** epoch ms момента ввода — по нему решается, что свежее. */
  updated_at: number;
}

export interface OutboxDoc {
  entries: OutboxEntry[];
}

/** Минимальный срез серверной строки подхода, нужный правилу меток. */
export interface ServerLogStamp {
  set_number: number;
  completed_at?: string | null;
}

/**
 * Критерий «подход засчитан» — тот же, что у отправки
 * (src/hooks/useWorkoutSession.ts:152-166): пустой по весу и повторам сет с
 * отметкой усилия всё равно уезжает в базу (правило F3 от 17.10), поэтому он же
 * и считается незаписанным.
 */
function isFilledSet(set: SetData | undefined): boolean {
  if (!set) return false;
  return (
    (set.weight ?? '') !== '' ||
    (set.reps ?? '') !== '' ||
    (set.reps_left ?? '') !== '' ||
    (set.reps_right ?? '') !== '' ||
    set.rpe != null ||
    set.rir != null ||
    set.difficulty != null
  );
}

/** Только поля ввода пользователя: подсказки `previous*` в журнал не едут. */
function inputFields(set: SetData): SetData {
  return {
    weight: set.weight ?? '',
    reps: set.reps ?? '',
    reps_left: set.reps_left ?? '',
    reps_right: set.reps_right ?? '',
    rpe: set.rpe ?? null,
    rir: set.rir ?? null,
    difficulty: set.difficulty ?? null,
    isWarmup: set.isWarmup ?? false,
    estimatedReps: set.estimatedReps ?? null,
  };
}

/** Пустая строка и отсутствующий ключ — одно и то же «не заполнено». */
function sameSet(a: SetData | undefined, b: SetData | undefined): boolean {
  if (!a || !b) return false;
  const x = inputFields(a);
  const y = inputFields(b);
  return (
    x.weight === y.weight &&
    x.reps === y.reps &&
    x.reps_left === y.reps_left &&
    x.reps_right === y.reps_right &&
    x.rpe === y.rpe &&
    x.rir === y.rir &&
    x.difficulty === y.difficulty &&
    x.isWarmup === y.isWarmup &&
    (x.estimatedReps ?? null) === (y.estimatedReps ?? null)
  );
}

function maxCompletedAt(serverLogs: ServerLogStamp[]): number | null {
  let newest: number | null = null;
  for (const log of serverLogs) {
    if (!log.completed_at) continue;
    const stamp = Date.parse(log.completed_at);
    if (Number.isNaN(stamp)) continue;
    if (newest == null || stamp > newest) newest = stamp;
  }
  return newest;
}

export function countFilledSets(sets: SetData[]): number {
  return sets.reduce((total, set) => (isFilledSet(set) ? total + 1 : total), 0);
}

/** Сколько подходов сейчас в памяти очереди отправки. */
export function countUnsentSets(entries: Iterable<[string, SetData[]]>): number {
  let total = 0;
  for (const [, sets] of entries) total += countFilledSets(sets);
  return total;
}

/**
 * Память очереди → записи журнала. `now` приходит параметром, а не берётся внутри:
 * иначе харнес не сможет задать время детерминированно.
 */
export function buildOutboxEntries(
  workoutId: string,
  buffer: Map<string, SetData[]>,
  now: number
): OutboxEntry[] {
  const entries: OutboxEntry[] = [];
  for (const [workoutExerciseId, sets] of buffer) {
    if (countFilledSets(sets) === 0) continue;
    entries.push({
      workout_id: workoutId,
      workout_exercise_id: workoutExerciseId,
      sets: sets.map((set) => inputFields(set)),
      updated_at: now,
    });
  }
  return entries;
}

/**
 * Наложение журнала на то, что пришло с сервера. Правило согласовано владельцем
 * 27.10: побеждает запись с более поздней меткой.
 *
 * `keep` — надо ли и дальше держать эту строку в журнале и отправлять её:
 * `false` значит «сервер уже свежее или значения совпали», и ключ можно выбросить.
 * Слот журнала, пустой по `isFilledSet`, серверное значение не перетирает: иначе
 * досылка «очистила» бы уже записанный подход.
 *
 * Журнал может быть шире сетки: подход добавили офлайн (`addSet`), а его
 * `persistExerciseSettings` без сети не доехал — тогда ширина растёт до журнала.
 * Это то же правило, по которому маппер расширяет сетку под сохранённые логи
 * (src/hooks/workout/useWorkoutSession.mapper.ts:72-73).
 */
export function overlayOutboxSets(
  sets: SetData[],
  serverLogs: ServerLogStamp[],
  entry: OutboxEntry | null
): { sets: SetData[]; keep: boolean } {
  if (!entry) return { sets, keep: false };

  const newestServer = maxCompletedAt(serverLogs);
  if (newestServer != null && newestServer > entry.updated_at) return { sets, keep: false };

  const next = sets.map((set) => ({ ...set }));
  const width = Math.max(next.length, entry.sets.length);
  let changed = false;

  for (let index = 0; index < width; index++) {
    const fromJournal = entry.sets[index];
    if (!isFilledSet(fromJournal)) continue;
    const incoming = inputFields(fromJournal as SetData);

    if (index >= next.length) {
      next.push(incoming);
      changed = true;
      continue;
    }
    if (sameSet(next[index], incoming)) continue;
    next[index] = { ...next[index], ...incoming };
    changed = true;
  }

  return { sets: next, keep: changed };
}

/** Upsert записей по `workout_exercise_id`: порядок существующих не меняется. */
export function mergeOutboxDoc(existing: OutboxDoc, incoming: OutboxEntry[]): OutboxDoc {
  const byKey = new Map(existing.entries.map((entry) => [entry.workout_exercise_id, entry]));
  for (const entry of incoming) {
    byKey.set(entry.workout_exercise_id, entry);
  }
  return { entries: Array.from(byKey.values()) };
}

export function removeOutboxKeys(doc: OutboxDoc, workoutExerciseIds: string[]): OutboxDoc {
  const doomed = new Set(workoutExerciseIds);
  return { entries: doc.entries.filter((entry) => !doomed.has(entry.workout_exercise_id)) };
}

export function removeOutboxWorkout(doc: OutboxDoc, workoutId: string): OutboxDoc {
  return { entries: doc.entries.filter((entry) => entry.workout_id !== workoutId) };
}

export function keepOutboxWorkouts(doc: OutboxDoc, workoutId: string): OutboxDoc {
  return { entries: doc.entries.filter((entry) => entry.workout_id === workoutId) };
}
