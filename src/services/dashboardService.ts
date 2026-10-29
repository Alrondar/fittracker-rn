import { supabase } from '../lib/supabase';
import { computeStreaks, StreakStats } from '../utils/streak';

export interface DashboardActiveProgram {
  programId: string;
  currentPhase: number;
  phaseName?: string;
  phaseType?: string;
  totalPhases: number;
  currentWeek: number;
  currentDay: number;
  programName: string;
  dayName: string;
  totalDays: number;
}

export interface DashboardData {
  userName: string;
  activeProgram: DashboardActiveProgram | null;
  totalWorkouts: number;
  /** FEAT-1.3: недельный стрик */
  streak: StreakStats;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [profileResult, activeProgramResult, totalWorkoutsResult] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('full_name, username, current_weight_kg')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('user_programs')
      .select(
        `
        program_id,
        current_phase,
        current_week,
        current_day,
        is_active,
        programs!inner (
          name,
          duration,
          program_phases (
            phase_number,
            name,
            phase_type,
            weeks_count,
            program_days (
              name,
              day_number,
              week_number
            )
          )
        )
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),

    supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .is('skipped_at', null), // FIT-7: пропуски не входят в счётчик тренировок
  ]);

  if (__DEV__) {
    const warnIfError = (name: string, result: PromiseSettledResult<any>) => {
      if (result.status === 'rejected') {
        console.warn(`[dashboard] ${name} rejected:`, result.reason);
        return;
      }

      if (result.value?.error) {
        console.warn(`[dashboard] ${name}:`, result.value.error.message);
      }
    };

    warnIfError('profile', profileResult);
    warnIfError('activeProgram', activeProgramResult);
    warnIfError('totalWorkouts', totalWorkoutsResult);
  }

  let userName = 'Пользователь';

  if (profileResult.status === 'fulfilled' && profileResult.value.data) {
    const profile = profileResult.value.data;
    userName = profile.full_name || profile.username || 'Пользователь';
  }

  let activeProgram: DashboardActiveProgram | null = null;

  if (activeProgramResult.status === 'fulfilled' && activeProgramResult.value.data) {
    const userProgram = activeProgramResult.value.data;

    const program = Array.isArray(userProgram.programs)
      ? userProgram.programs[0]
      : userProgram.programs;

    const phases = (program?.program_phases || [])
      .slice()
      .sort((a: any, b: any) => a.phase_number - b.phase_number);

    const currentPhaseNumber = userProgram.current_phase ?? 1;
    const currentWeek = userProgram.current_week ?? 1;
    const currentDay = userProgram.current_day ?? 1;

    const currentPhase =
      phases.find((phase: any) => phase.phase_number === currentPhaseNumber) || phases[0];

    const phaseDays = (currentPhase?.program_days || []).slice().sort((a: any, b: any) => {
      if ((a.week_number ?? 1) !== (b.week_number ?? 1)) {
        return (a.week_number ?? 1) - (b.week_number ?? 1);
      }

      return a.day_number - b.day_number;
    });

    const currentDayObject =
      phaseDays.find(
        (day: any) => (day.week_number ?? 1) === currentWeek && day.day_number === currentDay
      ) ||
      phaseDays.find((day: any) => day.day_number === currentDay) ||
      phaseDays[0];

    const daysThisWeek = phaseDays.filter(
      (day: any) => (day.week_number ?? 1) === currentWeek
    ).length;

    activeProgram = {
      programId: userProgram.program_id,
      currentPhase: currentPhaseNumber,
      phaseName: currentPhase?.name,
      phaseType: currentPhase?.phase_type,
      totalPhases: phases.length,
      currentWeek,
      currentDay,
      programName: program?.name || 'Программа',
      dayName: currentDayObject?.name || 'День тренировки',
      totalDays: daysThisWeek || phaseDays.length || 1,
    };
  }

  let totalWorkouts = 0;

  if (totalWorkoutsResult.status === 'fulfilled' && totalWorkoutsResult.value.count !== undefined) {
    totalWorkouts = totalWorkoutsResult.value.count || 0;
  }

  // FEAT-1.3: стрик по ВСЕЙ истории занятий
  let streak: StreakStats = { current: 0, best: 0, activeThisWeek: false };
  try {
    const { data: streakDates } = await supabase
      .from('workouts')
      .select('created_at, started_at, finished_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .is('skipped_at', null); // FIT-7: стрик не строится на пропусках
    streak = computeStreaks(
      (streakDates ?? [])
        .map(
          (w: {
            created_at: string | null;
            started_at: string | null;
            finished_at: string | null;
          }) => {
            // Effective date: finished_at ?? started_at ?? created_at
            return w.finished_at ?? w.started_at ?? w.created_at;
          }
        )
        .filter(Boolean) as string[]
    );
  } catch {
    streak = { current: 0, best: 0, activeThisWeek: false };
  }

  return {
    userName,
    activeProgram,
    totalWorkouts,
    streak,
  };
}
