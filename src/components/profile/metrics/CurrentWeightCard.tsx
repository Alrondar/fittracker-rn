// app/profile/metrics.tsx split (DA-P2-8): карточка «Текущий вес» с изменением.
import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useWeightDisplay } from '../../../hooks/useUnitPreferences';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { AppCard } from '../../ui/AppCard';
import type { BodyMetric } from '../../../types/metrics';

interface Props {
  latestMetric: BodyMetric | null;
  weightChange: { value: number; percent: number } | null;
}

export function CurrentWeightCard({ latestMetric, weightChange }: Props) {
  const { colors } = useTheme();
  const { unitLabel, kgToUnit, fmt } = useWeightDisplay();

  const changeIcon = !weightChange ? (
    <Minus size={20} color={colors.textSecondary} />
  ) : weightChange.value > 0 ? (
    <TrendingUp size={20} color={colors.error} />
  ) : weightChange.value < 0 ? (
    <TrendingDown size={20} color={colors.success} />
  ) : (
    <Minus size={20} color={colors.textSecondary} />
  );

  const changeText = () => {
    if (!weightChange) return 'Нет данных';
    const sign = weightChange.value > 0 ? '+' : '';
    return `${sign}${kgToUnit(weightChange.value).toFixed(1)} ${unitLabel} (${sign}${weightChange.percent.toFixed(1)}%)`;
  };

  const changeColor = () => {
    if (!weightChange) return colors.textSecondary;
    if (weightChange.value > 0) return colors.error;
    if (weightChange.value < 0) return colors.success;
    return colors.textSecondary;
  };

  return (
    <AppCard
      variant="highlighted"
      style={{
        marginBottom: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View>
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.xs }]}
        >
          Текущий вес
        </Text>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>
          {latestMetric?.weight_kg ? fmt(latestMetric.weight_kg) : '--'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
          {changeIcon}
          <Text style={[typography.labelBold, { color: changeColor(), marginLeft: SPACING.xs }]}>
            {changeText()}
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>с прошлого замера</Text>
      </View>
    </AppCard>
  );
}
