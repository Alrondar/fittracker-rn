// src/services/progressService.ts
// Progress hub: агрегированные данные для ответа «Как я меняюсь?» (PRODUCT.md §11).
// Колонки сверены с types/database.types.ts (18.08.2026):
// - workout_exercises НЕ имеет exercise_name — имена только через embed exercises(name);
// - workout_logs.completed_at существует;
// - дата замера в body_metrics — metric_date;
// - skip = finished_at + skipped_at (FIT-7) → исключаем через .is('skipped_at', null).
// Нигде в сервисе нет .in()-цепочек (источник 400 Bad Request) — только вложенные
// embed-запросы по FK (паттерн, доказанный в runtime).
// UI не ходит в supabase напрямую — только через этот сервис (CLAUDE.md §2).
//
// TEMP(tracing): console.log '[progress] ...' — временная трассировка для диагностики;
// снять после подтверждения зелёного рантайма.
import { supabase } from '../lib/supabase';
import { epley } from '../utils/e1rm';
import { computeStreaks } from '../utils/streak';
import { profileService, PersonalRecord } from './profileService';

export interface WeeklyVolume {
  weekStart: string; // YYYY-MM-DD (понедельник)
  weekEnd: string;
  volume: number;
  workoutsCount: number;
}

export interface PersonalRecordWithDate extends PersonalRecord {
  recordDate: string; // ISO date
  /** id тренировки, где установлен рекорд — для перехода в Workout Report */
  workoutId: string;
}

export interface StrengthPoint {
  weekStart: string; // YYYY-MM-DD (понедельник)
  e1rm: number;
}

export interface StrengthSeries {
  exerciseName: string;
  points: StrengthPoint[];
}

export interface WeightPoint {
  date: string; // YYYY-MM-DD (metric_date)
  weightKg: number;
}

export interface ProgressData {
  weeklyVolume: WeeklyVolume[]; // последние 8 недель
  personalRecords: PersonalRecordWithDate[]; // top-5 с датами
  strengthTrend: StrengthSeries[]; // top-3 упражнения по e1RM
  weightTrend: WeightPoint[]; // замеры веса за 8 недель
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  bestStreak: number;
}

/**
 * Данные для Progress hub.
 * Core-блоки (stats/volume/streak): ошибка → error-state с меткой источника.
 * Опциональные блоки (personalRecords временно, strength/weight постоянно):
 * ошибка → блок деградирует в [], экран живёт; причина — в console.error (Metro).
 */
export async function getProgressData(userId: string): Promise<ProgressData> {
  console.log('[progress] fetch start'); // TEMP(tracing)

  const [stats, weeklyVolume, streakData] = await Promise.all([
    required('stats', profileService.getStats(userId)),
    required('weeklyVolume', getWeeklyVolume(userId, 8)),
    required('streak', getStreakData(userId)),
  ]);

  // personalRecords временно optional: экран не роняем, причину видим в логах.
  // Вернуть в required после подтверждения зелёного рантайма.
  const [personalRecords, strengthTrend, weightTrend] = await Promise.all([
    optional('personalRecords', getPersonalRecordsWithDates(userId), []),
    optional('strengthTrend', getStrengthTrend(userId, 8), []),
    optional('weightTrend', getWeightTrend(userId, 8), []),
  ]);

  console.log('[progress] fetch done'); // TEMP(tracing)

  return {
    weeklyVolume,
    personalRecords,
    strengthTrend,
    weightTrend,
    totalWorkouts: stats.totalWorkouts,
    totalVolume: stats.totalVolume,
    currentStreak: streakData.current,
    bestStreak: streakData.best,
  };
}

const errDetail = (e: any) =>
  `${e?.message ?? e} | code=${e?.code ?? ''} | details=${e?.details ?? ''} | hint=${e?.hint ?? ''}`;

/** Core-блок: логирует ok/FAILED и пробрасывает ошибку с меткой источника. */
async function required<T>(label: string, p: Promise<T>): Promise<T> {
  try {
    const v = await p;
    console.log(`[progress] ${label} ok`); // TEMP(tracing)
    return v;
  } catch (e: any) {
    console.error(`[progress] ${label} FAILED:`, errDetail(e)); // TEMP(tracing)
    throw new Error(`progress:${label}: ${e?.message ?? e}`);
  }
}

/** Опциональный блок: деградирует в fallback, причина — в console.error. */
async function optional<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    const v = await p;
    console.log(`[progress] ${label} ok`); // TEMP(tracing)
    return v;
  } catch (e: any) {
    console.error(`[progress] ${label} FAILED:`, errDetail(e)); // TEMP(tracing)
    return fallback;
  }
}

/**
 * Объём тренировок по неделям (окно N недель, последний bucket = текущая неделя).
 * Группировка по понедельникам на клиенте.
 */
async function getWeeklyVolume(userId: string, weeks: number): Promise<WeeklyVolume[]> {
  const now = new Date();
  const startMs = now.getTime() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000;
  const startISO = new Date(startMs).toISOString();

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('created_at, started_at, finished_at, workout_exercises (workout_logs (weight_kg, reps, is_warmup))')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .is('skipped_at', null) // FIT-7: пропуски не считаем
    .gte('finished_at', startISO)
    .order('finished_at', { ascending: true, nullsFirst: false });

  if (error) throw error;
  if (!workouts || workouts.length === 0) return [];

  const byWeek = new Map<string, { volume: number; count: number }>();

  workouts.forEach((workout: any) => {
    // Effective date: finished_at ?? started_at ?? created_at
    const effectiveDate = workout.finished_at ?? workout.started_at ?? workout.created_at;
    const weekStart = getMondayISO(new Date(effectiveDate));
    if (!byWeek.has(weekStart)) {
      byWeek.set(weekStart, { volume: 0, count: 0 });
    }
    const week = byWeek.get(weekStart)!;
    week.count += 1;

    workout.workout_exercises?.forEach((ex: any) => {
      ex.workout_logs?.forEach((log: any) => {
        // ENG-13: разминка не учитывается в объёме
        if (log.is_warmup) return;
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        week.volume += weight * reps;
      });
    });
  });

  // Инициализируем все недели (даже пустые)
  const result: WeeklyVolume[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(startMs + i * 7 * 24 * 60 * 60 * 1000);
    const weekStartStr = getMondayISO(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const data = byWeek.get(weekStartStr) || { volume: 0, count: 0 };
    result.push({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      volume: data.volume,
      workoutsCount: data.count,
    });
  }
  return result;
}

/**
 * PR с датами рекордов (top-5 по весу).
 * Один вложенный запрос: имена — embed exercises(name), без цепочки .in(),
 * которая давала 400 Bad Request.
 */
async function getPersonalRecordsWithDates(userId: string): Promise<PersonalRecordWithDate[]> {
  const { data: workouts, error } = await supabase
  .from('workouts')
  .select(
  'id, created_at, started_at, finished_at, workout_exercises (exercise_id, exercises (name), workout_logs (weight_kg, reps, completed_at, is_warmup))',
  )
  .eq('user_id', userId);

  if (error) throw error;
  if (!workouts || workouts.length === 0) return [];

  const exerciseRecords: Record<string, PersonalRecordWithDate> = {};

  workouts.forEach((workout: any) => {
    // Effective date: finished_at ?? started_at ?? created_at
    const workoutDate = workout.finished_at ?? workout.started_at ?? workout.created_at ?? '';
    workout.workout_exercises?.forEach((we: any) => {
      const exerciseId = we.exercise_id;
      const exerciseName = we.exercises?.name;
      if (!exerciseId || !exerciseName) return;

      we.workout_logs?.forEach((log: any) => {
        // ENG-13: разминка не может быть PR
        if (log.is_warmup) return;
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        if (weight <= 0 || reps <= 0) return;

        const setE1rm = epley(weight, reps);
        const recordDate = workoutDate || log.completed_at || '';

        const existing = exerciseRecords[exerciseId];
if (!existing) {
  exerciseRecords[exerciseId] = {
    exercise_id: exerciseId,
    name: exerciseName,
    maxWeight: weight,
    reps,
    e1rm: setE1rm,
    recordDate,
    workoutId: workout.id,
  };
} else {
  if (weight > existing.maxWeight) {
    existing.maxWeight = weight;
    existing.reps = reps;
  }
  if (setE1rm > existing.e1rm) {
    existing.e1rm = setE1rm;
    existing.recordDate = recordDate;
    existing.workoutId = workout.id;
  }
}
      });
    });
  });

  return Object.values(exerciseRecords)
    .filter((record) => record.maxWeight > 0)
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 5);
}

/**
 * Тренд e1RM по неделям для top-3 упражнений (по количеству недель с данными).
 * Отвечает на «Становлюсь ли я сильнее?». Точка тренда = лучший e1RM за неделю.
 * Один вложенный запрос (embed exercises(name)), без .in().
 */
async function getStrengthTrend(userId: string, weeks: number): Promise<StrengthSeries[]> {
  const startMs = Date.now() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000;
  const startISO = new Date(startMs).toISOString();

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('created_at, started_at, finished_at, workout_exercises (exercise_id, exercises (name), workout_logs (weight_kg, reps, is_warmup))')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .is('skipped_at', null)
    .gte('finished_at', startISO);

  if (error) throw error;
  if (!workouts || workouts.length === 0) return [];

  // exercise name → weekStart → e1RM[]
  const exerciseWeeks = new Map<string, Map<string, number[]>>();

  workouts.forEach((workout: any) => {
    // Effective date: finished_at ?? started_at ?? created_at
    const effectiveDate = workout.finished_at ?? workout.started_at ?? workout.created_at;
    const weekStart = getMondayISO(new Date(effectiveDate));
    workout.workout_exercises?.forEach((we: any) => {
      const name = we.exercises?.name;
      if (!name) return;
      we.workout_logs?.forEach((log: any) => {
        // ENG-13: разминочные сеты не попадают в тренд силы
        if (log.is_warmup) return;
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        if (weight <= 0 || reps <= 0) return;

        if (!exerciseWeeks.has(name)) exerciseWeeks.set(name, new Map());
        const weekMap = exerciseWeeks.get(name)!;
        if (!weekMap.has(weekStart)) weekMap.set(weekStart, []);
        weekMap.get(weekStart)!.push(epley(weight, reps));
      });
    });
  });

  // Top-3 упражнения по количеству недель с данными
  const ranked = [...exerciseWeeks.entries()]
    .map(([name, weekMap]) => ({ name, weekCount: weekMap.size }))
    .sort((a, b) => b.weekCount - a.weekCount)
    .slice(0, 3);

  return ranked.map(({ name }) => ({
    exerciseName: name,
    points: [...exerciseWeeks.get(name)!.entries()]
      .map(([weekStart, e1rms]) => ({ weekStart, e1rm: Math.max(...e1rms) }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  }));
}

/**
 * Тренд веса за последние N недель (body_metrics.metric_date).
 * Отвечает на «Как меняется моё тело?».
 */
async function getWeightTrend(userId: string, weeks: number): Promise<WeightPoint[]> {
  const startMs = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
  // metric_date — date (YYYY-MM-DD): сравниваем с date-only строкой
  const startDate = new Date(startMs).toISOString().split('T')[0];

  const { data: metrics, error } = await supabase
    .from('body_metrics')
    .select('metric_date, weight_kg')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .gte('metric_date', startDate)
    .order('metric_date', { ascending: true });

  if (error) throw error;
  if (!metrics || metrics.length === 0) return [];

  return metrics.map((m: any) => ({
    date: m.metric_date,
    weightKg: parseFloat(m.weight_kg) || 0,
  }));
}

/**
 * Streak (current + best) через utils/streak.ts.
 */
async function getStreakData(userId: string): Promise<{ current: number; best: number }> {
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('created_at, started_at, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .is('skipped_at', null);

  if (error) throw error;
  if (!workouts || workouts.length === 0) {
    return { current: 0, best: 0 };
  }

  // Effective date: finished_at ?? started_at ?? created_at
  const dates = workouts.map((w: any) => {
    return w.finished_at ?? w.started_at ?? w.created_at;
  }).filter((d): d is string => !!d);
  if (dates.length === 0) return { current: 0, best: 0 };

  const streak = computeStreaks(dates);
  return { current: streak.current, best: streak.best };
}

// ===== Helpers =====

/** Понедельник недели данной даты, YYYY-MM-DD. */
function getMondayISO(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().split('T')[0];
}