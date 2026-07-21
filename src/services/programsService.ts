import { supabase } from '../lib/supabase';
import type { PhaseType } from '../constants/phaseTypes';

// ============================================================================
// ТИПЫ
// ============================================================================

export type { PhaseType };

export interface Program {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  description: string;
  schedule: string[];
  created_by?: string;
  created_at?: string;
  phases?: ProgramPhase[]; // фазы/мезоциклы (новая структура)
  days?: ProgramDay[];     // плоский список (неделя 1 всех фаз) — обратная совместимость
}

export interface ProgramPhase {
  id: string;
  program_id: string;
  phase_number: number;
  name: string;
  phase_type: PhaseType;
  weeks_count: number;
  description?: string | null;
  position?: number | null;
  created_at?: string;
  days?: ProgramDay[];
  isNew?: boolean; // ✅ ДОБАВИТЬ ЭТУ СТРОКУ
}

export interface ProgramDay {
  id: string;
  program_id: string;
  phase_id?: string | null;
  week_number: number;
  day_number: number;
  name: string;
  position?: number;
  created_at?: string;
  exercises?: ProgramExercise[];
  isNew?: boolean; // ✅ ДОБАВИТЬ ЭТУ СТРОКУ
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
  current_phase: number; // ✅ НОВОЕ
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

// ============================================================================
// МАППЕРЫ (единый формат из сырых строк Supabase)
// ============================================================================

function mapExercise(ex: any): ProgramExercise {
  return {
    id: ex.id,
    program_day_id: ex.program_day_id,
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name,
    sets: ex.sets,
    reps_range: ex.reps_range,
    rest_seconds: ex.rest_seconds,
    intensity: ex.intensity,
    position: ex.position,
  };
}

function mapDay(day: any): ProgramDay {
  return {
    id: day.id,
    program_id: day.program_id,
    phase_id: day.phase_id,
    week_number: day.week_number ?? 1,
    day_number: day.day_number,
    name: day.name,
    position: day.position,
    created_at: day.created_at,
    exercises: (day.program_exercises || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map(mapExercise),
  };
}

export function mapPhase(phase: any): ProgramPhase {
  return {
    id: phase.id,
    program_id: phase.program_id,
    phase_number: phase.phase_number,
    name: phase.name,
    phase_type: phase.phase_type,
    weeks_count: phase.weeks_count,
    description: phase.description,
    position: phase.position,
    created_at: phase.created_at,
    days: (phase.program_days || [])
      .sort((a: any, b: any) => (a.week_number - b.week_number) || (a.day_number - b.day_number))
      .map(mapDay),
  };
}

// ============================================================================
// ПРОГРАММЫ (CRUD)
// ============================================================================

export async function getPrograms(filters?: ProgramFilters): Promise<Program[]> {
  let query = supabase.from('programs').select('*').is('created_by', null);
  if (filters?.level && filters.level.length > 0) query = query.in('level', filters.level as any);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  const sortBy = filters?.sortBy || 'date';
  if (sortBy === 'name') query = query.order('name', { ascending: true });
  else if (sortBy === 'level') query = query.order('level', { ascending: true });
  else query = query.order('created_at', { ascending: false });
  const limit = filters?.limit || 10;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getMyPrograms(userId: string, filters?: ProgramFilters): Promise<Program[]> {
  let query = supabase.from('programs').select('*').eq('created_by', userId);
  if (filters?.level && filters.level.length > 0) query = query.in('level', filters.level as any);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  const sortBy = filters?.sortBy || 'date';
  if (sortBy === 'name') query = query.order('name', { ascending: true });
  else if (sortBy === 'level') query = query.order('level', { ascending: true });
  else query = query.order('created_at', { ascending: false });
  const limit = filters?.limit || 10;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createProgram(
  program: Omit<Program, 'id' | 'created_at' | 'phases' | 'days'>,
  userId: string
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({ ...program, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgram(programId: string, updates: Partial<Program>): Promise<Program> {
  const { phases, days, ...rest } = updates; // фазы/дни не пишем в programs
  const { data, error } = await supabase
    .from('programs')
    .update(rest)
    .eq('id', programId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProgram(programId: string): Promise<void> {
  const { data: days } = await supabase.from('program_days').select('id').eq('program_id', programId);
  if (days && days.length > 0) {
    const dayIds = days.map(d => d.id);
    await supabase.from('program_exercises').delete().in('program_day_id', [...dayIds] as any);
    await supabase.from('program_days').delete().in('program_id', [programId] as any);
  }
  await supabase.from('program_phases').delete().eq('program_id', programId);
  const { error } = await supabase.from('programs').delete().eq('id', programId);
  if (error) throw error;
}

// ============================================================================
// ЗАГРУЗКА ПРОГРАММЫ С ФАЗАМИ
// ============================================================================

/**
 * Программа с фазами → днями (по неделям) → упражнениями.
 * Также возвращает плоский `days` (неделя 1 всех фаз) для обратной совместимости
 * со старым редактором.
 */
export async function getProgramWithDays(programId: string): Promise<Program | null> {
  const { data: program, error } = await supabase
    .from('programs')
    .select(`*, program_phases ( *, program_days ( *, program_exercises (*) ) )`)
    .eq('id', programId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!program) return null;

  const phases: ProgramPhase[] = (program.program_phases || [])
    .sort((a: any, b: any) => a.phase_number - b.phase_number)
    .map(mapPhase);

  // Плоский список для совместимости: неделя 1 каждой фазы
  const flatDays = phases.flatMap(p => (p.days || []).filter(d => (d.week_number ?? 1) === 1));

  return {
    id: program.id,
    name: program.name,
    level: program.level,
    duration: program.duration,
    description: program.description,
    schedule: program.schedule || [],
    created_by: program.created_by,
    created_at: program.created_at,
    phases,
    days: flatDays,
  };
}

// ============================================================================
// СТАРТ И ПРОГРЕСС ПРОГРАММЫ
// ============================================================================

export async function startProgram(programId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase.from('user_programs').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true);
  await supabase.from('user_programs').delete().eq('user_id', user.id).eq('program_id', programId);

  const { error } = await supabase.from('user_programs').insert({
    user_id: user.id,
    program_id: programId,
    current_phase: 1, // ✅ НОВОЕ
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

export async function updateProgramProgress(userProgramId: string, week: number, day: number): Promise<void> {
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

/**
 * Фазовое автопереключение прогресса:
 * день → (конец недели?) неделя++ → (конец фазы?) фаза++ → (конец программы?) финиш.
 * Если для текущей недели нет своих дней — используется неделя 1 фазы (шаблон).
 */
export async function advanceProgramProgress(
  userId: string,
  programId: string
): Promise<{ phase: number; week: number; day: number; isCompleted: boolean }> {
  const { data: current, error: fetchError } = await supabase
    .from('user_programs')
    .select('id, current_phase, current_week, current_day')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') throw new Error('Активная программа не найдена');
    throw fetchError;
  }

  // Фазы программы (упорядочены)
  const { data: phases } = await supabase
    .from('program_phases')
    .select('phase_number, weeks_count, program_days ( week_number, day_number )')
    .eq('program_id', programId)
    .order('phase_number', { ascending: true });

  const orderedPhases = (phases || []).sort((a: any, b: any) => a.phase_number - b.phase_number);

  const curPhase = current.current_phase ?? 1;
  const curWeek = current.current_week ?? 1;
  const curDay = current.current_day ?? 1;

  // Fallback: программа без фаз (старая) — прежняя логика по общей длительности
  if (orderedPhases.length === 0) {
    const { count } = await supabase.from('program_days').select('*', { count: 'exact', head: true }).eq('program_id', programId);
    const totalDays = count || 5;
    const { data: prog } = await supabase.from('programs').select('duration').eq('id', programId).single();
    const actualWeeks = prog?.duration || 8;

    let newWeek = curWeek;
    let newDay = curDay + 1;
    if (newDay > totalDays) {
      newDay = 1;
      newWeek += 1;
      if (newWeek > actualWeeks) {
        await supabase.from('user_programs').update({ is_active: false, completed_at: new Date().toISOString() }).eq('id', current.id);
        return { phase: 1, week: actualWeeks, day: totalDays, isCompleted: true };
      }
    }
    await supabase.from('user_programs').update({ current_week: newWeek, current_day: newDay }).eq('id', current.id);
    return { phase: 1, week: newWeek, day: newDay, isCompleted: false };
  }

  const phase = orderedPhases.find((p: any) => p.phase_number === curPhase) || orderedPhases[0];

  // Дней в (фазе, неделе); fallback на неделю 1 (шаблон)
  const daysFor = (week: number): number => {
    const all = phase.program_days || [];
    const inWeek = all.filter((d: any) => d.week_number === week);
    if (inWeek.length > 0) return inWeek.length;
    return all.filter((d: any) => d.week_number === 1).length || 1;
  };

  const totalDaysThisWeek = daysFor(curWeek);

  let newPhase = curPhase;
  let newWeek = curWeek;
  let newDay = curDay + 1;

  if (newDay > totalDaysThisWeek) {
    newDay = 1;
    newWeek = curWeek + 1;
    if (newWeek > (phase.weeks_count || 1)) {
      newWeek = 1;
      newPhase = curPhase + 1;
      // Следующая фаза существует?
      if (!orderedPhases.some((p: any) => p.phase_number === newPhase)) {
        await supabase.from('user_programs').update({ is_active: false, completed_at: new Date().toISOString() }).eq('id', current.id);
        return { phase: curPhase, week: curWeek, day: totalDaysThisWeek, isCompleted: true };
      }
    }
  }

  const { error: updateError } = await supabase
    .from('user_programs')
    .update({ current_phase: newPhase, current_week: newWeek, current_day: newDay })
    .eq('id', current.id);
  if (updateError) throw updateError;

  return { phase: newPhase, week: newWeek, day: newDay, isCompleted: false };
}

// ============================================================================
// СОЗДАНИЕ ТРЕНИРОВОК ИЗ ПРОГРАММЫ (фазо-недельное)
// ============================================================================

/**
 * Создаёт тренировки для указанной фазы и недели (по умолчанию фаза 1, неделя 1).
 * Если для недели нет своих дней — берёт неделю 1 фазы (шаблон).
 */
export async function createWorkoutsFromProgram(
  programId: string,
  userId: string,
  phaseNumber: number = 1,
  weekNumber: number = 1
): Promise<string[]> {
  const program = await getProgramWithDays(programId);
  if (!program) throw new Error('Program not found');

  const phase = (program.phases || []).find(p => p.phase_number === phaseNumber);
  let days = (phase?.days || []).filter(d => (d.week_number ?? 1) === weekNumber);
  if (days.length === 0 && phase) {
    days = (phase.days || []).filter(d => (d.week_number ?? 1) === 1); // шаблон
  }
  if (days.length === 0) {
    days = program.days || []; // fallback для программ без фаз
  }

  const workoutIds: string[] = [];
  for (const day of days) {
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        name: day.name,
        description: `${program.name} — Фаза ${phaseNumber} · Неделя ${weekNumber}`,
        program_id: programId,
        week_number: weekNumber,
        day_index: day.day_number,
      })
      .select()
      .single();
    if (workoutError) throw workoutError;

    if (day.exercises) {
      for (const exercise of day.exercises) {
        const { data: foundExercise } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', `%${exercise.exercise_name}%`)
          .limit(1)
          .single();
        const exerciseId = foundExercise?.id || null;

        const { error: exError } = await supabase.from('workout_exercises').insert({
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

// ============================================================================
// АКТИВНАЯ ПРОГРАММА (для дашборда)
// ============================================================================

export async function getActiveProgram(userId: string) {
  const { data, error } = await supabase
    .from('user_programs')
    .select(`*, programs ( id, name, level, duration, description, schedule, program_phases ( id, phase_number, name, phase_type, weeks_count, program_days ( id, day_number, week_number, name, program_exercises ( id, exercise_name, sets, reps_range, rest_seconds, intensity, position ) ) ) )`)
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