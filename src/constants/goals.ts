import {
  TrendingDown,
  Minus,
  TrendingUp,
  User,
  Activity,
} from 'lucide-react-native';
import { PHARMA_COLORS } from './semanticColors';
import type { GoalType, GenderType, PharmaType } from '../services/goalsService';

export type IconComponent = typeof Activity;

export const GOALS: {
  value: GoalType;
  label: string;
  icon: IconComponent;
  desc: string;
}[] = [
  { value: 'lose', label: 'Похудение', icon: TrendingDown, desc: 'Дефицит калорий' },
  { value: 'maintain', label: 'Поддержание', icon: Minus, desc: 'Баланс калорий' },
  { value: 'gain', label: 'Набор массы', icon: TrendingUp, desc: 'Профицит калорий' },
];

export const GENDERS: {
  value: GenderType;
  label: string;
  icon: IconComponent;
}[] = [
  { value: 'male', label: 'Мужской', icon: User },
  { value: 'female', label: 'Женский', icon: User },
];

export const ACTIVITY_LEVELS: {
  value: number;
  label: string;
  desc: string;
}[] = [
  { value: 1.2, label: 'Минимальная', desc: 'Сидячий образ жизни' },
  { value: 1.375, label: 'Низкая', desc: '1-2 тренировки/нед' },
  { value: 1.55, label: 'Средняя', desc: '3-4 тренировки/нед' },
  { value: 1.725, label: 'Высокая', desc: '5-6 тренировок/нед' },
  { value: 1.9, label: 'Очень высокая', desc: 'Ежедневные тренировки' },
];

export const PHARMA_TYPES: {
  value: Exclude<PharmaType, null>;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: 'steroids',
    label: 'Анаболические стероиды',
    desc: 'Белок ×1.5, калории +10%',
    color: PHARMA_COLORS.steroids,
  },
  {
    value: 'gh',
    label: 'Гормон роста',
    desc: 'Жиры -20%',
    color: PHARMA_COLORS.gh,
  },
  {
    value: 'combo',
    label: 'Комбо (АС + ГР)',
    desc: 'Белок ×1.5, жиры -20%',
    color: PHARMA_COLORS.combo,
  },
];