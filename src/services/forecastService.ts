// src/services/forecastService.ts
// Фича 7: Next Workout Forecast.
// Загружает данные, необходимые для прогноза сложности следующей тренировки:
//   1. активная программа + указатель следующего дня;
//   2. workout следующей тренировки (не finished, не skipped);
//   3. workout_exercises этой тренировки;
//   4. workout_logs за последние 4 недели по этим exercise_id (is_warmup=false);
//   5. суммарные объёмы всех тренировок пользователя за тот же период (baseline).
// CLAUDE.md §2 — единственное место для supabase-запросов прогноза.
// CLAUDE.md §8 — три параллельных запроса, без N+1.

import { supabase } from '../lib/supabase';
import {
  ForecastExerciseInput,
  ForecastInput,
  calculateWorkoutForecast,
  WorkoutForecastResult,
} from '../utils/workoutForecast';

const FORECAST_WINDOW_DAYS = 28;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface ActiveProgramPointer {
  programId: string;
  currentPhase: number;
  currentWeek: number;
  currentDay: number;
}

interface NextWorkoutRow {
  id: string;
  name: string;
}

interface WorkoutExerciseRow {
  id: string;
  exercise_id: string | null;
  // Supabase embed `.select('exercises(name)')` возвращает массив, а не одиночный объект.
  exercises: { name: string | null }[] | null;
}

interface LogRow {
  workout_exercise_id: string;
  weight: number | null;
  reps: number | null;
  // Supabase join `.select('workout_exercises!inner(exercise_id)')` возвращает массив.
  workout_exercises: { exercise_id: string | null }[] | null;
}

interface RecentWorkoutVolumeRow {
  id: string;
  workout_logs: {
    weight: number | null;
    reps: number | null;
    is_warmup: boolean | null;
  }[];
}

/**
 * Возвращает прогноз сложности следующей тренировки активной программы.
 * Если активной программы нет, или следующей тренировки нет, или данных
 * недостаточно — возвращает `null`.
 */
export async function getWorkoutForecast(userId: string): Promise<WorkoutForecastWithNames | null> {
  // 1) Активная программа + указатель следующего дня
  const { data: userProgram, error: progErr } = await supabase
    .from('user_programs')
    .select('program_id, current_phase, current_week, current_day')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (progErr) throw progErr;
  if (!userProgram) return null;

  const pointer: ActiveProgramPointer = {
    programId: userProgram.program_id,
    currentPhase: userProgram.current_phase ?? 1,
    currentWeek: userProgram.current_week ?? 1,
    currentDay: userProgram.current_day ?? 1,
  };

  // 2) Следующая тренировка программы (не finished, не skipped)
  //    Приоритет: started_at is not null (in_progress) > is null (next).
  const { data: nextWorkouts, error: nextErr } = await supabase
    .from('workouts')
    .select('id, name')
    .eq('user_id', userId)
    .eq('program_id', pointer.programId)
    .eq('phase_number', pointer.currentPhase)
    .eq('week_number', pointer.currentWeek)
    .eq('day_index', pointer.currentDay)
    .is('finished_at', null)
    .is('skipped_at', null)
    .limit(1);

  if (nextErr) throw nextErr;
  const nextWorkout = (nextWorkouts ?? [])[0] as NextWorkoutRow | undefined;
  if (!nextWorkout) return null;

  // 3) Упражнения следующей тренировки (+ имя упражнения для L2 sheet)
  const { data: weRows, error: weErr } = await supabase
    .from('workout_exercises')
    .select('id, exercise_id, exercises ( name )')
    .eq('workout_id', nextWorkout.id);

  if (weErr) throw weErr;
  const exercises = (weRows ?? []) as WorkoutExerciseRow[];
  if (exercises.length === 0) return null;

  const exerciseNames: Record<string, string> = {};
  exercises.forEach((e) => {
    const name = e.exercises?.[0]?.name;
    if (e.exercise_id && name) {
      exerciseNames[e.exercise_id] = name;
    }
  });

  const exerciseIds = exercises.map((e) => e.exercise_id).filter((id): id is string => !!id);

  if (exerciseIds.length === 0) return null;

  const sinceIso = isoDaysAgo(FORECAST_WINDOW_DAYS);

  // 4+5) Параллельно: логи по exercise_id за окно И объёмы всех тренировок за окно.
  //      workout_logs join workout_exercises нужен, чтобы сопоставить
  //      log с exercise_id (в workout_logs только workout_exercise_id).
  const [logsRes, workoutVolumesRes] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('workout_exercise_id, weight, reps, workout_exercises!inner (exercise_id)')
      .in('workout_exercises.exercise_id', exerciseIds)
      .eq('is_warmup', false)
      .gte('created_at', sinceIso),
    supabase
      .from('workouts')
      .select('id, workout_logs ( weight, reps, is_warmup )')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .is('skipped_at', null)
      .gte('finished_at', sinceIso),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (workoutVolumesRes.error) throw workoutVolumesRes.error;

  const logs = (logsRes.data ?? []) as LogRow[];
  const recentWorkouts = (workoutVolumesRes.data ?? []) as RecentWorkoutVolumeRow[];

  // Группируем объёмы по exercise_id (объём одной тренировки для упражнения =
  // сумма weight × reps всех рабочих сетов этого упражнения в этой тренировке).
  // workout_exercise_id уникален per (workout, exercise), поэтому группируем по нему,
  // а потом маппим в exercise_id.
  const weIdToExerciseId = new Map<string, string>();
  const volumePerWeId = new Map<string, number>(); // we_id → volume этого упражнения в данной тренировке
  const exerciseIdSessions = new Map<string, number[]>(); // exercise_id → [volumePerTraining, ...]

  for (const log of logs) {
    const we = log.workout_exercises?.[0];
    if (!we || !we.exercise_id) continue;
    const exerciseId = we.exercise_id;
    weIdToExerciseId.set(log.workout_exercise_id, exerciseId);

    const weight = log.weight ?? 0;
    const reps = log.reps ?? 0;
    const prev = volumePerWeId.get(log.workout_exercise_id) ?? 0;
    volumePerWeId.set(log.workout_exercise_id, prev + weight * reps);
  }

  // Собираем сессии: для каждого we_id один раз добавляем его volume в массив
  // сессий exercise_id. Это корректно, т.к. workout_exercise_id уникален для
  // связки (workout, exercise) в рамках одной тренировки.
  const seenWeIds = new Set<string>();
  for (const log of logs) {
    const weId = log.workout_exercise_id;
    if (seenWeIds.has(weId)) continue;
    seenWeIds.add(weId);
    const exerciseId = weIdToExerciseId.get(weId);
    if (!exerciseId) continue;
    const volume = volumePerWeId.get(weId) ?? 0;
    const arr = exerciseIdSessions.get(exerciseId) ?? [];
    arr.push(volume);
    exerciseIdSessions.set(exerciseId, arr);
  }

  const exercisesInput: ForecastExerciseInput[] = exerciseIds.map((id) => ({
    exerciseId: id,
    recentVolumes: exerciseIdSessions.get(id) ?? [],
  }));

  // Суммарные объёмы тренировок за окно (per workout).
  const recentWorkoutVolumes: number[] = recentWorkouts.map((w) => {
    let sum = 0;
    for (const l of w.workout_logs ?? []) {
      if (l.is_warmup) continue;
      const weight = l.weight ?? 0;
      const reps = l.reps ?? 0;
      sum += weight * reps;
    }
    return sum;
  });

  const input: ForecastInput = {
    exercises: exercisesInput,
    recentWorkoutVolumes,
  };

  const result = calculateWorkoutForecast(input);
  return { ...result, exerciseNames };
}

export interface WorkoutForecastWithNames extends WorkoutForecastResult {
  exerciseNames: Record<string, string>;
}
