import { supabase } from '../lib/supabase';

// ============================================================================
// ТИПЫ
// ============================================================================
export type PhaseType = 'hypertrophy' | 'strength' | 'power' | 'deload' | 'custom';

export interface Program {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  description: string;
  schedule: string[];
  created_by?: string;
  created_at?: string;
  phases?: ProgramPhase[];
  days?: ProgramDay[];
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
  isNew?: boolean;
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
  isNew?: boolean;
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
  primary_muscles?: string[];
  /** Фича 2: Целевой RPE для упражнения (1-10). */
  target_rpe?: number | null;
  isNew?: boolean;
}

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  current_phase: number;
  current_week: number;
  current_day: number;
  started_at: string;
  completed_at?: string;
  is_active: boolean;
}

/** Статус программы для пользователя (один запрос на весь список). */
export interface UserProgramStatus {
  program_id: string;
  is_active: boolean;
  completed_at: string | null;
}

export interface ProgramFilters {
  level?: readonly ('beginner' | 'intermediate' | 'advanced')[];
  search?: string;
  sortBy?: 'date' | 'name' | 'level';
  limit?: number;
  offset?: number;
}

export interface SyncProgramChangesResult {
  deleted_workouts: number;
  updated_workouts: number;
  deleted_exercises: number;
  updated_exercises: number;
  inserted_exercises: number;
}

export interface WorkoutProgramInfo {
  programName: string;
  phaseName?: string;
  phaseType?: string;
}

// ============================================================================
// ВНУТРЕННИЕ ТИПЫ JOIN-СТРУКТУР (ARCH-6: вместо any в мапперах)
// Отражают ровно то, что уходит в select getProgramWithPhases:
//   *, program_phases ( *, program_days ( *, program_exercises (*, exercises ( primary_muscles ) ) ) )
// ============================================================================
interface ProgramRow {
  id: string;
  name: string;
  level: string; // БД хранит строку; домен сужает в mapProgramRow
  duration: number;
  description: string | null;
  schedule: string[] | null;
  created_by: string | null;
  created_at: string | null;
}
interface ProgramWithPhasesRow extends ProgramRow {
  program_phases: ProgramPhaseRow[] | null;
}
interface ProgramPhaseRow {
  id: string;
  program_id: string;
  phase_number: number;
  name: string;
  phase_type: string; // БД хранит строку; домен сужает в mapPhase
  weeks_count: number;
  description: string | null;
  position: number | null;
  created_at: string | null;
  program_days: ProgramDayRow[] | null;
}
interface ProgramDayRow {
  id: string;
  program_id: string;
  phase_id: string | null;
  week_number: number;
  day_number: number;
  name: string;
  position: number | null;
  created_at: string | null;
  program_exercises: ProgramExerciseRow[] | null;
}
interface ProgramExerciseRow {
  id: string;
  program_day_id: string;
  exercise_id: string | null;
  exercise_name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  intensity: string; // БД хранит строку; домен сужает в mapExercise
  position: number;
  /** Фича 2: Целевой RPE для упражнения (1-10). */
  target_rpe: number | null;
  exercises: { primary_muscles: string[] } | null;
}

// ============================================================================
// МАППЕРЫ
// ============================================================================
/** programs.Row → Program (типобезопасно, без any). */
function mapProgramRow(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    level: row.level as Program['level'],
    duration: row.duration,
    description: row.description ?? '',
    schedule: row.schedule ?? [],
    created_by: row.created_by ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

function mapExercise(ex: ProgramExerciseRow): ProgramExercise {
  return {
    id: ex.id,
    program_day_id: ex.program_day_id,
    exercise_id: ex.exercise_id ?? undefined,
    exercise_name: ex.exercise_name,
    sets: ex.sets,
    reps_range: ex.reps_range,
    rest_seconds: ex.rest_seconds,
    intensity: ex.intensity as ProgramExercise['intensity'],
    position: ex.position,
    primary_muscles: ex.exercises?.primary_muscles || [],
    target_rpe: ex.target_rpe,
  };
}

function mapDay(day: ProgramDayRow): ProgramDay {
  return {
    id: day.id,
    program_id: day.program_id,
    phase_id: day.phase_id,
    week_number: day.week_number ?? 1,
    day_number: day.day_number,
    name: day.name,
    position: day.position ?? undefined,
    created_at: day.created_at ?? undefined,
    exercises: (day.program_exercises || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(mapExercise),
  };
}

export function mapPhase(phase: ProgramPhaseRow): ProgramPhase {
  return {
    id: phase.id,
    program_id: phase.program_id,
    phase_number: phase.phase_number,
    name: phase.name,
    phase_type: phase.phase_type as PhaseType,
    weeks_count: phase.weeks_count,
    description: phase.description,
    position: phase.position,
    created_at: phase.created_at ?? undefined,
    days: (phase.program_days || [])
      .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)
      .map(mapDay),
  };
}

// ============================================================================
// ПРОГРАММЫ (CRUD)
// ============================================================================
export async function getPrograms(filters?: ProgramFilters): Promise<Program[]> {
  let query = supabase.from('programs').select('*').is('created_by', null);
  if (filters?.level && filters.level.length > 0) query = query.in('level', [...filters.level]);
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
  return (data || []).map(mapProgramRow);
}

export async function getMyPrograms(userId: string, filters?: ProgramFilters): Promise<Program[]> {
  let query = supabase.from('programs').select('*').eq('created_by', userId);
  if (filters?.level && filters.level.length > 0) query = query.in('level', [...filters.level]);
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
  return (data || []).map(mapProgramRow);
}

export async function createProgram(
  program: Omit<Program, 'id' | 'created_at' | 'phases' | 'days'>,
  userId: string
): Promise<Program> {
  // id генерируется на стороне БД (DEFAULT gen_random_uuid()::text).
  const { data, error } = await supabase
    .from('programs')
    .insert({ ...program, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgram(
  programId: string,
  updates: Partial<Program>
): Promise<Program> {
  const { phases, days, ...rest } = updates;
  const { data, error } = await supabase
    .from('programs')
    .update(rest)
    .eq('id', programId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProgram(programId: string, userId: string): Promise<void> {
  // 1. Отвязываем тренировки пользователя от программы: история сохраняется
  //    как ad-hoc (workouts.program_id nullable). Явный фильтр по user_id —
  //    defense in depth поверх RLS (workouts: auth.uid() = user_id).
  const { error: unlinkErr } = await supabase
    .from('workouts')
    .update({ program_id: null })
    .eq('program_id', programId)
    .eq('user_id', userId);
  if (unlinkErr) throw unlinkErr;

  // 2. Удаляем запись прогресса пользователя. После этого активных программ
  //    у него на одну меньше; если удалили активную — остаётся 0 активных
  //    (другую НЕ активируем автоматически, per ТЗ).
  const { error: progErr } = await supabase
    .from('user_programs')
    .delete()
    .eq('program_id', programId)
    .eq('user_id', userId);
  if (progErr) throw progErr;

  // 3. Каскадная чистка содержимого программы (упражнения → дни → фазы).
  //    RLS на этих таблицах = created_by = auth.uid() (мы владелец).
  const { data: days } = await supabase
    .from('program_days')
    .select('id')
    .eq('program_id', programId);
  if (days && days.length > 0) {
    const dayIds = days.map((d) => d.id);
    await supabase.from('program_exercises').delete().in('program_day_id', dayIds);
    await supabase.from('program_days').delete().in('program_id', [programId]);
  }
  await supabase.from('program_phases').delete().eq('program_id', programId);

  // 4. Удаляем саму программу (RLS: created_by = auth.uid()).
  //    К этому моменту шагами 1–2 убраны ВСЕ ссылки на program_id у владельца,
  //    а у других пользователей их нет (импорт создаёт копию с новым id) —
  //    поэтому DELETE не упрётся в FK workouts/user_programs (RESTRICT).
  const { error } = await supabase.from('programs').delete().eq('id', programId);
  if (error) throw error;
}

// ============================================================================
// ЗАГРУЗКА ПРОГРАММЫ С ФАЗАМИ
// ============================================================================
export async function getProgramWithPhases(programId: string): Promise<Program | null> {
  const { data: program, error } = await supabase
    .from('programs')
    .select(
      `*, program_phases ( *, program_days ( *, program_exercises (*, exercises ( primary_muscles ) ) ) )`
    )
    .eq('id', programId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!program) return null;

  // Один каст на join-корень: дальше фазы/дни/упражнения типизированы локальными
  // row-интерфейсами, а корень возврата собирается через mapProgramRow (без any).
  const programRow = program as unknown as ProgramWithPhasesRow;
  const phases: ProgramPhase[] = (programRow.program_phases || [])
    .sort((a, b) => a.phase_number - b.phase_number)
    .map(mapPhase);
  const flatDays = phases.flatMap((p) =>
    (p.days || []).filter((d: ProgramDay) => (d.week_number ?? 1) === 1)
  );

  return { ...mapProgramRow(programRow), phases, days: flatDays };
}

export const getProgramWithDays = getProgramWithPhases;

// ============================================================================
// СТАРТ И ПРОГРЕСС ПРОГРАММЫ
// ============================================================================
export async function startProgram(programId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: deactivateError } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (deactivateError) console.warn('Ошибка деактивации:', deactivateError);

  await supabase.from('user_programs').delete().eq('user_id', user.id).eq('program_id', programId);

  const { error } = await supabase.from('user_programs').insert({
    user_id: user.id,
    program_id: programId,
    current_phase: 1,
    current_week: 1,
    current_day: 1,
    is_active: true,
  });
  if (error) throw error;
}

export async function getActiveUserProgram(): Promise<UserProgram | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { data: phases } = await supabase
    .from('program_phases')
    .select('phase_number, weeks_count, program_days ( week_number, day_number )')
    .eq('program_id', programId)
    .order('phase_number', { ascending: true });

  // Типы a/b/p/d выводятся из supabase-join; any больше не нужен.
  const orderedPhases = (phases || []).sort((a, b) => a.phase_number - b.phase_number);
  const curPhase = current.current_phase ?? 1;
  const curWeek = current.current_week ?? 1;
  const curDay = current.current_day ?? 1;

  if (orderedPhases.length === 0) {
    const { count } = await supabase
      .from('program_days')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId);
    const totalDays = count || 5;
    const { data: prog } = await supabase
      .from('programs')
      .select('duration')
      .eq('id', programId)
      .single();
    const actualWeeks = prog?.duration || 8;
    let newWeek = curWeek;
    let newDay = curDay + 1;
    if (newDay > totalDays) {
      newDay = 1;
      newWeek += 1;
      if (newWeek > actualWeeks) {
        await supabase
          .from('user_programs')
          .update({ is_active: false, completed_at: new Date().toISOString() })
          .eq('id', current.id);
        return { phase: 1, week: actualWeeks, day: totalDays, isCompleted: true };
      }
    }
    await supabase
      .from('user_programs')
      .update({ current_week: newWeek, current_day: newDay })
      .eq('id', current.id);
    return { phase: 1, week: newWeek, day: newDay, isCompleted: false };
  }

  const phase = orderedPhases.find((p) => p.phase_number === curPhase) || orderedPhases[0];
  const daysFor = (week: number): number => {
    const all = phase.program_days || [];
    const inWeek = all.filter((d) => d.week_number === week);
    if (inWeek.length > 0) return inWeek.length;
    return all.filter((d) => d.week_number === 1).length || 1;
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
      if (!orderedPhases.some((p) => p.phase_number === newPhase)) {
        await supabase
          .from('user_programs')
          .update({ is_active: false, completed_at: new Date().toISOString() })
          .eq('id', current.id);
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
// КОПИРОВАНИЕ ГОТОВОЙ ПРОГРАММЫ (PROG-1)
// ============================================================================
/**
 * PROG-1: Копировать готовую (seeded) программу в "Мои программы" пользователя.
 * Оборачивает RPC copy_program_for_user + select для возврата полной программы.
 * Используется в каталоге программ для ready-programs (`created_by IS NULL`).
 */
export async function copyProgramForUser(programId: string, userId: string): Promise<Program> {
  const { data: newProgramId, error: rpcError } = await supabase.rpc('copy_program_for_user', {
    p_program_id: programId,
    p_user_id: userId,
  });
  if (rpcError) throw rpcError;

  // RPC возвращает id (string | string[] в зависимости от конфигурации).
  const id = Array.isArray(newProgramId) ? newProgramId[0] : newProgramId;
  if (!id) throw new Error('Не удалось скопировать программу');

  const { data: program, error: selectError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id as string)
    .single();
  if (selectError) throw selectError;
  if (!program) throw new Error('Скопированная программа не найдена');

  return mapProgramRow(program as unknown as ProgramRow);
}

// ============================================================================
// АКТИВАЦИЯ ПРОГРАММЫ
// ============================================================================
/**
 * Активирует программу. Одновременно может быть только одна активная.
 * @param reset true — «начать заново» завершённую программу: прогресс в 1/1/1,
 *   completed_at = null, новый started_at, тренировки пересоздаются через RPC
 *   (старые, включая завершённые, удаляются — консистентно с «Перезапустить»
 *   в редакторе). false — прогресс сохраняется, тренировки создаются только
 *   если их ещё нет.
 */
export async function activateProgram(
  programId: string,
  userId: string,
  reset: boolean = false
): Promise<void> {
  // 1. Деактивируем все программы пользователя.
  const { error: deactivateError } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (deactivateError) throw deactivateError;

  // 2. Есть ли уже запись user_programs для этой программы?
  const { data: existing } = await supabase
    .from('user_programs')
    .select('id')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .maybeSingle();
  if (existing) {
    const update: Record<string, unknown> = { is_active: true };
    if (reset) {
      update.current_phase = 1;
      update.current_week = 1;
      update.current_day = 1;
      update.completed_at = null;
      update.started_at = new Date().toISOString();
    }
    const { error } = await supabase.from('user_programs').update(update).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('user_programs').insert({
      user_id: userId,
      program_id: programId,
      current_phase: 1,
      current_week: 1,
      current_day: 1,
      is_active: true,
    });
    if (error) throw error;
  }

  // 3. Тренировки: при reset — пересоздаём (RPC удалит старые + создаст свежие);
  //    иначе — создаём только если их нет.
  if (reset) {
    const { error: rpcError } = await supabase.rpc('create_workouts_for_program', {
      p_program_id: programId,
      p_user_id: userId,
    });
    if (rpcError) throw rpcError;
  } else {
    const { count } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('program_id', programId);
    if (!count || count === 0) {
      const { error: rpcError } = await supabase.rpc('create_workouts_for_program', {
        p_program_id: programId,
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;
    }
  }
}

/** Деактивирует все программы пользователя (0 активных). */
export async function deactivateAllPrograms(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
}

/** ID активной программы (или null). Лёгкий запрос. */
export async function getActiveProgramId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_programs')
    .select('program_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data?.program_id ?? null;
}

/**
 * Карта статусов ВСЕХ программ пользователя одним запросом: is_active + completed_at.
 * Используется списком программ для бейджа «Текущая», сортировки и диалога
 * «программа завершена — начать заново?».
 */
export async function getUserProgramsStatus(userId: string): Promise<UserProgramStatus[]> {
  const { data, error } = await supabase
    .from('user_programs')
    .select('program_id, is_active, completed_at')
    .eq('user_id', userId);
  if (error) throw error;
  // row выводится типом supabase из select; any не нужен.
  return (data || []).map((row) => ({
    program_id: row.program_id,
    is_active: !!row.is_active,
    completed_at: row.completed_at ?? null,
  }));
}

// ============================================================================
// СИНХРОНИЗАЦИЯ ПРАВОК ПРОГРАММЫ С ТРЕНИРОВКАМИ (RPC)
// ============================================================================
/**
 * Атомарно синхронизирует будущие тренировки с текущим состоянием программы.
 * Будущая тренировка = started_at IS NULL AND finished_at IS NULL.
 * Тренировки в процессе и завершённые НЕ трогаются.
 */
export async function syncProgramChanges(programId: string): Promise<SyncProgramChangesResult> {
  const { data, error } = await supabase.rpc('sync_program_changes_to_workouts', {
    p_program_id: programId,
  });
  if (error) {
    console.error('[syncProgramChanges] RPC error:', error);
    throw error;
  }
  return data as SyncProgramChangesResult;
}

// ============================================================================
// PROGRAM EXERCISE REPLACEMENT (UX-5 Feature 1)
// ============================================================================

/**
 * UX-5 Feature 1: Заменить упражнение в программе (постоянная замена).
 *
 * Алгоритм:
 * 1. Разрешить workout → program_id + phase/week/day.
 * 2. Разрешить workout_exercise → position + old exercise_id (для fallback-матчинга).
 * 3. Найти program_day по цепочке с fallback'ами (зеркалит startProgramWorkout).
 * 4. Найти program_exercise: сначала по (day, position), затем по (day, old exercise_id).
 * 5. UPDATE program_exercises: exercise_id + exercise_name.
 * 6. UPDATE текущей workout_exercises: exercise_id = новый — чтобы sync не пересоздал
 *    строку и не осиротил pending workout_logs (для не начатых тренировок sync иначе
 *    удалил бы старое упражнение как orphaned по exercise_id и вставил новое с новым id).
 * 7. syncProgramChanges(program_id) — распространить на будущие тренировки.
 *
 * Ограничения RPC sync_program_changes_to_workouts:
 * - SECURITY DEFINER с проверкой programs.created_by = auth.uid().
 * - Для готовых (seeded) программ с created_by IS NULL вызов упадёт с
 *   "Program not found". Caller должен обрабатывать ошибку и сообщать пользователю,
 *   что программа недоступна для редактирования.
 */
export async function replaceExerciseInProgram(
  workoutId: string,
  workoutExerciseId: string,
  newExerciseId: string,
  newExerciseName: string
): Promise<void> {
  // 1. Workout context
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('program_id, phase_number, week_number, day_index')
    .eq('id', workoutId)
    .maybeSingle();

  if (workoutError) throw workoutError;
  if (!workout || !workout.program_id) {
    throw new Error('Тренировка не привязана к программе');
  }

  const { program_id, phase_number, week_number, day_index } = workout;

  // 2. Текущая строка workout_exercise — position + old exercise_id для fallback-матчинга
  const { data: workoutExercise, error: weError } = await supabase
    .from('workout_exercises')
    .select('position, exercise_id')
    .eq('id', workoutExerciseId)
    .maybeSingle();

  if (weError) throw weError;
  if (!workoutExercise) throw new Error('Упражнение тренировки не найдено');

  // 3. Найти program_day по цепочке (зеркалит startProgramWorkout)
  const phaseNumber = phase_number ?? 1;
  const weekNumber = week_number ?? 1;
  const dayNumber = day_index ?? 1;

  const { data: phase } = await supabase
    .from('program_phases')
    .select('id')
    .eq('program_id', program_id)
    .eq('phase_number', phaseNumber)
    .limit(1)
    .maybeSingle();

  let dayId: string | null = null;
  if (phase) {
    const { data: exactDay } = await supabase
      .from('program_days')
      .select('id')
      .eq('phase_id', phase.id)
      .eq('week_number', weekNumber)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();
    dayId = exactDay?.id ?? null;

    if (!dayId) {
      const { data: templateDay } = await supabase
        .from('program_days')
        .select('id')
        .eq('phase_id', phase.id)
        .eq('week_number', 1)
        .eq('day_number', dayNumber)
        .limit(1)
        .maybeSingle();
      dayId = templateDay?.id ?? null;
    }
  }

  if (!dayId) {
    const { data: programDay } = await supabase
      .from('program_days')
      .select('id')
      .eq('program_id', program_id)
      .eq('week_number', weekNumber)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();
    dayId = programDay?.id ?? null;
  }

  if (!dayId) {
    const { data: fallbackDay } = await supabase
      .from('program_days')
      .select('id')
      .eq('program_id', program_id)
      .eq('day_number', dayNumber)
      .limit(1)
      .maybeSingle();
    dayId = fallbackDay?.id ?? null;
  }

  if (!dayId) throw new Error('День программы не найден');

  // 4. program_exercise: match by position (primary), fallback by old exercise_id
  let programExerciseId: string | null = null;
  if (workoutExercise.position != null) {
    const { data } = await supabase
      .from('program_exercises')
      .select('id')
      .eq('program_day_id', dayId)
      .eq('position', workoutExercise.position)
      .limit(1)
      .maybeSingle();
    programExerciseId = data?.id ?? null;
  }
  if (!programExerciseId && workoutExercise.exercise_id) {
    const { data } = await supabase
      .from('program_exercises')
      .select('id')
      .eq('program_day_id', dayId)
      .eq('exercise_id', workoutExercise.exercise_id)
      .limit(1)
      .maybeSingle();
    programExerciseId = data?.id ?? null;
  }
  if (!programExerciseId) throw new Error('Упражнение в программе не найдено');

  // 5. Update program_exercises (колонки: exercise_name + exercise_id; primary_muscles
  // в program_exercises нет — подтягивается через JOIN с exercises таблицей)
  const { error: peErr } = await supabase
    .from('program_exercises')
    .update({ exercise_id: newExerciseId, exercise_name: newExerciseName })
    .eq('id', programExerciseId);

  if (peErr) throw peErr;

  // 6. Update текущей workout_exercises.exercise_id — чтобы sync не пересоздал строку.
  // Критично для не начатых тренировок: sync удаляет workout_exercises, у которых
  // exercise_id не совпадает ни с одним program_exercise (orphaned by exercise_id),
  // и вставляет новый с новым id → osиротил бы pending workout_logs.
  const { error: weUpdErr } = await supabase
    .from('workout_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', workoutExerciseId);

  if (weUpdErr) throw weUpdErr;

  // 7. Sync будущих тренировок. Для готовых (seeded) программ может упасть —
  // см. комментарий в начале функции.
  await syncProgramChanges(program_id);
}

// ============================================================================
// ИНФО О ПРОГРАММЕ ДЛЯ ТРЕНИРОВКИ (шапка workout/[id])
// ============================================================================
export async function getWorkoutProgramInfo(workoutId: string): Promise<WorkoutProgramInfo | null> {
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('program_id, phase_number, programs ( name )')
    .eq('id', workoutId)
    .maybeSingle();
  if (error || !workout?.program_id) return null;

  const program = Array.isArray(workout.programs) ? workout.programs[0] : workout.programs;
  let phaseName: string | undefined;
  let phaseType: string | undefined;
  if (workout.phase_number != null) {
    const { data: phase } = await supabase
      .from('program_phases')
      .select('name, phase_type')
      .eq('program_id', workout.program_id)
      .eq('phase_number', workout.phase_number)
      .maybeSingle();
    phaseName = phase?.name;
    phaseType = phase?.phase_type;
  }
  return {
    programName: program?.name || 'Программа',
    phaseName,
    phaseType,
  };
}

// ============================================================================
// АКТИВНАЯ ПРОГРАММА (для дашборда)
// ============================================================================
export async function getActiveProgram(userId: string) {
  const { data, error } = await supabase
    .from('user_programs')
    .select(
      `*, programs ( id, name, level, duration, description, schedule, program_phases ( id, phase_number, name, phase_type, weeks_count, program_days ( id, day_number, week_number, name, program_exercises ( id, exercise_name, sets, reps_range, rest_seconds, intensity, position, target_rpe ) ) ) )`
    )
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
