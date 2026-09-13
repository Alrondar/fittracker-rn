// src/utils/exerciseHelpers.ts
// P0.2: Хелперы для определения характеристик упражнений.

/**
 * Определяет, является ли упражнение односторонним (unilateral).
 * Использует эвристику по movement_pattern и названию.
 * В будущем можно заменить на явный флаг в таблице exercises.
 */
export function isUnilateralExercise(exercise: {
  name: string;
  movement_pattern?: string | null;
}): boolean {
  const pattern = exercise.movement_pattern?.toLowerCase() || '';
  const name = exercise.name.toLowerCase();

  return pattern.includes('unilateral') || /одной|выпад|болгар|single|unilateral/i.test(name);
}
