// Ядро прогрессии (ENG-1): детерминированные правила веса/повторов по
// previous-данным. Чистые функции — без React, без Supabase, без side effects.
// Работает по данным «прошлый раз этого упражнения»: пользователь видит хинт
// «прошлый раз: X кг × Y · RPE Z» и получает объяснимую рекомендацию.
// Живой recompute по текущим сетам — задача COACH-1 (Recommendation card).
//
// Решения в порядке приоритета (первое совпадение — результат):
//   1. lastRpe === 10, отказ повторный   → decrease · MAX_EFFORT
//      Одиночный отказ (10 только в одном подходе) → hold · MAX_EFFORT_SINGLE
//   2. repsAllAtMax + lastRpe <= 7       → increase · READY_TO_PROGRESS
//   3. repsAllAtMax + no RPE             → increase · ALL_MAX_REPS
//   4. lastRpe >= 9                      → hold · HIGH_RPE_HOLD
//   5. repsAllAtMin (или low RPE без таргета) → hold · CONSOLIDATE
//   6. allBelowMin (все ниже таргета)    → decrease · OVERREACHED
//   7. anyBelowMin                       → hold · MISSED_REPS
//   8. fallback                          → hold · INCONCLUSIVE
import type { ProgressionInput, ProgressionReason, ProgressionResult } from './types';
import { applyLoadableSnap } from './snap';
import { completedWorkingSets, getReps } from './sets';
import { numText, round2 } from './rounding';
import { calculateDoubleProgression, calculateGreyskull, calculateTimeBased } from './policies';

const DEFAULT_STEP_KG = 2.5;

/**
 * Парсит строку диапазона повторов. Поддерживает:
 *   "8-12", "8 - 12", "8–12", "8—12" → {min: 8, max: 12}
 *   "10"                              → {min: 10, max: 10}
 *   "8+"                              → {min: 8, max: 8}
 *   null, "", "abc"                   → null
 */
export function parseRepsRange(
  repsRange: string | null | undefined
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
  return applyLoadableSnap(decideWithContext(input), input);
}

function decideWithContext(input: ProgressionInput): ProgressionResult {
  const result = decideProgression(input);

  // FD11-9: контексты восстановления/цикла (сон, стресс, лютеиновая, овуляция)
  // раньше стояли ПЕРЕД всем деревом и могли заменить законное decrease (отказ
  // RPE 10, перетрен) на «держим вес». Теперь они блокируют только ПОВЫШЕНИЕ:
  // increase → hold, decrease/no_data проходят как есть.
  if (result.action !== 'increase') return result;

  const { factors } = result.reason;
  const baseWeight = factors.lastWeight;
  const targetRange = factors.targetRange;
  const hold = (code: string, ruText: string): ProgressionResult => ({
    action: 'hold',
    suggestedWeight: baseWeight,
    suggestedReps: targetRange ? targetRange.max : null,
    reason: { code, ruText, factors },
  });

  if (input.sleepHours != null && input.sleepHours < 6) {
    return hold(
      'LOW_SLEEP',
      `Сон ${input.sleepHours}ч — ниже нормы. Не повышаем вес, закрепляем текущий.`
    );
  }
  if (input.stressLevel != null && input.stressLevel >= 4) {
    return hold('HIGH_STRESS', `Высокий стресс (${input.stressLevel}/5). Не повышаем вес.`);
  }
  if (input.cyclePhase === 'luteal') {
    return hold('LUTEAL_PHASE', 'Лютеиновая фаза цикла — без повышения веса.');
  }
  if (input.cyclePhase === 'ovulation') {
    return hold('OVULATION_RISK', 'Овуляция — высокий риск травм, без повышения веса.');
  }
  return result;
}

function decideProgression(input: ProgressionInput): ProgressionResult {
  const { sets, repsRange, stepKg = DEFAULT_STEP_KG, targetSetIndex } = input;

  // 1. Рабочие сеты с историей (исключая warmup)
  const workingSetsWithHistory = sets.filter(
    (s) =>
      !s.isWarmup &&
      s.previousWeight != null &&
      s.previousReps != null &&
      !Number.isNaN(s.previousWeight) &&
      !Number.isNaN(s.previousReps)
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
  const baseWeight =
    ((targetSet?.previousWeight ?? null) as number | null) ??
    (workingSetsWithHistory[workingSetsWithHistory.length - 1].previousWeight as number);

  // Данные "прошлый раз" для хинта
  const hintReps = (targetSet?.previousReps ??
    workingSetsWithHistory[workingSetsWithHistory.length - 1].previousReps) as number;
  const hintRpe =
    targetSet?.previousRpe ??
    workingSetsWithHistory[workingSetsWithHistory.length - 1].previousRpe ??
    null;

  // 3. Текущие завершённые РАБОЧИЕ сеты — для оценки усталости
  // (weight !== '' && (reps !== '' || (reps_left && reps_right)) = завершён; !isWarmup = рабочий)
  // ENG-13: если reps пустое, но есть estimatedReps или reps_left/right — тоже учитываем
  const currentCompleted = completedWorkingSets(sets);

  // 4. Оценка: если есть currentCompleted, используем их; иначе fallback на прошлые данные
  const evalReps =
    currentCompleted.length > 0
      ? currentCompleted.map(getReps)
      : workingSetsWithHistory.map((s) => s.previousReps as number);
  const evalRpe =
    currentCompleted.length > 0
      ? (currentCompleted[currentCompleted.length - 1].rpe ?? null)
      : (workingSetsWithHistory[workingSetsWithHistory.length - 1].previousRpe ?? null);

  // RPE по всем оцениваемым рабочим сетам — нужен, чтобы отличить одиночный
  // отказ от повторного (MAX_EFFORT_SINGLE).
  const evalRpeList =
    currentCompleted.length > 0
      ? currentCompleted.map((s) => s.rpe ?? null)
      : workingSetsWithHistory.map((s) => s.previousRpe ?? null);
  // RPE «прошлого раза» по последнему рабочему сету: есть только когда оцениваем
  // текущую сессию (в fallback-ветке это то же число, что и evalRpe).
  const lastSetPreviousRpe =
    currentCompleted.length > 0
      ? (workingSetsWithHistory[workingSetsWithHistory.length - 1].previousRpe ?? null)
      : null;

  const allAtMax = targetRange != null && evalReps.every((r) => r >= targetRange.max);
  const allAtMin = targetRange != null && evalReps.every((r) => r >= targetRange.min);
  const anyBelowMin = targetRange != null && evalReps.some((r) => r < targetRange.min);
  const allBelowMin = targetRange != null && evalReps.every((r) => r < targetRange.min);

  const factors: ProgressionReason['factors'] = {
    lastWeight: baseWeight,
    lastReps: hintReps,
    lastRpe: hintRpe,
    completedSets: currentCompleted.length || workingSetsWithHistory.length,
    targetRange,
    currentPhaseType: input.currentPhaseType,
    targetRpe: input.targetRpe,
  };

  // P1.2: Корректировка шага на основе фазы программы
  let effectiveStepKg = stepKg;
  if (input.currentPhaseType === 'hypertrophy') effectiveStepKg = 1.25;
  else if (input.currentPhaseType === 'endurance') effectiveStepKg = 1.0;
  // strength остаётся 2.5 (дефолт)

  // P1.2: Флаг необходимости рассмотреть разгрузку (>6 недель в блоке)
  // Примечание: currentPhaseType !== 'deload' уже гарантирован, так как deload-фаза
  // обрабатывается и возвращает результат выше.
  const shouldConsiderDeload = input.weeksInBlock != null && input.weeksInBlock > 6;

  // P1.1: Ветвление по политике прогрессии
  if (input.policy === 'double_progression') {
    return calculateDoubleProgression(
      input,
      targetRange,
      effectiveStepKg,
      baseWeight,
      shouldConsiderDeload
    );
  }
  if (input.policy === 'greyskull') {
    return calculateGreyskull(
      input,
      targetRange,
      effectiveStepKg,
      baseWeight,
      shouldConsiderDeload
    );
  }
  if (input.policy === 'time_based') {
    return calculateTimeBased(
      input,
      targetRange,
      effectiveStepKg,
      baseWeight,
      shouldConsiderDeload
    );
  }
  // default: linear (текущая логика ниже)

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

  // 0.5/0.6: recovery (сон/стресс) и cycle (лютеиновая/овуляция) — обработаны
  // обёрткой calculateProgression (FD11-9): только downgrade increase→hold.

  // 1. Отказ. Снижаем только за подтверждённый: 10 в двух рабочих подходах
  // сейчас, либо прошлый раз тоже 10, либо повторы ниже минимума диапазона
  // (подход сорван). Одиночный отказ в последнем подходе — штатный режим
  // гипертрофии, вес держим (вердикт владельца 18.10). Величина снятия —
  // max(один шаг, 5%): раньше это были 1,25 кг, которые съедались округлением
  // под снаряд, и RPE 10 визуально ничего не менял.
  if (evalRpe === 10) {
    const reduction = Math.max(effectiveStepKg, round2(baseWeight * 0.05));
    const newWeight = Math.max(0, round2(baseWeight - reduction));
    const confirmedFailure =
      evalRpeList.filter((r) => r === 10).length >= 2 || lastSetPreviousRpe === 10;
    if (confirmedFailure || allBelowMin) {
      return {
        action: 'decrease',
        suggestedWeight: newWeight > 0 ? newWeight : null,
        suggestedReps: targetRange ? targetRange.min : null,
        reason: {
          code: 'MAX_EFFORT',
          ruText: `Отказ (RPE 10) — снижаем на ${numText(reduction)} кг`,
          factors,
        },
      };
    }
    return {
      action: 'hold',
      suggestedWeight: baseWeight,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: {
        code: 'MAX_EFFORT_SINGLE',
        ruText: `Отказ (RPE 10) в одном подходе — вес держим; повторится — снизим на ${numText(
          reduction
        )} кг`,
        factors,
      },
    };
  }

  // ENG-13: Weight trend signal — если текущий рабочий вес значительно ниже прошлого,
  // пользователь, вероятно, устал. Не предлагаем повышение (даже если повторы и RPE
  // позволяют), а при сильном провале — снижаем.
  // avgRatio = среднее (currentWeight / previousWeight) по завершённым рабочим сетам
  // с историей. ratio < 0.95 → SESSION_LIGHT_DAY (cap increase to hold, base = previousWeight × avgRatio).
  // ratio < 0.90 → SESSION_FATIGUE (decrease to previousWeight × avgRatio).
  const currentWorkingSets = sets.filter(
    (s) =>
      !s.isWarmup &&
      s.weight !== '' &&
      (s.reps !== '' || (s.reps_left && s.reps_right)) &&
      s.previousWeight != null &&
      s.previousWeight > 0
  );
  let avgRatio: number | null = null;
  if (currentWorkingSets.length > 0) {
    const ratios = currentWorkingSets.map(
      (s) => parseFloat(s.weight) / (s.previousWeight as number)
    );
    avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }

  // SESSION_FATIGUE: weights significantly below last time — decrease to current level
  if (avgRatio != null && avgRatio < 0.9) {
    const adjustedWeight = Math.max(0, round2(baseWeight * avgRatio));
    return {
      action: 'decrease',
      suggestedWeight: adjustedWeight > 0 ? adjustedWeight : null,
      suggestedReps: targetRange ? targetRange.min : null,
      reason: {
        code: 'SESSION_FATIGUE',
        ruText: 'Веса заметно ниже прошлого раза — снижаем до текущего уровня',
        factors,
      },
    };
  }
  // SESSION_LIGHT_DAY: weights slightly below last time — cap increase to hold, use lower weight
  if (avgRatio != null && avgRatio >= 0.9 && avgRatio < 1.0) {
    // Don't increase — if base chain would say increase, use hold at adjusted weight
    // But this rule is checked BEFORE READY_TO_PROGRESS, so if we're here, it's always a SESSION_LIGHT_DAY hold
    const adjustedWeight = round2(baseWeight * avgRatio);
    return {
      action: 'hold',
      suggestedWeight: adjustedWeight,
      suggestedReps: targetRange ? targetRange.max : null,
      reason: {
        code: 'SESSION_LIGHT_DAY',
        ruText: 'Веса ниже прошлого раза — закрепляем, без повышения',
        factors,
      },
    };
  }

  // 2. Фича 2: RPE-based Autoregulation
  // Если задан targetRpe, и фактический RPE значительно ниже целевого (≥ 2 пунктов разницы),
  // и повторы в диапазоне (или выше минимума) → сигнал к прогрессии, даже если верхняя граница не достигнута.
  if (
    input.targetRpe != null &&
    evalRpe != null &&
    evalRpe <= input.targetRpe - 2 &&
    allAtMin // повторы хотя бы на уровне минимума таргета
  ) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return increaseResult('RPE_UNDER_TARGET', `RPE ${evalRpe} ниже целевого ${input.targetRpe}`);
  }

  // 3. Все повторы по верху диапазона + низкий RPE → явно готовы к прогрессу
  if (allAtMax && evalRpe != null && evalRpe <= 7) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return increaseResult('READY_TO_PROGRESS', 'Все повторы, низкий RPE');
  }

  // 4. Все повторы по верху + нет RPE данных — всё равно прогресс (reps-driven)
  if (allAtMax && evalRpe == null) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return increaseResult('ALL_MAX_REPS', 'Все повторы по верху диапазона');
  }

  // 5. Высокий RPE — закрепляем результат
  if (evalRpe != null && evalRpe >= 9) {
    return holdResult('HIGH_RPE_HOLD', 'Высокий RPE — закрепляем вес');
  }

  // 6a. Все повторы в диапазоне (>= min) → consolidate
  if (allAtMin) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
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

  // 6b. Без таргета: low RPE = consolidate (не знаем, попали ли в репы)
  if (targetRange == null && evalRpe != null && evalRpe <= 8) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return holdResult('CONSOLIDATE', 'Уверенное выполнение — закрепляем');
  }

  // 7. Все повторы ниже таргета → overreached, снижаем
  if (allBelowMin) {
    return decreaseResult('OVERREACHED', 'Не в диапазоне — снижаем вес');
  }

  // 8. Часть сетов ниже таргета → mixed signal, hold
  if (anyBelowMin) {
    if (shouldConsiderDeload) {
      return holdResult('AUTO_DELOAD_SUGGESTION', '6+ недель в фазе — рассмотрите разгрузку');
    }
    return holdResult('MISSED_REPS', 'Часть повторов меньше цели — тот же вес');
  }

  // 9. Fallback: без таргета и без RPE — данных мало
  return holdResult('INCONCLUSIVE', 'Используй текущий вес');
}
