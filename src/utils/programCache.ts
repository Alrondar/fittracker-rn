// src/utils/programCache.ts
// Чистая часть офлайн-кэша программ: форма записи и правило выбора, из какой
// скачанной программы читать данные. Никакого хранилища и react-native здесь нет —
// именно эти ветки проверяет харнес scripts/check-program-snapshot.ts, а запись в
// файл / IndexedDB живёт в src/lib/programSnapshot.ts.
//
// В записи может лежать несколько программ (переключать программу не значит
// вышвыривать прошлую), поэтому выбор должен быть детерминированным: явный id →
// программа, которой принадлежит тренировка → указатель `activeProgramId`.
import type { Database } from '../types/database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

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

export type ProgramCacheDoc = {
  /** Какая программа считалась активной в момент последнего скачивания. */
  activeProgramId: string | null;
  programs: Record<string, ProgramSnapshotData>;
};

/** К какой программе принадлежит тренировка (у лога и строки дня своего id нет). */
export function programOfWorkout(
  doc: ProgramCacheDoc,
  workoutId: string
): ProgramSnapshotData | null {
  for (const data of Object.values(doc.programs)) {
    if (data.workouts.some((workout) => workout.id === workoutId)) return data;
  }
  return null;
}

/**
 * Явный id важнее указателя, тренировка — важнее указателя, но лишь когда её хозяин
 * найден: чужая или неизвестная тренировка обязана откатиться к указателю, а не
 * отдать первую попавшуюся программу. Указатель на отсутствующую программу = «снимка
 * нет», а не «любой снимок»: иначе день открылся бы данными другой программы.
 */
export function pickFromCache(
  doc: ProgramCacheDoc | null,
  hint?: { programId?: string; workoutId?: string }
): ProgramSnapshotData | null {
  if (!doc) return null;
  if (hint?.programId && doc.programs[hint.programId]) return doc.programs[hint.programId];
  if (hint?.workoutId) {
    const owner = programOfWorkout(doc, hint.workoutId);
    if (owner) return owner;
  }
  return doc.activeProgramId ? (doc.programs[doc.activeProgramId] ?? null) : null;
}

/**
 * Что станет записью после скачивания одной программы. Указатель переезжает только
 * на ДЕЙСТВИТЕЛЬНО активную программу: кнопка на карточке готовой программы из
 * каталога (её строки в `user_programs` нет) не имеет права перетащить
 * офлайн-экраны на её дни — иначе список тренировок стал бы про другую программу.
 */
export function mergeIntoCache(
  doc: ProgramCacheDoc | null,
  data: ProgramSnapshotData
): ProgramCacheDoc {
  const base = doc ?? { activeProgramId: null, programs: {} };
  return {
    activeProgramId: data.userProgram?.is_active ? data.programId : base.activeProgramId,
    programs: { ...base.programs, [data.programId]: data },
  };
}

/** Пустая сводка — «этой программы на устройстве нет». */
export const NO_PROGRAM_INFO = {
  takenAt: null,
  bytes: 0,
  days: 0,
  workouts: 0,
  exercises: 0,
  logs: 0,
} as const;

export type ProgramSnapshotInfo = {
  takenAt: string | null;
  bytes: number;
  days: number;
  workouts: number;
  exercises: number;
  logs: number;
};

/** Сводка для интерфейса: число дней, тренировок, строк и байт по одной программе. */
export function infoOf(
  data: ProgramSnapshotData,
  bytes: number,
  takenAt: string | null
): ProgramSnapshotInfo {
  return {
    takenAt,
    bytes,
    days: data.days.length,
    workouts: data.workouts.length,
    exercises: data.workoutExercises.length,
    logs: data.logs.length,
  };
}
