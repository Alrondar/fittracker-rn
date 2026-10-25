// src/services/programSnapshotService.ts
// Скачивание активной программы: структура и история (programSnapshot) плюс кадры
// её упражнений и кадров упражнений, на которые эти можно заменить (mediaCache).
// Справочник с текстами — отдельным снимком, он обязателен: без него программе
// нечем показать технику, пользу и риски.
import { supabase } from '../lib/supabase';
import { fetchAllPages } from './pagedSelect';
import { readSnapshotRows, snapshotStats } from '../lib/exerciseSnapshot';
import { refreshExerciseSnapshot } from './exerciseSnapshotService';
import {
  PROGRAM_MAX_AGE_MS,
  programSnapshotAgeMs,
  saveProgramSnapshot,
  type ProgramSnapshotData,
} from '../lib/programSnapshot';
import { stageFrames } from '../lib/mediaCache';
import { planProgramFrames } from '../utils/framePlan';
import type { MediaGender } from '../utils/mediaScheme';
import type { Database } from '../types/database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Один запрос `in()` — не больше стольких-то идентификаторов: строка условия
 * уезжает в URL, а шлюз режет длинные запросы ошибкой, которую легко спутать
 * с «данных нет».
 */
const ID_CHUNK = 80;

async function collectInPages<T>(
  build: (
    chunk: string[],
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ids: string[],
  label: string
): Promise<T[]> {
  const out: T[] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    const chunk = ids.slice(index, index + ID_CHUNK);
    const pages = await fetchAllPages<T>(
      (from, to) => build(chunk, from, to),
      `${label} (часть ${Math.floor(index / ID_CHUNK) + 1})`
    );
    out.push(...pages);
  }
  return out;
}

async function pullActiveProgram(userId: string): Promise<ProgramSnapshotData> {
  const { data: userProgram, error: userProgramError } = await supabase
    .from('user_programs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (userProgramError) throw userProgramError;
  if (!userProgram) throw new Error('Активной программы нет — скачивать нечего');

  const programId = userProgram.program_id;
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle();
  if (programError) throw programError;

  const phases = await fetchAllPages<Row<'program_phases'>>(
    (from, to) =>
      supabase
        .from('program_phases')
        .select('*')
        .eq('program_id', programId)
        .order('phase_number')
        .range(from, to),
    'program_phases'
  );
  const days = await fetchAllPages<Row<'program_days'>>(
    (from, to) =>
      supabase
        .from('program_days')
        .select('*')
        .eq('program_id', programId)
        .order('id')
        .range(from, to),
    'program_days'
  );
  const dayIds = days.map((day) => day.id);
  const programExercises = dayIds.length
    ? await collectInPages<Row<'program_exercises'>>(
        (chunk, from, to) =>
          supabase
            .from('program_exercises')
            .select('*')
            .in('program_day_id', chunk)
            .order('id')
            .range(from, to),
        dayIds,
        'program_exercises'
      )
    : [];

  const workouts = await fetchAllPages<Row<'workouts'>>(
    (from, to) =>
      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .order('id')
        .range(from, to),
    'workouts'
  );
  const workoutIds = workouts.map((workout) => workout.id);
  const workoutExercises = workoutIds.length
    ? await collectInPages<Row<'workout_exercises'>>(
        (chunk, from, to) =>
          supabase
            .from('workout_exercises')
            .select('*')
            .in('workout_id', chunk)
            .order('id')
            .range(from, to),
        workoutIds,
        'workout_exercises'
      )
    : [];
  const weIds = workoutExercises.map((we) => we.id);
  const logs = weIds.length
    ? await collectInPages<Row<'workout_logs'>>(
        (chunk, from, to) =>
          supabase
            .from('workout_logs')
            .select('*')
            .in('workout_exercise_id', chunk)
            .order('id')
            .range(from, to),
        weIds,
        'workout_logs'
      )
    : [];
  const painEvents = await fetchAllPages<Row<'pain_events'>>(
    (from, to) =>
      supabase.from('pain_events').select('*').eq('user_id', userId).order('id').range(from, to),
    'pain_events'
  );

  return {
    programId,
    userProgram,
    program: program ?? null,
    phases,
    days,
    programExercises,
    workouts,
    workoutExercises,
    logs,
    painEvents,
  };
}

/** Все упражнения программы: из снапшота дней и из строк тренировок. */
function exerciseIdsOf(data: ProgramSnapshotData): string[] {
  const ids = new Set<string>();
  for (const row of data.workoutExercises) if (row.exercise_id) ids.add(row.exercise_id);
  for (const row of data.programExercises) if (row.exercise_id) ids.add(row.exercise_id);
  return [...ids];
}

export type FrameGroup = { planned: number; fetched: number; bytes: number };

export type ProgramDownloadResult = {
  bytes: number;
  days: number;
  workouts: number;
  exercises: number;
  logs: number;
  framesOwn: FrameGroup;
  framesAlternatives: FrameGroup;
};

/** Тянет структуру и историю и пишет снимок. Справочник обязателен: без него
 * программе нечем показать технику, пользу и риски. */
async function pullAndSave(userId: string): Promise<{
  data: ProgramSnapshotData;
  bytes: number;
  days: number;
  workouts: number;
  exercises: number;
  logs: number;
}> {
  if (snapshotStats().rows === 0) await refreshExerciseSnapshot(true);
  await readSnapshotRows();
  const data = await pullActiveProgram(userId);
  const saved = await saveProgramSnapshot(userId, data);
  return {
    data,
    bytes: saved.bytes,
    days: saved.days,
    workouts: saved.workouts,
    exercises: data.workoutExercises.length,
    logs: data.logs.length,
  };
}

/**
 * Скачивает активную программу целиком: структура + история + кадры упражнений +
 * кадры их замен. Бросает ошибку, если сеть не ответила, — кнопка должна показать
 * отказ, а не молча оставить пользователя со старым снимком.
 */
export async function downloadActiveProgram(
  userId: string,
  gender: MediaGender
): Promise<ProgramDownloadResult> {
  const pulled = await pullAndSave(userId);
  const plan = planProgramFrames(await readSnapshotRows(), exerciseIdsOf(pulled.data), gender);
  // Сначала кадры самой программы: при переполнении потолка вытесняются самые давние,
  // а замены в этом порядке жертвуются первыми.
  const own = await stageFrames(plan.own);
  const alternatives = await stageFrames(plan.alternatives);

  return {
    bytes: pulled.bytes,
    days: pulled.days,
    workouts: pulled.workouts,
    exercises: pulled.exercises,
    logs: pulled.logs,
    framesOwn: { planned: plan.own.length, fetched: own.fetched, bytes: own.bytes },
    framesAlternatives: {
      planned: plan.alternatives.length,
      fetched: alternatives.fetched,
      bytes: alternatives.bytes,
    },
  };
}

/**
 * Фоновое обновление при старте: только структура и история, кадров не касается —
 * пол пользователя вне React-хука неизвестен, а качать не ту пару кадров означало
 * бы тратить трафик впустую. Молча, если снимок не включали или он свежий: фоновый
 * обновляльщик не имеет права мешать работе.
 */
export async function refreshProgramSnapshotStructure(
  userId: string | null
): Promise<{ bytes: number; workouts: number; days: number } | null> {
  if (!userId) return null;
  const age = await programSnapshotAgeMs(userId);
  if (age === Infinity || age < PROGRAM_MAX_AGE_MS) return null;
  try {
    const { bytes, workouts, days } = await pullAndSave(userId);
    return { bytes, workouts, days };
  } catch (e) {
    console.warn('[programSnapshotService] фоновое обновление не удалось:', e);
    return null;
  }
}
