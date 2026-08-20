// src/hooks/workout/useWorkoutSession.loader.ts
// Функции загрузки данных для useWorkoutSession (чистые, тестируемые)
import { supabase } from '../../lib/supabase';
import { AlternativeExercise } from '../../types/workout';
import { getExerciseReferenceData } from '../../services/exerciseReferenceService';
import { getExerciseContraindications } from '../../services/injuriesService';
import { painService, PainEvent } from '../../services/painService';
import { UserInjury, targetsInjuredMuscle } from '../../constants/injuries';
import {
  rankAlternatives,
  AlternativeCandidate,
  AlternativeSourceInput,
  AlternativeSourceContext,
  ExerciseDifficulty,
  RelationType,
} from '../../engine/alternatives';
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
  // PR6: pain events для prefill PainSheet и visual affordance «Боль отмечена»
  painEvents: PainEvent[];
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

  // 3. ПАРАЛЛЕЛЬНО грузим logs + recentLogs + referenceData + pain events (PR6)
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
// ENG-5: ALTERNATIVES WITH RANKING
// ============================================================================

/** ENG-5: результат загрузки альтернатив + число скрытых травмами. */
export interface FetchAlternativesResult {
  alternatives: AlternativeExercise[];
  excludedCount: number;
}

/**
 * Загружает альтернативы для упражнения и ранжирует детерминированно (ENG-5).
 * Порядок: score desc; при равенстве — исходный порядок exercise_relationships
 * (approved > suggested > confidence). Исключения по травмам — два уровня,
 * зеркалят warmupService (ARCH-8).
 *
 * @param exerciseId - ID исходного упражнения
 * @param source - контекст источника для ранжирования
 * @param activeInjuries - активные травмы пользователя
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

  if (alternativeIds.length === 0) return { alternatives: [], excludedCount: 0 };

  // ENG-5: тип связи по кандидату. Запрос уже отсортирован (status, confidence) —
  // при дублях берём первую (наилучшую) связь. null = тип не указан (честный пропуск).
  const relationTypeMap = new Map<string, RelationType | null>();
  for (const row of relationships ?? []) {
    const id = row.related_exercise_id as string;
    if (!relationTypeMap.has(id)) {
      relationTypeMap.set(id, (row.relation_type ?? null) as RelationType | null);
    }
  }

  // 2. Загружаем данные упражнений + исходное упражнение:
  //    movement_pattern/difficulty нужны для ранжирования ENG-5 (один запрос).
  const allIds = [...alternativeIds, exerciseId];
  const { data: exercisesData, error: exercisesError } = await supabase
    .from('exercises')
    .select(
      'id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url, movement_pattern, difficulty',
    )
    .in('id', allIds);

  if (exercisesError) throw exercisesError;

  // 3. Получаем normalized reference data (equipment, injuries, alternativeIds)
  const referenceData = await getExerciseReferenceData(alternativeIds);

  const exercisesById = new Map(
    (exercisesData ?? []).map((exercise) => [exercise.id, exercise]),
  );

  // 4. ENG-5: контекст источника (pattern/difficulty из того же запроса)
  const sourceRow = exercisesById.get(exerciseId);
  const sourceContext: AlternativeSourceContext = {
    ...source,
    movementPattern: sourceRow?.movement_pattern ?? null,
    difficulty: (sourceRow?.difficulty ?? null) as ExerciseDifficulty | null,
  };

  // 5. ENG-5: кандидаты для ранжирования
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

  // 6. ENG-5: противопоказания — только при активных травмах (паттерн warmupService)
  const contraindications =
    activeInjuries.length > 0 ? await getExerciseContraindications(alternativeIds) : {};

  // 7. ENG-5: ранжирование (чистая функция engine)
  const ranking = rankAlternatives(candidates, sourceContext, activeInjuries, contraindications);

  // 8. Маппинг в ранжированном порядке (только не исключённые)
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