// Позиция 9-2: структурированные факторы ранжирования замен → короткая строка
// «почему эта замена». Движок считает вклад каждого фактора, экран показывает
// не больше трёх — по убыванию вклада, при равенстве порядок детерминированный.
import type { ScoreFactor } from '../engine/alternatives';

const REASONS: Record<string, string> = {
  PRIMARY_MATCH: 'та же главная мышца',
  SECONDARY_MATCH: 'те же мышцы-помощники',
  PATTERN_MATCH: 'то же движение',
  EQUIPMENT_MATCH: 'тот же снаряд',
  EQUIPMENT_MISMATCH: 'другой снаряд',
  LEVEL_JUMP: 'заметно сложнее по уровню',
  LEVEL_DROP: 'заметно проще по уровню',
  PAIN_ON_SOURCE_GROUP: 'та же группа мышц, где была боль',
  INJURY_MEDIUM: 'нагружает травмированную зону',
  INJURY_LOW: 'чуть нагружает травмированную зону',
  REGRESSION_FOR_RECOVERY: 'упрощение — подходит через боль',
  REGRESSION_NO_RECOVERY: 'проще исходного движения',
  PROGRESSION_WITH_PAIN: 'усложнение, а при боли мы его не предлагаем',
};

const MAX_LINES = 3;

export function alternativeReasonLines(factors: ScoreFactor[]): string[] {
  return [...factors]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.code.localeCompare(b.code))
    .slice(0, MAX_LINES)
    .map((factor) => REASONS[factor.code])
    .filter((text): text is string => !!text);
}
