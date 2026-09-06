// src/utils/weeklyCaloricBalance.ts
// FEAT-3: расчёт недельного баланса калорий.
// Чистая функция — ноль зависимостей от Supabase/React.
// Используется для L1-чипа на Dashboard и L2 bar chart.

import type { WeeklyNutritionDay } from '../services/profileService';

export interface DailyBalance {
  date: string; // YYYY-MM-DD
  /** calories - target (positive = surplus, negative = deficit, null = no logs) */
  balance: number | null;
  /** true если за этот день есть записи питания */
  hasLogs: boolean;
  /** фактические калории за день (0 если no logs) */
  calories: number;
  /** целевые калории (0 если цель не задана) */
  target: number;
}

export interface WeeklyCaloricBalance {
  /** Суммарный баланс за неделю (ккал). Отрицательный = дефицит. */
  total: number;
  /** Детализация по дням для bar chart. */
  days: DailyBalance[];
  /** Доля дней с логами за неделю (0..1). */
  adherenceRatio: number;
  /** Количество дней с логами. */
  loggedDays: number;
  /** Общее количество дней в периоде. */
  totalDays: number;
  /** true если достаточно данных для осмысленного вывода (≥3 дня). */
  hasSufficientData: boolean;
}

/**
 * Рассчитывает недельный баланс калорий.
 *
 * @param days — массив дней недельной агрегации из profileService.getWeeklyNutrition
 * @param calorieTarget — суточная цель калорий из profiles.target_calories
 * @returns структурированный результат с totals, days и adherence
 *
 * Семантика:
 * - total < 0 → недельный дефицит (хорошо для fat loss)
 * - total > 0 → недельный профицит (хорошо для muscle gain)
 * - total ≈ 0 → поддержание
 * - hasSufficientData = false при < 3 днях с логами (не выдумываем точность)
 */
export function calculateWeeklyCaloricBalance(
  days: WeeklyNutritionDay[],
  calorieTarget: number
): WeeklyCaloricBalance {
  if (!days || days.length === 0) {
    return {
      total: 0,
      days: [],
      adherenceRatio: 0,
      loggedDays: 0,
      totalDays: 0,
      hasSufficientData: false,
    };
  }

  const target = calorieTarget > 0 ? calorieTarget : 0;

  const balanceDays: DailyBalance[] = days.map((d) => ({
    date: d.date,
    balance: d.hasLogs ? d.calories - target : null,
    hasLogs: d.hasLogs,
    calories: d.hasLogs ? d.calories : 0,
    target,
  }));

  const loggedDays = balanceDays.filter((d) => d.hasLogs);
  const total = loggedDays.reduce((sum, d) => sum + (d.balance ?? 0), 0);

  return {
    total,
    days: balanceDays,
    adherenceRatio: days.length > 0 ? loggedDays.length / days.length : 0,
    loggedDays: loggedDays.length,
    totalDays: days.length,
    hasSufficientData: loggedDays.length >= 3,
  };
}
