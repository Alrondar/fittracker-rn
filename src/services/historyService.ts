import { supabase } from '../lib/supabase';

export interface HistoryWorkout {
  id: string;
  name: string;
  created_at: string;
  volume: number;
  sets: number;
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

function calculateVolume(workout: any): number {
  let volume = 0;
  workout.workout_exercises?.forEach((ex: any) => {
    ex.workout_logs?.forEach((log: any) => {
      volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
    });
  });
  return volume;
}

function calculateSets(workout: any): number {
  let sets = 0;
  workout.workout_exercises?.forEach((ex: any) => {
    sets += ex.workout_logs?.length || 0;
  });
  return sets;
}

function groupByMonth(workouts: HistoryWorkout[]): HistorySection[] {
  const groups: Record<string, HistoryWorkout[]> = {};
  workouts.forEach((workout) => {
    const date = new Date(workout.created_at);
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
    const date = new Date(w.created_at);
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
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, created_at, workout_exercises ( id, workout_logs ( weight_kg, reps ) )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const completed = (data || [])
    .filter((w: any) => w.workout_exercises?.some((ex: any) => ex.workout_logs?.length > 0))
    .map((w: any) => ({
      id: w.id,
      name: w.name,
      created_at: w.created_at,
      volume: calculateVolume(w),
      sets: calculateSets(w),
    }));

  return {
    sections: groupByMonth(completed),
    monthlyStats: calculateMonthlyStats(completed),
  };
  
}
// ============================================================================
// ДЕТАЛИ ТРЕНИРОВКИ (для history/[id].tsx) — SEC-10
// ============================================================================
import type { Database } from '../types/database.types';

type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];
type WorkoutExerciseRow = Database['public']['Tables']['workout_exercises']['Row'];

export interface WorkoutDetailLog {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
}

export interface WorkoutDetailExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  target_sets: number | null;
  target_reps_range: string | null;
  rest_seconds: number | null;
  logs: WorkoutDetailLog[];
}

export interface WorkoutDetail {
  id: string;
  name: string;
  created_at: string;
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
      `id, name, created_at, finished_at, duration_seconds, program_id, week_number, day_index,
       workout_exercises (
         id, exercise_id, target_sets, target_reps_range, rest_seconds,
         exercises ( name ),
         workout_logs ( id, set_number, weight_kg, reps )
       )`,
    )
    .eq('id', workoutId)
    .maybeSingle();

  // Различаем "не найдено" и "сетевая ошибка"
  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: { notFound: true, message: 'Тренировка не найдена' } };
    }
    return { data: null, error: { notFound: false, message: error.message } };
  }

  if (!data) {
    return { data: null, error: { notFound: true, message: 'Тренировка не найдена' } };
  }

  // Маппинг упражнений с типизацией
  const rawExercises = (data as any).workout_exercises as Array<{
    id: string;
    exercise_id: string;
    target_sets: number | null;
    target_reps_range: string | null;
    rest_seconds: number | null;
    exercises: { name: string } | null;
    workout_logs: WorkoutLogRow[];
  }>;

  const exercises: WorkoutDetailExercise[] = (rawExercises || []).map((we) => ({
    id: we.id,
    exercise_id: we.exercise_id,
    exercise_name: we.exercises?.name || 'Неизвестное упражнение',
    target_sets: we.target_sets,
    target_reps_range: we.target_reps_range,
    rest_seconds: we.rest_seconds,
    logs: (we.workout_logs || [])
      .sort((a: WorkoutLogRow, b: WorkoutLogRow) => a.set_number - b.set_number)
      .map((log) => ({
        id: log.id,
        set_number: log.set_number,
        weight_kg: log.weight_kg,
        reps: log.reps,
      })),
  }));

  return {
    data: {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      finished_at: data.finished_at,
      duration_seconds: data.duration_seconds,
      program_id: data.program_id,
      week_number: data.week_number,
      day_index: data.day_index,
      exercises,
    },
    error: null,
  };
}