import { supabase } from '../lib/supabase';

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
  // 1. Активная программа + фазы + прогресс
  const { data: userProgram, error: progError } = await supabase
    .from('user_programs')
    .select(
      `program_id, current_phase, current_week, current_day, programs!inner (name, program_phases (phase_number, name, phase_type))`
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (progError) throw progError;

  if (!userProgram) {
    return {
      activeProgram: null,
      sections: [],
      progress: { completed: 0, total: 0 },
    };
  }

  const prog = Array.isArray(userProgram.programs)
    ? userProgram.programs[0]
    : userProgram.programs;
  const phases = prog?.program_phases || [];
  const curPhase = userProgram.current_phase ?? 1;
  const curWeek = userProgram.current_week ?? 1;
  const curDay = userProgram.current_day ?? 1;

  const activeProgram: ActiveProgram = {
    programId: userProgram.program_id,
    name: prog?.name || 'Программа',
    currentPhase: curPhase,
    currentWeek: curWeek,
    currentDay: curDay,
    phases,
  };

  // 2. Тренировки программы (со статусами) — UX-5 Feature 2: +skipped_at
  const { data: workouts, error: workError } = await supabase
    .from('workouts')
    .select(
      'id, name, description, program_id, phase_number, week_number, day_index, created_at, started_at, finished_at, duration_seconds, skipped_at'
    )
    .eq('user_id', userId)
    .eq('program_id', userProgram.program_id)
    .order('phase_number', { ascending: true })
    .order('week_number', { ascending: true })
    .order('day_index', { ascending: true });

  if (workError) throw workError;

  const list = workouts || [];

  // 3. Прогресс (выполнено / всего)
  const completed = list.filter((w) => w.finished_at).length;

  // 4. Секции по (фаза, неделя)
  const phaseMap = new Map<number, any>(phases.map((p: any) => [p.phase_number, p]));
  const groups = new Map<string, any[]>();
  list.forEach((w) => {
    const key = `${w.phase_number ?? 1}-${w.week_number ?? 1}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  });

  const sections: WorkoutSection[] = Array.from(groups.entries()).map(([key, data]) => {
    const [phaseNum, weekNum] = key.split('-').map(Number);
    const phase = phaseMap.get(phaseNum);
    return {
      key,
      phaseNumber: phaseNum,
      phaseName: phase?.name || `Фаза ${phaseNum}`,
      phaseType: phase?.phase_type || 'custom',
      weekNumber: weekNum,
      data,
    };
  });

  return {
    activeProgram,
    sections,
    progress: { completed, total: list.length },
  };
}

/**
 * UX-5 Feature 2: Пропустить тренировку программы.
 * Sequential: 1) update workouts (finished_at + skipped_at) → 2) advanceProgramProgress.
 * Паттерн saveWorkout: sequential + retry при ошибке advance.
 */
export async function skipWorkout(
  workoutId: string,
  userId: string,
  programId: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('workouts')
    .update({
      finished_at: new Date().toISOString(),
      skipped_at: new Date().toISOString(),
    })
    .eq('id', workoutId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // advanceProgramProgress — из programsService (dynamic import для избежания circular dependency)
  const { advanceProgramProgress } = await import('./programsService');
  await advanceProgramProgress(userId, programId);
}