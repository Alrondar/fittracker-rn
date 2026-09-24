// src/utils/reps.ts
//
// Единый способ получить количество повторений из лога подхода с учётом
// unilateral-упражнений (reps_left/reps_right вместо общего reps).
// Согласовано с engine/progression.ts getReps: рабочий объём unilateral-сета —
// это сумма повторений на левую и правую стороны (L+R), а не максимум.
//
// Приоритет: общий reps (если заполнен) → иначе сумма reps_left + reps_right.

export interface RepsSource {
  reps?: number | null;
  reps_left?: number | null;
  reps_right?: number | null;
}

/** Возвращает эффективное число повторений для расчёта объёма (Σ вес × повторы). */
export function effectiveReps(log: RepsSource): number {
  if (log.reps != null) return log.reps;
  return (log.reps_left ?? 0) + (log.reps_right ?? 0);
}
