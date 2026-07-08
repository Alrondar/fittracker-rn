import { supabase } from '../lib/supabase';

export interface Program {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  description: string;
  schedule: string[];
  created_by?: string;
  created_at?: string;
  days?: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
  position?: number;
  created_at?: string;
  exercises?: ProgramExercise[];
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_id?: string;
  exercise_name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  intensity: 'low' | 'medium' | 'high';
  position: number;
  isNew?: boolean;
}

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_week: number;
  current_day: number;
  started_at: string;
  completed_at?: string;
  is_active: boolean;
}

export interface ProgramFilters {
  level?: readonly ('beginner' | 'intermediate' | 'advanced')[];
  search?: string;
  sortBy?: 'date' | 'name' | 'level';
  limit?: number;
  offset?: number;
}

// Получить готовые программы (где created_by IS NULL)
export async function getPrograms(filters?: ProgramFilters): Promise<Program[]> {
  let query = supabase
    .from('programs')
    .select('*')
    .is('created_by', null);

  if (filters?.level && filters.level.length > 0) {
    query = query.in('level', filters.level as any);
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const sortBy = filters?.sortBy || 'date';
  if (sortBy === 'name') {
    query = query.order('name', { ascending: true });
  } else if (sortBy === 'level') {
    query = query.order('level', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const limit = filters?.limit || 10;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Получить личные программы пользователя
export async function getMyPrograms(
  userId: string,
  filters?: ProgramFilters
): Promise<Program[]> {
  let query = supabase
    .from('programs')
    .select('*')
    .eq('created_by', userId);

  if (filters?.level && filters.level.length > 0) {
    query = query.in('level', filters.level as any);
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const sortBy = filters?.sortBy || 'date';
  if (sortBy === 'name') {
    query = query.order('name', { ascending: true });
  } else if (sortBy === 'level') {
    query = query.order('level', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const limit = filters?.limit || 10;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Создать программу
export async function createProgram(
  program: Omit<Program, 'id' | 'created_at'>,
  userId: string
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      ...program,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Обновить программу
export async function updateProgram(
  programId: string,
  updates: Partial<Program>
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', programId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Удалить программу (каскадно)
export async function deleteProgram(programId: string): Promise<void> {
  const { data: days } = await supabase
    .from('program_days')
    .select('id')
    .eq('program_id', programId);

  if (days && days.length > 0) {
    const dayIds = days.map(d => d.id);
    await supabase.from('program_exercises').delete().in('program_day_id', [...dayIds] as any);
    await supabase.from('program_days').delete().in('program_id', [programId] as any);
  }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', programId);

  if (error) throw error;
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

export async function startProgram(programId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: deactivateError } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (deactivateError) console.warn('Ошибка деактивации:', deactivateError);

  await supabase
    .from('user_programs')
    .delete()
    .eq('user_id', user.id)
    .eq('program_id', programId);

  const { error } = await supabase
    .from('user_programs')
    .insert({
      user_id: user.id,
      program_id: programId,
      current_week: 1,
      current_day: 1,
      is_active: true,
    });

  if (error) throw error;
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

export async function createWorkoutsFromProgram(
  programId: string,
  userId: string
): Promise<string[]> {
  const program = await getProgramWithDays(programId);
  if (!program || !program.days) throw new Error('Program not found');

  const workoutIds: string[] = [];

  for (const day of program.days) {
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

    if (day.exercises) {
      for (const exercise of day.exercises) {
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

export async function getActiveProgram(userId: string) {
  const { data, error } = await supabase
    .from('user_programs')
    .select(`*, programs ( id, name, level, duration, description, schedule, program_days ( id, day_number, name, program_exercises ( id, exercise_name, sets, reps_range, rest_seconds, intensity, position ) ) )`)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function advanceProgramProgress(
  userId: string,
  programId: string
): Promise<{ week: number; day: number; isCompleted: boolean }> {
  const { data: current, error: fetchError } = await supabase
    .from('user_programs')
    .select('id, current_week, current_day')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Найдено несколько активных записей. Обратитесь в поддержку.');
    }
    throw fetchError;
  }

  const { count: daysCount } = await supabase
    .from('program_days')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', programId);

  const totalDays = daysCount || 5;

  const { data: program } = await supabase
    .from('programs')
    .select('duration')
    .eq('id', programId)
    .single();

  const actualWeeks = program?.duration || 8;

  let newWeek = current.current_week;
  let newDay = current.current_day + 1;
  let isCompleted = false;

  if (newDay > totalDays) {
    newDay = 1;
    newWeek += 1;
    if (newWeek > actualWeeks) {
      isCompleted = true;
      await supabase
        .from('user_programs')
        .update({ is_active: false, completed_at: new Date().toISOString() })
        .eq('id', current.id);
      return { week: actualWeeks, day: totalDays, isCompleted: true };
    }
  }

  const { error: updateError } = await supabase
    .from('user_programs')
    .update({ current_week: newWeek, current_day: newDay })
    .eq('id', current.id);

  if (updateError) throw updateError;

  return { week: newWeek, day: newDay, isCompleted: false };
}