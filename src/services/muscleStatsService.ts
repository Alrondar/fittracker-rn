// src/services/muscleStatsService.ts
//
// Публичный сервис: агрегация логов тренировок по мышцам за всю историю.
// Единственная точка доступа к Supabase для вкладки «Мышцы» в Progress hub.
// (CLAUDE.md §2: supabase.* только в services.)
//
// Возвращает плоский массив MuscleStatsRow — по одной строке на упражнение
// в каждой завершённой тренировке. Клиентский хук (useMuscleStats) агрегирует
// данные по периодам (7/30/90/всё) и slug'ам локально — ноль дополнительных запросов.
//
// Blast-radius: новый export в services; consumers — useMuscleStats → MuscleStatsSection.

import { supabase, fetchAllPages } from '../lib/supabase';
import { calculateE1rm } from '../utils/e1rm';
import { effectiveReps } from '../utils/reps';

export type MuscleStatsRow = {
  workoutId: string;
  /** Эффективная дата тренировки: finished_at ?? started_at ?? created_at (CLAUDE.md §4). */
  date: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Сумма рабочих сетов (is_warmup=false, weight>0, reps>0). */
  sets: number;
  /** Тоннаж упражнения: Σ(weight × reps). */
  volumeKg: number;
  /** Взвешенный объём с учётом RPE — используется для интенсивности раскраски. */
  loadScore: number;
  /** Лучший e1RM по сетам этого упражнения в этой тренировке. */
  bestE1rm: number;
};

interface LogRow {
  weight_kg: number | null;
  reps: number | null;
  reps_left?: number | null;
  reps_right?: number | null;
  rpe: number | null;
  is_warmup?: boolean;
}
interface ExerciseRow {
  id: string;
  exercise_id: string;
  exercises: {
    name: string;
    primary_muscles: string[] | null;
    secondary_muscles: string[] | null;
  } | null;
  workout_logs: LogRow[] | null;
}
interface WorkoutRow {
  id: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  skipped_at?: string | null;
  workout_exercises: ExerciseRow[] | null;
}

/** Дефолт для подходов без RPE (типичный рабочий сет — RPE 7). */
const DEFAULT_RPE_FACTOR = 0.7;

function effectiveDate(w: WorkoutRow): string {
  return w.finished_at ?? w.started_at ?? w.created_at;
}

/**
 * Возвращает все MuscleStatsRow для пользователя за всю историю.
 * Пропущенные тренировки (без finished_at и без логов) исключаются
 * консистентно с FIT-7 / historyService.
 */
export async function getMuscleStats(userId: string): Promise<MuscleStatsRow[]> {
  // FD-6: пагинация по всей истории (лимит PostgREST 1000 строк), порядок по `id`.
  const { data, error } = await fetchAllPages<WorkoutRow>((from, to) =>
    supabase
      .from('workouts')
      .select(
        `id, created_at, started_at, finished_at, skipped_at,
         workout_exercises (
           id,
           exercise_id,
           exercises ( name, primary_muscles, secondary_muscles ),
           workout_logs ( weight_kg, reps, reps_left, reps_right, rpe, is_warmup )
         )`
      )
      .eq('user_id', userId)
      .order('id')
      .range(from, to)
  );

  if (error) throw error;

  const rows = data;
  const result: MuscleStatsRow[] = [];

  for (const w of rows) {
    const date = effectiveDate(w);
    const exercises = w.workout_exercises ?? [];
    // Исключаем «пропущенные» тренировки (FIT-7): skipped_at, либо нет finished_at и ни одного лога.
    const hasLogs = exercises.some((ex) => (ex.workout_logs?.length ?? 0) > 0);
    if (w.skipped_at != null) continue;
    if (!w.finished_at && !hasLogs) continue;

    for (const ex of exercises) {
      const logs = ex.workout_logs ?? [];
      let sets = 0;
      let volumeKg = 0;
      let loadScore = 0;
      let bestE1rm = 0;

      for (const log of logs) {
        if (log.is_warmup) continue;
        const wgt = log.weight_kg ?? 0;
        const rps = effectiveReps(log);
        if (wgt <= 0 || rps <= 0) continue;

        const vol = wgt * rps;
        const rpeFactor = log.rpe != null ? log.rpe / 10 : DEFAULT_RPE_FACTOR;
        sets += 1;
        volumeKg += vol;
        loadScore += vol * rpeFactor;

        const e = calculateE1rm(wgt, rps);
        if (e > bestE1rm) bestE1rm = e;
      }

      if (sets === 0) continue;

      result.push({
        workoutId: w.id,
        date,
        exerciseId: ex.exercise_id,
        exerciseName: ex.exercises?.name ?? 'Упражнение',
        primaryMuscles: ex.exercises?.primary_muscles ?? [],
        secondaryMuscles: ex.exercises?.secondary_muscles ?? [],
        sets,
        volumeKg,
        loadScore,
        bestE1rm,
      });
    }
  }

  return result;
}
