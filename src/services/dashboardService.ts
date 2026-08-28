import { supabase } from '../lib/supabase';
import { profileService } from './profileService';
import { computeStreaks, StreakStats } from '../utils/streak';
import { roundE1rm } from '../utils/e1rm';

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

export interface DashboardLastWorkout {
  id: string;
  name: string;
  date: string;
  durationSeconds: number;
  exercisesCount: number;
  totalVolume: number;
}

export interface DashboardExerciseProgressHistoryItem {
  date: string;
  maxWeight: number;
  volume: number;
}

export interface DashboardExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  history: DashboardExerciseProgressHistoryItem[];
  currentMaxWeight: number;
  currentVolume: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardPersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  /** FEAT-1.4: оценочный 1ПМ (Epley) от рекордного сета */
  e1rm: number;
  recordDate: string;
}

export interface DashboardData {
  userName: string;
  activeProgram: DashboardActiveProgram | null;
  workoutDates: string[];
  weeklyStats: {
    workoutsCount: number;
    totalVolume: number;
    burnedCalories: number;
  };
  exerciseProgress: DashboardExerciseProgress[];
  personalRecords: DashboardPersonalRecord[];
  lastWorkout: DashboardLastWorkout | null;
  totalWorkouts: number;
  /** FEAT-1.3: недельный стрик */
  streak: StreakStats;
}

function parseVolumeFromWorkouts(workouts: any[]): number {
  let volume = 0;

  workouts?.forEach((workout: any) => {
    workout.workout_exercises?.forEach((exercise: any) => {
      exercise.workout_logs?.forEach((log: any) => {
        // ENG-13: разминка не учитывается в недельном объёме
        if (log.is_warmup) return;
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        volume += weight * reps;
      });
    });
  });

  return volume;
}

function parseExerciseProgress(recentWorkouts: any[]): DashboardExerciseProgress[] {
  const exerciseMap: Record<string, any> = {};

  recentWorkouts?.forEach((workout: any) => {
    // Effective date: finished_at ?? started_at ?? created_at.
    const effectiveDate = workout.finished_at ?? workout.started_at ?? workout.created_at;
    workout.workout_exercises?.forEach((exercise: any) => {
      exercise.workout_logs?.forEach((log: any) => {
        // ENG-13: разминочные сеты не влияют на тренды упражнений
        if (log.is_warmup) return;
        const exerciseId = exercise.exercise_id;

        if (!exerciseId) return;

        const exerciseName = exercise.exercises?.name || 'Упражнение';
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        const volume = weight * reps;

        if (!exerciseMap[exerciseId]) {
          exerciseMap[exerciseId] = {
            exerciseId,
            exerciseName,
            history: [],
            maxWeight: 0,
            volume: 0,
          };
        }

        exerciseMap[exerciseId].history.push({
          date: effectiveDate,
          maxWeight: weight,
          volume,
        });

        if (weight > exerciseMap[exerciseId].maxWeight) {
          exerciseMap[exerciseId].maxWeight = weight;
        }

        exerciseMap[exerciseId].volume += volume;
      });
    });
  });

return Object.values(exerciseMap)
  .map((exercise: any) => {
    // recentWorkouts приходят в порядке убывания даты.
    // history разворачиваем в хронологический порядок: старые → новые.
    const history: DashboardExerciseProgressHistoryItem[] = exercise.history.slice().reverse();

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    const currentMaxWeight = current?.maxWeight || 0;
    const previousMaxWeight = previous?.maxWeight || 0;
    const currentVolume = current?.volume || 0;

    const trend: DashboardExerciseProgress['trend'] =
      currentMaxWeight > previousMaxWeight
        ? 'up'
        : currentMaxWeight < previousMaxWeight
          ? 'down'
          : 'stable';

      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        history,
        currentMaxWeight,
        currentVolume,
        trend,
      };
    })
    .slice(0, 3);
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
const [
  profileResult,
  activeProgramResult,
  workoutDatesResult,
  weeklyStatsResult,
  lastWorkoutResult,
  totalWorkoutsResult,
  recentWorkoutsResult,
] = await Promise.allSettled([
supabase
  .from('profiles')
  .select('full_name, username, current_weight_kg')
  .eq('id', userId)
  .maybeSingle(),

    supabase
      .from('user_programs')
      .select(`
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
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),

    supabase
      .from('workouts')
      .select('created_at, started_at, finished_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from('workouts')
      .select('workout_exercises (workout_logs (weight_kg, reps, is_warmup))')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from('workouts')
      .select(`
        id,
        name,
        created_at,
        started_at,
        finished_at,
        duration_seconds,
        workout_exercises (
          id,
          workout_logs (
            weight_kg,
            reps,
            is_warmup
          )
        )
      `)
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('finished_at', 'is', null),

    supabase
      .from('workouts')
      .select(`
        id,
        created_at,
        started_at,
        finished_at,
        workout_exercises (
          exercise_id,
          exercises (
            name
          ),
          workout_logs (
            weight_kg,
            reps,
            is_warmup
          )
        )
      `)
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false, nullsFirst: false })
      .limit(20),

  ]);

  if (__DEV__) {
    const warnIfError = (
      name: string,
      result: PromiseSettledResult<any>
    ) => {
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
    warnIfError('workoutDates', workoutDatesResult);
    warnIfError('weeklyStats', weeklyStatsResult);
    warnIfError('lastWorkout', lastWorkoutResult);
    warnIfError('totalWorkouts', totalWorkoutsResult);
    warnIfError('recentWorkouts', recentWorkoutsResult);
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
      phases.find((phase: any) => phase.phase_number === currentPhaseNumber) ||
      phases[0];

    const phaseDays = (currentPhase?.program_days || [])
      .slice()
      .sort((a: any, b: any) => {
        if ((a.week_number ?? 1) !== (b.week_number ?? 1)) {
          return (a.week_number ?? 1) - (b.week_number ?? 1);
        }

        return a.day_number - b.day_number;
      });

    const currentDayObject =
      phaseDays.find(
        (day: any) =>
          (day.week_number ?? 1) === currentWeek &&
          day.day_number === currentDay
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

  let workoutDates: string[] = [];

  if (workoutDatesResult.status === 'fulfilled' && workoutDatesResult.value.data) {
    workoutDates = workoutDatesResult.value.data
      .map((workout: any) => {
        // Effective date: finished_at ?? started_at ?? created_at
        const effectiveDate = workout.finished_at ?? workout.started_at ?? workout.created_at;
        return effectiveDate?.split('T')[0];
      })
      .filter(Boolean);
  }

let weeklyStats = {
  workoutsCount: 0,
  totalVolume: 0,
  burnedCalories: 0,
};
if (weeklyStatsResult.status === 'fulfilled' && weeklyStatsResult.value.data) {
  const workouts = weeklyStatsResult.value.data;
  const workoutsCount = workouts?.length || 0;
  const totalVolume = parseVolumeFromWorkouts(workouts);

  // Персонализированная формула калорий (едина с profileService)
  let userWeight = 70; // fallback
  if (profileResult.status === 'fulfilled' && profileResult.value.data?.current_weight_kg) {
    userWeight = parseFloat(profileResult.value.data.current_weight_kg) || 70;
  }

  let burnedCalories = 0;
  try {
    burnedCalories = (await profileService.getBurnedCalories(userId, 7)) ?? 0;
  } catch {
    burnedCalories = workoutsCount * 300; // graceful fallback
  }

  weeklyStats = {
    workoutsCount,
    totalVolume,
    burnedCalories,
  };
}

  let lastWorkout: DashboardLastWorkout | null = null;

  if (lastWorkoutResult.status === 'fulfilled' && lastWorkoutResult.value.data) {
    const workout = lastWorkoutResult.value.data;

    let totalVolume = 0;
    let exercisesCount = 0;

    workout.workout_exercises?.forEach((exercise: any) => {
      // ENG-13: упражнение считается «выполненным», если в нём есть хотя бы 1 рабочий сет
      const hasWorkingSet = exercise.workout_logs?.some((l: any) => !l.is_warmup);
      if (hasWorkingSet) {
        exercisesCount += 1;

        exercise.workout_logs.forEach((log: any) => {
          // ENG-13: разминка не считается в объёме последней тренировки
          if (log.is_warmup) return;
          const weight = parseFloat(log.weight_kg) || 0;
          const reps = parseInt(log.reps) || 0;
          totalVolume += weight * reps;
        });
      }
    });

    // Effective date: finished_at ?? started_at ?? created_at
    const lastWorkoutDate = workout.finished_at ?? workout.started_at ?? workout.created_at;
    lastWorkout = {
      id: workout.id,
      name: workout.name,
      date: lastWorkoutDate,
      durationSeconds: workout.duration_seconds || 0,
      exercisesCount,
      totalVolume,
    };
  }

  let totalWorkouts = 0;

  if (
    totalWorkoutsResult.status === 'fulfilled' &&
    totalWorkoutsResult.value.count !== undefined
  ) {
    totalWorkouts = totalWorkoutsResult.value.count || 0;
  }

  let exerciseProgress: DashboardExerciseProgress[] = [];

  if (recentWorkoutsResult.status === 'fulfilled' && recentWorkoutsResult.value.data) {
    exerciseProgress = parseExerciseProgress(recentWorkoutsResult.value.data);
  }

// PR без bias: переиспользуем корректную группировку из profileService
let personalRecords: DashboardPersonalRecord[] = [];
try {
  const records = await profileService.getPersonalRecords(userId);
      personalRecords = records.map((record) => ({
        exerciseName: record.name,
        maxWeight: record.maxWeight,
        maxReps: record.reps,
        e1rm: roundE1rm(record.e1rm),
        recordDate: '',
      }));
    } catch {
      personalRecords = [];
    }

    // FEAT-1.3: стрик по ВСЕЙ истории (workoutDates ограничен 14 днями для календаря)
    let streak: StreakStats = { current: 0, best: 0, activeThisWeek: false };
    try {
      const { data: streakDates } = await supabase
        .from('workouts')
        .select('created_at, started_at, finished_at')
        .eq('user_id', userId)
        .not('finished_at', 'is', null);
      streak = computeStreaks(
        (streakDates ?? []).map((w: { created_at: string | null; started_at: string | null; finished_at: string | null }) => {
          // Effective date: finished_at ?? started_at ?? created_at
          return w.finished_at ?? w.started_at ?? w.created_at;
        }).filter(Boolean) as string[],
      );
    } catch {
      streak = { current: 0, best: 0, activeThisWeek: false };
    }

    return {
      userName,
      activeProgram,
      workoutDates,
      weeklyStats,
      exerciseProgress,
      personalRecords,
      lastWorkout,
      totalWorkouts,
      streak,
    };
}