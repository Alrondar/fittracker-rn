/**
 * A11Y (аудит 06.10, `spark-output/audit/a11y-wcag-2026-10-06.md`): подбор чернил
 * под акцентный фон по WCAG 2.1 relative luminance.
 *
 * Почему не хардкод: `colors.textInverse` в светлых темах — белый, а `primary`
 * в них же местами слишком светлый (neon #00CC6A → 2.13:1, orange #FF6B35 → 2.84:1,
 * blue #0984E3 → 3.87:1, pink #E91E63 → 4.35:1; проходит только purple 5.70:1).
 * Функция выбирает того кандидата, у которого отношение контраста к фону больше,
 * поэтому палитру тем менять не нужно — меняется только цвет текста/иконки на ней.
 *
 * Чистые функции, без React и I/O (инвариант CLAUDE.md §2).
 */

const srgbToLinear = (c: number): number =>
  c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const parse = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean.slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
};

/** Относительная яркость по WCAG 2.1 (0 — чёрный, 1 — белый). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Отношение контраста двух цветов по WCAG (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Чернила под фон из списка кандидатов.
 *
 * Берётся ПЕРВЫЙ кандидат, который набирает `target` (по умолчанию 4.5:1 — AA для
 * обычного текста), а не самый контрастный: иначе в темах, где белый и так законен,
 * кнопка внезапно стала бы чёрной. Если ни один кандидат не проходит — берётся
 * лучший по отношению (в честном AA мы не врём, что норма выполнена).
 *
 * Кандидаты приходят из темы (её `textInverse`/`textPrimary`) плюс нейтральные
 * `#FFFFFF`/`#000000` как гарантия AA — новая палитра при этом не вводится.
 */
export function bestInkOn(background: string, candidates: string[], target = 4.5): string {
  let fallback = candidates[0] ?? background;
  let fallbackRatio = -1;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio >= target) return candidate;
    if (ratio > fallbackRatio) {
      fallback = candidate;
      fallbackRatio = ratio;
    }
  }
  return fallback;
}
