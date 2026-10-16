// src/hooks/workout/useWorkoutSession.mapper.ts
// Чистые функции маппинга для useWorkoutSession
import { ExerciseData, ExercisePainState, ProgressionPolicy, SetData } from '../../types/workout';
import { PainEvent } from '../../services/painService';
import { effectiveReps } from '../../utils/reps';
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
  reps_left: number | null;
  reps_right: number | null;
  rpe: number | null;
  rir: number | null;
  difficulty: string | null;
  /** ENG-13: флаг разминочного сета */
  is_warmup?: boolean;
  /** ENG-13: оценка повторов для незавершённого сета */
  is_estimated_reps?: boolean;
}
/**
 * Строит ExerciseData[] из workout_exercises + exercises + logs + referenceData.
 * PR6: painStateByExerciseId опционально — содержит per-exercise pain state.
 */
export function buildExercisesData(
  workoutExercises: SessionWERow[],
  exercisesById: Map<string, SessionExerciseRow>,
  logsByWorkoutExercise: Record<string, LogRow[]>,
  referenceData: ReferenceDataMap,
  painStateByExerciseId: Map<string, ExercisePainState> = new Map()
): ExerciseData[] {
  // ADD-BELOW (16.10): порядок экрана = order_index строк workout_exercises.
  // Сортировка стабильная, поэтому пока у всех строк order_index null (старые
  // тренировки), ничего не меняется: остаётся прежний порядок отдачи Postgres.
  // Равные order_index (перестановка в программе: синхронизация обновляла
  // position, но не order_index) дописываем по position, иначе их порядок
  // зависит от того, в каком порядке строки вернул Postgres.
  const ordered = [...workoutExercises].sort((a, b) => {
    const ai = a.order_index ?? Number.MAX_SAFE_INTEGER;
    const bi = b.order_index ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    const ap = a.position ?? Number.MAX_SAFE_INTEGER;
    const bp = b.position ?? Number.MAX_SAFE_INTEGER;
    if (ap !== bp) return ap - bp;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return ordered
    .map((we): ExerciseData | null => {
      const exercise = exercisesById.get(we.exercise_id);
      if (!exercise) {
        console.warn('[useWorkoutSession] Exercise not found:', we.exercise_id);
        return null;
      }

      const targetSets = we.target_sets ?? 3;
      const sets: SetData[] = [];
      for (let i = 0; i < targetSets; i++) {
        // reps_left/right инициализируются пустыми строками: без ключей
        // isSetCompleted (set.reps_left !== '') считает пустой сет завершённым
        sets.push({ weight: '', reps: '', reps_left: '', reps_right: '' });
      }

      const savedLogs = logsByWorkoutExercise[we.id] || [];
      savedLogs.forEach((log) => {
        const index = log.set_number - 1;
        if (index >= 0 && index < targetSets) {
          sets[index] = {
            ...sets[index],
            weight: log.weight_kg != null ? String(log.weight_kg) : '',
            reps: log.reps != null ? String(log.reps) : '',
            reps_left: log.reps_left != null ? String(log.reps_left) : '',
            reps_right: log.reps_right != null ? String(log.reps_right) : '',
            rpe: log.rpe ?? null,
            rir: log.rir ?? null,
            difficulty: (log.difficulty as SetData['difficulty']) ?? null,
            // ENG-13: warmup + estimated reps
            isWarmup: log.is_warmup ?? false,
            estimatedReps: log.is_estimated_reps && typeof log.reps === 'number' ? log.reps : null,
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
        target_rpe: we.target_rpe,
        // FD-4: политика доехала до движка (была всегда undefined → linear)
        progression_policy: (we.progression_policy as ProgressionPolicy | null) ?? 'linear',
        // PR6: pain state из pain_events для этого упражнения (если есть)
        painState: painStateByExerciseId.get(exercise.id) ?? null,
      };
    })
    .filter((exercise): exercise is ExerciseData => exercise !== null);
}

/**
 * Строит Map предыдущих логов по exercise_id → set_number
 * FEAT-1.1 v2: данные из последней завершённой тренировки
 */
export function buildPrevLogsByExerciseId(
  recentLogs: RecentLog[]
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
      // VF-2: effectiveReps (reps ?? reps_left+reps_right) — previous для unilateral
      const eff = effectiveReps(log);
      bySet.set(log.set_number, {
        weight_kg: log.weight_kg,
        reps: eff > 0 ? eff : null,
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
  prevLogsByExerciseId: Map<
    string,
    Map<number, { weight_kg: number | null; reps: number | null; rpe: number | null }>
  >
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
/**
 * PR6: строит Map exercise_id → ExercisePainState из PainEvent[].
 * Берёт первый (самый свежий) event для каждого exercise_id —
 * getPainEventsForWorkout сортирует по occurred_at DESC,
 * поэтому первый найденный для exercise_id = актуальный.
 */
export function buildPainStateMap(painEvents: PainEvent[]): Map<string, ExercisePainState> {
  const map = new Map<string, ExercisePainState>();
  for (const event of painEvents) {
    if (!event.exercise_id) continue;
    if (map.has(event.exercise_id)) continue; // берём первый (самый свежий)
    map.set(event.exercise_id, {
      painLevel: event.pain_level,
      painType: event.pain_type,
      bodyPart: event.body_part,
      stopExercise: event.stop_exercise,
      notes: event.notes,
    });
  }
  return map;
}
