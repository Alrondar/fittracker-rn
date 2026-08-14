// src/components/workout/sections/ExerciseCardHeader.tsx
// Header карточки упражнения: название + controls (alternatives, pain, settings, repsRange, intensity)
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, HeartPulse, Settings } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { createCardStyles } from '../../../styles/components/card';

interface ExerciseCardHeaderProps {
  exerciseName: string;
  isMain: boolean;
  hasAlternatives: boolean;
  exerciseIndex: number;
  setsCount: number;
  restSeconds: number;
  repsRange?: string;
  intensityInfo: { label: string; color: string; bgColor: string; icon: React.ReactNode };
  onOpenSettings: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  onOpenPain?: (exerciseIndex: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const ExerciseCardHeader = memo(function ExerciseCardHeader({
  exerciseName,
  isMain,
  hasAlternatives,
  exerciseIndex,
  setsCount,
  restSeconds,
  repsRange,
  intensityInfo,
  onOpenSettings,
  onOpenPain,
  colors,
  cardStyles,
}: ExerciseCardHeaderProps) {
  return (
    <View
      style={[
        cardStyles.workoutExerciseHeader,
        { flexDirection: 'column', alignItems: 'stretch', gap: SPACING.sm },
      ]}
    >
      <Text
        style={[cardStyles.workoutExerciseName, { color: colors.textPrimary }]}
        numberOfLines={2}
      >
        {exerciseName}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: SPACING.xs,
        }}
      >
        {isMain && hasAlternatives && (
          <View style={[cardStyles.workoutSwipeIcon, { backgroundColor: colors.surfaceSecondary }]}>
            <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
          </View>
        )}
        {isMain && onOpenPain ? (
          <TouchableOpacity
            onPress={() => onOpenPain(exerciseIndex)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: SPACING.sm }}
          >
            <HeartPulse size={18} color={colors.warning} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
        {isMain && (
          <TouchableOpacity
            onPress={() => onOpenSettings(exerciseIndex, setsCount, restSeconds)}
            style={[cardStyles.workoutSettingsButton, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
        {!!repsRange && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: SPACING.sm,
              paddingVertical: 4,
              borderRadius: BORDER_RADIUS.full,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, fontWeight: '700' },
              ]}
            >
              {repsRange} повт.
            </Text>
          </View>
        )}
        <View style={[cardStyles.workoutIntensityBadge, { backgroundColor: intensityInfo.bgColor }]}>
          {intensityInfo.icon}
          <Text style={[cardStyles.workoutIntensityText, { color: intensityInfo.color }]}>
            {intensityInfo.label}
          </Text>
        </View>
      </View>
    </View>
  );
});