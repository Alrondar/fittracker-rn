// src/components/workout/WorkoutDisplayModePicker.tsx
// Picker режима отображения карточки упражнения: training / balanced / learn.
// Используется в profile/settings. UX-2: progressive disclosure density.
// Обновлён для использования универсального PillToggle (PRODUCT.md §3.6).
import React from 'react';
import { Dumbbell, LayoutGrid, BookOpen } from 'lucide-react-native';
import { PillToggle } from '../ui/PillToggle';
import { useWorkoutDisplayMode } from '../../hooks/useWorkoutDisplayMode';
import { WorkoutCardDisplayMode } from '../../types/workout';

const MODES: {
  key: WorkoutCardDisplayMode;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { key: 'training', label: 'Тренировка', icon: Dumbbell },
  { key: 'balanced', label: 'Баланс', icon: LayoutGrid },
  { key: 'learn', label: 'Изучение', icon: BookOpen },
];

const DESCRIPTIONS: Record<WorkoutCardDisplayMode, string> = {
  training: 'Минимум информации — фокус на подходах',
  balanced: 'Подходы + контекст упражнения',
  learn: 'Техника и детали упражнения на виду',
};

export function WorkoutDisplayModePicker() {
  const { mode, updateMode } = useWorkoutDisplayMode();

  return (
    <PillToggle
      options={MODES}
      value={mode}
      onChange={updateMode}
      description={DESCRIPTIONS[mode]}
    />
  );
}
