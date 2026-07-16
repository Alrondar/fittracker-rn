// @ts-nocheck
import React from 'react';
import { View, Text } from 'react-native';
import { createDashboardStyles } from '../styles/components/dashboard';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../styles/typography';
import { Dumbbell, Trophy, Zap } from 'lucide-react-native';

interface WeeklyStatsCardProps {
  workoutsCount: number;
  totalVolume: number;
  burnedCalories: number;
}

export function WeeklyStatsCard({
  workoutsCount,
  totalVolume,
  burnedCalories,
}: WeeklyStatsCardProps) {
  const { colors } = useTheme();
  const styles = createDashboardStyles(colors);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
          <Dumbbell size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
            Тренировок
          </Text>
        </View>
        <Text style={styles.statValue}>{workoutsCount}</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
          <Trophy size={16} color={colors.warning} strokeWidth={2} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
            Объём (т)
          </Text>
        </View>
        <Text style={styles.statValue}>{(totalVolume / 1000).toFixed(1)}</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
          <Zap size={16} color="#FF5722" strokeWidth={2} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
            Ккал
          </Text>
        </View>
        <Text style={styles.statValue}>{burnedCalories}</Text>
      </View>
    </View>
  );
}