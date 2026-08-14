// src/hooks/workout/useWorkoutSession.loader.ts
// Функции загрузки данных для useWorkoutSession (чистые, тестируемые)
import { supabase } from '../../lib/supabase';
import { AlternativeExercise } from '../../types/workout';
import { getExerciseReferenceData } from '../../services/exerciseReferenceService';
import {
  SessionWorkoutRow,
  SessionExerciseRow,
  SessionWERow,
  RecentLog,
} from './useWorkoutSession.types';

export interface WorkoutSessionData {
  workoutRow: SessionWorkoutRow;
  exerciseRows: SessionExerciseRow[];
  logsByWorkoutExercise: Record<
    string,
    Array<{
      set_number: number;
      weight_kg: number | null;
      reps: number | null;
      rpe: number | null;
      rir: number | null;
      difficulty: string | null;
    }>
  >;
  recentLogs: RecentLog[];
  referenceData: Record<
    string,
    { equipment: string[]; injuries: string[]; alternativeIds: string[] }
  >;
}

/**
 * Загружает все данные для workout session параллельно.
 * Возвращает сырые данные для маппинга в orchestrator.
 */
export async function fetchWorkoutSession(workoutId: string): Promise<WorkoutSessionData> {
  // 1. Загружаем workout и workout_exercises
  const { data: workout, error } = await supabase
    .from('workouts')
    .select(
      `name, program_id, started_at, finished_at, duration_seconds, workout_exercises ( id, exercise_id, target_sets, rest_seconds, intensity, target_reps_range )`,
    )
    .eq('id', workoutId)
    .single();

  if (error) throw error;

  const workoutRow = workout as unknown as SessionWorkoutRow;
  const workoutExercises = workoutRow.workout_exercises || [];
  const workoutExerciseIds = workoutExercises.map((we) => we.id);
  const exerciseIds = workoutExercises
    .map((we) => we.exercise_id)
    .filter((id): id is string => !!id);

  // 2. Загружаем exercises
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('exercises')
    .select(
      `id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url`,
    )
    .in('id', exerciseIds);

  if (exerciseError) throw exerciseError;

  // 3. ПАРАЛЛЕЛЬНО грузим logs + recentLogs + referenceData
  const referenceDataPromise = getExerciseReferenceData(exerciseIds);

  const [logsRes, recentLogsRes, referenceData] = await Promise.all([
    workoutExerciseIds.length > 0
      ? supabase
          .from('workout_logs')
          .select('workout_exercise_id, set_number, weight_kg, reps, rpe, rir, difficulty')
          .in('workout_exercise_id', workoutExerciseIds)
      : Promise.resolve({ data: null, error: null }),
    exerciseIds.length > 0
      ? supabase
          .from('workout_logs')
          .select('weight_kg, reps, rpe, set_number, workout_exercises(exercise_id)')
          .in('workout_exercises.exercise_id', exerciseIds)
          .neq('workout_exercises.workout_id', workoutId)
          .order('created_at', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: null, error: null }),
    referenceDataPromise,
  ]);

  // 4. Группируем logs по workout_exercise_id
  const logsByWorkoutExercise: WorkoutSessionData['logsByWorkoutExercise'] = {};
  logsRes.data?.forEach((log) => {
    if (!logsByWorkoutExercise[log.workout_exercise_id]) {
      logsByWorkoutExercise[log.workout_exercise_id] = [];
    }
    logsByWorkoutExercise[log.workout_exercise_id].push(log);
  });

  return {
    workoutRow,
    exerciseRows: (exerciseRows ?? []) as SessionExerciseRow[],
    logsByWorkoutExercise,
    recentLogs: (recentLogsRes.data ?? []) as RecentLog[],
    referenceData,
  };
}

/**
 * Загружает альтернативы для упражнения.
 * Возвращает AlternativeExercise[] в порядке из exercise_relationships.
 */
export async function fetchAlternatives(exerciseId: string): Promise<AlternativeExercise[]> {
  // 1. Получаем связи альтернатив из нормализованной таблицы
  const { data: relationships, error: relationshipsError } = await supabase
    .from('exercise_relationships')
    .select('related_exercise_id, relation_type, status')
    .eq('exercise_id', exerciseId)
    .in('status', ['approved', 'suggested'])
    .order('status', { ascending: true }) // approved < suggested по алфавиту
    .order('confidence', { ascending: false });

  if (relationshipsError) throw relationshipsError;

  const alternativeIds = [
    ...new Set(
      (relationships ?? [])
        .map((row) => row.related_exercise_id)
        .filter((id): id is string => !!id && id !== exerciseId),
    ),
  ];

  if (alternativeIds.length === 0) return [];

  // 2. Загружаем собственные данные упражнений
  const { data: exercisesData, error: exercisesError } = await supabase
    .from('exercises')
    .select(
      'id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url',
    )
    .in('id', alternativeIds);

  if (exercisesError) throw exercisesError;

  // 3. Получаем normalized reference data
  const referenceData = await getExerciseReferenceData(alternativeIds);

  // 4. Сохраняем порядок из exercise_relationships
  const exercisesById = new Map(
    (exercisesData ?? []).map((exercise) => [exercise.id, exercise]),
  );

  const alternatives: AlternativeExercise[] = alternativeIds
    .map((id) => {
      const ex = exercisesById.get(id);
      if (!ex) return null;
      const refs = referenceData[id] ?? {
        equipment: [],
        injuries: [],
        alternativeIds: [],
      };
      return {
        id: ex.id,
        name: ex.name,
        primary_muscles: ex.primary_muscles || [],
        secondary_muscles: ex.secondary_muscles || [],
        technique: ex.technique || '',
        equipment: refs.equipment,
        settings: ex.settings || '',
        benefits: ex.benefits || '',
        risks: ex.risks || '',
        injuries: refs.injuries,
        media_url: ex.media_url ?? null,
      };
    })
    .filter((exercise): exercise is AlternativeExercise => exercise !== null);

  return alternatives;
}