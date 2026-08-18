// src/services/progressService.ts
// Progress hub: агрегированные данные для ответа на «Как я меняюсь?»
// Переиспользует существующие данные из profileService + dashboardService.
// Добавляет: объём по неделям (8 недель) + PR timeline с датами.
import { supabase } from '../lib/supabase';
import { epley } from '../utils/e1rm';
import { profileService, PersonalRecord } from './profileService';

export interface WeeklyVolume {
  weekStart: string; // YYYY-MM-DD (понедельник)
  weekEnd: string;
  volume: number;
  workoutsCount: number;
}

export interface PersonalRecordWithDate extends PersonalRecord {
  recordDate: string; // ISO date
}

export interface ProgressData {
  weeklyVolume: WeeklyVolume[]; // последние 8 недель
  personalRecords: PersonalRecordWithDate[]; // top 5 с датами
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  bestStreak: number;
}

/**
 * Получить данные для Progress hub.
 * Переиспользует profileService.getPersonalRecords + getStats.
 * Добавляет: объём по неделям + даты рекордов.
 */
export async function getProgressData(userId: string): Promise<ProgressData> {
  const [stats, personalRecords, weeklyVolume, streakData] = await Promise.all([
    profileService.getStats(userId),
    getPersonalRecordsWithDates(userId),
    getWeeklyVolume(userId, 8),
    getStreakData(userId),
  ]);

  return {
    weeklyVolume,
    personalRecords,
    totalWorkouts: stats.totalWorkouts,
    totalVolume: stats.totalVolume,
    currentStreak: streakData.current,
    bestStreak: streakData.best,
  };
}

/**
 * Объём тренировок по неделям (последние N недель).
 * Группировка на клиенте для простоты (не RPC).
 */
async function getWeeklyVolume(userId: string, weeks: number): Promise<WeeklyVolume[]> {
  const now = new Date();
  // Окно из N недель, где ПОСЛЕДНИЙ bucket = текущая неделя.
  // Старая формула `now - weeks*7d` сдвигала окно на неделю назад — сегодняшние
  // тренировки не попадали в chart и в блок регулярности.
  const startMs = now.getTime() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000;
  const startISO = new Date(startMs).toISOString();

  const { data: workouts } = await supabase
    .from('workouts')
    .select('created_at, workout_exercises (workout_logs (weight_kg, reps))')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .gte('created_at', startISO)
    .order('created_at', { ascending: true });

  if (!workouts || workouts.length === 0) return [];

  // Группируем по неделям (понедельник как начало)
  const byWeek = new Map<string, { volume: number; count: number }>();
  workouts.forEach((workout: any) => {
    const date = new Date(workout.created_at);
    // Находим понедельник этой недели
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];

    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, { volume: 0, count: 0 });
    }

    const week = byWeek.get(weekStart)!;
    week.count += 1;

    workout.workout_exercises?.forEach((ex: any) => {
      ex.workout_logs?.forEach((log: any) => {
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        week.volume += weight * reps;
      });
    });
  });

  // Инициализируем все недели (даже пустые)
  const result: WeeklyVolume[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(startMs + i * 7 * 24 * 60 * 60 * 1000);
    const mondayOffset = weekStart.getDay() === 0 ? -6 : 1 - weekStart.getDay();
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const data = byWeek.get(weekStartStr) || { volume: 0, count: 0 };
    result.push({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      volume: data.volume,
      workoutsCount: data.count,
    });
  }

  return result;
}

/**
 * PR с датами рекордов (когда был установлен).
 * Расширяет profileService.getPersonalRecords датами.
 */
async function getPersonalRecordsWithDates(
  userId: string,
): Promise<PersonalRecordWithDate[]> {
  const { data: userWorkouts } = await supabase
    .from('workouts')
    .select('id, created_at')
    .eq('user_id', userId);

  if (!userWorkouts || userWorkouts.length === 0) return [];
  const workoutIds = userWorkouts.map((w) => w.id);
  const workoutDateMap = new Map(userWorkouts.map((w) => [w.id, w.created_at]));

  const { data: workoutExercises } = await supabase
    .from('workout_exercises')
    .select('id, exercise_id, workout_id')
    .in('workout_id', workoutIds);

  if (!workoutExercises || workoutExercises.length === 0) return [];
  const exerciseIds = [...new Set(workoutExercises.map((we) => we.exercise_id))];
  const workoutExerciseIds = workoutExercises.map((we) => we.id);

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name')
    .in('id', exerciseIds);
  const exerciseNameMap = new Map(exercises?.map((e) => [e.id, e.name]) || []);

  const { data: logs } = await supabase
    .from('workout_logs')
    .select('workout_exercise_id, weight_kg, reps, completed_at')
    .in('workout_exercise_id', workoutExerciseIds);

  const exerciseRecords: Record<string, PersonalRecordWithDate> = {};
  logs?.forEach((log: any) => {
    const workoutExercise = workoutExercises.find((we) => we.id === log.workout_exercise_id);
    if (!workoutExercise) return;
    const exerciseId = workoutExercise.exercise_id;
    const exerciseName = exerciseNameMap.get(exerciseId);
    if (!exerciseName) return;
    const weight = parseFloat(log.weight_kg) || 0;
    const reps = parseInt(log.reps) || 0;
    const setE1rm = epley(weight, reps);
    const workoutDate = workoutDateMap.get(workoutExercise.workout_id) || log.completed_at;

    const existing = exerciseRecords[exerciseId];
    if (!existing || weight > existing.maxWeight) {
      exerciseRecords[exerciseId] = {
        name: exerciseName,
        maxWeight: weight,
        reps,
        e1rm: Math.max(setE1rm, existing?.e1rm ?? 0),
        recordDate: workoutDate,
      };
    } else if (setE1rm > existing.e1rm) {
      existing.e1rm = setE1rm;
      // Обновляем дату, если новый e1RM рекорд
      if (setE1rm > existing.e1rm) {
        existing.recordDate = workoutDate;
      }
    }
  });

  return Object.values(exerciseRecords)
    .filter((record) => record.maxWeight > 0)
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 5);
}

/**
 * Streak data (current + best).
 * Переиспользует логику из utils/streak.ts.
 */
async function getStreakData(
  userId: string,
): Promise<{ current: number; best: number }> {
  const { data: workouts } = await supabase
    .from('workouts')
    .select('created_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null);

  if (!workouts || workouts.length === 0) {
    return { current: 0, best: 0 };
  }

  const dates = workouts.map((w) => w.created_at);
  const { computeStreaks } = await import('../utils/streak');
  const streak = computeStreaks(dates);
  return { current: streak.current, best: streak.best };
}