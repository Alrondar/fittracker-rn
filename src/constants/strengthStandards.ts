// src/constants/strengthStandards.ts
// Силовые нормативы для основных compound-упражнений.
// Источник: StrengthLevel.com / ExRx (адаптировано под 1ПМ / собственный вес).
// Ключ — движение (не exercise_id), чтобы покрыть варианты (напр. "Жим лёжа" / "Bench Press").
//
// Модель «внутренняя» — не медицинский норматив и не абсолютная истина
// (PRODUCT.md §11: «коэффициенты — внутренняя модель, а не абсолютная истина»).
//
// Уровень = максимальный, для которого user.e1RM / bodyWeight >= ratio.
// Порядок уровней снизу вверх: Novice < Beginner < Intermediate < Advanced < Elite.
//
// Для упражнений, которых нет в таблице, функция возвращает null —
// в UI это отображается как «недостаточно данных», без фейковой уверенности.

export type StrengthLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'elite';

export const STRENGTH_LEVEL_LABELS: Record<StrengthLevel, string> = {
  novice: 'Новичок',
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
  elite: 'Элитный',
};

/**
 * Коэффициенты 1ПМ / собственный вес для 5 уровней.
 * Ключ — canonical-имя движения (нижний регистр, латиница).
 * Значения — минимальный ratio для достижения уровня.
 */
export interface StandardRatios {
  male: Record<StrengthLevel, number>;
  female: Record<StrengthLevel, number>;
}

export const STRENGTH_STANDARD_RATIOS: Record<string, StandardRatios> = {
  // ===== Горизонтальный жим =====
  bench_press: {
    male: { novice: 0.6, beginner: 0.8, intermediate: 1.05, advanced: 1.35, elite: 1.75 },
    female: { novice: 0.3, beginner: 0.45, intermediate: 0.65, advanced: 0.85, elite: 1.1 },
  },
  incline_bench_press: {
    male: { novice: 0.5, beginner: 0.65, intermediate: 0.85, advanced: 1.1, elite: 1.4 },
    female: { novice: 0.25, beginner: 0.35, intermediate: 0.5, advanced: 0.7, elite: 0.9 },
  },

  // ===== Приседания =====
  squat: {
    male: { novice: 0.75, beginner: 1.0, intermediate: 1.35, advanced: 1.7, elite: 2.1 },
    female: { novice: 0.45, beginner: 0.65, intermediate: 0.85, advanced: 1.15, elite: 1.5 },
  },
  front_squat: {
    male: { novice: 0.6, beginner: 0.8, intermediate: 1.05, advanced: 1.35, elite: 1.7 },
    female: { novice: 0.35, beginner: 0.5, intermediate: 0.7, advanced: 0.95, elite: 1.2 },
  },

  // ===== Тяга =====
  deadlift: {
    male: { novice: 0.85, beginner: 1.15, intermediate: 1.5, advanced: 1.9, elite: 2.35 },
    female: { novice: 0.55, beginner: 0.8, intermediate: 1.1, advanced: 1.45, elite: 1.85 },
  },
  romanian_deadlift: {
    male: { novice: 0.65, beginner: 0.85, intermediate: 1.1, advanced: 1.4, elite: 1.75 },
    female: { novice: 0.4, beginner: 0.55, intermediate: 0.75, advanced: 1.0, elite: 1.25 },
  },

  // ===== Вертикальный жим =====
  overhead_press: {
    male: { novice: 0.4, beginner: 0.55, intermediate: 0.75, advanced: 1.0, elite: 1.25 },
    female: { novice: 0.2, beginner: 0.3, intermediate: 0.45, advanced: 0.65, elite: 0.85 },
  },

  // ===== Горизонтальная тяга =====
  barbell_row: {
    male: { novice: 0.5, beginner: 0.7, intermediate: 0.9, advanced: 1.2, elite: 1.5 },
    female: { novice: 0.3, beginner: 0.4, intermediate: 0.55, advanced: 0.75, elite: 0.95 },
  },

  // ===== Подтягивания/отжимания на брусьях (веса тела) =====
  pull_up: {
    // Для pull-up «ratio» = bodyweight × (1 + additional/bw) — упрощённо,
    // считаем 1ПМ = (вес тела + доп. вес). Для новичка = собственный вес.
    male: { novice: 0.85, beginner: 1.0, intermediate: 1.15, advanced: 1.35, elite: 1.6 },
    female: { novice: 0.55, beginner: 0.7, intermediate: 0.9, advanced: 1.15, elite: 1.4 },
  },
  dip: {
    male: { novice: 0.85, beginner: 1.05, intermediate: 1.3, advanced: 1.55, elite: 1.85 },
    female: { novice: 0.5, beginner: 0.7, intermediate: 0.9, advanced: 1.15, elite: 1.4 },
  },
};

/**
 * Маппинг русского названия упражнения (из каталога) → canonical-ключ.
 * Покрывает основные русские варианты, которые реально встречаются в логах.
 */
export const EXERCISE_NAME_TO_STANDARD_KEY: Record<string, string> = {
  // Жимы
  'Жим лёжа': 'bench_press',
  'Жим штанги лёжа': 'bench_press',
  'Жим гантелей лёжа': 'bench_press',
  'Жим в Смите лёжа': 'bench_press',
  'Bench Press': 'bench_press',
  'Dumbbell Bench Press': 'bench_press',
  'Наклонный жим лёжа': 'incline_bench_press',
  'Жим на наклонной скамье': 'incline_bench_press',
  'Incline Bench Press': 'incline_bench_press',
  'Incline Dumbbell Press': 'incline_bench_press',

  // Приседания
  'Приседания со штангой': 'squat',
  Приседания: 'squat',
  'Приседания в Смите': 'squat',
  Squat: 'squat',
  'Front Squat': 'front_squat',
  'Фронтальные приседания': 'front_squat',

  // Тяга
  'Становая тяга': 'deadlift',
  'Становая тяга классическая': 'deadlift',
  Deadlift: 'deadlift',
  'Румынская тяга': 'romanian_deadlift',
  'Мёртвая тяга': 'romanian_deadlift',
  'Romanian Deadlift': 'romanian_deadlift',

  // Жим стоя
  'Жим стоя': 'overhead_press',
  'Армейский жим': 'overhead_press',
  'Жим штанги стоя': 'overhead_press',
  'Жим гантелей сидя': 'overhead_press',
  'Overhead Press': 'overhead_press',
  'Military Press': 'overhead_press',
  'Shoulder Press': 'overhead_press',

  // Горизонтальная тяга
  'Тяга штанги в наклоне': 'barbell_row',
  'Тяга в наклоне': 'barbell_row',
  'Barbell Row': 'barbell_row',
  'Bent Over Row': 'barbell_row',

  // Подтягивания/брусья
  Подтягивания: 'pull_up',
  'Pull-Up': 'pull_up',
  Pullup: 'pull_up',
  'Отжимания на брусьях': 'dip',
  Dip: 'dip',
  Dips: 'dip',
};

/**
 * Попытка сопоставить произвольное имя упражнения ключу норматива.
 * Сначала — точное совпадение, потом — поиск ключевых слов внутри названия.
 */
export function resolveStandardKey(exerciseName: string): string | null {
  const exact = EXERCISE_NAME_TO_STANDARD_KEY[exerciseName];
  if (exact) return exact;

  const lower = exerciseName.toLowerCase();

  // Ключевые слова для fallback-матчинга
  const patterns: [string[], string][] = [
    [['жим лёжа', 'жим лежа', 'bench press'], 'bench_press'],
    [['наклонн', 'incline'], 'incline_bench_press'],
    [['присед', 'squat'], 'squat'],
    [['станов', 'deadlift'], 'deadlift'],
    [['румынск', 'romanian', 'мёртв тяг', 'мертв тяг'], 'romanian_deadlift'],
    [
      ['жим стоя', 'армейск', 'overhead press', 'military press', 'shoulder press'],
      'overhead_press',
    ],
    [['тяга в наклон', 'тяга штанги', 'barbell row', 'bent over'], 'barbell_row'],
    [['подтягиван', 'pull-up', 'pullup'], 'pull_up'],
    [['брусья', 'брус', 'dip'], 'dip'],
  ];

  for (const [keywords, key] of patterns) {
    if (keywords.some((kw) => lower.includes(kw))) {
      // Дополнительная проверка: не совпало ли с другим паттерном
      return key;
    }
  }

  return null;
}
