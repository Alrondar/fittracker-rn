// src/lib/programSnapshot.ts
// Снимок АКТИВНОЙ программы пользователя: указатель, сама программа, фазы, дни,
// упражнения программы, тренировки со статусами, их строки упражнений, сделанные
// подходы и события боли. Это данные пользователя, а не справочник, поэтому
// хранилище скопировано по инвариантам кэша запросов: ключ с кодом пользователя
// (на общем устройстве второй профиль физически не читает чужой снимок) и полное
// стирание при выходе.
//
// Тексты упражнений здесь не дублируются — они в снимке справочника
// (src/lib/exerciseSnapshot.ts), кадры — в хранилище кадров
// (src/lib/mediaCache.ts). Здесь только то, чего в справочнике нет: структура и
// история. Замер 25.10 на проде: 100–230 КБ JSON на активную программу.
import { readLocalDoc, removeLocalDoc, writeLocalDoc, type LocalDocMeta } from './localStore';
import type { Database } from '../types/database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

const DOC_PREFIX = 'active-program-';
/** Меняй при несовместимой форме снимка. */
export const PROGRAM_SNAPSHOT_VERSION = 1;
/** моложе шести часов не перезагружаем: структура меняется по правкам программы. */
export const PROGRAM_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type ProgramSnapshotData = {
  programId: string;
  userProgram: Row<'user_programs'> | null;
  program: Row<'programs'> | null;
  phases: Row<'program_phases'>[];
  days: Row<'program_days'>[];
  programExercises: Row<'program_exercises'>[];
  workouts: Row<'workouts'>[];
  workoutExercises: Row<'workout_exercises'>[];
  logs: Row<'workout_logs'>[];
  painEvents: Row<'pain_events'>[];
};

export type ProgramSnapshotInfo = {
  takenAt: string | null;
  bytes: number;
  days: number;
  workouts: number;
  exercises: number;
  logs: number;
};

let cache: { userId: string; meta: LocalDocMeta; data: ProgramSnapshotData } | null = null;
/**
 * Последний владелец снимка в этом запуске. Нужен для стирания по logout: в момент
 * события session уже пустой, а ключ хранилища — с кодом пользователя.
 */
let lastUserId: string | null = null;

const docName = (userId: string) => `${DOC_PREFIX}${userId}.json`;

/** Стирание по событию SIGNED_OUT, когда идентификатор уже недоступен. */
export async function clearLastProgramSnapshot(): Promise<void> {
  await clearProgramSnapshot(lastUserId);
  lastUserId = null;
}

/** Как выглядит снимок на экране настроек. */
export async function programSnapshotInfo(userId: string | null): Promise<ProgramSnapshotInfo> {
  const stored = await readProgramSnapshot(userId);
  if (!stored) return { takenAt: null, bytes: 0, days: 0, workouts: 0, exercises: 0, logs: 0 };
  return {
    takenAt: stored.meta.takenAt,
    bytes: stored.meta.bytes,
    days: stored.data.days.length,
    workouts: stored.data.workouts.length,
    exercises: stored.data.workoutExercises.length,
    logs: stored.data.logs.length,
  };
}

export async function readProgramSnapshot(
  userId: string | null
): Promise<{ meta: LocalDocMeta; data: ProgramSnapshotData } | null> {
  if (!userId) return null;
  if (cache && cache.userId === userId) return cache;
  const doc = await readLocalDoc<ProgramSnapshotData>(docName(userId));
  lastUserId = userId;
  if (!doc || doc.meta.v !== PROGRAM_SNAPSHOT_VERSION || !doc.data) return null;
  cache = { userId, meta: doc.meta, data: doc.data };
  return cache;
}

/** Возраст снимка в миллисекундах; Infinity — если снимка нет. */
export async function programSnapshotAgeMs(userId: string | null): Promise<number> {
  const stored = await readProgramSnapshot(userId);
  const stamp = Date.parse(stored?.meta.takenAt ?? '');
  return Number.isNaN(stamp) ? Infinity : Math.max(Date.now() - stamp, 0);
}

export async function saveProgramSnapshot(
  userId: string,
  data: ProgramSnapshotData
): Promise<{ bytes: number; workouts: number; days: number }> {
  const stamp = new Date().toISOString();
  const bytes = await writeLocalDoc(docName(userId), data, {
    v: PROGRAM_SNAPSHOT_VERSION,
    takenAt: stamp,
    count: data.workouts.length,
  });
  cache = {
    userId,
    meta: { v: PROGRAM_SNAPSHOT_VERSION, takenAt: stamp, bytes, count: data.workouts.length },
    data,
  };
  lastUserId = userId;
  return { bytes, workouts: data.workouts.length, days: data.days.length };
}

/** Стирание по logout и по кнопке «Очистить». Идемпотентно. */
export async function clearProgramSnapshot(userId: string | null): Promise<void> {
  if (!userId) return;
  if (cache?.userId === userId) cache = null;
  if (lastUserId === userId) lastUserId = null;
  await removeLocalDoc(docName(userId));
}

/**
 * Сеть, а если молчит — снимок программы. Как и со справочником, пустой ответ сети
 * отказом не считается: в fallback заходим только по исключению, и если снимка нет
 * (или он не про того пользователя), исходная ошибка летит дальше.
 */
export async function networkOrProgram<T>(
  userId: string | null,
  network: () => Promise<T>,
  fallback: (data: ProgramSnapshotData) => T | null
): Promise<T> {
  try {
    return await network();
  } catch (error) {
    const stored = await readProgramSnapshot(userId);
    if (!stored) throw error;
    const value = fallback(stored.data);
    if (value === null || value === undefined) throw error;
    return value;
  }
}
