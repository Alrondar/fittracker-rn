import { supabase } from '../lib/supabase';
import { toDateKeyFromIso } from '../utils/dateKey';

/**
 * Данные, нужные правилу напоминания (src/utils/reminders.ts), в пересчёте на
 * один день. Отдельный сервис — чтобы не возвращать на «Главную» блоки, которые
 * она не читает (позиция 9-3 их вырезала ровно по этой причине).
 */
export interface ReminderSourceData {
  programName: string | null;
  /** Короткие имена дней из расписания программы ('Пн'…'Вс'); null — не задано. */
  schedule: string[] | null;
  /** По указателю программы есть незакрытое занятие. */
  workoutDue: boolean;
  /** Локальный ключ дня последней завершённой тренировки; null — таких не было. */
  lastFinishedKey: string | null;
}

export async function getReminderSourceData(userId: string): Promise<ReminderSourceData> {
  const { data: userProgram, error: programError } = await supabase
    .from('user_programs')
    .select('program_id, current_phase, current_week, current_day, programs!inner (name, schedule)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (programError) throw programError;

  const program = Array.isArray(userProgram?.programs)
    ? userProgram.programs[0]
    : userProgram?.programs;

  const empty: ReminderSourceData = {
    programName: null,
    schedule: null,
    workoutDue: false,
    lastFinishedKey: null,
  };

  if (!userProgram) return empty;

  const result: ReminderSourceData = {
    programName: program?.name ?? null,
    schedule: program?.schedule ?? null,
    workoutDue: false,
    lastFinishedKey: null,
  };

  const { data: dueWorkout, error: dueError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .eq('program_id', userProgram.program_id)
    .eq('phase_number', userProgram.current_phase ?? 1)
    .eq('week_number', userProgram.current_week ?? 1)
    .eq('day_index', userProgram.current_day ?? 1)
    .is('finished_at', null)
    .is('skipped_at', null)
    .limit(1)
    .maybeSingle();

  if (dueError) throw dueError;
  result.workoutDue = !!dueWorkout;

  const { data: lastFinished, error: lastError } = await supabase
    .from('workouts')
    .select('finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (lastError) throw lastError;
  result.lastFinishedKey = toDateKeyFromIso(lastFinished?.finished_at);

  return result;
}
