export const MUSCLE_COLORS: Record<string, string> = {
  'грудь': '#EF4444',      // Красный
  'спина': '#3B82F6',      // Синий
  'ноги': '#10B981',       // Зелёный
  'плечи': '#F59E0B',      // Оранжевый
  'руки': '#8B5CF6',       // Фиолетовый
  'пресс': '#EC4899',      // Розовый
  'ягодицы': '#F97316',    // Оранжевый яркий
  'икры': '#14B8A6',       // Бирюзовый
  'предплечья': '#6366F1', // Индиго
  'трапеция': '#A855F7',   // Фиолетовый светлый
};

export const getMuscleColor = (muscle: string, defaultColor: string = '#6B7280'): string => {
  return MUSCLE_COLORS[muscle.toLowerCase()] || defaultColor;
};