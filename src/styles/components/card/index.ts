import { createBaseCardStyles } from './base';
import { createProgramCardStyles } from './program';
import { createWorkoutCardStyles } from './workout';
import { createExerciseCardStyles } from './exercise';
import { createFilterCardStyles } from './filter';
import { createSheetCardStyles } from './sheet';
import { createProfileCardStyles } from './profile';
import { createEmptyCardStyles } from './empty';
import {
  createExerciseCardBorderStyles,
  getMuscleGroupChipStyle,
  getMuscleGroupChipTextStyle,
  getMuscleGroupBadgeStyle,
  getMuscleGroupBadgeTextStyle,
  getMuscleSubgroupItemStyle,
  getMuscleSubgroupItemTextStyle,
  getExerciseIconMainStyle,
  getExerciseIconExtraStyle,
  getMuscleBubbleStyle,
  getMuscleBubbleTextStyle,
} from './dynamic';

// Объединяем все стили в одну функцию
export const createCardStyles = (colors: any) => ({
  ...createBaseCardStyles(colors),
  ...createProgramCardStyles(colors),
  ...createWorkoutCardStyles(colors),
  ...createExerciseCardStyles(colors),
  ...createFilterCardStyles(colors),
  ...createSheetCardStyles(colors),
  ...createProfileCardStyles(colors),
  ...createEmptyCardStyles(colors),
});

// Экспортируем динамические генераторы
export {
  createExerciseCardBorderStyles,
  getMuscleGroupChipStyle,
  getMuscleGroupChipTextStyle,
  getMuscleGroupBadgeStyle,
  getMuscleGroupBadgeTextStyle,
  getMuscleSubgroupItemStyle,
  getMuscleSubgroupItemTextStyle,
  getExerciseIconMainStyle,
  getExerciseIconExtraStyle,
  getMuscleBubbleStyle,
  getMuscleBubbleTextStyle,
};

export type CardStyleKey = keyof ReturnType<typeof createCardStyles>;