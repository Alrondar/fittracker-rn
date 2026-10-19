// P1.1: альтернативные политики прогрессии (double / greyskull / time-based).
// Каждая — самостоятельное дерево поверх величин, которые посчитало ядро
// (core.ts): диапазон повторов, effectiveStepKg, baseWeight и флаг разгрузки.
// Коды причин отсюда попадают в explanations.ts.
import type { ProgressionInput, ProgressionReason, ProgressionResult } from './types';
import { completedWorkingSets, getReps } from './sets';
import { round2 } from './rounding';

export function calculateDoubleProgression(
  input: ProgressionInput,
  targetRange: { min: number; max: number } | null,
  effectiveStepKg: number,
  baseWeight: number,
  shouldConsiderDeload: boolean
): ProgressionResult {
  const currentCompleted = completedWorkingSets(input.sets);
  const evalReps = currentCompleted.length > 0 ? currentCompleted.map(getReps) : [];

  const factors: ProgressionReason['factors'] = {
    lastWeight: baseWeight,
    lastReps: null,
    lastRpe: null,
    completedSets: currentCompleted.length,
    targetRange,
  };

  const increaseResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'increase',
    suggestedWeight: round2(baseWeight + effectiveStepKg),
    suggestedReps: targetRange ? targetRange.min : null,
    reason: { code, ruText, factors },
  });
  const holdResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'hold',
    suggestedWeight: baseWeight,
    suggestedReps: targetRange ? targetRange.max : null,
    reason: { code, ruText, factors },
  });

  if (shouldConsiderDeload) {
    return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
  }

  if (targetRange && evalReps.length > 0 && evalReps.every((r) => r >= targetRange.max)) {
    return increaseResult(
      'DOUBLE_ALL_MAX',
      `Все подходы ≥ ${targetRange.max} повт. → повышаем вес, сбрасываем повторения`
    );
  }

  return holdResult('DOUBLE_CONSOLIDATE', 'Набираем повторения в диапазоне');
}

export function calculateGreyskull(
  input: ProgressionInput,
  targetRange: { min: number; max: number } | null,
  effectiveStepKg: number,
  baseWeight: number,
  shouldConsiderDeload: boolean
): ProgressionResult {
  const currentCompleted = completedWorkingSets(input.sets);

  const factors: ProgressionReason['factors'] = {
    lastWeight: baseWeight,
    lastReps: null,
    lastRpe: null,
    completedSets: currentCompleted.length,
    targetRange,
  };

  const increaseResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'increase',
    suggestedWeight: round2(baseWeight + effectiveStepKg * 2), // большой шаг для greyskull
    suggestedReps: targetRange ? targetRange.min : null,
    reason: { code, ruText, factors },
  });
  const holdResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'hold',
    suggestedWeight: baseWeight,
    suggestedReps: targetRange ? targetRange.min : null,
    reason: { code, ruText, factors },
  });

  if (shouldConsiderDeload) {
    return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
  }

  if (currentCompleted.length >= 2) {
    const amrapSet = currentCompleted[currentCompleted.length - 1]; // последний сет = AMRAP
    const amrapReps = getReps(amrapSet);
    const targetReps = targetRange ? targetRange.min : 5;

    if (amrapReps >= targetReps * 2) {
      return increaseResult(
        'GREYSKULL_AMRAP_SUCCESS',
        `AMRAP ≥ ${targetReps * 2} повт. → повышаем вес`
      );
    }
  }

  return holdResult('GREYSKULL_HOLD', 'AMRAP не достигнут, закрепляем вес');
}

export function calculateTimeBased(
  input: ProgressionInput,
  targetRange: { min: number; max: number } | null,
  effectiveStepKg: number,
  baseWeight: number,
  shouldConsiderDeload: boolean
): ProgressionResult {
  const currentCompleted = completedWorkingSets(input.sets);
  const evalReps = currentCompleted.length > 0 ? currentCompleted.map(getReps) : [];

  const factors: ProgressionReason['factors'] = {
    lastWeight: baseWeight,
    lastReps: null,
    lastRpe: null,
    completedSets: currentCompleted.length,
    targetRange,
  };

  const increaseResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'increase',
    suggestedWeight: baseWeight, // вес не меняется
    suggestedReps: targetRange ? targetRange.min : null, // сбрасываем к минимуму
    reason: { code, ruText, factors },
  });
  const holdResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'hold',
    suggestedWeight: baseWeight,
    suggestedReps: targetRange ? targetRange.max : null,
    reason: { code, ruText, factors },
  });

  if (shouldConsiderDeload) {
    return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
  }

  if (targetRange && evalReps.length > 0 && evalReps.every((r) => r >= targetRange.max)) {
    return increaseResult(
      'TIME_ALL_MAX',
      `Все подходы ≥ ${targetRange.max} сек → усложняем вариант, время сбрасываем к минимуму`
    );
  }

  return holdResult('TIME_HOLD', 'Увеличиваем время удержания');
}
