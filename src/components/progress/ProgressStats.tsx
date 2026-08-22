// src/components/progress/ProgressStats.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';

interface ProgressStatsProps {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  bestStreak: number;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}

export function ProgressStats({
  totalWorkouts,
  totalVolume,
  currentStreak,
  bestStreak,
}: ProgressStatsProps) {
  const { colors } = useTheme();

  return (
    <AppCard variant="compact" style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>{totalWorkouts}</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>тренировок</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border, marginVertical: SPACING.xs }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>{formatVolume(totalVolume)}</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>кг объём</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border, marginVertical: SPACING.xs }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>{currentStreak}</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>недель</Text>
          {bestStreak > currentStreak && (
            <Text style={[typography.overline, { color: colors.textTertiary, marginTop: 2 }]}>
              макс: {bestStreak}
            </Text>
          )}
        </View>
      </View>
    </AppCard>
  );
}
