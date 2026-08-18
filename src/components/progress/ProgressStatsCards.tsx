// src/components/progress/ProgressStatsCards.tsx
// UX-11: три статистические карточки Progress hub — тренировки / объём / стрик.
// Единый паттерн с profile.tsx (компактные AppCard с иконкой и числом).
import React from 'react';
import { View, Text } from 'react-native';
import { Dumbbell, Trophy, Flame } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';

interface ProgressStatsCardsProps {
  totalWorkouts: number;
  totalVolume: number; // кг
  currentStreak: number; // недель
  bestStreak: number; // недель
  colors: any;
}

export function ProgressStatsCards({
  totalWorkouts,
  totalVolume,
  currentStreak,
  bestStreak,
  colors,
}: ProgressStatsCardsProps) {
  const volumeInTons = totalVolume / 1000;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
        <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />
        <Text style={[typography.h3, { color: colors.primary, marginTop: SPACING.xs }]}>
          {totalWorkouts}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Тренировок</Text>
      </AppCard>

      <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
        <Trophy size={20} color={colors.warning} strokeWidth={1.5} />
        <Text style={[typography.h3, { color: colors.warning, marginTop: SPACING.xs }]}>
          {volumeInTons.toFixed(1)}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Тонн</Text>
      </AppCard>

      <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
        <Flame size={20} color={colors.error} strokeWidth={1.5} />
        <Text style={[typography.h3, { color: colors.error, marginTop: SPACING.xs }]}>
          {currentStreak}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {bestStreak > 0 ? `best ${bestStreak}` : 'недель'}
        </Text>
      </AppCard>
    </View>
  );
}
