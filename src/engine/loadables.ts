// src/engine/loadables.ts
// PLATE-SNAP: округление рекомендованного веса до веса, который реально взять.
//
// Почему нужно: движок считает шаг в кг (+1,25 в гипертрофии, −5% на плато), а
// история иногда приходит после пересчёта из фунтов — наружу выходило «12,72 кг».
// Гантель с таким номиналом в зале не существует. Рекомендация, которую нельзя
// повесить, бесполезна и подрывает доверие к остальным числам (PRODUCT.md §3).
//
// Чистые функции, без React и I/O (инвариант CLAUDE.md §2).

/** Номиналы, которые пользователь назвал реальными для своего зала. */
const DUMBBELL_STEP_KG = 1;
const DUMBBELL_STEP1_MAX_KG = 10;
const DUMBBELL_STEP2_MAX_KG = 50;
/** Меньший блин из списка 25/20/15/10/5/2,5/1,25 → на штанге шаг 2×1,25. */
const BARBELL_MIN_PLATE_KG = 1.25;
const KETTLEBELL_STEP_KG = 4;
const STACK_STEP_KG = 5;
/** Всё остальное (свои тела, пояса, скамьи) — хотя бы убираем дробный мусор. */
const FALLBACK_STEP_KG = 0.5;

export type LoadableLadder = 'dumbbell' | 'barbell' | 'kettlebell' | 'stack' | 'fallback';

const DUMBBELL_NAMES = ['гантел', 'dumbbell'];
const BARBELL_NAMES = [
  'штанг',
  'гриф',
  'блин',
  'смит',
  'смита',
  'barbell',
  'ez bar',
  'trap bar',
  'smith',
  't-bar',
  'олимпийск',
];
const KETTLEBELL_NAMES = ['гир', 'kettlebell'];
const STACK_NAMES = [
  'кроссовер',
  'блок',
  'тренажер',
  'тренажёр',
  'рычаж',
  'кабель',
  'stack',
  'machine',
  'порожн',
];

const norm = (s: string): string => s.toLowerCase().replace(/ё/g, 'е');

/**
 * Лестница по списку снаряжения упражнения. Первое совпадение выигрывает:
 * «Гантели» важнее «Скамьи», «Тренажер Смита» важнее «Смит».
 */
export function ladderForEquipment(equipment?: (string | null)[] | string | null): LoadableLadder {
  const list = (Array.isArray(equipment) ? equipment : [equipment])
    .filter(Boolean)
    .map((x) => norm(String(x)));

  if (list.some((x) => DUMBBELL_NAMES.some((k) => x.includes(k)))) return 'dumbbell';
  if (list.some((x) => BARBELL_NAMES.some((k) => x.includes(k)))) return 'barbell';
  if (list.some((x) => KETTLEBELL_NAMES.some((k) => x.includes(k)))) return 'kettlebell';
  if (list.some((x) => STACK_NAMES.some((k) => x.includes(k)))) return 'stack';
  return 'fallback';
}

const roundTo = (kg: number, step: number): number =>
  Math.round((kg + Number.EPSILON) / step) * step;

/** Гантели: 1–10 с шагом 1, 12–50 с шагом 2, дальше шаг 2,5. */
export function snapDumbbell(kg: number): number {
  if (kg <= 0) return 0;
  if (kg <= DUMBBELL_STEP1_MAX_KG) {
    return Math.max(DUMBBELL_STEP_KG, roundTo(kg, DUMBBELL_STEP_KG));
  }
  if (kg <= DUMBBELL_STEP2_MAX_KG) {
    // 10,5 → 11 кг быть не может: после десятки ряд только чётный.
    return roundTo(kg, 2);
  }
  return roundTo(kg, 2.5);
}

/**
 * Штанга: гриф + одинаковые пары блинов. Меньший блин 1,25 → шаг 2,5 кг,
 * поэтому вес сводится к ближайшей реальной сборке. Если вес грифа не известен
 * (0) — считаем шаг 2,5 от самого веса.
 */
export function snapBarbell(kg: number, barWeightKg = 0): number {
  const bar = barWeightKg > 0 ? barWeightKg : 0;
  if (kg <= bar) return bar;
  // На одну сторону кладётся только кратное меньшему блину, поэтому весь снаряд
  // ходит с шагом 2 × 1,25 = 2,5 кг.
  const perSide = (kg - bar) / 2;
  return round2(bar + 2 * roundTo(perSide, BARBELL_MIN_PLATE_KG));
}

/**
 * Ближайший доступный вес. `barWeightKg` — вес грифа в кг (0, если снаряд не
 * штанга или гриф не настроен). Возвращает 0 только для 0 на входе.
 */
export function snapToLoadable(
  kg: number | null | undefined,
  equipment?: (string | null)[] | string | null,
  barWeightKg = 0
): number | null {
  if (kg == null || !Number.isFinite(kg)) return null;
  if (kg <= 0) return 0;

  switch (ladderForEquipment(equipment)) {
    case 'dumbbell':
      return round2(snapDumbbell(kg));
    case 'barbell':
      return round2(snapBarbell(kg, barWeightKg));
    case 'kettlebell':
      return round2(Math.max(KETTLEBELL_STEP_KG, roundTo(kg, KETTLEBELL_STEP_KG)));
    case 'stack':
      return round2(Math.max(STACK_STEP_KG, roundTo(kg, STACK_STEP_KG)));
    default:
      return round2(roundTo(kg, FALLBACK_STEP_KG));
  }
}

/** Шаг лестницы, применимый к текущему весу. */
function ladderStep(kg: number, ladder: LoadableLadder): number {
  switch (ladder) {
    case 'dumbbell':
      return kg <= DUMBBELL_STEP1_MAX_KG ? DUMBBELL_STEP_KG : kg <= DUMBBELL_STEP2_MAX_KG ? 2 : 2.5;
    case 'barbell':
      return BARBELL_MIN_PLATE_KG * 2;
    case 'kettlebell':
      return KETTLEBELL_STEP_KG;
    case 'stack':
      return STACK_STEP_KG;
    default:
      return FALLBACK_STEP_KG;
  }
}

/**
 * Соседний доступный вес вверх или вниз. Нужен, когда округление «съедает»
 * предписанное изменение: снижение не должно превращаться в «держи тот же вес»,
 * а повышение — в «стой на месте».
 */
export function stepLoadable(
  kg: number,
  direction: 'up' | 'down',
  equipment?: (string | null)[] | string | null,
  barWeightKg = 0
): number {
  const ladder = ladderForEquipment(equipment);
  const step = ladderStep(kg, ladder);
  const target = direction === 'up' ? kg + step : kg - step;
  const snapped = snapToLoadable(target, equipment, barWeightKg);
  if (snapped == null) return 0;
  // Округление могло вернуть тот же самый вес (например, 12,4 → 12 вниз уже
  // «12») — тогда идём ещё на один шаг.
  if (snapped === kg) {
    const next = direction === 'up' ? kg + step : kg - step * 2;
    return snapToLoadable(next, equipment, barWeightKg) ?? 0;
  }
  return snapped;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
