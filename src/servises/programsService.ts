import { supabase } from '../lib/supabase';

export interface Program {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  description: string;
  schedule: string[];
  days?: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
  exercises?: ProgramExercise[];
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  intensity: 'low' | 'medium' | 'high';
  position: number;
}

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_week: number;
  current_day: number;
  started_at: string;
  is_active: boolean;
}

export async function getPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProgramWithDays(programId: string): Promise<Program | null> {
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .single();

  if (programError) throw programError;

  const { data: days, error: daysError } = await supabase
    .from('program_days')
    .select('*')
    .eq('program_id', programId)
    .order('day_number');

  if (daysError) throw daysError;

  const daysWithExercises = await Promise.all(
    (days || []).map(async (day) => {
      const { data: exercises, error: exError } = await supabase
        .from('program_exercises')
        .select('*')
        .eq('program_day_id', day.id)
        .order('position');

      if (exError) throw exError;

      return {
        ...day,
        exercises: exercises || [],
      };
    })
  );

  return {
    ...program,
    days: daysWithExercises,
  };
}

export async function startProgram(programId: string): Promise<UserProgram> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_programs')
    .insert({
      user_id: user.id,
      program_id: programId,
      current_week: 1,
      current_day: 1,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveUserProgram(): Promise<UserProgram | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_programs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateProgramProgress(
  userProgramId: string,
  week: number,
  day: number
): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .update({ current_week: week, current_day: day })
    .eq('id', userProgramId);

  if (error) throw error;
}

export async function completeProgram(userProgramId: string): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .update({ is_active: false, completed_at: new Date().toISOString() })
    .eq('id', userProgramId);

  if (error) throw error;
}

// Создать тренировки из программы
export async function createWorkoutsFromProgram(
  programId: string,
  userId: string
): Promise<string[]> {
  const program = await getProgramWithDays(programId);
  if (!program || !program.days) throw new Error('Program not found');

  const workoutIds: string[] = [];

  for (const day of program.days) {
    // Создаем тренировку
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        name: day.name,
        description: `${program.name} - Неделя 1`,
        program_id: programId,
        week_number: 1,
        day_index: day.day_number,
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Добавляем упражнения
    if (day.exercises) {
      for (const exercise of day.exercises) {
        // Ищем упражнение в справочнике по названию
        let exerciseId: string | null = null;
        
        const { data: foundExercise } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', `%${exercise.exercise_name}%`)
          .limit(1)
          .single();
        
        exerciseId = foundExercise?.id || null;

        const { error: exError } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: workout.id,
            exercise_id: exerciseId,
            order_index: exercise.position,
            target_sets: exercise.sets,
            target_reps: parseInt(exercise.reps_range.split('-')[0]) || 10,
            target_reps_range: exercise.reps_range,
            rest_seconds: exercise.rest_seconds,
          });

        if (exError) throw exError;
      }
    }

    workoutIds.push(workout.id);
  }

  return workoutIds;
}