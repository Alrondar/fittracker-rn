import { supabase } from '../lib/supabase';

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