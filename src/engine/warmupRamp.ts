// src/engine/warmupRamp.ts
// WARMUP-3d (ENG-12): лесенка разминочных подходов к рабочему весу.
// Чистая функция — без React и Supabase, как остальное в src/engine/.
//
// Протокол взят из спецификации ENG-12 (STATUS §5) без изменений:
//   compound   (база: присед/тяга/жим)  → 50%×5, 70%×3, 85%×1
//   blood_flow (изоляция/памп)          → 40%×12, 60%×6
// Выбор протокола — по `intensity` упражнения (вердикт владельца 20.10):
// high|medium → compound, low → blood_flow, неизвестное значение → лесенки нет.
//
// База процента — верхний вес: рекомендация движка, фолбэк на вес «прошлого
// раза» (тоже вердикт владельца). Если ни того, ни другого нет — план не
// строится: выдумывать вес для разминки нельзя.
import { snapToLoadable } from './loadables';
import { round2 } from './progression/rounding';

export type RampProtocol = 'compound' | 'blood_flow';

export interface RampStep {
  /** Итог округления под снаряд, кг (storage unit). */
  weightKg: number;
  reps: number;
  /** Доля верхнего веса, которой получились ступень (для подписи «70%»). */
  pct: number;
}

export interface RampPlan {
  protocol: RampProtocol;
  topWeightKg: number;
  steps: RampStep[];
}

export interface RampInput {
  /** Верхний вес в кг: рекомендация движка или previousWeight последнего подхода. */
  topWeightKg: number | null | undefined;
  intensity?: string | null;
  /** Снаряжение упражнения (как в PLATE-SNAP): лесенка обязана быть подъёмной. */
  equipment?: (string | null)[] | string | null;
  /** Вес грифа в кг, 0 если не штанга. */
  barWeightKg?: number;
}

const LADDER: Record<RampProtocol, { pct: number; reps: number }[]> = {
  compound: [
    { pct: 0.5, reps: 5 },
    { pct: 0.7, reps: 3 },
    { pct: 0.85, reps: 1 },
  ],
  blood_flow: [
    { pct: 0.4, reps: 12 },
    { pct: 0.6, reps: 6 },
  ],
};

export function rampProtocolForIntensity(intensity?: string | null): RampProtocol | null {
  if (intensity === 'high' || intensity === 'medium') return 'compound';
  if (intensity === 'low') return 'blood_flow';
  return null;
}

/**
 * Строит лесенку или возвращает null, когда её строить не из чего (нет верхнего
 * веса, неизвестная интенсивность, вес собственного тела, либо все ступени
 * округляются до самого рабочего веса).
 */
export function planRampUp(input: RampInput): RampPlan | null {
  const top = input.topWeightKg;
  if (top == null || !Number.isFinite(top) || top <= 0) return null;

  const protocol = rampProtocolForIntensity(input.intensity);
  if (!protocol) return null;

  const equipment = input.equipment ?? null;
  const bar = input.barWeightKg ?? 0;
  // На собственном весе проценты от «рабочего веса» бессмысленны: там нет штанги,
  // которую можно разбить на ступени.
  const eqList = Array.isArray(equipment) ? equipment.join('|') : String(equipment ?? '');
  if (/body\s*only|bodyweight/i.test(eqList)) return null;

  const steps: RampStep[] = [];
  for (const rung of LADDER[protocol]) {
    const raw = round2(top * rung.pct);
    // Snap к тому, что реально повесить; если снаряд не позволяет — берём сырое.
    const snapped = snapToLoadable(raw, equipment, bar) ?? raw;
    const weightKg = Math.max(bar, snapped);
    // Ступень должна быть строго ниже верха и строго выше предыдущей,
    // иначе это не лесенка, а дубль рабочего веса.
    if (weightKg >= top) continue;
    if (steps.length > 0 && weightKg <= steps[steps.length - 1].weightKg) continue;
    steps.push({ weightKg, reps: rung.reps, pct: rung.pct });
  }

  return steps.length > 0 ? { protocol, topWeightKg: top, steps } : null;
}

/** Подпись ступени для UI: 0.7 → «70%». */
export function rampPctLabel(pct: number): string {
  return `${Math.round(pct * 100)}%`;
}
