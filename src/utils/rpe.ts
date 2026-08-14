import { Difficulty } from '../types/workout';

/** Что меняется от 1 до 10 — объяснение под шкалой (согласовано с RIR = 10 − RPE). */
export const RPE_DESCRIPTIONS: Record<number, string> = {
  1: 'пустяковое усилие, уровень прогулки',
  2: 'очень легко, почти без усилий',
  3: 'легко, лёгкая разминка',
  4: 'легко, большой запас',
  5: 'умеренно, ~5 повторов в запасе',
  6: 'заметно, 4 в запасе',
  7: 'рабочая, 3 в запасе',
  8: 'тяжело, 2 в запасе',
  9: 'очень тяжело, 1 в запасе',
  10: 'отказ, повторов в запасе нет',
};

export type RpeZone = 'easy' | 'hard' | 'max';

/** Зоны шкалы: зелёная / оранжевая / красная. */
export const rpeZone = (v: number): RpeZone =>
  v <= 6 ? 'easy' : v <= 8 ? 'hard' : 'max';

/** RIR = 10 − RPE, кламп 0..5. */
export const deriveRir = (rpe: number): number =>
  Math.min(5, Math.max(0, 10 - rpe));

/** difficulty из RPE. */
export const deriveDifficulty = (rpe: number): Difficulty =>
  rpe <= 6 ? 'easy' : rpe <= 8 ? 'moderate' : rpe === 9 ? 'hard' : 'max';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Легко',
  moderate: 'Средне',
  hard: 'Тяжело',
  max: 'Макс',
};