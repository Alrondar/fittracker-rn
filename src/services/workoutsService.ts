import { supabase } from '../lib/supabase';
import { finishWorkoutAndAdvance } from './workoutService';
import { networkOrProgram, type ProgramSnapshotData } from '../lib/programSnapshot';
import {
  buildWorkoutsData,
  type ActiveProgramLite,
  type WorkoutListRow,
} from '../utils/workoutSections';

export interface ActiveProgram {
  programId: string;
  name: string;
  currentPhase: number;
  currentWeek: number;
  currentDay: number;
  phases: any[];
}

export interface WorkoutSection {
  key: string;
  phaseNumber: number;
  phaseName: string;
  phaseType: string;
  weekNumber: number;
  data: any[];
}

export interface WorkoutsProgress {
  completed: number;
  total: number;
}

export interface WorkoutsData {
  activeProgram: ActiveProgram | null;
  sections: WorkoutSection[];
  progress: WorkoutsProgress;
}

export async function getWorkoutsData(userId: string): Promise<WorkoutsData> {
  const source = await networkOrProgram(userId, () => loadActiveSource(userId), sourceFromSnapshot);
  return buildWorkoutsData(source.active, source.workouts);
}

type ActiveSource = { active: ActiveProgramLite | null; workouts: WorkoutListRow[] };

/**
 * Строки тренировок программы. Порядок (фаза → неделя → день) задаёт не запрос, а
 * buildWorkoutsData: у пути из снимка того же запроса нет, а список дней обязан
 * совпадать с сетевым байт в байт.
 */
async function pullWorkoutRows(userId: string, programId: string): Promise<WorkoutListRow[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, name, description, program_id, phase_number, week_number, day_index, created_at, started_at, finished_at, duration_seconds, skipped_at'
    )
    .eq('user_id', userId)
    .eq('program_id', programId)
    .order('phase_number', { ascending: true })
    .order('week_number', { ascending: true })
    .order('day_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkoutListRow[];
}

async function loadActiveSource(userId: string): Promise<ActiveSource> {
  const { data: userProgram, error: progError } = await supabase
    .from('user_programs')
    .select(
      `program_id, current_phase, current_week, current_day, programs!inner (name, program_phases (phase_number, name, phase_type))`
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (progError) throw progError;
  if (!userProgram) return { active: null, workouts: [] };

  const prog = Array.isArray(userProgram.programs) ? userProgram.programs[0] : userProgram.programs;
  const active: ActiveProgramLite = {
    programId: userProgram.program_id,
    name: prog?.name || 'Программа',
    currentPhase: userProgram.current_phase ?? 1,
    currentWeek: userProgram.current_week ?? 1,
    currentDay: userProgram.current_day ?? 1,
    phases: prog?.program_phases || [],
  };

  return { active, workouts: await pullWorkoutRows(userId, active.programId) };
}

/** Тот же ActiveSource из снимка программы — без сети и без отдельной логики. */
function sourceFromSnapshot(data: ProgramSnapshotData): ActiveSource | null {
  if (!data.userProgram) return null;
  return {
    active: {
      programId: data.programId,
      name: data.program?.name || 'Программа',
      currentPhase: data.userProgram.current_phase ?? 1,
      currentWeek: data.userProgram.current_week ?? 1,
      currentDay: data.userProgram.current_day ?? 1,
      phases: data.phases.map((phase) => ({
        phase_number: phase.phase_number,
        name: phase.name,
        phase_type: phase.phase_type,
      })),
    },
    workouts: data.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      phase_number: workout.phase_number,
      week_number: workout.week_number,
      day_index: workout.day_index,
      finished_at: workout.finished_at,
      skipped_at: workout.skipped_at,
    })),
  };
}

/**
 * UX-5 Feature 2: Пропустить тренировку программы.
 * ADV-atomic (18.10): раньше — два запроса (запись finished_at/skipped_at,
 * затем сдвиг указателя). Теперь один RPC пишет обе метки и двигает указатель
 * в одной транзакции по CAS-правилу, поэтому «Повторить» на экране тренировок
 * не может пропустить второй день. programId больше не нужен: база берёт
 * программу и тройку дня из самой строки тренировки.
 */
export async function skipWorkout(workoutId: string, userId: string): Promise<void> {
  await finishWorkoutAndAdvance(userId, workoutId, new Date().toISOString(), null, true);
}
