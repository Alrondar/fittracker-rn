import type { ComponentType } from 'react';
import {
  Dumbbell,
  Sparkles,
  Zap,
  Medal,
  Trophy,
  Heart,
} from 'lucide-react-native';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export interface CategoryMeta {
  value: string; // точное значение поля category в БД
  label: string; // русская подпись
  icon: IconComponent;
}

// Порядок = убыванию количества упражнений в БД
export const EXERCISE_CATEGORIES: CategoryMeta[] = [
  { value: 'strength', label: 'Силовые', icon: Dumbbell },
  { value: 'stretching', label: 'Растяжка', icon: Sparkles },
  { value: 'plyometrics', label: 'Плиометрика', icon: Zap },
  { value: 'olympic weightlifting', label: 'Тяж. атлетика', icon: Medal },
  { value: 'powerlifting', label: 'Пауэрлифтинг', icon: Trophy },
  { value: 'cardio', label: 'Кардио', icon: Heart },
];

export const getCategoryLabel = (value: string): string =>
  EXERCISE_CATEGORIES.find(c => c.value === value)?.label ?? value;