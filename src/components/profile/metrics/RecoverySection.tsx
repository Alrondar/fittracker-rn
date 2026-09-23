// app/profile/metrics.tsx split (DA-P2-8): P0 Вариант B — тренд восстановления за 7 дней.
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useRecoveryTrend } from '../../../hooks/useRecoveryTrend';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { SectionHeader } from '../../SectionHeader';
import { MetricSparkline } from '../MetricSparkline';

export function RecoverySection() {
  const { colors } = useTheme();
  const { data: recoveryData, isLoading: isRecoveryLoading } = useRecoveryTrend(7);

  if (
    isRecoveryLoading ||
    !recoveryData ||
    !(
      recoveryData.sleepHours.some((d) => d.value !== null) ||
      recoveryData.stress.some((d) => d.value !== null)
    )
  ) {
    return null;
  }

  return (
    <View style={{ marginBottom: SPACING.xl }}>
      <SectionHeader
        title="Восстановление (7 дней)"
        style={{ paddingHorizontal: 0, paddingTop: 0 }}
      />

      {recoveryData.sleepHours.some((d) => d.value !== null) && (
        <MetricSparkline
          label="Сон"
          unit="ч"
          color={recoveryData.avgSleepHours < 7 ? colors.warning : colors.success}
          points={recoveryData.sleepHours.filter(
            (d): d is { date: string; value: number } => d.value !== null
          )}
        />
      )}

      {recoveryData.stress.some((d) => d.value !== null) && (
        <MetricSparkline
          label="Стресс"
          unit="/5"
          color={recoveryData.avgStress >= 4 ? colors.error : colors.success}
          points={recoveryData.stress.filter(
            (d): d is { date: string; value: number } => d.value !== null
          )}
        />
      )}

      {recoveryData.avgSleepHours > 0 && recoveryData.avgSleepHours < 7 && (
        <View
          style={{
            backgroundColor: withAlpha(colors.warning, 0.125),
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            marginTop: SPACING.sm,
          }}
        >
          <Text style={[typography.caption, { color: colors.warning }]}>
            ⚠️ Средний сон: {recoveryData.avgSleepHours.toFixed(1)}ч (рекомендуется 7–9ч)
          </Text>
        </View>
      )}

      {recoveryData.avgStress > 0 && recoveryData.avgStress >= 4 && (
        <View
          style={{
            backgroundColor: withAlpha(colors.error, 0.125),
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            marginTop: SPACING.sm,
          }}
        >
          <Text style={[typography.caption, { color: colors.error }]}>
            ⚠️ Высокий уровень стресса ({recoveryData.avgStress.toFixed(1)}/5). Рассмотрите снижение
            нагрузки.
          </Text>
        </View>
      )}
    </View>
  );
}
