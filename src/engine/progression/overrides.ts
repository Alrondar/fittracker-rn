// ENG-4: SAFETY PRECEDENCE (pain/injury > recommendation)
// PRODUCT.md §8: injury/pain constraints → training constraints →
// recommendation → AI. Engine не может рекомендовать повышение, если
// отмечена боль или есть травма-ограничение.
//
// ENG-3: READINESS CONTEXT (optional signal, PRODUCT.md §7)
// Readiness влияет на recommendation, но:
//   - отсутствие check-in (null) НЕ меняет recommendation;
//   - боль/травма имеют больший приоритет (PRODUCT.md §8).
// Применяется ПОСЛЕ applySafetyPrecedence: если safety уже подавила
// recommendation или downgraded её, readiness — no-op.
import type { ProgressionResult } from './types';

export interface SafetyContext {
  /** painState != null в этом упражнении текущей тренировки */
  hasPain: boolean;
  /** painState.stopExercise === true — пользователь прекратил из-за боли */
  stopExercise: boolean;
  /** warning.level из useInjuryWarnings (injury_exercise_warnings hard constraint) */
  warningLevel: 'avoid' | 'caution' | null;
}

export interface SafetyOverride {
  code: string;
  ruText: string;
}

/**
 * Применяет safety precedence к базовой рекомендации.
 * Чистая функция, O(1), без side effects.
 *
 * Порядок приоритета (первое совпадение — результат):
 *   1. stopExercise      → suppress (no_data)   · PAIN_STOPPED
 *   2. warning='avoid'   → suppress (no_data)   · INJURY_AVOID
 *   3. hasPain + increase → downgrade to hold   · PAIN_RECORDED
 *   4. caution + increase → downgrade to hold   · INJURY_CAUTION
 *   5. иначе → base result unchanged
 *
 * Возвращает новый объект (не мутирует input).
 */
export function applySafetyPrecedence(
  base: ProgressionResult,
  safety: SafetyContext | null
): ProgressionResult & { safetyOverride?: SafetyOverride | null } {
  if (!safety) return { ...base, safetyOverride: null };

  // 1. Suppression cases → hide recommendation entirely
  if (safety.stopExercise) {
    return {
      action: 'no_data',
      suggestedWeight: null,
      suggestedReps: null,
      reason: base.reason,
      safetyOverride: {
        code: 'PAIN_STOPPED',
        ruText: 'Прекращено из-за боли — рекомендация отключена',
      },
    };
  }

  if (safety.warningLevel === 'avoid') {
    return {
      action: 'no_data',
      suggestedWeight: null,
      suggestedReps: null,
      reason: base.reason,
      safetyOverride: {
        code: 'INJURY_AVOID',
        ruText: 'Упражнение противопоказано — рекомендация отключена',
      },
    };
  }

  // 2. Downgrade cases: increase → hold (conservative)
  if (base.action === 'increase') {
    if (safety.hasPain) {
      const holdWeight = base.reason.factors.lastWeight;
      return {
        action: 'hold',
        suggestedWeight: holdWeight,
        suggestedReps: base.reason.factors.targetRange ? base.reason.factors.targetRange.max : null,
        reason: base.reason,
        safetyOverride: {
          code: 'PAIN_RECORDED',
          ruText: 'Отмечена боль — фиксируем вес',
        },
      };
    }

    if (safety.warningLevel === 'caution') {
      const holdWeight = base.reason.factors.lastWeight;
      return {
        action: 'hold',
        suggestedWeight: holdWeight,
        suggestedReps: base.reason.factors.targetRange ? base.reason.factors.targetRange.max : null,
        reason: base.reason,
        safetyOverride: {
          code: 'INJURY_CAUTION',
          ruText: 'Осторожно с травмой — фиксируем вес',
        },
      };
    }
  }

  // 3. No override: base result unchanged
  return { ...base, safetyOverride: null };
}

export interface ReadinessContext {
  /** Значение readiness за сегодня (1-5). null = check-in не сделан → no-op. */
  readiness: number | null;
}

export interface ReadinessOverride {
  code: string;
  ruText: string;
}

/**
 * Применяет readiness-контекст к рекомендации, уже прошедшей safety.
 * Чистая функция, O(1).
 *
 * Правила:
 *   - Если safetyOverride уже установлен → no-op (PRODUCT.md §8: боль > усталость)
 *   - readiness == null (check-in не сделан) → no-op (PRODUCT.md §7: не gate)
 *   - readiness 1-2 + базовый increase → downgrade to hold, код LOW_READINESS
 *   - readiness 3-5 → no-op (базовые правила ENG-1 уже решают)
 *
 * Возвращает новый объект (не мутирует input).
 */
export function applyReadinessContext(
  input: ProgressionResult & { safetyOverride?: SafetyOverride | null },
  readiness: ReadinessContext | null
): ProgressionResult & {
  safetyOverride?: SafetyOverride | null;
  readinessOverride?: ReadinessOverride | null;
} {
  // Safety уже подавил или downgraded — readiness не вмешивается
  if (input.safetyOverride) {
    return { ...input, readinessOverride: null };
  }
  // No context / no check-in today — readiness не блокирует и не меняет (§7)
  if (!readiness || readiness.readiness == null) {
    return { ...input, readinessOverride: null };
  }
  // Readiness 1-2 (низкая готовность) + базовый increase → downgrade до hold
  if (readiness.readiness <= 2 && input.action === 'increase') {
    const holdWeight = input.reason.factors.lastWeight;
    return {
      ...input,
      action: 'hold',
      suggestedWeight: holdWeight,
      suggestedReps: input.reason.factors.targetRange ? input.reason.factors.targetRange.max : null,
      readinessOverride: {
        code: 'LOW_READINESS',
        ruText: `Низкая готовность (${readiness.readiness} из 5) — фиксируем вес`,
      },
    };
  }
  // Readiness 3-5: no-op
  return { ...input, readinessOverride: null };
}
