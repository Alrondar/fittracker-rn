// Семантика сетов для движка: какой подход считается завершённым рабочим и
// сколько в нём повторов. Одно место, потому что и ядро, и политики (policies.ts)
// считают это одинаково; расхождение здесь = расхождение рекомендаций.
import type { SetData } from '../../types/workout';

/** Рабочие сеты текущей сессии: непустой вес и хоть какой-то учёт повторов. */
export function completedWorkingSets(sets: SetData[]): SetData[] {
  return sets.filter(
    (s) =>
      !s.isWarmup &&
      s.weight !== '' &&
      (s.reps !== '' || (s.reps_left && s.reps_right) || s.estimatedReps != null)
  );
}

/**
 * Общий объём подхода: сумма L+R для unilateral (P0.2), иначе estimatedReps.
 * Согласовано с `src/utils/reps.ts`.
 */
export function getReps(s: SetData): number {
  if (s.reps !== '') return parseInt(s.reps, 10);
  if (s.reps_left && s.reps_right) return parseInt(s.reps_left, 10) + parseInt(s.reps_right, 10);
  return s.estimatedReps ?? 0;
}
