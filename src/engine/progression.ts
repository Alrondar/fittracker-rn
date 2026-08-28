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
    /** P1.2: Тип текущей фазы программы для объяснения deload. */
    currentPhaseType?: 'strength' | 'hypertrophy' | 'endurance' | 'deload';
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
  /**
   * ENG-13: индекс сета, для которого даётся рекомендация (обычно первый незавершённый).
   * Для пирамидальных подходов baseWeight = previousWeight этого сета.
   * Если не передан — fallback на последний completed сет с историей (старая логика).
   */
  targetSetIndex?: number;
  /** P0: сколько сессий/недель подряд рекомендация была hold на том же весе. */
  consecutiveHolds?: number;
  /** P0: флаг недели разгрузки (из программы или вручную). */
  isDeloadWeek?: boolean;
  /** P0: возраст пользователя для корректировки восстановления. */
  age?: number;
  /** P0: является ли тренировка тяжелой (ноги/спина). */
  isHeavyDay?: boolean;
  /** P0: использует ли пользователь фармакологию (ускоренное восстановление). */
  usePharma?: boolean;
  /** P1.2: Тип текущей фазы программы для корректировки шага и deload. */
  currentPhaseType?: 'strength' | 'hypertrophy' | 'endurance' | 'deload';
  /** P1.2: Сколько недель пользователь находится в текущей фазе. */
  weeksInBlock?: number;
  /** P0 Вариант B: часы сна для оценки восстановления. */
  sleepHours?: number | null;
  /** P0 Вариант B: уровень стресса (1–5) для оценки восстановления. */
  stressLevel?: number | null;
  /** P1: Фаза менструального цикла для корректировки рекомендаций. */
  cyclePhase?: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
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
 *
 * ENG-13: Per-set recommendations + warmup filtering.
 * - Разминочные сеты (isWarmup === true) исключаются из оценки усталости.
 * - Базовый вес = previousWeight целевого сета (для пирамид).
 * - Оценка усталости = текущие завершённые рабочие сеты (не previousReps!).
 */
export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const { sets, repsRange, stepKg = DEFAULT_STEP_KG, targetSetIndex } = input;

  // 1. Рабочие сеты с историей (исключая warmup)
  const workingSetsWithHistory = sets.filter(
    (s) =>
      !s.isWarmup &&
      s.previousWeight != null &&
      s.previousReps != null &&
      !Number.isNaN(s.previousWeight) &&
      !Number.isNaN(s.previousReps),
  );

  const targetRange = parseRepsRange(repsRange);

  // No history: первый раз — используем программный вес
  if (workingSetsWithHistory.length === 0) {
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

  // 2. Базовый вес = previousWeight целевого сета (для пирамид)
  // Если targetSetIndex передан и имеет previousWeight — используем его.
  // Иначе fallback на последний completed сет с историей (старая логика).
  const targetSet = targetSetIndex != null ? sets[targetSetIndex] : null;
  const baseWeight = (targetSet?.previousWeight ?? null) as number | null
    ?? (workingSetsWithHistory[workingSetsWithHistory.length - 1].previousWeight as number);
  
  // Данные "прошлый раз" для хинта
  const hintReps = (targetSet?.previousReps ?? workingSetsWithHistory[workingSetsWithHistory.length - 1].previousReps) as number;
  const hintRpe = (targetSet?.previousRpe ?? workingSetsWithHistory[workingSetsWithHistory.length - 1].previousRpe) ?? null;

  // 3. Текущие завершённые РАБОЧИЕ сеты — для оценки усталости
  // (weight !== '' && reps !== '' = завершён; !isWarmup = рабочий)
  // ENG-13: если reps пустое, но есть estimatedReps — тоже учитываем (оценка пользователя)
  const currentCompleted = sets.filter(
    (s) =>
      !s.isWarmup &&
      s.weight !== '' &&
      (s.reps !== '' || s.estimatedReps != null),
  );

  // 4. Оценка: если есть currentCompleted, используем их; иначе fallback на прошлые данные
  // ENG-13: evalReps учитывает estimatedReps если reps пустое
  const evalReps = currentCompleted.length > 0
    ? currentCompleted.map((s) =>
        s.reps !== '' ? parseInt(s.reps, 10) : (s.estimatedReps ?? 0),
      )
    : workingSetsWithHistory.map((s) => s.previousReps as number);
  const evalRpe = currentCompleted.length > 0
    ? currentCompleted[currentCompleted.length - 1].rpe ?? null
    : (workingSetsWithHistory[workingSetsWithHistory.length - 1].previousRpe ?? null);
  
  const allAtMax =
    targetRange != null && evalReps.every((r) => r >= targetRange.max);
  const allAtMin =
    targetRange != null && evalReps.every((r) => r >= targetRange.min);
  const anyBelowMin =
    targetRange != null && evalReps.some((r) => r < targetRange.min);
  const allBelowMin =
    targetRange != null && evalReps.every((r) => r < targetRange.min);

  const factors: ProgressionReason['factors'] = {
    lastWeight: baseWeight,
    lastReps: hintReps,
    lastRpe: hintRpe,
    completedSets: currentCompleted.length || workingSetsWithHistory.length,
    targetRange,
    currentPhaseType: input.currentPhaseType,
  };

  // P1.2: Корректировка шага на основе фазы программы
  let effectiveStepKg = stepKg;
  if (input.currentPhaseType === 'hypertrophy') effectiveStepKg = 1.25;
  else if (input.currentPhaseType === 'endurance') effectiveStepKg = 1.0;
  // strength остаётся 2.5 (дефолт)

  // Вспомогалки для построения результата
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

  const decreaseResult = (code: string, ruText: string): ProgressionResult => {
    // Bodyweight protection: нельзя уйти ниже 0 кг (bodyweight не в кг-единицах)
    const newWeight = Math.max(0, round2(baseWeight - effectiveStepKg));
    return {
      action: 'decrease',
      suggestedWeight: newWeight > 0 ? newWeight : null,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: { code, ruText, factors },
    };
  };

  // ===== Decision tree (priority order) =====

  // 0. P0/P1.2: Неделя разгрузки или Deload фаза
  if (input.isDeloadWeek || input.currentPhaseType === 'deload') {
    const deloadWeight = Math.max(0, round2(baseWeight * 0.9));
    const isPhaseDeload = input.currentPhaseType === 'deload';
    return {
      action: 'decrease',
      suggestedWeight: deloadWeight > 0 ? deloadWeight : null,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: {
        code: isPhaseDeload ? 'DELOAD_PHASE' : 'DELOAD_WEEK',
        ruText: isPhaseDeload 
          ? 'Фаза разгрузки — снижаем нагрузку на 10%' 
          : 'Неделя разгрузки — снижаем нагрузку на 10%',
        factors,
      },
    };
  }

  // 0.5. P0 Вариант B: Recovery context (Сон/Стресс)
  // Применяется ДО базовых правил прогрессии, чтобы предотвратить повышение веса при плохом восстановлении
  if (input.sleepHours != null && input.sleepHours < 6) {
    return {
      action: 'hold',
      suggestedWeight: baseWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: {
        code: 'LOW_SLEEP',
        ruText: `Сон ${input.sleepHours}ч — ниже нормы. Закрепляем вес для безопасности.`,
        factors,
      },
    };
  }
  if (input.stressLevel != null && input.stressLevel >= 4) {
    return {
      action: 'hold',
      suggestedWeight: baseWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: {
        code: 'HIGH_STRESS',
        ruText: `Высокий стресс (${input.stressLevel}/5). Закрепляем вес.`,
        factors,
      },
    };
  }

  // 0.6. P1: Cycle context (Менструальный цикл)
  // Применяется ДО базовых правил прогрессии
  if (input.cyclePhase === 'luteal') {
    return {
      action: 'hold',
      suggestedWeight: baseWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: {
        code: 'LUTEAL_PHASE',
        ruText: 'Лютеиновая фаза цикла — закрепляем вес.',
        factors,
      },
    };
  }
  if (input.cyclePhase === 'ovulation') {
    return {
      action: 'hold',
      suggestedWeight: baseWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: {
        code: 'OVULATION_RISK',
        ruText: 'Овуляция — высокий риск травм, закрепляем вес.',
        factors,
      },
    };
  }

  // 1. Полный отказ
  if (evalRpe === 10) {
    return decreaseResult('MAX_EFFORT', 'Отказ — снижаем вес');
  }

  // ENG-13: Weight trend signal — если текущий рабочий вес значительно ниже прошлого,
  // пользователь, вероятно, устал. Не предлагаем повышение (даже если повторы и RPE
  // позволяют), а при сильном провале — снижаем.
  // avgRatio = среднее (currentWeight / previousWeight) по завершённым рабочим сетам
  // с историей. ratio < 0.95 → SESSION_LIGHT_DAY (cap increase to hold, base = previousWeight × avgRatio).
  // ratio < 0.90 → SESSION_FATIGUE (decrease to previousWeight × avgRatio).
  const currentWorkingSets = sets.filter(
    (s) => !s.isWarmup && s.weight !== '' && s.reps !== '' && s.previousWeight != null && s.previousWeight > 0
  );
  let avgRatio: number | null = null;
  if (currentWorkingSets.length > 0) {
    const ratios = currentWorkingSets.map((s) => parseFloat(s.weight) / (s.previousWeight as number));
    avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  // SESSION_FATIGUE: weights significantly below last time — decrease to current level
  if (avgRatio != null && avgRatio < 0.90) {
    const adjustedWeight = Math.max(0, round2(baseWeight * avgRatio));
    return {
      action: 'decrease',
      suggestedWeight: adjustedWeight > 0 ? adjustedWeight : null,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: { code: 'SESSION_FATIGUE', ruText: 'Веса заметно ниже прошлого раза — снижаем до текущего уровня', factors },
    };
  }
  // SESSION_LIGHT_DAY: weights slightly below last time — cap increase to hold, use lower weight
  if (avgRatio != null && avgRatio >= 0.90 && avgRatio < 1.0) {
    // Don't increase — if base chain would say increase, use hold at adjusted weight
    // But this rule is checked BEFORE READY_TO_PROGRESS, so if we're here, it's always a SESSION_LIGHT_DAY hold
    const adjustedWeight = round2(baseWeight * avgRatio);
    return {
      action: 'hold',
      suggestedWeight: adjustedWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: { code: 'SESSION_LIGHT_DAY', ruText: 'Веса ниже прошлого раза — закрепляем, без повышения', factors },
    };
  }

  // 2. Все повторы по верху диапазона + низкий RPE → явно готовы к прогрессу
  if (allAtMax && evalRpe != null && evalRpe <= 7) {
    // P1.2: Авто-deload при >6 недель в блоке
    if (input.weeksInBlock != null && input.weeksInBlock > 6) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return increaseResult('READY_TO_PROGRESS', 'Все повторы, низкий RPE');
  }

  // 3. Все повторы по верху + нет RPE данных — всё равно прогресс (reps-driven)
  if (allAtMax && evalRpe == null) {
    return increaseResult('ALL_MAX_REPS', 'Все повторы по верху диапазона');
  }

  // 4. Высокий RPE — закрепляем результат
  if (evalRpe != null && evalRpe >= 9) {
    return holdResult('HIGH_RPE_HOLD', 'Высокий RPE — закрепляем вес');
  }

  // 5a. Все повторы в диапазоне (>= min) → consolidate
  if (allAtMin) {
    // P0: Плато — если 3+ сессии подряд hold, предлагаем deload
    if (input.consecutiveHolds != null && input.consecutiveHolds >= 3) {
      const plateauWeight = Math.max(0, round2(baseWeight * 0.9));
      return {
        action: 'decrease',
        suggestedWeight: plateauWeight > 0 ? plateauWeight : null,
        suggestedReps: targetRange ? targetRange.min : null,
        reason: {
          code: 'PLATEAU_DELOAD',
          ruText: 'Плато 3+ недели — время разгрузки (-10%)',
          factors,
        },
      };
    }
    return holdResult('CONSOLIDATE', 'В диапазоне — закрепляем');
  }

  // 5b. Без таргета: low RPE = consolidate (не знаем, попали ли в репы)
  if (targetRange == null && evalRpe != null && evalRpe <= 8) {
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

    case 'DELOAD_WEEK':
    case 'DELOAD_PHASE':
      items.push({
        kind: 'signal',
        label: 'Периодизация',
        value: reason.factors.currentPhaseType === 'deload' ? 'фаза разгрузки программы' : 'запланированная неделя разгрузки',
        emphasis: 'warning',
      });
      break;

    case 'AUTO_DELOAD_SUGGESTION':
      items.push({
        kind: 'signal',
        label: 'Периодизация',
        value: '6+ недель в текущей фазе — рекомендуется разгрузка',
        emphasis: 'warning',
      });
      break;

    case 'PLATEAU_DELOAD':
      items.push({
        kind: 'signal',
        label: 'Плато',
        value: 'стабильные результаты 3+ недели подряд',
        emphasis: 'warning',
      });
      break;

    case 'LOW_SLEEP':
      items.push({
        kind: 'signal',
        label: 'Сон',
        value: 'менее 6 часов — восстановление невозможно',
        emphasis: 'warning',
      });
      break;

    case 'HIGH_STRESS':
      items.push({
        kind: 'signal',
        label: 'Стресс',
        value: 'высокий уровень стресса повышает риск травмы',
        emphasis: 'warning',
      });
      break;

    case 'SESSION_FATIGUE':
      items.push({
        kind: 'signal',
        label: 'Вес сегодня',
        value: 'заметно ниже прошлого раза — возможная усталость',
        emphasis: 'warning',
      });
      break;

    case 'SESSION_LIGHT_DAY':
      items.push({
        kind: 'signal',
        label: 'Вес сегодня',
        value: 'ниже прошлого раза — закрепляем без повышения',
        emphasis: 'warning',
      });
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
  // 2.5. ENG-4: SAFETY OVERRIDE — если recommendation подавлена или downgraded
  // из-за pain/injury, добавляем сигнал с warning emphasis.
  const safetyOverride = (result as ProgressionResult & {
    safetyOverride?: SafetyOverride | null;
  }).safetyOverride;
  if (safetyOverride) {
    let signalText: string;
    switch (safetyOverride.code) {
      case 'PAIN_STOPPED':
        signalText = 'Пользователь прекратил упражнение из-за боли';
        break;
      case 'INJURY_AVOID':
        signalText = 'Противопоказание (injury_exercise_warnings)';
        break;
      case 'PAIN_RECORDED':
        signalText = 'В этой тренировке отмечена боль в упражнении';
        break;
      case 'INJURY_CAUTION':
        signalText = 'Травма требует остороности (injury_exercise_warnings)';
        break;
      default:
        signalText = 'Safety constraint';
    }
    items.push({
      kind: 'signal',
      label: 'Безопасность',
      value: signalText,
      emphasis: 'warning',
    });
  }

  // 2.6. ENG-3: READINESS OVERRIDE — low readiness + base increase → hold
  const readinessOverride = (result as ProgressionResult & {
    readinessOverride?: ReadinessOverride | null;
  }).readinessOverride;
  if (readinessOverride) {
    items.push({
      kind: 'signal',
      label: 'Readiness',
      value: readinessOverride.ruText,
      emphasis: 'warning',
    });
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
    const isDeload = reason.code === 'DELOAD_WEEK' || reason.code === 'DELOAD_PHASE' || reason.code === 'PLATEAU_DELOAD';
    items.push({
      kind: 'conclusion',
      label: isDeload ? 'Разгрузка' : 'Снизить до',
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
// ============================================================================
// ENG-4: SAFETY PRECEDENCE (pain/injury > recommendation)
// PRODUCT.md §8: injury/pain constraints → training constraints →
// recommendation → AI. Engine не может рекомендовать повышение, если
// отмечена боль или есть травма-ограничение.
// ============================================================================

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
  safety: SafetyContext | null,
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
        suggestedReps: base.reason.factors.targetRange
          ? base.reason.factors.targetRange.max
          : null,
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
        suggestedReps: base.reason.factors.targetRange
          ? base.reason.factors.targetRange.max
          : null,
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
// ============================================================================
// ENG-3: READINESS CONTEXT (optional signal, PRODUCT.md §7)
// Readiness влияет на recommendation, но:
//   - отсутствие check-in (null) НЕ меняет recommendation;
//   - боль/травма имеют больший приоритет (PRODUCT.md §8).
// Применяется ПОСЛЕ applySafetyPrecedence: если safety уже подавила
// recommendation или downgraded её, readiness — no-op.
// ============================================================================

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
 *   - readiness 1-2 + base action=increase → downgrade to hold, код LOW_READINESS
 *   - readiness 3-5 → no-op (базовые правила ENG-1 уже решают)
 *
 * Возвращает новый объект (не мутирует input).
 */
export function applyReadinessContext(
  input: ProgressionResult & { safetyOverride?: SafetyOverride | null },
  readiness: ReadinessContext | null,
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
      suggestedReps: input.reason.factors.targetRange
        ? input.reason.factors.targetRange.max
        : null,
      readinessOverride: {
        code: 'LOW_READINESS',
        ruText: `Низкая готовность (${readiness.readiness} из 5) — фиксируем вес`,
      },
    };
  }
  // Readiness 3-5: no-op
  return { ...input, readinessOverride: null };
}