import { supabase } from '../lib/supabase';
import { networkOrSnapshot } from '../lib/exerciseSnapshot';
import { networkOrProgram } from '../lib/programSnapshot';
import { toSessionFields } from '../utils/exerciseSearchLocal';
import { workoutTypeFromPhaseType } from '../utils/workoutType';
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

export async function startProgramWorkout(userId: string, programId: string): Promise<string> {
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
    .select('id, name, phase_type')
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
    .select(
      'exercise_id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe, progression_policy'
    )
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
      workout_type: workoutTypeFromPhaseType(phase?.phase_type),
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
      // В шаблоне программы exercise_id допустимо пустой, в снимке занятия — нет.
      // Пустых строк в program_exercises на 28.10 нет (0 из 2066); если появится —
      // запись отвалится на сервере, а не молча создаст пустой слот.
      exercise_id: exercise.exercise_id as string,
      order_index: exercise.position ?? index,
      position: exercise.position ?? index,
      target_sets: targetSets,
      sets: targetSets,
      target_reps: parseTargetReps(exercise.reps_range),
      target_reps_range: exercise.reps_range,
      rest_seconds: exercise.rest_seconds ?? 90,
      intensity: exercise.intensity ?? 'medium',
      target_rpe: exercise.target_rpe,
      // FD-4: копируем политику прогрессии из шаблона — иначе движок на тренировке
      // всегда живёт по 'linear' (миграция 20260925161000)
      progression_policy: exercise.progression_policy ?? 'linear',
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

export async function repeatWorkout(userId: string, sourceWorkoutId: string): Promise<string> {
  // ✅ Копируем также description (раньше терялся)
  const { data: sourceWorkout, error: sourceWorkoutError } = await supabase
    .from('workouts')
    .select(
      `id, name, description, program_id, phase_number, week_number, day_index, workout_type,
       workout_exercises ( exercise_id, order_index, position, target_sets, sets, target_reps, target_reps_range, rest_seconds, intensity, target_rpe, progression_policy )`
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
      // Повтор не меняет содержание занятия, поэтому тип берём за источником.
      // У исторических строк типа нет — они становятся смешанными.
      workout_type: sourceWorkout.workout_type ?? 'mixed',
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
        target_rpe: exercise.target_rpe,
        progression_policy: exercise.progression_policy ?? 'linear', // FD-4
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
      reps_left: number | null;
      reps_right: number | null;
      rpe: number | null;
      rir: number | null;
      difficulty: string | null;
      /** ENG-13: флаг разминочного сета */
      is_warmup?: boolean;
      /** ENG-13: оценка повторов для незавершённого сета */
      is_estimated_reps?: boolean;
      /**
       * CONN-1 (27.10): метка записи. Нужна правилу журнала: серверная строка
       * свежее копии на устройстве — копия выбрасывается, иначе досланный
       * подход перезаписал бы то, что уже сохранено.
       */
      completed_at?: string | null;
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
export async function fetchWorkoutSession(
  workoutId: string,
  userId?: string | null
): Promise<WorkoutSessionData> {
  // 1. Загружаем workout и workout_exercises. При отказе сети — из снимка активной
  // программы: это те же строки тех же таблиц, поэтому день открывается офлайн без
  // отдельной разметки «что смотреть».
  const workout = await networkOrProgram(
    userId ?? null,
    async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          `name, program_id, started_at, finished_at, duration_seconds, workout_exercises ( id, exercise_id, order_index, position, target_sets, rest_seconds, intensity, target_reps_range, target_rpe, progression_policy )`
        )
        .eq('id', workoutId)
        .single();
      if (error) throw error;
      return data as unknown as SessionWorkoutRow;
    },
    (snapshot) => {
      const row = snapshot.workouts.find((item) => item.id === workoutId);
      if (!row) return null;
      const rows = snapshot.workoutExercises
        .filter((we) => we.workout_id === workoutId)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      return { ...(row as unknown as SessionWorkoutRow), workout_exercises: rows };
    },
    // Скачанных программ может лежать несколько — день читается из той, которой
    // принадлежит эта тренировка, а не из той, что качали последней.
    { workoutId }
  );

  const workoutRow = workout as unknown as SessionWorkoutRow;
  const workoutExercises = workoutRow.workout_exercises || [];
  const workoutExerciseIds = workoutExercises.map((we) => we.id);
  const exerciseIds = workoutExercises
    .map((we) => we.exercise_id)
    .filter((id): id is string => !!id);

  // 2. Загружаем exercises — при отказе сети берём строки из снимка справочника
  // (src/lib/exerciseSnapshot.ts). Полный охват обязателен: если в снимке нет хотя
  // бы одного упражнения дня, возвращать частичный список нельзя — упражнение
  // исчезло бы из тренировки молча, ровно как в случае неразрешённого exercise_name.
  const exerciseRows = await networkOrSnapshot(
    async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(
          `id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url`
        )
        .in('id', exerciseIds);
      if (error) throw error;
      return data ?? [];
    },
    (rows) => {
      const wanted = new Set(exerciseIds);
      const found = rows.filter((row) => wanted.has(row.id));
      return found.length === wanted.size ? found.map(toSessionFields) : null;
    }
  );

  // 3. ПАРАЛЛЕЛЬНО грузим logs + recentLogs + referenceData + pain events.
  // Строки подходов раньше при отказе сети молча превращались в «пусто» — сейчас
  // они берутся из снимка программы, иначе день без сети показывал бы сделанное
  // как несделанное.
  const referenceDataPromise = getExerciseReferenceData(exerciseIds);

  // Форма строки подхода: то, что кладётся в группы, плюс id строки упражнения,
  // по которому эти группы собираются.
  type SessionLog = WorkoutSessionData['logsByWorkoutExercise'][string][number] & {
    workout_exercise_id: string;
  };

  const logsPromise =
    workoutExerciseIds.length > 0
      ? networkOrProgram<SessionLog[]>(
          userId ?? null,
          async () => {
            const { data, error } = await supabase
              .from('workout_logs')
              .select(
                'workout_exercise_id, set_number, weight_kg, reps, reps_left, reps_right, rpe, rir, difficulty, is_warmup, is_estimated_reps, completed_at'
              )
              .in('workout_exercise_id', workoutExerciseIds);
            if (error) throw error;
            return (data ?? []) as unknown as SessionLog[];
          },
          (snapshot) => {
            const wanted = new Set(workoutExerciseIds);
            return snapshot.logs.filter((log) =>
              wanted.has(log.workout_exercise_id)
            ) as unknown as SessionLog[];
          },
          { workoutId }
        )
      : Promise.resolve([] as SessionLog[]);

  const recentLogsPromise =
    exerciseIds.length > 0
      ? networkOrProgram<RecentLog[]>(
          userId ?? null,
          async () => {
            const { data, error } = await supabase
              .from('workout_logs')
              // VF-2: reps_left/reps_right — без них previous для unilateral = null → NO_HISTORY
              // Позиция 5: created_at + workout_id нужны, чтобы собрать серию занятий
              // (верхний рабочий вес по каждому прошлому занятию).
              .select(
                'weight_kg, reps, reps_left, reps_right, rpe, set_number, created_at, workout_exercises(exercise_id, workout_id)'
              )
              .in('workout_exercises.exercise_id', exerciseIds)
              .neq('workout_exercises.workout_id', workoutId)
              .eq('is_warmup', false) // ENG-13: previous data только из рабочих сетов
              .order('created_at', { ascending: false })
              .limit(300);
            if (error) throw error;
            return (data ?? []) as unknown as RecentLog[];
          },
          (snapshot) => {
            // workout_id у лога нет — он выводится через строку упражнения, как и в
            // запросе: чужие тренировки той же программы остаёмся видеть, текущую — нет.
            const weById = new Map(snapshot.workoutExercises.map((we) => [we.id, we]));
            const wanted = new Set(exerciseIds);
            return snapshot.logs
              .filter((log) => {
                const we = weById.get(log.workout_exercise_id);
                if (!we?.exercise_id || !wanted.has(we.exercise_id)) return false;
                return !log.is_warmup && we.workout_id !== workoutId;
              })
              .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
              .slice(0, 300)
              .map((log) => {
                const we = weById.get(log.workout_exercise_id)!;
                return {
                  weight_kg: log.weight_kg,
                  reps: log.reps,
                  reps_left: log.reps_left,
                  reps_right: log.reps_right,
                  rpe: log.rpe,
                  set_number: log.set_number,
                  created_at: log.created_at,
                  workout_exercises: {
                    exercise_id: we.exercise_id ?? '',
                    workout_id: we.workout_id ?? null,
                  },
                } as unknown as RecentLog;
              });
          },
          { workoutId }
        )
      : Promise.resolve([] as RecentLog[]);

  const painEventsPromise = networkOrProgram(
    userId ?? null,
    () => painService.getPainEventsForWorkout(workoutId),
    (snapshot) =>
      snapshot.painEvents.filter(
        (event) => event.workout_id === workoutId
      ) as unknown as PainEvent[],
    { workoutId }
  );

  const [logs, recentLogs, referenceData, painEvents] = await Promise.all([
    logsPromise,
    recentLogsPromise,
    referenceDataPromise,
    painEventsPromise,
  ]);

  // 4. Группируем logs по workout_exercise_id
  const logsByWorkoutExercise: WorkoutSessionData['logsByWorkoutExercise'] = {};
  logs.forEach((log) => {
    if (!logsByWorkoutExercise[log.workout_exercise_id]) {
      logsByWorkoutExercise[log.workout_exercise_id] = [];
    }
    logsByWorkoutExercise[log.workout_exercise_id].push(log);
  });

  return {
    workoutRow,
    exerciseRows: exerciseRows as unknown as SessionExerciseRow[],
    logsByWorkoutExercise,
    recentLogs,
    referenceData,
    painEvents,
  };
}

/**
 * SWAP-1: история одного упражнения для перевнедрения рекомендаций после свапа.
 * Форма запроса = recentLogs из fetchWorkoutSession (те же фильтры: чужие
 * тренировки, не разминки, created_at DESC) — чтобы previous* в карточке после
 * замены совпадали с тем, что карточка получила бы при перезаходе экрана.
 */
export async function fetchExerciseHistory(
  exerciseId: string,
  excludeWorkoutId: string
): Promise<RecentLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select(
      'weight_kg, reps, reps_left, reps_right, rpe, set_number, workout_exercises(exercise_id)'
    )
    .eq('workout_exercises.exercise_id', exerciseId)
    .neq('workout_exercises.workout_id', excludeWorkoutId)
    .eq('is_warmup', false)
    // F3: строки без веса и повторов (отметка только усилия, см. flushPendingLogs)
    // не должны становиться «последним подходом» для рекомендации — здесь берётся
    // первый лог на (упражнение, номер подхода) по created_at DESC.
    .or('weight_kg.not.is.null,reps.not.is.null,reps_left.not.is.null,reps_right.not.is.null')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as RecentLog[];
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
  activeInjuries: UserInjury[]
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
        .filter((id): id is string => !!id && id !== exerciseId)
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
  const exercisesData = await networkOrSnapshot(
    async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(
          'id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url, movement_pattern, difficulty'
        )
        .in('id', allIds);
      if (error) throw error;
      return data ?? [];
    },
    (rows) => {
      const wanted = new Set(allIds);
      const found = rows.filter((row) => wanted.has(row.id));
      // Исходное упражнение обязано быть в снимке: без него движку нечем оценить
      // контекст (паттерн и сложность), а списывать это на «замен нет» нельзя.
      if (!found.some((row) => row.id === exerciseId)) return null;
      return found.map((row) => ({
        ...toSessionFields(row),
        movement_pattern: row.movement_pattern,
        difficulty: row.difficulty,
      }));
    }
  );

  const referenceData = await getExerciseReferenceData(alternativeIds);

  const exercisesById = new Map((exercisesData ?? []).map((exercise) => [exercise.id, exercise]));

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
    /**
     * RESET-T: `null` — это не «не трогаем», а «очищаем колонку» (сброс начала
     * пишет started_at = NULL, чтобы тренировка снова стала «не начата»).
     */
    started_at?: string | null;
    finished_at?: string | null;
    duration_seconds?: number | null;
  }
): Promise<void> {
  const { error } = await supabase.from('workouts').update(updates).eq('id', workoutId);

  if (error) throw error;
}

export type WorkoutFinishStatus =
  | 'advanced'
  | 'completed'
  | 'already_advanced'
  | 'pointer_stale'
  | 'not_active'
  | 'no_workout'
  | 'finished_no_program';

export interface WorkoutFinishResult {
  status: WorkoutFinishStatus;
  phase: number;
  week: number;
  day: number;
  /** true — тренировка была завершена и до этого вызова (повторный тап, ретрай). */
  alreadyFinished: boolean;
}

/**
 * ADV-atomic (18.10): закрыть тренировку и сдвинуть прогресс-указатель одним
 * вызовом. RPC `finish_workout_and_advance` пишет finished_at (+skipped_at для
 * пропуска) и двигает указатель в одной транзакции по CAS-правилу: тройка
 * тренировки должна совпадать с указателем. Раньше это были два запроса
 * (`updateWorkout` + `advanceProgramProgress`), и между ними база была видна в
 * состоянии «день закрыт, указатель на нём».
 */
export async function finishWorkoutAndAdvance(
  userId: string,
  workoutId: string,
  finishedAt: string,
  durationSeconds: number | null,
  skipped = false
): Promise<WorkoutFinishResult> {
  const { data, error } = await supabase.rpc('finish_workout_and_advance', {
    p_user_id: userId,
    p_workout_id: workoutId,
    p_finished_at: finishedAt,
    // Генератор типов не знает, что параметр plpgsql принимает пустое значение:
    // без таймера на экране тренировки длительность остаётся пустой.
    p_duration_seconds: durationSeconds as number,
    p_skipped: skipped,
  });
  if (error) throw error;

  const row = (data ?? {}) as unknown as Record<string, unknown>;
  return {
    status: (typeof row.status === 'string' ? row.status : 'no_workout') as WorkoutFinishStatus,
    phase: Number(row.phase ?? 1),
    week: Number(row.week ?? 1),
    day: Number(row.day ?? 1),
    alreadyFinished: row.already_finished === true,
  };
}

/**
 * Upsert workout logs через RPC.
 */
export async function upsertWorkoutLogs(
  workoutExerciseId: string,
  logs: {
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    reps_left: number | null;
    reps_right: number | null;
    completed_at: string;
    rpe: number | null;
    rir: number | null;
    difficulty: string | null;
    /** ENG-13: флаг разминочного сета */
    is_warmup?: boolean;
    /** ENG-13: оценка повторов для незавершённого сета */
    is_estimated_reps?: boolean;
  }[],
  /**
   * F5 (17.10): сколько сетов упражнения экран показывает сейчас. RPC заменяет
   * только диапазон 1..totalSets — раньше он зачищал ВСЕ подходы, и сохранённый
   * подход сверх показанного числа терялся безвозвратно.
   */
  totalSets?: number
): Promise<void> {
  const { error } = await supabase.rpc('upsert_workout_logs', {
    p_workout_exercise_id: workoutExerciseId,
    p_logs: logs,
    p_total_sets: (totalSets ?? null) as number,
  });

  if (error) throw error;
}

/**
 * RESET-T: удаляет все подходы тренировки — осознанный пункт в подтверждении
 * сброса начала. Список id передаём явно: фильтр по вложенной таблице для
 * DELETE PostgREST не поддерживается, а RLS-политика `workout_logs_delete`
 * пускает владельца (workout_exercises → workouts.user_id = auth.uid()).
 */
export async function clearWorkoutLogs(workoutExerciseIds: string[]): Promise<void> {
  if (workoutExerciseIds.length === 0) return;

  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .in('workout_exercise_id', workoutExerciseIds);

  if (error) throw error;
}

/**
 * Обновляет exercise_id в workout_exercises.
 * Критично для временной замены (UX-5): предотвращает загрязнение истории
 * оригинального упражнения логами от заменённого упражнения.
 */
export async function updateWorkoutExerciseId(
  workoutExerciseId: string,
  newExerciseId: string
): Promise<void> {
  const { error } = await supabase
    .from('workout_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', workoutExerciseId);

  if (error) throw error;
}

/**
 * VF-4/FD12-4: синхронизирует настройки экземпляра упражнения после их правки
 * в ExerciseSettingsSheet и auto-add сетов. Без этого mapper при перезаходе
 * строит сеты по старому target_sets, а отдых откатывается к плану.
 */
export async function updateWorkoutExerciseSettings(
  workoutExerciseId: string,
  patch: { target_sets?: number; rest_seconds?: number }
): Promise<void> {
  const { error } = await supabase
    .from('workout_exercises')
    .update(patch)
    .eq('id', workoutExerciseId);

  if (error) throw error;
}

// ============================================================================
// ADD-BELOW (16.10): вставка нового упражнения в тренировку
// ============================================================================

/** Настройки блока, созданного из поиска (дефолты те же, что у пикера программы). */
export interface NewWorkoutExercise {
  exercise_id: string;
  target_sets: number;
  target_reps_range: string;
  rest_seconds: number;
  intensity: string;
}

/**
 * Вставляет упражнение сразу ПОСЛЕ строки `afterWorkoutExerciseId`.
 *
 * Порядок экрана держится на `order_index` (его раньше никто не читал — см.
 * fetchWorkoutSession), поэтому после вставки список перенумеровывается заново
 * в том порядке, который получился. Обновления идут параллельно; строк в
 * тренировке единицы, атомарность здесь сознательно принесена в жертву —
 * прод-DDL под эту фичу владелец не заводил (решение 16.10).
 *
 * `position` у новой строки остаётся null: это локальный блок, у которого нет
 * строки в программе. Не путать с `replaceExerciseInProgram`, который как раз
 * матчит program_exercise по position, — трогать position у существующих строк
 * нельзя.
 */
export async function addWorkoutExerciseBelow(
  workoutId: string,
  afterWorkoutExerciseId: string,
  input: NewWorkoutExercise
): Promise<{ id: string }> {
  const { data: created, error: insertError } = await supabase
    .from('workout_exercises')
    .insert({
      workout_id: workoutId,
      exercise_id: input.exercise_id,
      order_index: -1, // временное: получит настоящее при перенумерации ниже
      target_sets: input.target_sets,
      sets: input.target_sets,
      target_reps_range: input.target_reps_range,
      target_reps: parseTargetReps(input.target_reps_range),
      rest_seconds: input.rest_seconds,
      intensity: input.intensity,
      progression_policy: 'linear',
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!created) throw new Error('Не удалось добавить упражнение');

  const { data: rows, error: rowsError } = await supabase
    .from('workout_exercises')
    .select('id, order_index')
    .eq('workout_id', workoutId)
    .neq('id', created.id)
    .order('order_index', { ascending: true });

  if (rowsError) throw rowsError;

  const anchor = (rows ?? []).findIndex((row) => row.id === afterWorkoutExerciseId);
  if (anchor < 0) {
    // Якоря нет в списке (кто-то удалил строку параллельно) — убираем за собой
    // вставленное упражнение и честно сообщаем об этом наверх.
    await supabase.from('workout_exercises').delete().eq('id', created.id);
    throw new Error('Упражнение тренировки не найдено');
  }

  const ordered = (rows ?? []).slice();
  ordered.splice(anchor + 1, 0, { id: created.id, order_index: -1 });

  const previousIndex = new Map((rows ?? []).map((row) => [row.id, row.order_index]));
  const changed = ordered
    .map((row, index) => ({ id: row.id, order_index: index }))
    .filter((row) => previousIndex.get(row.id) !== row.order_index);

  await Promise.all(
    changed.map((row) =>
      supabase.from('workout_exercises').update({ order_index: row.order_index }).eq('id', row.id)
    )
  );

  return { id: created.id };
}

/**
 * Удаляет блок тренировки, добавленный вручную. workout_logs висят на строке с
 * ON DELETE CASCADE (проверено в прод-схеме), так что введённые подходы уходят
 * вместе с ней — пользователь должен это видеть в подтверждении.
 */
export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const { error } = await supabase.from('workout_exercises').delete().eq('id', workoutExerciseId);
  if (error) throw error;
}
