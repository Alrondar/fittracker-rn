// src/utils/streak.ts
// FEAT-1.3: стрик тренировок. Чистые функции, без зависимостей — кандидат в SCALE-1 тесты.
// Семантика: недельный стрик («N недель подряд»): неделя засчитана, если есть ≥1
// завершённая тренировка. Текущая неделя без тренировки НЕ ломает стрик (grace) —
// тогда отсчёт идёт с прошлой недели.

export interface StreakStats {
  /** Текущий стрик, недель */
  current: number;
  /** Лучший стрик, недель */
  best: number;
  /** Была ли тренировка на текущей неделе */
  activeThisWeek: boolean;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Порядковый индекс понедельника ISO-недели даты.
 * Соседние недели отличаются ровно на 1 — удобно для подсчёта серий.
 */
function mondayIndex(input: Date): number {
  const d = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const day = d.getUTCDay() || 7; // Пн=1 … Вс=7
  d.setUTCDate(d.getUTCDate() - (day - 1)); // понедельник 00:00 UTC своей недели
  return Math.round(d.getTime() / WEEK_MS);
}

export function computeStreaks(
  workoutDates: readonly (string | Date)[],
  now: Date = new Date(),
): StreakStats {
  if (workoutDates.length === 0) return { current: 0, best: 0, activeThisWeek: false };

  const weeks = new Set<number>();
  for (const raw of workoutDates) {
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    if (!isNaN(d.getTime())) weeks.add(mondayIndex(d));
  }
  if (weeks.size === 0) return { current: 0, best: 0, activeThisWeek: false };

  const sorted = [...weeks].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const thisWeek = mondayIndex(now);
  const activeThisWeek = weeks.has(thisWeek);
  let current = 0;
  let cursor = activeThisWeek ? thisWeek : thisWeek - 1; // grace: текущая неделя может быть ещё пустой
  while (weeks.has(cursor)) {
    current++;
    cursor--;
  }

  return { current, best, activeThisWeek };
}