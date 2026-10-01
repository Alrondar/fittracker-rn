// src/constants/readinessScales.ts
// RD-UX: единый владелец шкал чек-ина «Состояние сегодня» (паттерн PAIN_LEVELS
// из PainSheet — «один владелец шкалы»).
//
// Диагноз (30.09): раньше четыре ряда одинаковых кнопок 1–5 имели РАЗНУЮ
// полярность (качество сна: 5 = хорошо; усталость/боль/стресс: 1 = хорошо) —
// пользователь выучивал направление на первом ряду и ошибался на остальных.
// Теперь чисел нет вообще: каждый вариант подписан словом, а mapping к
// движковым 1–5 живёт здесь.
//
// Порядок чипов:
//   - wellness-метрики (сон, энергия) — от худшего к лучшему (слева хуже,
//     справа лучше);
//   - симптом-метрики (боль, стресс) — по возрастанию интенсивности
//     («нет → сильная»), как слайдер болевой интенсивности (NRS) и чек-ин
//     WHOOP: здесь направление читается из слов, числа не показываются.
//
// Значения выбраны так, чтобы пороги движка не сдвинулись:
//   progression.ts: stress>=4 → HIGH_STRESS; readiness.ts: soreness>=4 → −1,
//   stress<=2 → +1. Поэтому «натяжение» = 2 (не триггерит), «напряжение» = 4,
//   «сильная боль» = 5, «умеренная» = 4 (триггерит), «лёгкая» = 2 (нет).

export interface ReadinessScaleOption {
  label: string;
  /** Значение, которое уйдёт в daily_readiness (1–5, семантика колонки не меняется). */
  value: number;
}

export interface ReadinessScale {
  label: string;
  options: ReadinessScaleOption[];
}

export const SLEEP_QUALITY_SCALE: ReadinessScale = {
  label: 'Качество сна',
  options: [
    { label: 'Плохо', value: 1 },
    { label: 'Нормально', value: 3 },
    { label: 'Отлично', value: 5 },
  ],
};

/** Энергия — инвертированная «усталость»: в БД по-прежнему пишем fatigue (1 — свежий). */
export const ENERGY_SCALE: ReadinessScale = {
  label: 'Энергия',
  options: [
    { label: 'Разбит(а)', value: 5 },
    { label: 'Обычно', value: 3 },
    { label: 'Свеж(а)', value: 1 },
  ],
};

export const SORENESS_SCALE: ReadinessScale = {
  label: 'Боль в мышцах',
  options: [
    { label: 'Нет', value: 1 },
    { label: 'Лёгкая', value: 2 },
    { label: 'Умеренная', value: 4 },
    { label: 'Сильная', value: 5 },
  ],
};

export const STRESS_SCALE: ReadinessScale = {
  label: 'Стресс',
  options: [
    { label: 'Спокойно', value: 1 },
    { label: 'Натяжение', value: 2 },
    { label: 'Напряжение', value: 4 },
    { label: 'Перегруз', value: 5 },
  ],
};

/** Подпись readiness 1–5 для L1 (кольцо StatusCard) — слова вместо голых цифр. */
export function readinessLabel(value: number): string {
  if (value <= 2) return 'плохо';
  if (value === 3) return 'нормально';
  if (value === 4) return 'хорошо';
  return 'отлично';
}
