import { supabase } from '../lib/supabase';
import { AlternativeExercise } from '../types/workout';
import { getExerciseReferenceData } from './exerciseReferenceService';
import { getExerciseContraindications } from './injuriesService';
import { painService, PainEvent } from './painService';
import { UserInjury } from '../constants/injuries';
import {
  rankAlternatives,
  AlternativeCandidate,
  AlternativeSourceInput,
  AlternativeSourceContext,
  ExerciseDifficulty,
  RelationType,
} from '../engine/alternatives';
import type {
  SessionWorkoutRow,
  SessionExerciseRow,
  RecentLog,
} from '../hooks/workout/useWorkoutSession.types';

interface ProgramDayRow {
  id: string;
  name: string;
}

function parseTargetReps(repsRange: string | null): number | null {
  if (!repsRange) return null;
  const match = repsRange.match(/\d+/);
  if (!match) return null;
  const value = parseInt(match[0], 10);
  return Number.isNaN(value) ? null : value;
}

export async function startProgramWorkout(
  userId: string,
  programId: string
): Promise<string> {
  const { data: userProgram, error: userProgramError } = await supabase
    .from('user_programs')
    .select('id, current_phase, current_week, current_day, started_at')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (userProgramError) throw userProgramError;
  if (!userProgram) throw new Error('Активная программа не найдена');

  const phaseNumber = userProgram.current_phase ?? 1;
  const weekNumber = userProgram.current_week ?? 1;
  const dayNumber = userProgram.current_day ?? 1;

  // Идемпотентность: если незавершённая тренировка дня уже есть — возвращаем её
  const { data: existingWorkout, error: existingWorkoutError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('phase_number', phaseNumber)
    .eq('week_number', weekNumber)
    .eq('day_index', dayNumber)
    .is('finished_at', null)
    .limit(1)
    .maybeSingle();

  if (existingWorkoutError) throw existingWorkoutError;
  if (existingWorkout) return existingWorkout.id;

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('name')
    .eq('id', programId)
    .maybeSingle();

  if (programError) throw programError;

  const { data: phase, error: phaseError } = await supabase
    .from('program_phases')
    .select('id, name')
    .eq('program_id', programId)
    .eq('phase_number', phaseNumber)
    .limit(1)
    .maybeSingle();

  if (phaseError) throw phaseError;

  // Поиск дня: точный (фаза+неделя+день) → шаблон недели 1 → день программы → fallback по day_number
  let day: ProgramDayRow | null = null;

  if (phase) {
    const { data: exactDay, error: exactDayError } = await supabase
      .from('program_days')
      .select('id, name')
      .eq('phase_id', phase.id)
      .eq('week_number', weekNumber)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();

    if (exactDayError) throw exactDayError;
    day = exactDay;

    if (!day) {
      const { data: templateDay, error: templateDayError } = await supabase
        .from('program_days')
        .select('id, name')
        .eq('phase_id', phase.id)
        .eq('week_number', 1)
        .eq('day_number', dayNumber)
        .limit(1)
        .maybeSingle();

      if (templateDayError) throw templateDayError;
      day = templateDay;
    }
  }

  if (!day) {
    const { data: programDay, error: programDayError } = await supabase
      .from('program_days')
      .select('id, name')
      .eq('program_id', programId)
      .eq('week_number', weekNumber)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();

    if (programDayError) throw programDayError;
    day = programDay;
  }

  if (!day) {
    const { data: fallbackDay, error: fallbackDayError } = await supabase
      .from('program_days')
      .select('id, name')
      .eq('program_id', programId)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();

    if (fallbackDayError) throw fallbackDayError;
    day = fallbackDay;
  }

  if (!day) throw new Error('Тренировочный день не найден');

  const { data: programExercises, error: programExercisesError } = await supabase
    .from('program_exercises')
    .select('exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position')
    .eq('program_day_id', day.id)
    .order('position', { ascending: true });

  if (programExercisesError) throw programExercisesError;

  const validExercises = (programExercises || []).filter((ex) => !!ex.exercise_id);
  if (validExercises.length === 0) throw new Error('В этом дне программы нет упражнений');

  const workoutName = day.name || `${program?.name || 'Тренировка'} — День ${dayNumber}`;

  // ✅ Сначала создаём тренировку и получаем реальный id — никакого плейсхолдера ''
const { data: newWorkout, error: insertWorkoutError } = await supabase
  .from('workouts')
  .insert({
    user_id: userId,
    program_id: programId,
    name: workoutName,
    phase_number: phaseNumber,
    week_number: weekNumber,
    day_index: dayNumber,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
  })
  .select('id')
  .single();

  if (insertWorkoutError) throw insertWorkoutError;

  // ✅ Формируем упражнения уже с реальным workout_id
  const exercisesToInsert = validExercises.map((exercise, index) => {
    const targetSets = exercise.sets ?? 3;
    return {
      workout_id: newWorkout.id,
      exercise_id: exercise.exercise_id,
      order_index: exercise.position ?? index,
      position: exercise.position ?? index,
      target_sets: targetSets,
      sets: targetSets,
      target_reps: parseTargetReps(exercise.reps_range),
      target_reps_range: exercise.reps_range,
      rest_seconds: exercise.rest_seconds ?? 90,
      intensity: exercise.intensity ?? 'medium',
    };
  });

  const { error: insertExercisesError } = await supabase
    .from('workout_exercises')
    .insert(exercisesToInsert);

  if (insertExercisesError) throw insertExercisesError;

  if (!userProgram.started_at) {
    await supabase
      .from('user_programs')
      .update({ started_at: new Date().toISOString() })
      .eq('id', userProgram.id);
  }

  return newWorkout.id;
}

export async function repeatWorkout(
  userId: string,
  sourceWorkoutId: string
): Promise<string> {
  // ✅ Копируем также description (раньше терялся)
  const { data: sourceWorkout, error: sourceWorkoutError } = await supabase
    .from('workouts')
    .select(
      `id, name, description, program_id, phase_number, week_number, day_index,
       workout_exercises ( exercise_id, order_index, position, target_sets, sets, target_reps, target_reps_range, rest_seconds, intensity )`
    )
    .eq('id', sourceWorkoutId)
    .single();

  if (sourceWorkoutError) throw sourceWorkoutError;

const { data: newWorkout, error: insertWorkoutError } = await supabase
  .from('workouts')
  .insert({
    user_id: userId,
    name: sourceWorkout.name,
    description: sourceWorkout.description,
    program_id: null,
    phase_number: null,
    week_number: null,
    day_index: null,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
  })
  .select('id')
  .single();

  if (insertWorkoutError) throw insertWorkoutError;

  const exercisesToInsert = (sourceWorkout.workout_exercises || []).map(
    (exercise: any, index: number) => {
      const targetSets = exercise.target_sets ?? exercise.sets ?? 3;
      return {
        workout_id: newWorkout.id,
        exercise_id: exercise.exercise_id,
        order_index: exercise.order_index ?? index,
        position: exercise.position ?? index,
        target_sets: targetSets,
        sets: targetSets,
        target_reps: exercise.target_reps,
        target_reps_range: exercise.target_reps_range,
        rest_seconds: exercise.rest_seconds ?? 90,
        intensity: exercise.intensity ?? 'medium',
      };
    }
  );

  if (exercisesToInsert.length > 0) {
    const { error: insertExercisesError } = await supabase
      .from('workout_exercises')
      .insert(exercisesToInsert);

    if (insertExercisesError) throw insertExercisesError;
  }

  return newWorkout.id;
}

// ============================================================================
// WORKOUT SESSION DATA (перенесено из useWorkoutSession.loader.ts)
// ============================================================================

export interface WorkoutSessionData {
  workoutRow: SessionWorkoutRow;
  exerciseRows: SessionExerciseRow[];
  logsByWorkoutExercise: Record<
    string,
    {
      set_number: number;
      weight_kg: number | null;
      reps: number | null;
      rpe: number | null;
      rir: number | null;
      difficulty: string | null;
    }[]
  >;
  recentLogs: RecentLog[];
  referenceData: Record<
    string,
    { equipment: string[]; injuries: string[]; alternativeIds: string[] }
  >;
  painEvents: PainEvent[];
}

/**
 * Загружает все данные для workout session параллельно.
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

  // 3. ПАРАЛЛЕЛЬНО грузим logs + recentLogs + referenceData + pain events
  const referenceDataPromise = getExerciseReferenceData(exerciseIds);
  const painEventsPromise = painService.getPainEventsForWorkout(workoutId);

  const [logsRes, recentLogsRes, referenceData, painEvents] = await Promise.all([
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
    painEventsPromise,
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
    painEvents,
  };
}

// ============================================================================
// ALTERNATIVES (ENG-5 ranking, перенесено из useWorkoutSession.loader.ts)
// ============================================================================

export interface FetchAlternativesResult {
  alternatives: AlternativeExercise[];
  excludedCount: number;
}

/**
 * Загружает альтернативы для упражнения и ранжирует детерминированно (ENG-5).
 */
export async function fetchAlternatives(
  exerciseId: string,
  source: AlternativeSourceInput,
  activeInjuries: UserInjury[],
): Promise<FetchAlternativesResult> {
  // 1. Получаем связи альтернатив из нормализованной таблицы
  const { data: relationships, error: relationshipsError } = await supabase
    .from('exercise_relationships')
    .select('related_exercise_id, relation_type, status')
    .eq('exercise_id', exerciseId)
    .in('status', ['approved', 'suggested'])
    .order('status', { ascending: true })
    .order('confidence', { ascending: false });

  if (relationshipsError) throw relationshipsError;

  const alternativeIds = [
    ...new Set(
      (relationships ?? [])
        .map((row) => row.related_exercise_id)
        .filter((id): id is string => !!id && id !== exerciseId),
    ),
  ];

  if (alternativeIds.length === 0) return { alternatives: [], excludedCount: 0 };

  const relationTypeMap = new Map<string, RelationType | null>();
  for (const row of relationships ?? []) {
    const id = row.related_exercise_id as string;
    if (!relationTypeMap.has(id)) {
      relationTypeMap.set(id, (row.relation_type ?? null) as RelationType | null);
    }
  }

  // 2. Загружаем данные упражнений + исходное упражнение
  const allIds = [...alternativeIds, exerciseId];
  const { data: exercisesData, error: exercisesError } = await supabase
    .from('exercises')
    .select(
      'id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url, movement_pattern, difficulty',
    )
    .in('id', allIds);

  if (exercisesError) throw exercisesError;

  const referenceData = await getExerciseReferenceData(alternativeIds);

  const exercisesById = new Map(
    (exercisesData ?? []).map((exercise) => [exercise.id, exercise]),
  );

  const sourceRow = exercisesById.get(exerciseId);
  const sourceContext: AlternativeSourceContext = {
    ...source,
    movementPattern: sourceRow?.movement_pattern ?? null,
    difficulty: (sourceRow?.difficulty ?? null) as ExerciseDifficulty | null,
  };

  const candidates: AlternativeCandidate[] = alternativeIds
    .map((id) => {
      const ex = exercisesById.get(id);
      if (!ex) return null;
      const refs = referenceData[id] ?? { equipment: [], injuries: [], alternativeIds: [] };
      return {
        id: ex.id,
        primary_muscles: ex.primary_muscles || [],
        secondary_muscles: ex.secondary_muscles || [],
        equipment: refs.equipment,
        movement_pattern: ex.movement_pattern ?? null,
        difficulty: (ex.difficulty ?? null) as ExerciseDifficulty | null,
        relationType: relationTypeMap.get(ex.id) ?? null,
      };
    })
    .filter((c): c is AlternativeCandidate => c !== null);

  const contraindications =
    activeInjuries.length > 0 ? await getExerciseContraindications(alternativeIds) : {};

  const ranking = rankAlternatives(candidates, sourceContext, activeInjuries, contraindications);

  const alternatives: AlternativeExercise[] = ranking.ordered
    .map((ranked): AlternativeExercise | null => {
      const ex = exercisesById.get(ranked.id);
      if (!ex) return null;
      const refs = referenceData[ranked.id] ?? {
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
        relation_type: relationTypeMap.get(ex.id) ?? null,
      };
    })
    .filter((exercise): exercise is AlternativeExercise => exercise !== null);

  return { alternatives, excludedCount: ranking.excludedCount };
}

// ============================================================================
// WORKOUT UPDATES (перенесено из useWorkoutSession.ts)
// ============================================================================

/**
 * Обновляет поля тренировки (started_at, finished_at, duration_seconds).
 */
export async function updateWorkout(
  workoutId: string,
  updates: {
    started_at?: string;
    finished_at?: string;
    duration_seconds?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId);

  if (error) throw error;
}

/**
 * Upsert workout logs через RPC.
 */
export async function upsertWorkoutLogs(
  workoutExerciseId: string,
  logs: Array<{
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    completed_at: string;
    rpe: number | null;
    rir: number | null;
    difficulty: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.rpc('upsert_workout_logs', {
    p_workout_exercise_id: workoutExerciseId,
    p_logs: logs,
  });

  if (error) throw error;
}