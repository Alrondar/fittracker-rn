/**
 * Семантические и категориальные цвета.
 * Централизованный источник: уровни, макросы, тяжесть травм, зоны тела, фармакология.
 * Все цвета mid-tone, читаемы в светлой и тёмной темах.
 */

// ===== Уровни сложности программ =====
// ===== Цвета групп мышц для анатомической карты =====
import type { ThemeColors } from './theme';

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
  arms: '#2196F3', // синий (руки: плечо, локоть, запястье)
  torso: '#9C27B0', // фиолетовый (корпус: спина, шея)
  legs: '#4CAF50', // зелёный (ноги: бедро, колено, голеностоп)
} as const;

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  // Грудь
  грудь: '#EF4444',
  большая: '#EF4444',
  малая: '#EF4444',
  зубчатые: '#EF4444',

  // Спина
  спина: '#8B5CF6',
  широчайшие: '#8B5CF6',
  трапеция: '#8B5CF6',
  ромбовидные: '#8B5CF6',
  разгибатели: '#8B5CF6',
  квадратная: '#8B5CF6',
  круглая: '#8B5CF6',
  многораздельные: '#8B5CF6',

  // Плечи
  плечи: '#F59E0B',
  дельтовидные: '#F59E0B',
  дельта: '#F59E0B',
  ротаторная: '#F59E0B',
  надостная: '#F59E0B',
  подостная: '#F59E0B',
  подлопаточная: '#F59E0B',

  // Руки
  бицепс: '#3B82F6',
  трицепс: '#3B82F6',
  брахиалис: '#3B82F6',
  брахиорадиалис: '#3B82F6',
  предплечья: '#3B82F6',
  сгибатели: '#3B82F6',
  разгибатели_предплечий: '#3B82F6',
  локтевая: '#3B82F6',

  // Ноги
  квадрицепс: '#10B981',
  прямая: '#10B981',
  бицепс_бедра: '#10B981',
  ягодичная: '#10B981',
  ягодичные: '#10B981',
  икроножная: '#10B981',
  камбаловидная: '#10B981',
  приводящие: '#10B981',
  отводящие: '#10B981',
  грушевидная: '#10B981',
  подвздошно: '#10B981',

  // Пресс и кор
  пресс: '#EC4899',
  прямая_мышца_живота: '#EC4899',
  косые: '#EC4899',
  поперечная: '#EC4899',
};

/**
 * Получить цвет для группы мышц
 * Ищет по ключевым словам в названии мышцы
 */
export function getMuscleColor(muscleName: string, colors: ThemeColors): string {
  const lowerName = muscleName.toLowerCase();

  // Ищем первое совпадение по ключевым словам
  for (const [keyword, color] of Object.entries(MUSCLE_GROUP_COLORS)) {
    if (lowerName.includes(keyword)) {
      return color;
    }
  }

  // Fallback на primary color
  return colors.primary;
}
