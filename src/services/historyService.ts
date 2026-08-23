import { supabase } from '../lib/supabase';

// ============================================================================
// ПУБЛИЧНЫЕ ТИПЫ (контракт для history.tsx / history/[id].tsx — не менять)
// ============================================================================
export interface HistoryWorkout {
  id: string;
  name: string;
  /**
   * Фактическая дата тренировки: finished_at ?? started_at ?? created_at.
   * Используйте это поле для отображения даты, сортировки и фильтрации.
   * created_at ниже оставлен для обратной совместимости и отражает момент
   * создания записи в БД (при upfront-создании тренировок программы он
   * НЕ совпадает с фактической датой тренировки — см. bugfix 2026-08-23).
   */
  date: string;
  created_at: string;
  volume: number;
  sets: number;
  duration_seconds: number | null;
  program_name: string | null;
  avg_rpe: number | null;
}

export interface HistorySection {
  title: string;
  data: HistoryWorkout[];
}

export interface MonthlyStats {
  totalWorkouts: number;
  totalVolume: number;
  bestWorkout: number;
}

export interface HistoryData {
  sections: HistorySection[];
  monthlyStats: MonthlyStats;
}

// ============================================================================
// ВНУТРЕННИЕ ТИПЫ JOIN-СТРУКТУР (ARCH-6: вместо any)
// ============================================================================

/** getHistory: select('id, name, created_at, finished_at, duration_seconds, program_id, workout_exercises ( id, workout_logs ( weight_kg, reps, rpe ) )')
 *  program_id хранится без FK на programs — имена программ дозапрашиваем отдельным батч-запросом, чтобы не падать с PGRST200. */
interface HistoryLogRow {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}
interface HistoryExerciseRow {
  id: string;
  workout_logs: HistoryLogRow[] | null;
}
interface HistoryWorkoutRow {
  id: string;
  name: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  program_id: string | null;
  workout_exercises: HistoryExerciseRow[] | null;
}

/** Effective date тренировки: когда она фактически завершилась/началась. */
function effectiveDate(row: HistoryWorkoutRow): string {
  return row.finished_at ?? row.started_at ?? row.created_at;
}

function calculateVolume(workout: HistoryWorkoutRow): number {
  let volume = 0;
  (workout.workout_exercises ?? []).forEach((ex) => {
    (ex.workout_logs ?? []).forEach((log) => {
      volume += (Number(log.weight_kg) || 0) * (Number(log.reps) || 0);
    });
  });
  return volume;
}

function calculateSets(workout: HistoryWorkoutRow): number {
  let sets = 0;
  (workout.workout_exercises ?? []).forEach((ex) => {
    sets += ex.workout_logs?.length || 0;
  });
  return sets;
}

function calculateAvgRpe(workout: HistoryWorkoutRow): number | null {
  let sum = 0;
  let count = 0;
  (workout.workout_exercises ?? []).forEach((ex) => {
    (ex.workout_logs ?? []).forEach((log) => {
      if (log.rpe != null) {
        sum += Number(log.rpe);
        count += 1;
      }
    });
  });
  if (count === 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

function groupByMonth(workouts: HistoryWorkout[]): HistorySection[] {
  const groups: Record<string, HistoryWorkout[]> = {};
  workouts.forEach((workout) => {
    const date = new Date(workout.date);
    const monthYear = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const formattedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    if (!groups[formattedMonth]) groups[formattedMonth] = [];
    groups[formattedMonth].push(workout);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

function calculateMonthlyStats(workouts: HistoryWorkout[]): MonthlyStats {
  const now = new Date();
  const thisMonth = workouts.filter((w) => {
    const date = new Date(w.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  let totalVolume = 0;
  let bestWorkout = 0;
  thisMonth.forEach((w) => {
    totalVolume += w.volume;
    if (w.volume > bestWorkout) bestWorkout = w.volume;
  });
  return {
    totalWorkouts: thisMonth.length,
    totalVolume: Math.round(totalVolume),
    bestWorkout: Math.round(bestWorkout),
  };
}

export async function getHistory(userId: string): Promise<HistoryData> {
  // Запрашиваем started_at для корректной effective date.
  // PostgREST не умеет ORDER BY COALESCE(finished_at, started_at, created_at),
  // поэтому сортируем по effective date на клиенте — ниже, после маппинга.
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, name, created_at, started_at, finished_at, duration_seconds, program_id, workout_exercises ( id, workout_logs ( weight_kg, reps, rpe ) )',
    )
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data ?? []) as unknown as HistoryWorkoutRow[];

  // Батч-запрос имён программ: собираем уникальные program_id и одним запросом
  // вытаскиваем name. Ошибка здесь не должна ронять всю историю — ловим локально.
  const programIds = Array.from(
    new Set(rows.map((r) => r.program_id).filter((v): v is string => !!v)),
  );
  let programNames: Record<string, string> = {};
  if (programIds.length > 0) {
    try {
      const { data: programRows, error: programsError } = await supabase
        .from('programs')
        .select('id, name')
        .in('id', programIds);
      if (!programsError && programRows) {
        programNames = Object.fromEntries(programRows.map((p) => [p.id, p.name]));
      }
    } catch {
      // ignore — history должна жить даже если programs недоступны
    }
  }

  const completed: HistoryWorkout[] = rows
    .filter(
      (w) =>
        w.finished_at !== null ||
        (w.workout_exercises ?? []).some((ex) => (ex.workout_logs?.length ?? 0) > 0),
    )
    .map((w) => ({
      id: w.id,
      name: w.name,
      date: effectiveDate(w),
      created_at: w.created_at,
      volume: calculateVolume(w),
      sets: calculateSets(w),
      duration_seconds: w.duration_seconds ?? null,
      program_name: w.program_id ? (programNames[w.program_id] ?? null) : null,
      avg_rpe: calculateAvgRpe(w),
    }))
    // Сортируем по фактической дате тренировки, а не по дате создания записи.
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    sections: groupByMonth(completed),
    monthlyStats: calculateMonthlyStats(completed),
  };
}

// ============================================================================
// ДЕТАЛИ ТРЕНИРОВКИ (для history/[id].tsx) — SEC-10
// Остальной код без изменений (сохраняем существующий контракт).
// ============================================================================

/** getWorkoutDetail: вложенный select с exercises(name) и workout_logs(id,set_number,weight_kg,reps) */
interface WorkoutDetailLogRow {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  difficulty: string | null;
}
interface WorkoutDetailExerciseRow {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps_range: string | null;
  rest_seconds: number | null;
  exercises: { name: string; primary_muscles: string[] | null; secondary_muscles: string[] | null } | null;
  workout_logs: WorkoutDetailLogRow[] | null;
}
interface WorkoutDetailRow {
  id: string;
  name: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  program_id: string | null;
  week_number: number | null;
  day_index: number | null;
  workout_exercises: WorkoutDetailExerciseRow[] | null;
}

export interface WorkoutDetailLog {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  difficulty: string | null;
}

export interface WorkoutDetailExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  target_sets: number | null;
  target_reps_range: string | null;
  rest_seconds: number | null;
  logs: WorkoutDetailLog[];
}

export interface WorkoutDetail {
  id: string;
  name: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  program_id: string | null;
  week_number: number | null;
  day_index: number | null;
  exercises: WorkoutDetailExercise[];
}

export interface WorkoutDetailError {
  notFound: boolean;
  message: string;
}

export async function getWorkoutDetail(
  workoutId: string,
): Promise<{ data: WorkoutDetail | null; error: WorkoutDetailError | null }> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `id, name, created_at, started_at, finished_at, duration_seconds, program_id, week_number, day_index,
       workout_exercises ( id, exercise_id, target_sets, target_reps_range, rest_seconds, exercises ( name, primary_muscles, secondary_muscles ), workout_logs ( id, set_number, weight_kg, reps, rpe, rir, difficulty ) )`,
    )
    .eq('id', workoutId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: { notFound: true, message: 'Тренировка не найдена' } };
    }
    return { data: null, error: { notFound: false, message: error.message } };
  }

  if (!data) {
    return { data: null, error: { notFound: true, message: 'Тренировка не найдена' } };
  }

  const workout = data as unknown as WorkoutDetailRow;

  const exercises: WorkoutDetailExercise[] = (workout.workout_exercises ?? []).map((we) => ({
    id: we.id,
    exercise_id: we.exercise_id,
    exercise_name: we.exercises?.name || 'Неизвестное упражнение',
    primary_muscles: we.exercises?.primary_muscles || null,
    secondary_muscles: we.exercises?.secondary_muscles || null,
    target_sets: we.target_sets,
    target_reps_range: we.target_reps_range,
    rest_seconds: we.rest_seconds,
    logs: (we.workout_logs ?? [])
      .sort((a, b) => a.set_number - b.set_number)
      .map((log) => ({
        id: log.id,
        set_number: log.set_number,
        weight_kg: log.weight_kg,
        reps: log.reps,
        rpe: log.rpe,
        rir: log.rir,
        difficulty: log.difficulty,
      })),
  }));

  return {
    data: {
      id: workout.id,
      name: workout.name,
      created_at: workout.created_at,
      started_at: workout.started_at,
      finished_at: workout.finished_at,
      duration_seconds: workout.duration_seconds,
      program_id: workout.program_id,
      week_number: workout.week_number,
      day_index: workout.day_index,
      exercises,
    },
    error: null,
  };
}