import {
  Dumbbell,
  Settings,
  Circle,
  CircleDot,
  Square,
  Triangle,
  Users,
  Plug,
  RotateCcw,
  ChevronDown,
  Minus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SquareStack,
  Weight,
  Target,
} from 'lucide-react-native';
import { ComponentType } from 'react';

export const EQUIPMENT_ICONS: Record<string, ComponentType<any>> = {
  // === Свободные веса ===
  'Штанга': Dumbbell,
  'Гантели': Dumbbell,
  'EZ-гриф': Dumbbell,
  'Т-гриф': Dumbbell,
  'Гири': Weight,
  'Медбол': Target,
  'Блин': CircleDot,
  
  // === Тренажёры ===
  'Гакк-тренажер': Settings,
  'Тренажер Смита': Settings,
  'Тренажер для жима ногами': Settings,
  'Тренажер для разгибаний ног': Settings,
  'Тренажер для сгибаний ног лежа': Settings,
  'Тренажер для сгибаний ног сидя': Settings,
  'Тренажер для подъемов на носки сидя': Settings,
  'Тренажер для разведений ног': Settings,
  'Тренажер для тяги': Settings,
  'Тренажер для сгибаний рук': Settings,
  'Тренажер для жима на плечи': Settings,
  'Тренажер для отжиманий на брусьях': Settings,
  'Тренажер Hammer Strength (горизонтальный жим)': Settings,
  'Тренажер Hammer Strength (жим на плечи)': Settings,
  'Тренажер Pec Deck (обратные разведения)': Settings,
  'Тренажер Chest Press': Settings,
  'Тренажер для гиперэкстензии': Settings,
  'Тренажер для скручиваний': Settings,
  'Тренажер Nordic': Settings,
  'Тренажер Sissy Squat': Settings,
  'Ролик для запястий': RotateCcw,
  'Ролик для пресса': RotateCcw,
  'Тренажер': Settings,
  
  // === Блочные тренажёры ===
  'Верхний блок': ArrowDownToLine,
  'Нижний блок': ArrowUpFromLine,
  'Кроссовер': ArrowLeftRight,
  
  // === Рукояти ===
  'Канатная рукоять': Circle,
  'Прямая рукоять': Minus,
  'D-образная рукоять': Circle,
  'V-образная рукоять': ChevronDown,
  'Длинная рукоять': Minus,
  'Петли для рук': Circle,
  'Манжета': Circle,
  
  // === Скамьи ===
  'Скамья': Square,
  'Наклонная скамья': Triangle,
  'Скамья Скотта': Square,
  'Скамья со спинкой': Square,
  'Горизонтальная скамья': Square,
  'Регулируемая наклонная скамья': Triangle,
  'Опора': Square,
  
  // === Другое ===
  'Брусья': Minus,
  'Брусья с упорами для локтей': Minus,
  'Турник': Minus,
  'Стойки': SquareStack,
  'Платформа': Square,
  'Тумба': Square,
  'Коврик': Square,
  'Пол': Square,
  'Партнер': Users,
  'Адаптер': Plug,
};

export const DefaultEquipmentIcon = Dumbbell;

export const getEquipmentIcon = (name: string): ComponentType<any> => {
  if (EQUIPMENT_ICONS[name]) return EQUIPMENT_ICONS[name];
  const lowerName = Object.keys(EQUIPMENT_ICONS).find(k => k.toLowerCase() === name.toLowerCase());
  if (lowerName) return EQUIPMENT_ICONS[lowerName];
  return DefaultEquipmentIcon;
};