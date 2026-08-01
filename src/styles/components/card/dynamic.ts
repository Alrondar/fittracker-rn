import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';

// Стили для цветной обводки карточек упражнений
export const createExerciseCardBorderStyles = (colors: any, borderColor: string) => ({
  exerciseCardWithBorder: {
    borderLeftWidth: 4,
    borderLeftColor: borderColor,
  },
  exerciseListItemIconColored: {
    backgroundColor: borderColor + '15',
  },
});

// Динамические генераторы стилей
export const getMuscleGroupChipStyle = (groupColor: string, isActive: boolean): ViewStyle => ({
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.xs,
  borderRadius: BORDER_RADIUS.full,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: isActive ? `${groupColor}40` : `${groupColor}15`,
  borderColor: isActive ? groupColor : `${groupColor}50`,
  borderWidth: isActive ? 2 : 1,
  marginHorizontal: 4,
});

export const getMuscleGroupChipTextStyle = (groupColor: string, isActive: boolean): TextStyle => ({
  fontSize: 13,
  fontWeight: isActive ? '700' : '600',
  color: groupColor,
});

export const getMuscleGroupBadgeStyle = (groupColor: string, isActive: boolean): ViewStyle => ({
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
  backgroundColor: isActive ? groupColor : `${groupColor}50`,
});

export const getMuscleGroupBadgeTextStyle = (groupColor: string, isActive: boolean): TextStyle => ({
  fontSize: 10,
  fontWeight: '700',
  color: isActive ? '#fff' : groupColor,
});

export const getMuscleSubgroupItemStyle = (
  muscleColor: string,
  isSelected: boolean,
  surfaceColor: string,
  borderColor: string
): ViewStyle => ({
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: BORDER_RADIUS.full,
  borderWidth: 1.5,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: isSelected ? `${muscleColor}25` : surfaceColor,
  borderColor: isSelected ? muscleColor : borderColor,
});

export const getMuscleSubgroupItemTextStyle = (
  muscleColor: string,
  isSelected: boolean,
  textSecondaryColor: string
): TextStyle => ({
  fontSize: 12,
  fontWeight: isSelected ? '600' : '400',
  color: isSelected ? muscleColor : textSecondaryColor,
});

export const getExerciseIconMainStyle = (borderColor: string, surfaceColor: string): ViewStyle => ({
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: borderColor,
  backgroundColor: surfaceColor,
});

export const getExerciseIconExtraStyle = (
  right: number,
  top: number,
  backgroundColor: string,
  borderColor: string
): ViewStyle => ({
  position: 'absolute',
  right: right,
  top: top,
  width: 20,
  height: 20,
  backgroundColor: backgroundColor,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: borderColor,
});

export const getMuscleBubbleStyle = (muscleColor: string): ViewStyle => ({
  backgroundColor: `${muscleColor}20`,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: `${muscleColor}40`,
});

export const getMuscleBubbleTextStyle = (muscleColor: string): TextStyle => ({
  fontSize: 11,
  fontWeight: '600',
  color: muscleColor,
});