import React from 'react';
import { View, Text, Platform } from 'react-native';
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Dumbbell size={16} color={colors.primary} strokeWidth={2} />
          {/* ✅ Лейбл не обрезается: flexShrink + numberOfLines + автоподбор на iOS. */}
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginLeft: 4, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={0.8}
          >
            Тренировок
          </Text>
        </View>
        <Text style={styles.statValue}>{workoutsCount}</Text>
      </View>

      <View style={styles.statCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Trophy size={16} color={colors.warning} strokeWidth={2} />
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginLeft: 4, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={0.8}
          >
            Объём (т)
          </Text>
        </View>
        <Text style={styles.statValue}>{(totalVolume / 1000).toFixed(1)}</Text>
      </View>

      <View style={styles.statCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          {/* ✅ Хардкод #FF5722 убран → colors.error (семантика энергии, без нарушения дизайн-системы). */}
          <Zap size={16} color={colors.error} strokeWidth={2} />
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginLeft: 4, flexShrink: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={0.8}
          >
            Ккал
          </Text>
        </View>
        <Text style={styles.statValue}>{burnedCalories}</Text>
      </View>
    </View>
  );
}