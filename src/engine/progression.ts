// src/engine/progression.ts
// ENG-1: детерминированные правила прогрессии веса/повторов.
// Чистая функция — без React, без Supabase, без side effects.
// Работает по previous-данным (прошлый раз этого упражнения): пользователь
// видит хинт «прошлый раз: X кг × Y · RPE Z» и получает объяснимую рекомендацию.
// Живой recompute по текущим сетам — задача COACH-1 (Recommendation card).
//
// Решения в порядке приоритета (первое совпадение — результат):
//   1. lastRpe === 10                    → decrease · MAX_EFFORT
//   2. repsAllAtMax + lastRpe <= 7       → increase · READY_TO_PROGRESS
//   3. repsAllAtMax + no RPE             → increase · ALL_MAX_REPS
//   4. lastRpe >= 9                      → hold · HIGH_RPE_HOLD
//   5. repsAllAtMin (или low RPE без таргета) → hold · CONSOLIDATE
//   6. allBelowMin (все ниже таргета)    → decrease · OVERREACHED
//   7. anyBelowMin                       → hold · MISSED_REPS
//   8. fallback                          → hold · INCONCLUSIVE

import type { SetData } from '../types/workout';

// ============================================================================
// ТИПЫ
// ============================================================================
export type ProgressionAction = 'increase' | 'hold' | 'decrease' | 'no_data';

export interface ProgressionReason {
  /** Machine-readable код (фундамент для ENG-2 structured reasons). */
  code: string;
  /** Человекочитаемый one-liner для UI (RU). */
  ruText: string;
  /** Факторы решения — для «Почему?» и логов. */
  factors: {
    lastWeight: number | null;
    lastReps: number | null;
    lastRpe: number | null;
    completedSets: number;
    targetRange: { min: number; max: number } | null;
  };
}

export interface ProgressionResult {
  action: ProgressionAction;
  /** В кг (storage unit). null при bodyweight decrease или no_data. */
  suggestedWeight: number | null;
  /** Рекомендуемые повторы. null при no_data или отсутствии таргета. */
  suggestedReps: number | null;
  reason: ProgressionReason;
}

export interface ProgressionInput {
  sets: SetData[];
  /** Формат: "8-12", "10", "8+", "8 - 12" — любой с одним-двумя числами. */
  repsRange: string | null;
  /** Шаг изменения в кг. Default 2.5 (меньший чип прогрессии). */
  stepKg?: number;
}

// ============================================================================
// ПАРСЕР repsRange
// ============================================================================
/**
 * Парсит строку диапазона повторов. Поддерживает:
 *   "8-12", "8 - 12", "8–12", "8—12" → {min: 8, max: 12}
 *   "10"                              → {min: 10, max: 10}
 *   "8+"                              → {min: 8, max: 8}
 *   null, "", "abc"                   → null
 */
export function parseRepsRange(
  repsRange: string | null | undefined,
): { min: number; max: number } | null {
  if (!repsRange || repsRange.trim() === '') return null;
  // Захватывает одно или два числа через необязательный разделитель (dash/em-dash)
  const match = repsRange.match(/(\d+)(?:\s*[-–—+]\s*(\d+))?/);
  if (!match) return null;
  const first = parseInt(match[1], 10);
  if (Number.isNaN(first)) return null;
  // Если второго числа нет (single "10" или "8+"), min = max = first
  const second = match[2] ? parseInt(match[2], 10) : first;
  if (Number.isNaN(second)) return null;
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}

// ============================================================================
// ЧИСТЫЙ ДВИЖОК
// ============================================================================
const DEFAULT_STEP_KG = 2.5;

/**
 * Вычисляет рекомендацию прогрессии по previous-данным сетов.
 * Не мутирует input. Возвращает детерминированный результат.
 */
export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const { sets, repsRange, stepKg = DEFAULT_STEP_KG } = input;

  // Сеты с валидными previous-данными
  const completed = sets.filter(
    (s) =>
      s.previousWeight != null &&
      s.previousReps != null &&
      !Number.isNaN(s.previousWeight) &&
      !Number.isNaN(s.previousReps),
  );

  const targetRange = parseRepsRange(repsRange);

  // No data: ничего не можем сказать
  if (completed.length === 0) {
    return {
      action: 'no_data',
      suggestedWeight: null,
      suggestedReps: null,
      reason: {
        code: 'NO_HISTORY',
        ruText: 'Первый раз: используй программный вес',
        factors: {
          lastWeight: null,
          lastReps: null,
          lastRpe: null,
          completedSets: 0,
          targetRange,
        },
      },
    };
  }

  // Рабочий вес = вес первого completed сета (обычно все рабочие сеты одинаковы)
  const lastWeight = completed[0].previousWeight as number;
  // Last RPE = последний непустой RPE в порядке сетов (обычно последний сет — самый тяжёлый)
  const rpeCandidates = completed
    .map((s) => s.previousRpe)
    .filter((r): r is number => r != null && !Number.isNaN(r));
  const lastRpe = rpeCandidates.length > 0 ? rpeCandidates[rpeCandidates.length - 1] : null;
  // Last reps = reps первого completed сета (для хинта «прошлый раз»)
  const lastReps = completed[0].previousReps as number;

  const reps = completed.map((s) => s.previousReps as number);
  const allAtMax =
    targetRange != null && reps.every((r) => r >= targetRange.max);
  const allAtMin =
    targetRange != null && reps.every((r) => r >= targetRange.min);
  const anyBelowMin =
    targetRange != null && reps.some((r) => r < targetRange.min);
  const allBelowMin =
    targetRange != null && reps.every((r) => r < targetRange.min);

  const factors: ProgressionReason['factors'] = {
    lastWeight,
    lastReps,
    lastRpe,
    completedSets: completed.length,
    targetRange,
  };

  // Вспомогалки для построения результата
  const increaseResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'increase',
    suggestedWeight: round2(lastWeight + stepKg),
    suggestedReps: targetRange ? targetRange.min : null,
    reason: { code, ruText, factors },
  });

  const holdResult = (code: string, ruText: string): ProgressionResult => ({
    action: 'hold',
    suggestedWeight: lastWeight,
    suggestedReps: targetRange ? targetRange.max : null,
    reason: { code, ruText, factors },
  });

  const decreaseResult = (code: string, ruText: string): ProgressionResult => {
    // Bodyweight protection: нельзя уйти ниже 0 кг (bodyweight не в кг-единицах)
    const newWeight = Math.max(0, round2(lastWeight - stepKg));
    return {
      action: 'decrease',
      suggestedWeight: newWeight > 0 ? newWeight : null,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: { code, ruText, factors },
    };
  };

  // ===== Decision tree (priority order) =====

  // 1. Полный отказ
  if (lastRpe === 10) {
    return decreaseResult('MAX_EFFORT', 'Отказ — снижаем вес');
  }

  // 2. Все повторы по верху диапазона + низкий RPE → явно готовы к прогрессу
  if (allAtMax && lastRpe != null && lastRpe <= 7) {
    return increaseResult('READY_TO_PROGRESS', 'Все повторы, низкий RPE');
  }

  // 3. Все повторы по верху + нет RPE данных — всё равно прогресс (reps-driven)
  if (allAtMax && lastRpe == null) {
    return increaseResult('ALL_MAX_REPS', 'Все повторы по верху диапазона');
  }

  // 4. Высокий RPE — закрепляем результат
  if (lastRpe != null && lastRpe >= 9) {
    return holdResult('HIGH_RPE_HOLD', 'Высокий RPE — закрепляем вес');
  }

  // 5a. Все повторы в диапазоне (>= min) → consolidate
  if (allAtMin) {
    return holdResult('CONSOLIDATE', 'В диапазоне — закрепляем');
  }

  // 5b. Без таргета: low RPE = consolidate (не знаем, попали ли в репы)
  if (targetRange == null && lastRpe != null && lastRpe <= 8) {
    return holdResult('CONSOLIDATE', 'Уверенное выполнение — закрепляем');
  }

  // 6. Все повторы ниже таргета → overreached, снижаем
  if (allBelowMin) {
    return decreaseResult('OVERREACHED', 'Не в диапазоне — снижаем вес');
  }

  // 7. Часть сетов ниже таргета → mixed signal, hold
  if (anyBelowMin) {
    return holdResult('MISSED_REPS', 'Часть повторов меньше цели — тот же вес');
  }

  // 8. Fallback: без таргета и без RPE — данных мало
  return holdResult('INCONCLUSIVE', 'Используй текущий вес');
}

// ============================================================================
// HELPERS
// ============================================================================
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
// ============================================================================
// ENG-2: STRUCTURED REASONS (объяснения «Почему?»)
// ============================================================================

/**
 * Элемент структурированного объяснения.
 * UI форматирует поля в читаемый вид, engine отдаёт сырые данные.
 * - input: факт о предыдущей тренировке (вес × повторы × RPE)
 * - signal: что учли (RPE, диапазон повторов, все/часть сетов)
 * - conclusion: рекомендация (вес × повторы)
 */
export type ExplanationItemKind = 'input' | 'signal' | 'conclusion';

export interface ExplanationItem {
  kind: ExplanationItemKind;
  /** Короткий label для UI («Прошлый результат», «RPE», «Диапазон») */
  label: string;
  /** Значение в формате, готовом к отображению. Для веса — `${X} кг`. */
  value: string;
  /** Визуальный акцент: соответствует semantic color в UI */
  emphasis?: 'success' | 'warning' | 'primary' | 'default';
}

/**
 * Строит структурированное объяснение рекомендации из ProgressionResult.
 * Чистая функция: принимает result, возвращает массив ExplanationItem.
 *
 * Pattern: input (прошлый результат) → signal (что учли) → conclusion (рекомендация).
 */
export function explainProgression(result: ProgressionResult): ExplanationItem[] {
  const { action, reason, suggestedWeight, suggestedReps } = result;
  const { lastWeight, lastReps, lastRpe, targetRange } = reason.factors;
  const items: ExplanationItem[] = [];

  // 1. INPUT — прошлый результат (если есть)
  if (lastWeight != null && lastReps != null) {
    let inputText = `${lastWeight} кг × ${lastReps}`;
    if (lastRpe != null) inputText += ` · RPE ${lastRpe}`;
    items.push({ kind: 'input', label: 'Прошлый результат', value: inputText });
  } else {
    items.push({
      kind: 'input',
      label: 'История',
      value: 'нет предыдущих тренировок',
      emphasis: 'default',
    });
  }

  // 2. SIGNAL — что учли (по коду)
  switch (reason.code) {
    case 'NO_HISTORY':
      items.push({
        kind: 'signal',
        label: 'Данные',
        value: 'нет истории для расчёта прогрессии',
        emphasis: 'default',
      });
      break;

    case 'MAX_EFFORT':
      items.push({
        kind: 'signal',
        label: 'RPE',
        value: `${lastRpe} — полный отказ (0 в запасе)`,
        emphasis: 'warning',
      });
      break;

    case 'READY_TO_PROGRESS':
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `все повторы на верхней границе (${targetRange.min}–${targetRange.max})`,
          emphasis: 'success',
        });
      }
      if (lastRpe != null) {
        items.push({
          kind: 'signal',
          label: 'RPE',
          value: `${lastRpe} — низкий (≥3 в запасе)`,
          emphasis: 'success',
        });
      }
      break;

    case 'ALL_MAX_REPS':
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `все повторы на верхней границе (${targetRange.min}–${targetRange.max})`,
          emphasis: 'success',
        });
      }
      items.push({
        kind: 'signal',
        label: 'RPE',
        value: 'не записан',
        emphasis: 'default',
      });
      break;

    case 'HIGH_RPE_HOLD':
      items.push({
        kind: 'signal',
        label: 'RPE',
        value: `${lastRpe} — высокий (1 в запасе)`,
        emphasis: 'warning',
      });
      break;

    case 'CONSOLIDATE':
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `все повторы в диапазоне (${targetRange.min}–${targetRange.max})`,
          emphasis: 'success',
        });
      } else if (lastRpe != null) {
        items.push({
          kind: 'signal',
          label: 'RPE',
          value: `${lastRpe} — уверенное выполнение`,
          emphasis: 'success',
        });
      }
      break;

    case 'OVERREACHED':
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `все повторы ниже цели (${targetRange.min}–${targetRange.max})`,
          emphasis: 'warning',
        });
      }
      break;

    case 'MISSED_REPS':
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `часть повторов ниже цели (${targetRange.min}–${targetRange.max})`,
          emphasis: 'warning',
        });
      }
      break;

    case 'INCONCLUSIVE':
      items.push({
        kind: 'signal',
        label: 'Данные',
        value: 'недостаточно для уверенной рекомендации',
        emphasis: 'default',
      });
      break;
  }

  // 3. CONCLUSION — рекомендация
  const repsPart = suggestedReps != null ? ` × ${suggestedReps}` : '';
  if (action === 'no_data') {
    items.push({
      kind: 'conclusion',
      label: 'Рекомендация',
      value: 'используй программный вес',
      emphasis: 'primary',
    });
  } else if (action === 'increase' && suggestedWeight != null) {
    items.push({
      kind: 'conclusion',
      label: 'Рекомендуем',
      value: `${suggestedWeight} кг${repsPart}`,
      emphasis: 'success',
    });
  } else if (action === 'decrease' && suggestedWeight != null) {
    items.push({
      kind: 'conclusion',
      label: 'Снизить до',
      value: `${suggestedWeight} кг${repsPart}`,
      emphasis: 'warning',
    });
  } else if (suggestedWeight != null) {
    items.push({
      kind: 'conclusion',
      label: 'Закрепить',
      value: `${suggestedWeight} кг${repsPart}`,
      emphasis: 'primary',
    });
  } else {
    items.push({
      kind: 'conclusion',
      label: 'Рекомендация',
      value: 'используй текущий вес',
      emphasis: 'primary',
    });
  }

  return items;
}