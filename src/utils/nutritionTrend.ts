// src/utils/nutritionTrend.ts
// FEAT-2.1: тренд отклонения от целей КБЖУ. Чистые функции — кандидат в SCALE-1 тесты.
import { WeeklyNutritionDay } from '../services/profileService';

export interface NutritionTargetsLike {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

export interface MacroAdherence {
  pct: number; // средний % от цели
  closeness: number; // 0..100 (100 = ровно в цель)
  label: string; // «−8%» / «+12%» / «в цель»
}

export interface WeekAdherence {
  daysWithLogs: number;
  avgCalories: number;
  calories: MacroAdherence;
  proteins: MacroAdherence;
  fats: MacroAdherence;
  carbs: MacroAdherence;
  score: number; // 0..100 — средняя «близость» по четырём показателям
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function deviationLabel(pct: number): string {
  const dev = Math.round(pct - 100);
  if (Math.abs(dev) <= 5) return 'в цель';
  return dev > 0 ? `+${dev}%` : `${dev}%`;
}

function adherence(avg: number, target: number): MacroAdherence {
  const pct = target > 0 ? (avg / target) * 100 : 0;
  const closeness = Math.max(0, 100 - Math.abs(pct - 100));
  return {
    pct: round1(pct),
    closeness: Math.round(Math.min(100, closeness)),
    label: deviationLabel(pct),
  };
}

export function computeWeekAdherence(
  days: WeeklyNutritionDay[],
  targets: NutritionTargetsLike,
): WeekAdherence {
  const logged = days.filter((d) => d.hasLogs);
  const n = logged.length;
  const zero: MacroAdherence = { pct: 0, closeness: 0, label: '—' };
  if (n === 0) {
    return { daysWithLogs: 0, avgCalories: 0, calories: zero, proteins: zero, fats: zero, carbs: zero, score: 0 };
  }
  const sum = logged.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      proteins: acc.proteins + d.proteins,
      fats: acc.fats + d.fats,
      carbs: acc.carbs + d.carbs,
    }),
    { calories: 0, proteins: 0, fats: 0, carbs: 0 },
  );
  const calories = adherence(sum.calories / n, targets.calories);
  const proteins = adherence(sum.proteins / n, targets.proteins);
  const fats = adherence(sum.fats / n, targets.fats);
  const carbs = adherence(sum.carbs / n, targets.carbs);
  const score = Math.round(
    (calories.closeness + proteins.closeness + fats.closeness + carbs.closeness) / 4,
  );
  return { daysWithLogs: n, avgCalories: Math.round(sum.calories / n), calories, proteins, fats, carbs, score };
}