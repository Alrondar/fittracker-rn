import { MUSCLE_GROUPS } from './muscleGroups';

// Базовые цвета групп мышц
export const MUSCLE_COLORS: Record<string, string> = {
  'грудь': '#EF4444',      // Красный
  'спина': '#3B82F6',      // Синий
  'ноги': '#078D34',       // Зелёный (изумрудный)
  'плечи': '#F59E0B',      // Оранжевый (янтарный)
  'руки': '#8B5CF6',       // Фиолетовый ← было зелёное, теперь фиолетовое
  'пресс и кор': '#EC4899',// Розовый
  
};

// Автоматический обратный маппинг: детальная мышца → группа
// Строится из MUSCLE_GROUPS один раз при загрузке модуля
const MUSCLE_TO_GROUP: Record<string, string> = {};

Object.entries(MUSCLE_GROUPS).forEach(([group, muscles]) => {
  const groupLower = group.toLowerCase();
  muscles.forEach(muscle => {
    // Маппинг точного названия
    MUSCLE_TO_GROUP[muscle.toLowerCase()] = groupLower;
    
    // Также маппинг по ключевым словам (для вариантов написания)
    // Например, "бицепс бедра" → "ноги"
    const words = muscle.toLowerCase().split(' ');
    if (words.length > 1) {
      // Сохраняем маппинг для каждого слова (кроме предлогов)
      words.forEach(word => {
        if (word.length > 3 && !['мышца', 'мышцы', 'головка'].includes(word)) {
          MUSCLE_TO_GROUP[word] = groupLower;
        }
      });
    }
  });
});

export const getMuscleColor = (muscle: string, defaultColor: string = '#6B7280'): string => {
  if (!muscle) return defaultColor;
  
  const muscleLower = muscle.toLowerCase().trim();
  
  // 1. Точное совпадение в базовых цветах (если мышца = группа)
  if (MUSCLE_COLORS[muscleLower]) {
    return MUSCLE_COLORS[muscleLower];
  }
  
  // 2. Точное совпадение в обратном маппинге
  if (MUSCLE_TO_GROUP[muscleLower]) {
    const group = MUSCLE_TO_GROUP[muscleLower];
    return MUSCLE_COLORS[group] || defaultColor;
  }
  
  // 3. Поиск по подстроке в обратном маппинге
  // Например, "широчайшие мышцы спины" найдёт "спина"
  for (const [key, group] of Object.entries(MUSCLE_TO_GROUP)) {
    if (muscleLower.includes(key) || key.includes(muscleLower)) {
      return MUSCLE_COLORS[group] || defaultColor;
    }
  }
  
  // 4. Поиск по подстроке в названиях групп
  for (const [group, color] of Object.entries(MUSCLE_COLORS)) {
    if (muscleLower.includes(group)) {
      return color;
    }
  }
  
  return defaultColor;
};

// Вспомогательная функция: получить группу мышцы
export const getMuscleGroup = (muscle: string): string | null => {
  if (!muscle) return null;
  const muscleLower = muscle.toLowerCase().trim();
  
  if (MUSCLE_COLORS[muscleLower]) return muscleLower;
  if (MUSCLE_TO_GROUP[muscleLower]) return MUSCLE_TO_GROUP[muscleLower];
  
  for (const [key, group] of Object.entries(MUSCLE_TO_GROUP)) {
    if (muscleLower.includes(key) || key.includes(muscleLower)) {
      return group;
    }
  }
  
  return null;
};