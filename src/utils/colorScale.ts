// src/utils/colorScale.ts
//
// Утилиты для построения цветовой шкалы мышц из `colors.primary` темы.
// Задача: при переключении темы (синяя/фиолетовая/розовая/…) карта мышц
// автоматически меняет акцентный цвет — без хардкода палитр.
//
// Интенсивность задаётся числом 0..1:
//   0 — мышца не задействована (используется baseFill, например textTertiary)
//   1 — максимальная нагрузка (colors.primary)
// Между — линейная интерполяция в RGB-пространстве.

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16) || 0;
    g = parseInt(clean.slice(2, 4), 16) || 0;
    b = parseInt(clean.slice(4, 6), 16) || 0;
  }
  return [r, g, b];
}

function toHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

/**
 * Линейная интерполяция между двумя hex-цветами.
 * t=0 → a, t=1 → b.
 */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const k = Math.max(0, Math.min(1, t));
  const r = ar + (br - ar) * k;
  const g = ag + (bg - ag) * k;
  const bl = ab + (bb - ab) * k;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

/**
 * Цвет мышцы на карте по интенсивности и текущей теме.
 * intensity 0..1: 0 → base (не освещена), 1 → primary (максимальная нагрузка).
 */
export function intensityColor(primary: string, base: string, intensity: number): string {
  const k = Math.max(0, Math.min(1, intensity));
  if (k <= 0.04) return base;
  return mixHex(base, primary, k);
}

/**
 * Построить 5-ступенчатую шкалу от base до primary (для легенды).
 * Возвращает массив из 5 hex-цветов: [очень слабый, слабый, средний, сильный, максимальный].
 */
export function buildIntensityScale(primary: string, base: string): readonly string[] {
  return [0.2, 0.4, 0.6, 0.8, 1.0].map((t) => intensityColor(primary, base, t));
}
