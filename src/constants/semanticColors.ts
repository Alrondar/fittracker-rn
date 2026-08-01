/**
 * Семантические и категориальные цвета.
 * Централизованный источник: уровни, макросы, тяжесть травм, зоны тела, фармакология.
 * Все цвета mid-tone, читаемы в светлой и тёмной темах.
 */

// ===== Уровни сложности программ =====
export const LEVEL_COLORS = {
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
} as const;
export type LevelKey = keyof typeof LEVEL_COLORS;

// ===== Макронутриенты (единая схема для профиля и целей) =====
export const MACRO_COLORS = {
  calories: '#F44336',
  proteins: '#4CAF50',
  fats: '#FFC107',
  carbs: '#2196F3',
  water: '#00BCD4',
  burned: '#FF5722',
} as const;
export type MacroKey = keyof typeof MACRO_COLORS;

// ===== Тяжесть травм =====
export const SEVERITY_COLORS = {
  low: '#4CAF50',
  medium: '#FFC107',
  high: '#F44336',
} as const;
export type SeverityKey = keyof typeof SEVERITY_COLORS;

// ===== Зоны тела (травмы) =====
export const BODY_PART_COLORS: Record<string, string> = {
  shoulder: '#2196F3',
  elbow: '#2196F3',
  wrist: '#2196F3',
  back: '#9C27B0',
  neck: '#9C27B0',
  hip: '#4CAF50',
  knee: '#4CAF50',
  ankle: '#4CAF50',
};

// ===== Типы фармакологии (цели) =====
export const PHARMA_COLORS = {
  steroids: '#EF4444',
  gh: '#3B82F6',
  combo: '#8B5CF6',
} as const;
export type PharmaKey = keyof typeof PHARMA_COLORS;

// ===== Группы зон тела (легенда) =====
export const BODY_ZONE_COLORS = {
  arms: '#2196F3',   // синий (руки: плечо, локоть, запястье)
  torso: '#9C27B0',  // фиолетовый (корпус: спина, шея)
  legs: '#4CAF50',   // зелёный (ноги: бедро, колено, голеностоп)
} as const;