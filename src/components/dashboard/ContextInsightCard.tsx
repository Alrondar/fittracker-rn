// src/components/dashboard/ContextInsightCard.tsx
// COACH-4: Компактная карточка контекстного инсайта на Dashboard.
// Показывает только самый "горячий" сигнал (positive или warning), чтобы не перегружать экран.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import type { WeeklyInsight } from '../../engine/weeklySummary';

interface ContextInsightCardProps {
  insight: WeeklyInsight | null;
  readinessWarning: boolean;
}

export function ContextInsightCard({ insight, readinessWarning }: ContextInsightCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!insight && !readinessWarning) {
    return null; // Нечего показывать, не занимаем место
  }

  const isPositive = insight?.severity === 'positive';
  const isWarning = insight?.severity === 'warning' || readinessWarning;

  const icon = isPositive ? (
    <TrendingUp size={20} color={colors.success} strokeWidth={2} />
  ) : (
    <AlertTriangle size={20} color={colors.warning} strokeWidth={2} />
  );

  const title = readinessWarning
    ? 'Низкая готовность сегодня'
    : insight?.title ?? 'Инсайт';

  const subtitle = readinessWarning
    ? 'Рекомендуем снизить нагрузку или сделать разминку'
    : insight?.subtitle ?? '';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/profile/progress')}
      style={styles.container}
    >
      <AppCard
        variant="compact"
        style={[
          styles.card,
          {
            borderColor: isPositive ? colors.success + '40' : colors.warning + '40',
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconWrapper}>{icon}</View>
          <View style={styles.textContainer}>
            <Text style={[typography.h6, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle !== '' && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
});