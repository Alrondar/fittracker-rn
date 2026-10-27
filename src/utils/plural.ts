// src/utils/plural.ts
// CONN-1 (27.10): один шаг склонения существительного по числу. Нужен плашке
// «не записано N подходов»; существующие pluralizeSets/pluralizeDays
// (src/utils/muscleLoad.ts:136,157) остаются как есть — перенос ради переноса.

/**
 * `pluralWord(3, ['подход', 'подхода', 'подходов'])` → «3 подхода».
 * Дробные сюда не приходят: число всегда целое (счётчик подходов).
 */
export function pluralWord(n: number, forms: [string, string, string]): string {
  const value = Math.round(n);
  const abs = Math.abs(value);
  const last2 = abs % 100;
  const last = abs % 10;
  const form = last2 >= 11 && last2 <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
  return `${value} ${forms[form]}`;
}
