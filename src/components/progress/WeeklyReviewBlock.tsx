// src/components/progress/WeeklyReviewBlock.tsx
// COACH-5: Weekly review UI block для Progress hub.
// Отвечает на вопрос "Как прошла неделя?" детерминированными инсайтами.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, AlertTriangle, CheckCircle, Activity } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import type { WeeklyInsight } from '../../engine/weeklySummary';

interface WeeklyReviewBlockProps {
  insights: WeeklyInsight[];
  workoutsCount: number;
}

export function WeeklyReviewBlock({ insights, workoutsCount }: WeeklyReviewBlockProps) {
  const { colors } = useTheme();

  // Empty state: нет тренировок
  if (workoutsCount === 0) {
    return (
      <AppCard variant="default">
        <View style={styles.emptyContainer}>
          <Activity size={32} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h5, { color: colors.textPrimary, marginTop: SPACING.sm }]}>
            Нет данных за неделю
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs }]}>
            Завершите тренировку, чтобы увидеть инсайты здесь
          </Text>
        </View>
      </AppCard>
    );
  }

  // Empty state: тренировки были, но инсайтов нет
  if (insights.length === 0) {
    return (
      <AppCard variant="default">
        <View style={styles.emptyContainer}>
          <CheckCircle size={32} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h5, { color: colors.textPrimary, marginTop: SPACING.sm }]}>
            Стабильная неделя
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs }]}>
            Тренировки были, но пока нет ярких инсайтов. Так держать!
          </Text>
        </View>
      </AppCard>
    );
  }

  const getIcon = (severity: WeeklyInsight['severity']) => {
    switch (severity) {
      case 'positive':
        return <TrendingUp size={20} color={colors.success} strokeWidth={2} />;
      case 'caution':
      case 'warning':
        return <AlertTriangle size={20} color={severity === 'warning' ? colors.error : colors.warning} strokeWidth={2} />;
      default:
        return <CheckCircle size={20} color={colors.textSecondary} strokeWidth={2} />;
    }
  };

  const getBorderColor = (severity: WeeklyInsight['severity']) => {
    switch (severity) {
      case 'positive':
        return colors.success + '40'; // 25% opacity
      case 'caution':
        return colors.warning + '40';
      case 'warning':
        return colors.error + '40';
      default:
        return colors.border;
    }
  };

  return (
    <View style={styles.container}>
      {insights.map((insight, index) => (
        <AppCard
          key={`${insight.code}-${index}`}
          variant="default"
          style={[styles.insightCard, { borderColor: getBorderColor(insight.severity), borderWidth: 1 }]}
        >
          <View style={styles.insightContent}>
            <View style={styles.iconWrapper}>
              {getIcon(insight.severity)}
            </View>
            <View style={styles.textContainer}>
              <Text style={[typography.h6, { color: colors.textPrimary }]} numberOfLines={2}>
                {insight.title}
              </Text>
              {insight.subtitle && (
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                  {insight.subtitle}
                </Text>
              )}
            </View>
          </View>
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  insightCard: {
    marginBottom: 0, // переопределяем default marginBottom из AppCard
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    marginTop: 2,
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
});