// src/constants/barbellDefaults.ts
// Реальные стандарты весов грифов и номиналы блинов (IWF / международные стандарты)

export const DEFAULT_BAR_WEIGHTS_KG: Record<string, number> = {
  Штанга: 20,
  'EZ-гриф': 10,
  'Трэп-гриф': 20,
  'Тренажер Смита': 8,
  'Т-гриф': 10,
};

export const DEFAULT_BAR_WEIGHTS_LB: Record<string, number> = {
  Штанга: 45,
  'EZ-гриф': 20,
  'Трэп-гриф': 45,
  'Тренажер Смита': 15,
  'Т-гриф': 25,
};

export const PLATE_DENOMINATIONS_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
export const PLATE_DENOMINATIONS_LB = [45, 35, 25, 10, 5, 2.5];

export const BARBELL_EQUIPMENT_NAMES = [
  'Штанга',
  'EZ-гриф',
  'Трэп-гриф',
  'Тренажер Смита',
  'Т-гриф',
  // Английские варианты для совместимости с БД, если они используются
  'barbell',
  'ez barbell',
  'trap bar',
  'smith machine',
  't-bar',
];
