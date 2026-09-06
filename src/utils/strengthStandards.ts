// src/utils/strengthStandards.ts
// Чистая функция расчёта силового уровня.
// Без зависимостей от React/Supabase — кандидат в юнит-тесты (SCALE-1).
//
// Вход:
// - exerciseName — название упражнения из логов
// - e1rm — расчётный 1ПМ (кг)
// - bodyWeightKg — вес пользователя из профиля (или null)
// - gender — из профиля (или null)
//
// Выход:
// - null, если нет норматива для упражнения, или нет веса, или e1rm <= 0
// - { level, levelLabel, ratio, color, standards } — для UI

import {
  StrengthLevel,
  STRENGTH_LEVEL_LABELS,
  STRENGTH_STANDARD_RATIOS,
  resolveStandardKey,
} from '../constants/strengthStandards';

export interface StrengthStandardResult {
  /** Достигнутый уровень. */
  level: StrengthLevel;
  /** Локализованное название уровня. */
  levelLabel: string;
  /** Отношение e1RM / bodyWeight. */
  ratio: number;
  /** Цвет для бейджа (hex). */
  color: string;
  /** Все 5 уровней с их ratio — для L2-таблицы стандартов. */
  standards: { level: StrengthLevel; label: string; ratio: number; color: string }[];
}

/** Цвета уровней силы (mid-tone, читаемы в обеих темах). */
export const STRENGTH_LEVEL_COLORS: Record<StrengthLevel, string> = {
  novice: '#94a3b8',
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#E91E63',
  elite: '#7C3AED',
};

/**
 * Рассчитать силовой уровень для упражнения.
 *
 * Порядок уровней (снизу вверх): Novice < Beginner < Intermediate < Advanced < Elite.
 * Уровень = максимальный, для которого ratio >= threshold.
 * Если ratio ниже Novice-порога — возвращаем Novice (пользователь уже тренируется).
 *
 * @returns null, если упражнение не покрывается нормативами, нет веса, или e1rm <= 0.
 */
export function calculateStrengthStandard(
  exerciseName: string,
  e1rm: number,
  bodyWeightKg: number | null,
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
): StrengthStandardResult | null {
  // Валидация входных данных
  if (!exerciseName || !e1rm || e1rm <= 0) return null;
  if (!bodyWeightKg || bodyWeightKg <= 0) return null;

  const standardKey = resolveStandardKey(exerciseName);
  if (!standardKey) return null;

  const standard = STRENGTH_STANDARD_RATIOS[standardKey];
  if (!standard) return null;

  // Определяем пол: male/female или default (male для other/prefer_not_to_say/null)
  const genderKey: 'male' | 'female' = gender === 'female' ? 'female' : 'male';

  const ratios = standard[genderKey];
  const userRatio = e1rm / bodyWeightKg;

  // Уровни от высшего к низшему — ищем максимальный достигнутый
  const levels: StrengthLevel[] = ['elite', 'advanced', 'intermediate', 'beginner', 'novice'];

  let achievedLevel: StrengthLevel = 'novice';
  for (const level of levels) {
    if (userRatio >= ratios[level]) {
      achievedLevel = level;
      break;
    }
  }

  // Формируем массив всех уровней для L2-таблицы
  const allStandards = levels.map((level) => ({
    level,
    label: STRENGTH_LEVEL_LABELS[level],
    ratio: ratios[level],
    color: STRENGTH_LEVEL_COLORS[level],
  }));

  return {
    level: achievedLevel,
    levelLabel: STRENGTH_LEVEL_LABELS[achievedLevel],
    ratio: userRatio,
    color: STRENGTH_LEVEL_COLORS[achievedLevel],
    standards: allStandards,
  };
}
