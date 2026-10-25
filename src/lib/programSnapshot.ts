// src/lib/programSnapshot.ts
// Снимки программ пользователя: указатель, сама программа, фазы, дни, упражнения
// программы, тренировки со статусами, их строки упражнений, сделанные подходы и
// события боли. Это данные пользователя, а не справочник, поэтому хранилище
// скопировано по инвариантам кэша запросов: ключ с кодом пользователя (на общем
// устройстве второй профиль физически не читает чужой снимок) и полное стирание
// при выходе.
//
// В записи помещается несколько программ (`programs` по идентификатору), а не одна:
// скачанная программа остаётся на устройстве и после того, как пользователь
// переключится на другую, — место под данные не ограничено потолком кадров, а
// размер одной программы 0,1–0,2 МБ (замер 25.10). Какой снимок считать «своим»,
// решает указатель `activeProgramId`: он пишется при каждом скачивании и задаёт
// поведение офлайна по умолчанию.
//
// Тексты упражнений здесь не дублируются — они в снимке справочника
// (src/lib/exerciseSnapshot.ts), кадры — в хранилище кадров
// (src/lib/mediaCache.ts). Здесь только то, чего в справочнике нет: структура и
// история.
import { readLocalDoc, removeLocalDoc, writeLocalDoc, type LocalDocMeta } from './localStore';
import {
  NO_PROGRAM_INFO,
  infoOf,
  pickFromCache,
  type ProgramCacheDoc,
  type ProgramSnapshotData,
  type ProgramSnapshotInfo,
} from '../utils/programCache';

export type {
  ProgramCacheDoc,
  ProgramSnapshotData,
  ProgramSnapshotInfo,
} from '../utils/programCache';
export { pickFromCache } from '../utils/programCache';

const DOC_PREFIX = 'active-program-';
/**
 * Меняй при несовместимой форме снимка. Версия 2 — карта программ вместо одного
 * снимка: прежняя форма прочиталась бы как пустая программа. Расхождение
 * исправляется молча: не тот формат или версия — файл удаляется, место освобождается.
 */
export const PROGRAM_SNAPSHOT_VERSION = 2;
/** моложе шести часов не перезагружаем: структура меняется по правкам программы. */
export const PROGRAM_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const NO_INFO: ProgramSnapshotInfo = NO_PROGRAM_INFO;

let cache: { userId: string; meta: LocalDocMeta; doc: ProgramCacheDoc } | null = null;
/**
 * Последний владелец снимка в этом запуске. Нужен для стирания по logout: в момент
 * события session уже пустой, а ключ хранилища — с кодом пользователя.
 */
let lastUserId: string | null = null;

const docName = (userId: string) => `${DOC_PREFIX}${userId}.json`;

/** Вся запись пользователя; читаются только байты меты, сами программы — по выбору. */
async function readCacheDoc(userId: string | null): Promise<ProgramCacheDoc | null> {
  if (!userId) return null;
  if (cache && cache.userId === userId) return cache.doc;
  const doc = await readLocalDoc<ProgramCacheDoc>(docName(userId));
  lastUserId = userId;
  if (!doc || doc.meta.v !== PROGRAM_SNAPSHOT_VERSION || !doc.data) {
    // Файл прежней формы или битый: держим его под ногами смысла нет, а 0,2 МБ
    // мёртвого байта на телефоне — есть.
    if (doc) await removeLocalDoc(docName(userId));
    cache = null;
    return null;
  }
  cache = { userId, meta: doc.meta, doc: doc.data };
  return doc.data;
}

/** Стирание по событию SIGNED_OUT, когда идентификатор уже недоступен. */
export async function clearLastProgramSnapshot(): Promise<void> {
  await clearProgramSnapshot(lastUserId);
  lastUserId = null;
}

/**
 * Снимок одной программы. Без `programId` — программа под указателем `activeProgramId`
 * (то есть та, что качали последней), а не «первая попавшаяся»: при нескольких
 * скачанных программах выбор должен быть предсказуем.
 */
export async function readProgramSnapshot(
  userId: string | null,
  programId?: string | null
): Promise<ProgramSnapshotData | null> {
  const doc = await readCacheDoc(userId);
  if (!doc) return null;
  const wanted = programId ?? doc.activeProgramId;
  if (!wanted) return null;
  return doc.programs[wanted] ?? null;
}

/** Как выглядит снимок на экране: сводка по одной программе или по всем скачанным. */
export async function programSnapshotInfo(
  userId: string | null,
  programId?: string | null
): Promise<ProgramSnapshotInfo> {
  const doc = await readCacheDoc(userId);
  if (!doc) return NO_INFO;
  const wanted = programId ?? doc.activeProgramId;
  const data = wanted ? doc.programs[wanted] : null;
  if (!data || !cache) return NO_INFO;
  // Байты меты — размер всей записи; для одной программы это порядок 0,1–0,2 МБ,
  // поэтому делим на число программ: точнее всё равно не скажем, а врать нечем.
  const share = Math.round(cache.meta.bytes / Math.max(Object.keys(doc.programs).length, 1));
  return infoOf(data, share, wanted ? cache.meta.takenAt : null);
}

/** Что скачано: id всех программ на устройстве — для плашки и строки настроек. */
export async function downloadedProgramIds(userId: string | null): Promise<string[]> {
  const doc = await readCacheDoc(userId);
  return doc ? Object.keys(doc.programs) : [];
}

/** Возраст снимка программы в миллисекундах; Infinity — если снимка нет. */
export async function programSnapshotAgeMs(
  userId: string | null,
  programId?: string | null
): Promise<number> {
  const doc = await readCacheDoc(userId);
  if (!doc) return Infinity;
  const wanted = programId ?? doc.activeProgramId;
  if (!wanted || !doc.programs[wanted] || !cache) return Infinity;
  const stamp = Date.parse(cache.meta.takenAt);
  return Number.isNaN(stamp) ? Infinity : Math.max(Date.now() - stamp, 0);
}

/**
 * Добавляет программу в запись пользователя и делает её активной. Другие скачанные
 * программы остаются на месте: переключение программы не должно вышвыривать прошлую.
 */
export async function saveProgramSnapshot(
  userId: string,
  data: ProgramSnapshotData
): Promise<{ bytes: number; workouts: number; days: number }> {
  const stamp = new Date().toISOString();
  const doc: ProgramCacheDoc = (await readCacheDoc(userId)) ?? {
    activeProgramId: null,
    programs: {},
  };
  const next: ProgramCacheDoc = {
    activeProgramId: data.programId,
    programs: { ...doc.programs, [data.programId]: data },
  };
  const bytes = await writeLocalDoc(docName(userId), next, {
    v: PROGRAM_SNAPSHOT_VERSION,
    takenAt: stamp,
    count: Object.keys(next.programs).length,
  });
  cache = {
    userId,
    meta: {
      v: PROGRAM_SNAPSHOT_VERSION,
      takenAt: stamp,
      bytes,
      count: Object.keys(next.programs).length,
    },
    doc: next,
  };
  lastUserId = userId;
  return { bytes, workouts: data.workouts.length, days: data.days.length };
}

/**
 * Стирание по logout (без programId — вся запись) и по кнопке «Очистить» (с programId —
 * одна программа). Идемпотентно.
 */
export async function clearProgramSnapshot(
  userId: string | null,
  programId?: string
): Promise<void> {
  if (!userId) return;
  if (!programId) {
    cache = null;
    if (lastUserId === userId) lastUserId = null;
    await removeLocalDoc(docName(userId));
    return;
  }
  const doc = await readCacheDoc(userId);
  if (!doc || !doc.programs[programId]) return;
  const programs = { ...doc.programs };
  delete programs[programId];
  const activeProgramId = doc.activeProgramId === programId ? null : doc.activeProgramId;
  if (Object.keys(programs).length === 0) {
    cache = null;
    await removeLocalDoc(docName(userId));
    return;
  }
  const stamp = new Date().toISOString();
  const bytes = await writeLocalDoc(
    docName(userId),
    { activeProgramId, programs },
    {
      v: PROGRAM_SNAPSHOT_VERSION,
      takenAt: stamp,
      count: Object.keys(programs).length,
    }
  );
  cache = {
    userId,
    meta: {
      v: PROGRAM_SNAPSHOT_VERSION,
      takenAt: stamp,
      bytes,
      count: Object.keys(programs).length,
    },
    doc: { activeProgramId, programs },
  };
}

/** Выбор снимка по тем же правилам, что `pickFromCache`, но с чтением хранилища. */
async function pickSnapshot(
  userId: string | null,
  hint?: { programId?: string; workoutId?: string }
): Promise<ProgramSnapshotData | null> {
  return pickFromCache(await readCacheDoc(userId), hint);
}

/**
 * Сеть, а если молчит — снимок программы. Как и со справочником, пустой ответ сети
 * отказом не считается: в fallback заходим только по исключению, и если подходящего
 * снимка нет, исходная ошибка летит дальше. `hint` говорит, какой из скачанных
 * снимок нужен: список дней берётся под указателем, а день тренировки — у программы,
 * которой принадлежит эта тренировка.
 */
export async function networkOrProgram<T>(
  userId: string | null,
  network: () => Promise<T>,
  fallback: (data: ProgramSnapshotData) => T | null,
  hint?: { programId?: string; workoutId?: string }
): Promise<T> {
  try {
    return await network();
  } catch (error) {
    const data = await pickSnapshot(userId, hint);
    if (!data) throw error;
    const value = fallback(data);
    if (value === null || value === undefined) throw error;
    return value;
  }
}
