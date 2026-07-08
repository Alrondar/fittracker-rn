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

export async function startProgram(programId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Деактивируем ВСЕ активные программы (не только одну)
  const { error: deactivateError } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (deactivateError) console.warn('Ошибка деактивации:', deactivateError);

  // Удаляем дубликаты для этой программы (если есть)
  await supabase
    .from('user_programs')
    .delete()
    .eq('user_id', user.id)
    .eq('program_id', programId);

  // Создаём новую запись
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

// Получить активную программу пользователя
export async function getActiveProgram(userId: string) {
  const { data, error } = await supabase
    .from('user_programs')
    .select(`
      *,
      programs (
        id,
        name,
        level,
        duration,
        description,
        schedule,
        program_days (
          id,
          day_number,
          name,
          program_exercises (
            id,
            exercise_name,
            sets,
            reps_range,
            rest_seconds,
            intensity,
            position
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Нет активной программы
    throw error;
  }

  return data;
}

// Продвинуть прогресс программы (следующий день)
export async function advanceProgramProgress(
  userId: string,
  programId: string
): Promise<{ week: number; day: number; isCompleted: boolean }> {
  // Получаем текущий прогресс (с limit для защиты от дубликатов)
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

  // Получаем количество дней в программе
  const { count: daysCount } = await supabase
    .from('program_days')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', programId);

  const totalDays = daysCount || 5;

  // Получаем реальную длительность программы
  const { data: program } = await supabase
    .from('programs')
    .select('duration')
    .eq('id', programId)
    .single();

  const actualWeeks = program?.duration || 8;

  let newWeek = current.current_week;
  let newDay = current.current_day + 1;
  let isCompleted = false;

  // Если прошли все дни недели тренировки → следующая неделя
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

  // Обновляем прогресс
  const { error: updateError } = await supabase
    .from('user_programs')
    .update({ current_week: newWeek, current_day: newDay })
    .eq('id', current.id);

  if (updateError) throw updateError;

  return { week: newWeek, day: newDay, isCompleted: false };
}