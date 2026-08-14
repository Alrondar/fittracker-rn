// src/hooks/workout/useWorkoutSession.mapper.ts
// Чистые функции маппинга для useWorkoutSession
import { ExerciseData, SetData } from '../../types/workout';
import { SessionWERow, SessionExerciseRow, RecentLog } from './useWorkoutSession.types';

interface ReferenceDataMap {
  [exerciseId: string]: {
    equipment: string[];
    injuries: string[];
    alternativeIds: string[];
  };
}

interface LogRow {
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  difficulty: string | null;
}

/**
 * Строит ExerciseData[] из workout_exercises + exercises + logs + referenceData
 */
export function buildExercisesData(
  workoutExercises: SessionWERow[],
  exercisesById: Map<string, SessionExerciseRow>,
  logsByWorkoutExercise: Record<string, LogRow[]>,
  referenceData: ReferenceDataMap,
): ExerciseData[] {
  return workoutExercises
    .map((we): ExerciseData | null => {
      const exercise = exercisesById.get(we.exercise_id);
      if (!exercise) {
        console.warn('[useWorkoutSession] Exercise not found:', we.exercise_id);
        return null;
      }

      const targetSets = we.target_sets ?? 3;
      const sets: SetData[] = [];
      for (let i = 0; i < targetSets; i++) {
        sets.push({ weight: '', reps: '' });
      }

      const savedLogs = logsByWorkoutExercise[we.id] || [];
      savedLogs.forEach((log) => {
        const index = log.set_number - 1;
        if (index >= 0 && index < targetSets) {
          sets[index] = {
            ...sets[index],
            weight: log.weight_kg != null ? String(log.weight_kg) : '',
            reps: log.reps != null ? String(log.reps) : '',
            rpe: log.rpe ?? null,
            rir: log.rir ?? null,
            difficulty: (log.difficulty as SetData['difficulty']) ?? null,
          };
        }
      });

      const refs = referenceData[exercise.id] ?? {
        equipment: [],
        injuries: [],
        alternativeIds: [],
      };

      return {
        workout_exercise_id: we.id,
        id: exercise.id,
        name: exercise.name,
        primary_muscles: exercise.primary_muscles || [],
        secondary_muscles: exercise.secondary_muscles || [],
        technique: exercise.technique || '',
        equipment: refs.equipment,
        settings: exercise.settings || '',
        benefits: exercise.benefits || '',
        risks: exercise.risks || '',
        injuries: refs.injuries,
        alternatives: refs.alternativeIds,
        media_url: exercise.media_url ?? null,
        target_sets: targetSets,
        rest_seconds: we.rest_seconds ?? 90,
        intensity: we.intensity || 'medium',
        sets,
        reps_range: we.target_reps_range || undefined,
      };
    })
    .filter((exercise): exercise is ExerciseData => exercise !== null);
}

/**
 * Строит Map предыдущих логов по exercise_id → set_number
 * FEAT-1.1 v2: данные из последней завершённой тренировки
 */
export function buildPrevLogsByExerciseId(
  recentLogs: RecentLog[],
): Map<string, Map<number, { weight_kg: number | null; reps: number | null; rpe: number | null }>> {
  const prevLogsByExerciseId = new Map<
    string,
    Map<number, { weight_kg: number | null; reps: number | null; rpe: number | null }>
  >();

  recentLogs.forEach((log) => {
    const we = log.workout_exercises;
    const exId = Array.isArray(we) ? we[0]?.exercise_id : we?.exercise_id;
    if (!exId || log.set_number == null) return;

    if (!prevLogsByExerciseId.has(exId)) {
      prevLogsByExerciseId.set(exId, new Map());
    }
    const bySet = prevLogsByExerciseId.get(exId)!;

    // запрос отсортирован по created_at DESC → первый лог для (exercise, set_number)
    // = данные из последней завершённой тренировки
    if (!bySet.has(log.set_number)) {
      bySet.set(log.set_number, {
        weight_kg: log.weight_kg,
        reps: log.reps,
        rpe: log.rpe,
      });
    }
  });

  return prevLogsByExerciseId;
}

/**
 * Внедряет previous* в каждый сет по его номеру
 */
export function injectPreviousData(
  exercisesData: ExerciseData[],
  prevLogsByExerciseId: Map<string, Map<number, { weight_kg: number | null; reps: number | null; rpe: number | null }>>,
): ExerciseData[] {
  return exercisesData.map((ex) => {
    const bySet = prevLogsByExerciseId.get(ex.id);
    return {
      ...ex,
      sets: ex.sets.map((set, i) => {
        const prev = bySet?.get(i + 1);
        return {
          ...set,
          previousWeight: prev?.weight_kg ?? null,
          previousReps: prev?.reps ?? null,
          previousRpe: prev?.rpe ?? null,
        };
      }),
    };
  });
}