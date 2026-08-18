// src/components/workout/sections/ExerciseCardHeader.tsx
// Header карточки (вариант D):
// Строка 1: Название + Settings справа
// Строка 2: Metadata слева + Bubbles Боль/Альтернативы справа
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Settings, HeartPulse, ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { createCardStyles } from '../../../styles/components/card';

// Правильное склонение: 1 вариант, 2 варианта, 5 вариантов
const formatAlternativesCount = (count: number): string => {
  if (count === 1) return '1 вариант';
  if (count >= 2 && count <= 4) return `${count} варианта`;
  return `${count} вариантов`;
};

interface ExerciseCardHeaderProps {
  exerciseName: string;
  isMain: boolean;
  exerciseIndex: number;
  setsCount: number;
  restSeconds: number;
  repsRange?: string;
  intensityInfo: { label: string; color: string; bgColor: string; icon: React.ReactNode };
  hasAlternatives: boolean;
  alternativesCount: number;
  hasPainRecord?: boolean; // PR6: есть запись боли в pain_events — для visual affordance
  onOpenSettings: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  onOpenPain?: (exerciseIndex: number) => void;
  onOpenAlternatives?: (exerciseIndex: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const ExerciseCardHeader = memo(function ExerciseCardHeader({
  exerciseName,
  isMain,
  exerciseIndex,
  setsCount,
  restSeconds,
  repsRange,
  intensityInfo,
  hasAlternatives,
  alternativesCount,
  hasPainRecord = false,
  onOpenSettings,
  onOpenPain,
  onOpenAlternatives,
  colors,
  cardStyles,
}: ExerciseCardHeaderProps) {
  // Bubble style — как EquipmentBubbles
  const bubbleStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  };

  return (
    <View
      style={[
        cardStyles.workoutExerciseHeader,
        { flexDirection: 'column', alignItems: 'stretch', gap: SPACING.sm },
      ]}
    >
      {/* Строка 1: Название + Settings справа */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs }}>
        <Text
          style={[cardStyles.workoutExerciseName, { color: colors.textPrimary, flex: 1 }]}
          numberOfLines={2}
        >
          {exerciseName}
        </Text>
        {isMain && (
          <TouchableOpacity
            onPress={() => onOpenSettings(exerciseIndex, setsCount, restSeconds)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginTop: 2 }}
          >
            <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Строка 2: Metadata слева + Bubbles справа */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        {/* Metadata слева */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
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
                style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '700' }]}
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

        {/* Bubbles справа (только основная карточка) */}
        {isMain && (onOpenPain || hasAlternatives) && (
          <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
            {/* Боль — кнопка-bubble. PR6: при наличии записи — warning tint + «⚠ Боль отмечена» */}
            {onOpenPain && (
              <TouchableOpacity
                onPress={() => onOpenPain(exerciseIndex)}
                style={
                  hasPainRecord
                    ? {
                        ...bubbleStyle,
                        backgroundColor: colors.warning + '15',
                        borderColor: colors.warning,
                      }
                    : bubbleStyle
                }
                activeOpacity={0.7}
              >
                <HeartPulse size={14} color={colors.warning} strokeWidth={2} />
                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color: hasPainRecord ? colors.warning : colors.textPrimary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {hasPainRecord ? '⚠ Боль отмечена' : 'Боль'}
                </Text>
              </TouchableOpacity>
            )}
            {/* Альтернативы — индикатор-bubble */}
            {hasAlternatives && alternativesCount > 0 && (
              <TouchableOpacity
                onPress={() => onOpenAlternatives?.(exerciseIndex)}
                style={bubbleStyle}
                activeOpacity={0.7}
              >
                <ChevronRight size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}
                >
                  {formatAlternativesCount(alternativesCount)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
});