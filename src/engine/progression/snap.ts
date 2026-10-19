// PLATE-SNAP: последняя миля. Любой рекомендованный вес приводится к тому, что
// реально повесить: гантели 1–10 шагом 1 и 12–50 шагом 2, штанга — парами
// блинов (шаг 2,5 кг), гири шагом 4, стек тренажёра шагом 5. Делается в одном
// месте, а не в каждой ветке: ветков много (линейная, три политики, safety и
// readiness поверх), и в любой из них может родиться «12,72 кг».
//
// Отдельно бережёт смысл действия: если округление вернуло тот же вес, что был,
// снижение и повышение всё равно уезжают на соседный доступный вес — иначе
// «снизить вес» превращалось бы в «держи».
import type { ProgressionInput, ProgressionResult } from './types';
import { snapToLoadable, stepLoadable } from '../loadables';

export function applyLoadableSnap(
  result: ProgressionResult,
  input: ProgressionInput
): ProgressionResult {
  const raw = result.suggestedWeight;
  if (raw == null) return result;

  const bar = input.barWeightKg ?? 0;
  const base = result.reason?.factors?.lastWeight ?? null;
  let snapped = snapToLoadable(raw, input.equipment, bar) ?? raw;

  if (result.action === 'decrease' && base != null && snapped >= base) {
    const stepped = stepLoadable(base, 'down', input.equipment, bar);
    if (stepped < base) {
      snapped = stepped;
    } else {
      // Снаряд не даёт снизить вес дальше (например, пустой гриф 20 кг или
      // минимальная гантель). Честнее сказать «ниже некуда» и сместить нагрузку
      // на повторы, чем молча вернуть «тот же вес» под вывеской «снижаем».
      return {
        ...result,
        action: 'hold',
        suggestedWeight: base,
        loadableFrom: raw,
        reason: {
          ...result.reason,
          code: 'EQUIPMENT_FLOOR',
          ruText: `${result.reason.ruText}, но это минимальный вес снаряда — снижай объём`,
        },
      };
    }
  }
  if (result.action === 'increase' && base != null && snapped <= base) {
    snapped = stepLoadable(base, 'up', input.equipment, bar);
  }

  if (snapped === raw) return result;
  return { ...result, suggestedWeight: snapped, loadableFrom: raw };
}
