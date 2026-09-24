// src/services/weeklySummaryService.ts
// ENG-6: загрузка данных для weekly summary.
// Четыре параллельных запроса на неделю (workouts + pain + readiness + pre-week PR logs).
// Skip-тренировки (FIT-7: finished_at + skipped_at) исключены через .is('skipped_at', 'null').
// Упражнения без exercise_name в workout_exercises — имя через embed exercises(name).
import { supabase, fetchAllPages } from '../lib/supabase';
import { epley, roundE1rm } from '../utils/e1rm';
import { toDateKey } from '../utils/dateKey';
import { effectiveReps } from '../utils/reps';
import {
  buildWeeklyInsights,
  calculateTrainingLoadContext,
  calculateDeloadContext,
  WeeklySummaryData,
  WeeklySummaryResult,
} from '../engine/weeklySummary';

interface WeekRange {
  /** YYYY-MM-DD — для daily_readiness.date (date type, без tz). */
  startDate: string;
  endDate: string;
  /** ISO timestamptz — для workouts.created_at, pain.occurred_at, logs.completed_at. */
  startISO: string;
  /** Exclusive upper bound. */
  nextStartISO: string;
}

const asOne = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

/**
 * Вычисляет границы недели (понедельник → воскресенье) с учётом offset.
 * 0 = эта неделя, -1 = прошлая, и т.д.
 */
function computeWeekRange(weekOffset: number, now: Date = new Date()): WeekRange {
  const day = now.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  nextMonday.setHours(0, 0, 0, 0);
  return {
    startDate: toDateKey(monday),
    endDate: toDateKey(sunday),
    startISO: monday.toISOString(),
    nextStartISO: nextMonday.toISOString(),
  };
}

// ---- Сырые типы строк из Supabase ----
interface WorkoutWeekRow {
  id: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  workout_exercises:
    | {
        id: string;
        exercise_id: string;
        target_reps_range?: string | null;
        exercises:
          | { name: string; primary_muscles?: string[]; secondary_muscles?: string[] }
          | { name: string; primary_muscles?: string[]; secondary_muscles?: string[] }[]
          | null;
        workout_logs: {
          set_number: number;
          weight_kg: number | string | null;
          reps: number | null;
          reps_left?: number | null;
          reps_right?: number | null;
          rpe: number | null;
          completed_at: string | null;
          /** ENG-13: флаг разминочного сета (исключается из аналитики) */
          is_warmup?: boolean;
        }[];
      }[]
    | null;
}

/** Effective date тренировки: когда она фактически завершилась/началась. */
function workoutEffectiveDate(w: {
  finished_at: string | null;
  started_at: string | null;
  created_at: string;
}): string {
  return w.finished_at ?? w.started_at ?? w.created_at;
}

interface PainWeekRow {
  body_part: string | null;
  occurred_at: string;
}

interface ReadinessWeekRow {
  date: string;
  readiness: number | null;
}

interface PreWeekLogRow {
  weight_kg: number | string | null;
  reps: number | null;
  reps_left?: number | null;
  reps_right?: number | null;
  workout_exercises: { exercise_id: string } | { exercise_id: string }[] | null;
}

interface MuscleLogRow {
  finished_at: string;
  workout_exercises: {
    exercises:
      | { name: string; primary_muscles?: string[]; secondary_muscles?: string[] }
      | { name: string; primary_muscles?: string[]; secondary_muscles?: string[] }[]
      | null;
    workout_logs: {
      weight_kg: number | string | null;
      reps: number | null;
      reps_left?: number | null;
      reps_right?: number | null;
      completed_at: string | null;
      is_warmup?: boolean;
    }[];
  }[];
}

function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * CI-2 / ACWR: Вычисляет хроническую нагрузку (средний объём за 4 недели).
 * Используется для расчёта Acute:Chronic Workload Ratio (золотой стандарт предотвращения травм).
 */
async function calculateChronicVolume(
  userId: string,
  endDateISO: string // exclusive upper bound (nextStartISO текущей недели)
): Promise<number> {
  const fourWeeksAgo = new Date(endDateISO);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const startDateISO = fourWeeksAgo.toISOString();

  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      workout_exercises(
        workout_logs(weight_kg, reps, reps_left, reps_right, is_warmup)
      )
    `
    )
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .is('skipped_at', 'null')
    .gte('finished_at', startDateISO)
    .lt('finished_at', endDateISO);

  if (error || !data) return 0;

  let totalVolume = 0;
  for (const w of data as unknown as {
    workout_exercises: {
      workout_logs: {
        weight_kg: number | string | null;
        reps: number | null;
        reps_left?: number | null;
        reps_right?: number | null;
        is_warmup?: boolean;
      }[];
    }[];
  }[]) {
    for (const we of w.workout_exercises ?? []) {
      for (const log of we.workout_logs ?? []) {
        // ENG-13: разминочные сеты исключаются из метрик нагрузки
        if (log.is_warmup) continue;
        const weight = toNumber(log.weight_kg);
        const reps = effectiveReps(log);
        totalVolume += weight * reps;
      }
    }
  }

  // Средний объём за 4 недели
  return Math.round(totalVolume / 4);
}

/**
 * Агрегирует данные одной недели: workouts + logs + pain + readiness + pre-week PRs.
 */
async function aggregateWeek(userId: string, range: WeekRange): Promise<WeeklySummaryData> {
  // 3 параллельных запроса на неделю
  const [workoutsRes, painRes, readinessRes] = await Promise.all([
    supabase
      .from('workouts')
      .select(
        `
        id,
        created_at,
        started_at,
        finished_at,
        duration_seconds,
        workout_exercises(
          id,
          exercise_id,
          target_reps_range,
          exercises(name, primary_muscles, secondary_muscles),
          workout_logs(set_number, weight_kg, reps, reps_left, reps_right, rpe, completed_at, is_warmup)
        )
      `
      )
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .is('skipped_at', 'null')
      .gte('finished_at', range.startISO)
      .lt('finished_at', range.nextStartISO),
    supabase
      .from('pain_events')
      .select('body_part, occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', range.startISO)
      .lt('occurred_at', range.nextStartISO),
    supabase
      .from('daily_readiness')
      .select('date, readiness')
      .eq('user_id', userId)
      .gte('date', range.startDate)
      .lte('date', range.endDate),
  ]);
  if (workoutsRes.error) throw workoutsRes.error;
  if (painRes.error) throw painRes.error;
  if (readinessRes.error) throw readinessRes.error;

  const workoutsRows = (workoutsRes.data ?? []) as unknown as WorkoutWeekRow[];
  const painRows = (painRes.data ?? []) as unknown as PainWeekRow[];
  const readinessRows = (readinessRes.data ?? []) as unknown as ReadinessWeekRow[];

  // ---- Агрегация по workouts ----
  const workoutDaysSet = new Set<string>();
  let totalVolume = 0;
  let totalSets = 0;
  const muscleVolume: Record<string, number> = {};
  let rpeSum = 0;
  let rpeCount = 0;
  let rpeMin: number | null = null;
  let rpeMax: number | null = null;
  // exercise_id → best e1rm set in this week (+ metadata для PR)
  const exerciseBest = new Map<
    string,
    { name: string; maxWeight: number; e1rm: number; date: string }
  >();
  const exercisedIds = new Set<string>();
  const lastCompletedSetsMap = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      lastWeight: number;
      lastReps: number;
      repsRange: [number, number];
      date: string;
    }
  >();

  for (const w of workoutsRows) {
    const wDate = new Date(workoutEffectiveDate(w));
    workoutDaysSet.add(toDateKey(wDate));
    for (const we of w.workout_exercises ?? []) {
      exercisedIds.add(we.exercise_id);
      const ex = asOne(we.exercises) as {
        name: string;
        primary_muscles?: string[];
        secondary_muscles?: string[];
      } | null;
      const name = ex?.name ?? 'Упражнение';
      const primary = ex?.primary_muscles ?? [];
      const secondary = ex?.secondary_muscles ?? [];

      const validLogs = (we.workout_logs ?? []).filter((log) => !log.is_warmup);
      if (validLogs.length > 0) {
        const lastLog = validLogs.sort((a, b) => (b.set_number || 0) - (a.set_number || 0))[0];
        const weight = toNumber(lastLog.weight_kg);
        const reps = effectiveReps(lastLog);

        let repsRange: [number, number] = [8, 12];
        if (we.target_reps_range) {
          const parts = we.target_reps_range.split('-').map(Number);
          if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
            repsRange = [parts[0], parts[1]];
          }
        }

        const lastLogDate = lastLog.completed_at ?? workoutEffectiveDate(w);
        const currentBest = lastCompletedSetsMap.get(we.exercise_id);
        if (!currentBest || lastLogDate > currentBest.date) {
          lastCompletedSetsMap.set(we.exercise_id, {
            exerciseId: we.exercise_id,
            exerciseName: name,
            lastWeight: weight,
            lastReps: reps,
            repsRange: repsRange,
            date: lastLogDate,
          });
        }
      }

      for (const log of we.workout_logs ?? []) {
        // ENG-13: разминочные сеты исключаются из всех метрик недели
        if (log.is_warmup) continue;
        totalSets += 1;
        const weight = toNumber(log.weight_kg);
        const reps = effectiveReps(log);
        totalVolume += weight * reps;

        // CI-4: Muscle volume aggregation (primary = 1.0, secondary = 0.5)
        for (const m of primary) {
          muscleVolume[m] = (muscleVolume[m] || 0) + 1.0;
        }
        for (const m of secondary) {
          muscleVolume[m] = (muscleVolume[m] || 0) + 0.5;
        }
        if (log.rpe != null) {
          rpeSum += log.rpe;
          rpeCount += 1;
          if (rpeMin === null || log.rpe < rpeMin) rpeMin = log.rpe;
          if (rpeMax === null || log.rpe > rpeMax) rpeMax = log.rpe;
        }
        const e = epley(weight, reps);
        const current = exerciseBest.get(we.exercise_id);
        if (!current || e > current.e1rm) {
          exerciseBest.set(we.exercise_id, {
            name,
            maxWeight: weight,
            e1rm: e,
            date: log.completed_at ?? workoutEffectiveDate(w),
          });
        }
      }
    }
  }

  // ---- Агрегация pain ----
  const painByBodyPart = new Map<string, number>();
  for (const row of painRows) {
    if (row.body_part) {
      painByBodyPart.set(row.body_part, (painByBodyPart.get(row.body_part) ?? 0) + 1);
    }
  }

  // ---- Агрегация readiness ----
  const readinessVals = readinessRows.map((r) => r.readiness).filter((v): v is number => v != null);
  const daysLogged = readinessVals.length;
  const rAvg = daysLogged > 0 ? readinessVals.reduce((a, b) => a + b, 0) / daysLogged : null;
  const rMin = daysLogged > 0 ? Math.min(...readinessVals) : null;
  const rMax = daysLogged > 0 ? Math.max(...readinessVals) : null;

  // ---- Pre-week best для PR detection ----
  // Один запрос на все exercise_id этой недели. .in() на embed column — OK
  // (паттерн работает в useWorkoutSession.loader для recentLogs).
  const exercisedIdsArr = Array.from(exercisedIds);
  const preBest = new Map<string, number>();
  if (exercisedIdsArr.length > 0) {
    // FD-6: baseline по всей предшествующей истории для этих упражнений может
    // превысить лимит PostgREST 1000 строк → пагинация, порядок по `id`.
    const { data: preRows, error: preError } = await fetchAllPages<PreWeekLogRow>((from, to) =>
      supabase
        .from('workout_logs')
        .select('weight_kg, reps, reps_left, reps_right, workout_exercises!inner(exercise_id)')
        .in('workout_exercises.exercise_id', exercisedIdsArr)
        .eq('is_warmup', false) // ENG-13: baseline для PR — только рабочие сеты
        .lt('completed_at', range.startISO)
        .order('id')
        .range(from, to)
    );
    if (!preError) {
      for (const row of preRows) {
        const we = asOne(row.workout_exercises);
        if (!we) continue;
        const e = epley(toNumber(row.weight_kg), effectiveReps(row));
        const prev = preBest.get(we.exercise_id) ?? 0;
        if (e > prev) preBest.set(we.exercise_id, e);
      }
    }
  }

  // ---- PRs недели (week best > pre-week best) ----
  // PR считается только если был pre-week baseline (prevE1rm > 0) —
  // иначе это «первый раз в упражнении», не «рекорд».
  const prs: WeeklySummaryData['prs'] = [];
  for (const [exId, best] of exerciseBest.entries()) {
    const prevE1rm = preBest.get(exId) ?? 0;
    if (best.e1rm > prevE1rm && prevE1rm > 0) {
      prs.push({
        exerciseId: exId,
        exerciseName: best.name,
        maxWeight: roundE1rm(best.maxWeight),
        e1rm: roundE1rm(best.e1rm),
        date: best.date,
      });
    }
  }

  return {
    weekStart: range.startDate,
    weekEnd: range.endDate,
    workoutsCount: workoutsRows.length,
    totalVolume: Math.round(totalVolume),
    totalSets,
    workoutDays: Array.from(workoutDaysSet).sort(),
    rpe: {
      avg: rpeCount > 0 ? rpeSum / rpeCount : null,
      min: rpeMin,
      max: rpeMax,
      count: rpeCount,
    },
    pain: {
      count: painRows.length,
      bodyParts: Array.from(painByBodyPart.entries())
        .map(([bodyPart, count]) => ({ bodyPart, count }))
        .sort((a, b) => b.count - a.count),
    },
    readiness: {
      daysLogged,
      avg: rAvg,
      min: rMin,
      max: rMax,
    },
    volumeByType: {
      strength: Math.round(totalVolume),
      hypertrophy: 0,
      cardio: 0,
      mixed: 0,
    },
    muscleVolume,
    muscleFatigue: {},
    muscleStrength: {},
    prs,
    lastCompletedSets: Array.from(lastCompletedSetsMap.values()).map(
      ({ date: _date, ...rest }) => rest
    ),
  };
}

/**
 * P2: Агрегация усталости и силы по мышечным группам за последние 14 дней.
 * Fatigue: weight * reps * (weight / e1rm)^1.5 * (0.5 ^ (daysAgo / 3))
 * Strength: min daysAgo, max e1rm
 */
async function aggregateMuscleData(userId: string, now: Date) {
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      finished_at,
      workout_exercises(
        exercises(name, primary_muscles, secondary_muscles),
        workout_logs(weight_kg, reps, reps_left, reps_right, completed_at, is_warmup)
      )
    `
    )
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .is('skipped_at', 'null')
    .gte('finished_at', fourteenDaysAgoISO);

  if (error || !data) return { muscleFatigue: {}, muscleStrength: {} };

  const muscleFatigue: Record<string, number> = {};
  const muscleStrength: Record<string, { daysAgo: number; current1RM: number }> = {};

  for (const w of data as unknown as MuscleLogRow[]) {
    const finishedAt = new Date(w.finished_at);
    const daysAgo = (now.getTime() - finishedAt.getTime()) / (1000 * 60 * 60 * 24);

    for (const we of w.workout_exercises ?? []) {
      const ex = asOne(we.exercises) as {
        name: string;
        primary_muscles?: string[];
        secondary_muscles?: string[];
      } | null;
      const primary = ex?.primary_muscles ?? [];
      const secondary = ex?.secondary_muscles ?? [];

      for (const log of we.workout_logs ?? []) {
        if (log.is_warmup) continue;
        const weight = toNumber(log.weight_kg);
        const reps = effectiveReps(log);
        if (weight === 0 || reps === 0) continue;

        const e1rm = epley(weight, reps);
        const intensityFactor = Math.pow(weight / e1rm, 1.5);
        const decayFactor = Math.pow(0.5, daysAgo / 3);
        const fatigueContribution = weight * reps * intensityFactor * decayFactor;

        const updateMuscle = (m: string, multiplier: number) => {
          muscleFatigue[m] = (muscleFatigue[m] || 0) + fatigueContribution * multiplier;
          if (!muscleStrength[m] || daysAgo < muscleStrength[m].daysAgo) {
            muscleStrength[m] = { daysAgo, current1RM: e1rm };
          } else if (e1rm > muscleStrength[m].current1RM) {
            muscleStrength[m].current1RM = e1rm;
          }
        };

        for (const m of primary) updateMuscle(m, 1.0);
        for (const m of secondary) updateMuscle(m, 0.5);
      }
    }
  }

  return { muscleFatigue, muscleStrength };
}

/**
 * Публичный API: текущая + предыдущая неделя + инсайты.
 * weekOffset: 0 = эта неделя, -1 = прошлая, и т.д.
 */
export async function getWeeklySummary(
  userId: string,
  weekOffset: number = 0,
  unit: 'kg' | 'lb' = 'kg'
): Promise<WeeklySummaryResult> {
  const now = new Date();
  const currentRange = computeWeekRange(weekOffset, now);
  const previousRange = computeWeekRange(weekOffset - 1, now);

  // CI-2 / CI-5 / P2: параллельно загружаем цель, хронический объём, данные недель и muscle data (14 дней)
  const [current, previous, profileRes, chronicVol, muscleData] = await Promise.all([
    aggregateWeek(userId, currentRange),
    aggregateWeek(userId, previousRange),
    supabase.from('profiles').select('goal').eq('id', userId).single(),
    calculateChronicVolume(userId, currentRange.nextStartISO),
    aggregateMuscleData(userId, now),
  ]);

  const primaryGoal = profileRes.data?.goal ?? null;

  // Активируем ACWR в engine, передавая chronicVolume и P2 muscle data
  const currentWithChronic: WeeklySummaryData = {
    ...current,
    chronicVolume: chronicVol,
    muscleFatigue: muscleData.muscleFatigue,
    muscleStrength: muscleData.muscleStrength,
  };

  const insights = buildWeeklyInsights(currentWithChronic, previous, { primaryGoal, unit });
  const trainingLoad = calculateTrainingLoadContext(currentWithChronic, previous);
  // CI-6: расчёт рекомендации разгрузки после инсайтов и контекста нагрузки.
  const deload = calculateDeloadContext(currentWithChronic, previous, trainingLoad, insights);

  return { current: currentWithChronic, previous, insights, trainingLoad, deload };
}
