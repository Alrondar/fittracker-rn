// src/utils/e1rm.ts
// FEAT-1.4: оценочный одноповторный максимум.
// Чистые функции — кандидат в SCALE-1 тесты; позже переиспользуется в AI-прогрессии (3.2).

/**
 * P2.1: Переключение формулы для точности.
 * Epley точна до ~10 повторов. Brzycki точнее до ~12.
 * Для high-rep (>12) формула Wathan даёт более точную оценку,
 * так как Epley/Brzycki начинают завышать 1ПМ на 10–20%.
 */
export function calculateE1rm(weight: number, reps: number): number {
  if (!isFinite(weight) || !isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  if (reps <= 1) return weight;
  
  if (reps <= 10) {
    // Epley: w × (1 + reps/30)
    return weight * (1 + reps / 30);
  } else if (reps <= 12) {
    // Brzycki: w × (36 / (37 - reps))
    return weight * (36 / (37 - reps));
  } else {
    // Wathan для high-rep (>12), где другие формулы теряют валидность
    return 100 * weight / (48.8 + (53.8 * Math.exp(-0.075 * reps)));
  }
}

/** Legacy alias для обратной совместимости. */
export const epley = calculateE1rm;

/** Лучший e1RM по набору сетов (0, если валидных сетов нет). */
export function bestE1rm(
  sets: readonly { weight: number | null; reps: number | null }[],
): number {
  let max = 0;
  for (const s of sets) {
    const v = epley(s.weight ?? 0, s.reps ?? 0);
    if (v > max) max = v;
  }
  return max;
}

/** Округление для отображения (шаг 0.5 кг). */
export function roundE1rm(value: number): number {
  return Math.round(value * 2) / 2;
}