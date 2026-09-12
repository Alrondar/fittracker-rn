// src/utils/plates.ts
// Чистая функция расчёта блинов для штанги

import { PLATE_DENOMINATIONS_KG, PLATE_DENOMINATIONS_LB } from '../constants/barbellDefaults';

export interface PlateResult {
  weight: number;
  count: number;
}

/**
 * Рассчитывает необходимые блины для заданного веса на одну сторону.
 * @param totalWeight - целевой общий вес (включая гриф)
 * @param barWeight - вес грифа
 * @param unit - единицы измерения ('kg' | 'lb')
 * @returns массив блинов на одну сторону или null, если вес меньше веса грифа
 */
export function calculatePlates(
  totalWeight: number,
  barWeight: number,
  unit: 'kg' | 'lb'
): PlateResult[] | null {
  const weightToLoad = totalWeight - barWeight;

  // Если целевой вес меньше или равен весу грифа, разборка не нужна
  if (weightToLoad <= 0) {
    return null;
  }

  const weightPerSide = weightToLoad / 2;
  const denominations = unit === 'kg' ? PLATE_DENOMINATIONS_KG : PLATE_DENOMINATIONS_LB;
  const result: PlateResult[] = [];
  let remaining = weightPerSide;

  // Жадный алгоритм подбора блинов
  for (const denom of denominations) {
    if (remaining >= denom) {
      const count = Math.floor(remaining / denom);
      result.push({ weight: denom, count });
      remaining = Math.round((remaining - count * denom) * 100) / 100; // избегаем ошибок float
    }
  }

  // Если остался небольшой "хвост" (например, из-за нестандартного веса),
  // мы его игнорируем, так как показываем ближайшую возможную сборку.
  // В реальности пользователь либо округлит вес, либо добавит микро-блины.

  return result.length > 0 ? result : null;
}

/**
 * Форматирует результат расчёта в читаемую строку.
 * Пример: "Гриф 20 кг + 2×10 кг + 2×5 кг"
 */
export function formatPlates(barWeight: number, plates: PlateResult[], unit: 'kg' | 'lb'): string {
  const platesStr = plates.map((p) => `2×${p.weight} ${unit}`).join(' + ');

  return `Гриф ${barWeight} ${unit} + ${platesStr}`;
}
