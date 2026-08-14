// src/utils/e1rm.ts
// FEAT-1.4: оценочный одноповторный максимум (формула Epley).
// Чистые функции — кандидат в SCALE-1 тесты; позже переиспользуется в AI-прогрессии (3.2).

/** Epley: e1RM = w × (1 + reps/30). При reps ≤ 1 возвращает сам вес. */
export function epley(weight: number, reps: number): number {
  if (!isFinite(weight) || !isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/** Лучший e1RM по набору сетов (0, если валидных сетов нет). */
export function bestE1rm(
  sets: ReadonlyArray<{ weight: number | null; reps: number | null }>,
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