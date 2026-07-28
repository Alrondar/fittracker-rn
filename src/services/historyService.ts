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