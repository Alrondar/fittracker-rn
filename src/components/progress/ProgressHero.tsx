// src/components/progress/ProgressHero.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';

interface ProgressHeroProps {
  totalWorkouts: number;
  currentStreak: number;
  weeklyWorkoutDelta: number | null;
  currentWeekVolume: number;
  previousWeekVolume: number | null;
}

export function ProgressHero({
  totalWorkouts,
  currentStreak,
  weeklyWorkoutDelta,
  currentWeekVolume,
  previousWeekVolume,
}: ProgressHeroProps) {
  const { colors } = useTheme();

  let title = 'Ты продолжаешь тренироваться';
  let subtitle = 'Продолжай фиксировать тренировки, чтобы увидеть больше динамики.';

  if (totalWorkouts > 0) {
    if (weeklyWorkoutDelta !== null) {
      if (weeklyWorkoutDelta > 0) {
        title = 'Отличный темп';
        subtitle = `+${weeklyWorkoutDelta} к прошлой неделе. Так держать!`;
      } else if (weeklyWorkoutDelta < 0) {
        title = 'Стабильный ритм';
        subtitle = `На ${Math.abs(weeklyWorkoutDelta)} тренировку меньше, но ты в деле.`;
      } else {
        title = 'Стабильный ритм';
        subtitle = 'Столько же тренировок, как на прошлой неделе.';
      }
    } else {
      title = 'Ты тренируешься';
      subtitle = 'Продолжай в том же духе, и здесь появится больше динамики.';
    }
  }

  return (
    <AppCard variant="default" style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}
