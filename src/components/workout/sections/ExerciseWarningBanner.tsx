// src/components/workout/sections/ExerciseWarningBanner.tsx
// Safety warning banner: caution/avoid warnings
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';

interface ExerciseWarningBannerProps {
  warning: { level: 'avoid' | 'caution'; message: string } | null;
  colors: any;
}

export const ExerciseWarningBanner = memo(function ExerciseWarningBanner({
  warning,
  colors,
}: ExerciseWarningBannerProps) {
  if (!warning) return null;

  const warningColor = warning.level === 'avoid' ? colors.error : colors.warning;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: warningColor + '15',
        borderColor: warningColor,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
      }}
    >
      <ShieldAlert
        size={16}
        color={warningColor}
        strokeWidth={2}
        style={{ marginRight: SPACING.xs, marginTop: 1 }}
      />
      <Text
        style={{
          color: warningColor,
          flex: 1,
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 16,
        }}
      >
        {warning.message}
      </Text>
    </View>
  );
});