// src/components/workout/sections/ExerciseCardMuscles.tsx
// Primary + secondary muscles bubbles
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { getMuscleColor } from '../../../constants/muscleColors';

interface ExerciseCardMusclesProps {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  colors: any;
}

export const ExerciseCardMuscles = memo(function ExerciseCardMuscles({
  primaryMuscles,
  secondaryMuscles,
  colors,
}: ExerciseCardMusclesProps) {
  if (primaryMuscles.length === 0 && secondaryMuscles.length === 0) return null;

  return (
    <>
      {primaryMuscles.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: secondaryMuscles.length > 0 ? 6 : SPACING.md,
          }}
        >
          {primaryMuscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`p-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c + '1A',
                  borderWidth: 1,
                  borderColor: c + '55',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c,
                    marginRight: 5,
                  }}
                />
                <Text style={[typography.captionSmall, { color: c, fontWeight: '700' }]}>
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {secondaryMuscles.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: SPACING.md,
          }}
        >
          {secondaryMuscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`s-${i}`}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: c + '40',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
});