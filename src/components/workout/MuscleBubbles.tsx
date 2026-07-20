import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { getMuscleColor } from '../../constants/muscleColors';

interface MuscleBubblesProps {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  style?: ViewStyle;
}

/**
 * Баблы мышц: primary — насыщенный цвет группы (точка-маркер),
 * secondary — нейтральный фон с цветной обводкой.
 * Цвета берутся из constants/muscleColors.ts («Грудь» → #EF4444 и т.д.)
 */
export function MuscleBubbles({ primaryMuscles = [], secondaryMuscles = [], style }: MuscleBubblesProps) {
  const { colors } = useTheme();

  if (primaryMuscles.length === 0 && secondaryMuscles.length === 0) return null;

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
      {primaryMuscles.map(m => {
        const color = getMuscleColor(m);
        return (
          <View
            key={`p-${m}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: color + '1A',
              borderWidth: 1,
              borderColor: color + '55',
              paddingHorizontal: SPACING.sm,
              paddingVertical: 3,
              borderRadius: BORDER_RADIUS.full,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 5 }} />
            <Text style={[typography.captionSmall, { color, fontWeight: '700' }]}>{m}</Text>
          </View>
        );
      })}
      {secondaryMuscles.map(m => {
        const color = getMuscleColor(m);
        return (
          <View
            key={`s-${m}`}
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: color + '40',
              paddingHorizontal: SPACING.sm,
              paddingVertical: 3,
              borderRadius: BORDER_RADIUS.full,
            }}
          >
            <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>{m}</Text>
          </View>
        );
      })}
    </View>
  );
}