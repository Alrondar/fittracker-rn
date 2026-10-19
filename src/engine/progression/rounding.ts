// Арифметика движка: один округлитель на все ветки и формат числа для русских подписей.
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Число внутри русской подписи: 1.25 → «1,25», иначе фраза читается как опечатка. */
export function numText(n: number): string {
  return String(round2(n)).replace('.', ',');
}
