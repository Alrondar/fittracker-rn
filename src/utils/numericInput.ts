/**
 * EDGE-12 (аудит состояний 06.10): санитизация числового ввода в сетовой таблице.
 *
 * Проблема: `parseFloat` молча съеет «82,5» с RU-клавиатуры → запишется 82, а
 * «99999» уйдёт в объём тренировки и в рекорды. Никакой границы на вводе не было.
 *
 * Два раздельных шага, потому что у них разные моменты:
 *  - `sanitizeNumericInput` — посимвольная чистка ПОКА Пользователь печатает
 *    (разделитель, лишние символы, длина). Делает текст предсказуемым.
 *  - `clampNumericValue` — граница значения при КОММИТЕ в стейт. Не мешает
 *    набирать число, но не пускает абсурд в расчёт (progression, PR, объём).
 *
 * Чистые функции, без React и I/O — по инварианту `CLAUDE.md` §2.
 */

export type NumericInputKind = 'decimal-pad' | 'number-pad';

/** Разумные границы значения в кг (хранение всегда в кг, `useUnitPreferences`). */
export const MAX_WEIGHT_KG = 500;
export const MAX_REPS = 200;
/** Десятичных знаков в весе: 0.5 шага хватает, лишние только шумят. */
const MAX_DECIMALS = 2;
/** Потолок длины строки ввода — защита от вставки «123456789». */
const MAX_INPUT_LENGTH = 7;

/**
 * Оставляет только цифры и один разделитель; «,» → «.», лишние точки выкидываются.
 * `number-pad` (повторы) — только целые.
 */
export function sanitizeNumericInput(raw: string, kind: NumericInputKind): string {
  if (!raw) return '';
  // Мгновенно режем всё, что не цифра и не разделитель (включая 'e', 'инф', пробелы).
  let s = raw.replace(',', '.').replace(/[^\d.]/g, '');

  if (kind === 'number-pad') {
    s = s.replace(/\./g, '');
    return s.slice(0, MAX_INPUT_LENGTH);
  }

  // Один разделитель: первую точку оставляем, остальные убираем.
  const firstDot = s.indexOf('.');
  s = firstDot === -1 ? s : s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');

  // Ограничение числа знаков после разделителя (только когда пользователь их печатает).
  if (firstDot !== -1) {
    const [intPart, fracPart] = [s.slice(0, firstDot), s.slice(firstDot + 1)];
    s = `${intPart}.${fracPart.slice(0, MAX_DECIMALS)}`;
  }

  return s.slice(0, MAX_INPUT_LENGTH);
}

/**
 * Граница значения при коммите. Пустая строка и мусор → '' (поле считается пустым,
 * а не нулём: ноль в весе означает «штанга без блинов» и отличается от «не заполнено»).
 */
export function clampNumericValue(raw: string, max: number): string {
  if (raw.trim() === '') return '';
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return '';
  if (v > max) return String(max);
  return raw;
}
