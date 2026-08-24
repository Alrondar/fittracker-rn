// src/utils/e1rm.ts
// FEAT-1.4: оценочный одноповторный максимум.
// Чистые функции — кандидат в SCALE-1 тесты; позже переиспользуется в AI-прогрессии (3.2).

/**
 * P2.1: Переключение формулы для точности.
 * Epley точна до ~10 повторов. Для high-rep (>10) Brzycki даёт более точную оценку,
 * так как Epley начинает завышать 1ПМ на 5–10%.
 */
export function calculateE1rm(weight: number, reps: number): number {
  if (!isFinite(weight) || !isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  if (reps <= 1) return weight;
  
  if (reps <= 10) {
    // Epley: w × (1 + reps/30)
    return weight * (1 + reps / 30);
  } else {
    // Brzycki: w × (36 / (37 - reps))
    return weight * (36 / (37 - reps));
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