// src/services/profileService.ts
// Профиль, статистика, питание, личные рекорды (FEAT-1.4: e1RM), травмы.
import { supabase } from '../lib/supabase';
import { epley } from '../utils/e1rm';
import { UserInjury, WarningRule } from '../constants/injuries';

export interface ProfileData {
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  weight: number | null;
}

export interface ProfileStats {
  totalWorkouts: number;
  totalPrograms: number;
  totalVolume: number;
}

export interface NutritionTargets {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

export interface DailyNutrition {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  water_ml: number;
}

export interface PersonalRecord {
  name: string;
  maxWeight: number;
  reps: number;
  /** FEAT-1.4: лучший e1RM (Epley) по всем сетам упражнения */
  e1rm: number;
}

export const profileService = {
  async getProfileData(userId: string): Promise<ProfileData> {
    const { data: { user } } = await supabase.auth.getUser();

    // maybeSingle: если профиля ещё нет — вернёт null без ошибки PGRST116
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, current_weight_kg')
      .eq('id', userId)
      .maybeSingle();

    return {
      email: user?.email || '',
      username: profileData?.username || user?.email?.split('@')[0] || 'Пользователь',
      fullName: profileData?.full_name || null,
      avatarUrl: profileData?.avatar_url || null,
      weight: profileData?.current_weight_kg
        ? parseFloat(profileData.current_weight_kg)
        : null,
    };
  },

  // SEC-10: обновление имени из настроек (вынесено из UI settings.tsx).
  // RLS profiles_update гарантирует auth.uid() = id.
  async updateFullName(userId: string, fullName: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId);
    if (error) throw error;
  },

  async getStats(userId: string): Promise<ProfileStats> {
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, workout_exercises (workout_logs (weight_kg, reps))')
      .eq('user_id', userId);

    const { data: programs } = await supabase
      .from('user_programs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    let totalVolume = 0;
    let totalWorkouts = 0;
    workouts?.forEach((workout: any) => {
      const hasLogs = workout.workout_exercises?.some(
        (ex: any) => ex.workout_logs?.length > 0,
      );
      if (hasLogs) {
        totalWorkouts++;
        workout.workout_exercises?.forEach((ex: any) => {
          ex.workout_logs?.forEach((log: any) => {
            totalVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
          });
        });
      }
    });

    return {
      totalWorkouts,
      totalPrograms: programs?.length || 0,
      totalVolume: Math.round(totalVolume),
    };
  },

  async getNutritionTargets(userId: string): Promise<NutritionTargets> {
    // maybeSingle: отсутствие профиля не роняет запрос
    const { data } = await supabase
      .from('profiles')
      .select('target_calories, target_proteins, target_fats, target_carbs')
      .eq('id', userId)
      .maybeSingle();

    return {
      calories: data?.target_calories || 0,
      proteins: data?.target_proteins || 0,
      fats: data?.target_fats || 0,
      carbs: data?.target_carbs || 0,
    };
  },

  async getDailyNutrition(userId: string): Promise<DailyNutrition> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('nutrition_logs')
      .select('calories, proteins, fats, carbs, water_ml')
      .eq('user_id', userId)
      .eq('log_date', today)
      .neq('meal_type', 'workout');

    if (!data || data.length === 0) {
      return { calories: 0, proteins: 0, fats: 0, carbs: 0, water_ml: 0 };
    }
    return data.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        proteins: acc.proteins + (log.proteins || 0),
        fats: acc.fats + (log.fats || 0),
        carbs: acc.carbs + (log.carbs || 0),
        water_ml: acc.water_ml + (log.water_ml || 0),
      }),
      { calories: 0, proteins: 0, fats: 0, carbs: 0, water_ml: 0 },
    );
  },

  async getBurnedCalories(
    userId: string,
    userWeight: number,
    days: number = 1,
  ): Promise<number> {
    let startISO: string;
    let endISO: string;
    if (days === 1) {
      // Сохраняем семантику «за сегодня» (от начала дня до конца дня)
      const today = new Date().toISOString().split('T')[0];
      startISO = `${today}T00:00:00+00:00`;
      endISO = `${today}T23:59:59+00:00`;
    } else {
      // Для периода — последние N дней
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      startISO = start.toISOString();
      endISO = now.toISOString();
    }

    const { data: periodWorkouts } = await supabase
      .from('workouts')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', endISO);

    if (!periodWorkouts || periodWorkouts.length === 0) return 0;
    const workoutIds = periodWorkouts.map((w) => w.id);

    // ✅ Устранён N+1: один запрос всех логов за период вместо запроса на каждую тренировку
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('completed_at, workout_exercises!inner (workout_id)')
      .in('workout_exercises.workout_id', workoutIds)
      .order('completed_at', { ascending: true });

    const logsByWorkout = new Map<string, number[]>();
    logs?.forEach((log: any) => {
      const workoutId = log.workout_exercises?.workout_id;
      if (!workoutId) return;
      const t = new Date(log.completed_at).getTime();
      if (!logsByWorkout.has(workoutId)) logsByWorkout.set(workoutId, []);
      logsByWorkout.get(workoutId)!.push(t);
    });

    let totalBurned = 0;
    logsByWorkout.forEach((times) => {
      if (times.length >= 2) {
        const firstLog = Math.min(...times);
        const lastLog = Math.max(...times);
        const durationHours = Math.max(0, (lastLog - firstLog) / 1000 / 3600);
        totalBurned += 5.0 * userWeight * durationHours;
      } else {
        // Fallback: тренировка без логов ≈ 45 минут
        totalBurned += 5.0 * userWeight * (45 / 60);
      }
    });

    return Math.round(totalBurned);
  },

  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    const { data: userWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId);

    if (!userWorkouts || userWorkouts.length === 0) return [];
    const workoutIds = userWorkouts.map((w) => w.id);

    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id')
      .in('workout_id', workoutIds);

    if (!workoutExercises || workoutExercises.length === 0) return [];
    const exerciseIds = [...new Set(workoutExercises.map((we) => we.exercise_id))];
    const workoutExerciseIds = workoutExercises.map((we) => we.id);

    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', exerciseIds);
    const exerciseNameMap = new Map(exercises?.map((e) => [e.id, e.name]) || []);

    const { data: logs } = await supabase
      .from('workout_logs')
      .select('workout_exercise_id, weight_kg, reps')
      .in('workout_exercise_id', workoutExerciseIds)
      .order('weight_kg', { ascending: false });

    const exerciseRecords: Record<string, PersonalRecord> = {};
    logs?.forEach((log: any) => {
      const workoutExercise = workoutExercises.find(
        (we) => we.id === log.workout_exercise_id,
      );
      if (!workoutExercise) return;
      const exerciseId = workoutExercise.exercise_id;
      const exerciseName = exerciseNameMap.get(exerciseId);
      if (!exerciseName) return;
      const weight = parseFloat(log.weight_kg) || 0;
      const reps = parseInt(log.reps) || 0;
      const setE1rm = epley(weight, reps);
      const existing = exerciseRecords[exerciseId];
      if (!existing || weight > existing.maxWeight) {
        exerciseRecords[exerciseId] = {
          name: exerciseName,
          maxWeight: weight,
          reps,
          // лучший e1RM по всем сетам: лёгкий многоповторный сет может дать больше
          e1rm: Math.max(setE1rm, existing?.e1rm ?? 0),
        };
      } else if (setE1rm > existing.e1rm) {
        existing.e1rm = setE1rm;
      }
    });

    return Object.values(exerciseRecords)
      .filter((record) => record.maxWeight > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight)
      .slice(0, 5);
  },

  async saveNutritionLog(
    userId: string,
    data: { calories: number; proteins: number; fats: number; carbs: number; water_ml: number },
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('nutrition_logs').insert({
      user_id: userId,
      log_date: today,
      meal_type: 'manual',
      ...data,
    });
    if (error) throw error;
  },
};

// ============================================================================
// ТРАВМЫ — standalone-функции (для useInjuryWarnings и warmupService)
// ============================================================================

/** Активные травмы пользователя (все, кроме полностью восстановленных). */
export async function getActiveInjuries(userId: string): Promise<UserInjury[]> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('body_part, injury_type, severity')
    .eq('user_id', userId)
    .neq('status', 'recovered');

  if (error) throw error;

  return (data || []) as UserInjury[];
}

/**
 * Правила предупреждений (body_part → muscle_group → рекомендация).
 * Таблица может отсутствовать — возвращаем пустой список, не роняем.
 */
export async function getInjuryWarningRules(): Promise<WarningRule[]> {
  const { data, error } = await supabase
    .from('injury_exercise_warnings')
    .select('body_part, muscle_group, recommendation');

  if (error) return [];

  return (data || []) as WarningRule[];
}