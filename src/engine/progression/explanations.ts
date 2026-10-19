// ENG-2: STRUCTURED REASONS (объяснения «Почему?»)
// UI форматирует поля в читаемый вид, engine отдаёт сырые данные.
import type { ProgressionResult } from './types';
import type { ReadinessOverride, SafetyOverride } from './overrides';

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
export function explainProgression(
  result: ProgressionResult,
  unit: 'kg' | 'lb' = 'kg'
): ExplanationItem[] {
  const { action, reason, suggestedWeight, suggestedReps } = result;
  const { lastWeight, lastReps, lastRpe, targetRange } = reason.factors;
  const items: ExplanationItem[] = [];

  // P1-A: движок остаётся чистым (без импортов хуков) — единица приходит параметром,
  // коэффициент идентичен kgToLb из useUnitPreferences.
  const w = (kg: number) => (unit === 'kg' ? `${kg}` : `${Math.round(kg * 2.20462)}`);
  const uL = unit === 'kg' ? 'кг' : 'lb';

  // 1. INPUT — прошлый результат (если есть)
  if (lastWeight != null && lastReps != null) {
    let inputText = `${w(lastWeight)} ${uL} × ${lastReps}`;
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
        // Единица взята из условия ветки: lastRpe — это RPE «прошлого раза», и
        // без записи прошлого раза подпись печатала «null».
        value: '10 — полный отказ (0 в запасе)',
        emphasis: 'warning',
      });
      break;

    case 'MAX_EFFORT_SINGLE':
      items.push({
        kind: 'signal',
        label: 'RPE',
        value: '10 — отказ в одном подходе, не повторялся',
        emphasis: 'warning',
      });
      break;

    case 'RPE_UNDER_TARGET':
      if (reason.factors.targetRpe != null && lastRpe != null) {
        items.push({
          kind: 'signal',
          label: 'RPE',
          value: `${lastRpe} значительно ниже целевого ${reason.factors.targetRpe} (≥2 пункта разницы)`,
          emphasis: 'success',
        });
      }
      if (targetRange) {
        items.push({
          kind: 'signal',
          label: 'Диапазон',
          value: `повторы в диапазоне (${targetRange.min}–${targetRange.max})`,
          emphasis: 'success',
        });
      }
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

    case 'EQUIPMENT_FLOOR':
      items.push({
        kind: 'signal',
        label: 'Снаряд',
        value: `${w(lastWeight ?? 0)} ${uL} — минимальная сборка, ниже класть нечего`,
        emphasis: 'warning',
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
        value:
          reason.factors.currentPhaseType === 'deload'
            ? 'фаза разгрузки программы'
            : 'запланированная неделя разгрузки',
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

    case 'DOUBLE_ALL_MAX':
    case 'TIME_ALL_MAX':
      items.push({
        kind: 'signal',
        label: 'Достижение',
        value:
          reason.code === 'DOUBLE_ALL_MAX'
            ? 'все подходы на верхней границе диапазона'
            : 'все подходы достигли целевого времени',
        emphasis: 'success',
      });
      break;

    case 'GREYSKULL_AMRAP_SUCCESS':
      items.push({
        kind: 'signal',
        label: 'AMRAP',
        value: 'последний подход на максимум превзошёл цель в 2 раза',
        emphasis: 'success',
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
  const safetyOverride = (
    result as ProgressionResult & {
      safetyOverride?: SafetyOverride | null;
    }
  ).safetyOverride;
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
        signalText = 'Травма требует осторожности (injury_exercise_warnings)';
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
  const readinessOverride = (
    result as ProgressionResult & {
      readinessOverride?: ReadinessOverride | null;
    }
  ).readinessOverride;
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
      value: `${w(suggestedWeight)} ${uL}${repsPart}`,
      emphasis: 'success',
    });
  } else if (action === 'decrease' && suggestedWeight != null) {
    const isDeload =
      reason.code === 'DELOAD_WEEK' ||
      reason.code === 'DELOAD_PHASE' ||
      reason.code === 'PLATEAU_DELOAD';
    items.push({
      kind: 'conclusion',
      label: isDeload ? 'Разгрузка' : 'Снизить до',
      value: `${w(suggestedWeight)} ${uL}${repsPart}`,
      emphasis: 'warning',
    });
  } else if (suggestedWeight != null) {
    items.push({
      kind: 'conclusion',
      label: 'Закрепить',
      value: `${w(suggestedWeight)} ${uL}${repsPart}`,
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
