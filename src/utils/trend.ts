// src/utils/trend.ts
// FEAT-2.2: тренд веса — скользящее среднее + линейная регрессия.
// Чистые функции — кандидат в SCALE-1 тесты.

export interface WeightPoint {
  date: string; // YYYY-MM-DD или ISO
  weightKg: number;
}

export interface TrendResult {
  points: WeightPoint[]; // отсортированы по дате
  smoothed: number[]; // скользящее среднее, выровнено по points
  slopePerWeek: number; // наклон регрессии, кг/нед
  direction: 'up' | 'down' | 'stable';
  min: number;
  max: number;
  last: number;
  deltaTotal: number; // последний − первый
}

const MS_DAY = 24 * 60 * 60 * 1000;

export function sortPoints(points: WeightPoint[]): WeightPoint[] {
  return [...points].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/** Скользящее среднее с окном в днях (включая текущую точку и более ранние в окне). */
export function movingAverage(points: WeightPoint[], windowDays = 7): number[] {
  const t = points.map((p) => +new Date(p.date));
  return points.map((p, i) => {
    const from = t[i] - windowDays * MS_DAY;
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (t[j] < from) break;
      sum += points[j].weightKg;
      n++;
    }
    return n > 0 ? sum / n : p.weightKg;
  });
}

/** Наклон линейной регрессии, кг/неделя. */
export function linearSlopePerWeek(points: WeightPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const t0 = +new Date(points[0].date);
  const xs = points.map((p) => (+new Date(p.date) - t0) / MS_DAY);
  const ys = points.map((p) => p.weightKg);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return 0;
  return (num / den) * 7;
}

/** Полный расчёт тренда; null, если нет валидных точек. */
export function buildWeightTrend(
  input: WeightPoint[],
  windowDays = 7,
  stableThresholdPerWeek = 0.3,
): TrendResult | null {
  const points = sortPoints(input.filter((p) => Number.isFinite(p.weightKg)));
  if (points.length === 0) return null;
  const smoothed = movingAverage(points, windowDays);
  const slopePerWeek = linearSlopePerWeek(points);
  const direction: TrendResult['direction'] =
    slopePerWeek > stableThresholdPerWeek
      ? 'up'
      : slopePerWeek < -stableThresholdPerWeek
        ? 'down'
        : 'stable';
  const weights = points.map((p) => p.weightKg);
  return {
    points,
    smoothed,
    slopePerWeek: Math.round(slopePerWeek * 100) / 100,
    direction,
    min: Math.min(...weights),
    max: Math.max(...weights),
    last: weights[weights.length - 1],
    deltaTotal: Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10,
  };
}
// ============================================================================
// FEAT-2.2: generic-тренд для произвольного замера (спарклайны)
// ============================================================================
export interface TrendPoint {
  date: string;
  value: number;
}

export interface MetricTrendResult {
  points: TrendPoint[];
  smoothed: number[];
  slopePerWeek: number;
  direction: 'up' | 'down' | 'stable';
  min: number;
  max: number;
  last: number;
  deltaTotal: number;
}

function sortTrendPoints(points: TrendPoint[]): TrendPoint[] {
  return [...points].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

function movingAverageTrend(points: TrendPoint[], windowDays = 7): number[] {
  const t = points.map((p) => +new Date(p.date));
  return points.map((p, i) => {
    const from = t[i] - windowDays * MS_DAY;
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (t[j] < from) break;
      sum += points[j].value;
      n++;
    }
    return n > 0 ? sum / n : p.value;
  });
}

function slopeTrendPerWeek(points: TrendPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const t0 = +new Date(points[0].date);
  const xs = points.map((p) => (+new Date(p.date) - t0) / MS_DAY);
  const ys = points.map((p) => p.value);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return 0;
  return (num / den) * 7;
}

/** Полный расчёт тренда замера; порог «стабильно» мягче весового (0.1). */
export function buildTrend(
  input: TrendPoint[],
  windowDays = 7,
  stableThresholdPerWeek = 0.1,
): MetricTrendResult | null {
  const points = sortTrendPoints(input.filter((p) => Number.isFinite(p.value)));
  if (points.length === 0) return null;
  const smoothed = movingAverageTrend(points, windowDays);
  const slopePerWeek = slopeTrendPerWeek(points);
  const direction: MetricTrendResult['direction'] =
    slopePerWeek > stableThresholdPerWeek
      ? 'up'
      : slopePerWeek < -stableThresholdPerWeek
        ? 'down'
        : 'stable';
  const values = points.map((p) => p.value);
  return {
    points,
    smoothed,
    slopePerWeek: Math.round(slopePerWeek * 100) / 100,
    direction,
    min: Math.min(...values),
    max: Math.max(...values),
    last: values[values.length - 1],
    deltaTotal: Math.round((values[values.length - 1] - values[0]) * 10) / 10,
  };
}