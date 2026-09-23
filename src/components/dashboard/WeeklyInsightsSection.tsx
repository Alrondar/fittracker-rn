// app/(tabs)/index.tsx split (DA-P2-8): секция «Коротко о неделе» (COACH-4).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, scale } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { SectionHeader } from '../SectionHeader';
import type { WeeklyInsight } from '../../engine/weeklySummary';

interface Props {
  insights: WeeklyInsight[];
  onOpenProgress: () => void;
}

export function WeeklyInsightsSection({ insights, onOpenProgress }: Props) {
  const { colors } = useTheme();

  return (
    <View>
      <SectionHeader title="Коротко о неделе" />
      <AppCard variant="default">
        {insights.slice(0, 3).map((insight, idx) => {
          const isLast = idx === Math.min(2, insights.length - 1);
          return (
            <View
              key={insight.code || idx}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: SPACING.sm,
                marginBottom: isLast ? 0 : SPACING.md,
              }}
            >
              <View
                style={{
                  width: scale(6),
                  height: scale(6),
                  borderRadius: scale(3),
                  backgroundColor: insight.severity === 'warning' ? colors.warning : colors.success,
                  marginTop: scale(6),
                }}
              />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                {insight.title}
              </Text>
            </View>
          );
        })}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Посмотреть прогресс"
          style={{ marginTop: SPACING.md, alignItems: 'flex-end' }}
          onPress={onOpenProgress}
        >
          <Text style={[typography.caption, { color: colors.primary }]}>Посмотреть прогресс</Text>
        </TouchableOpacity>
      </AppCard>
    </View>
  );
}
