// src/components/progress/WeightTrendRow.tsx
// Компактный тренд веса (sparkline + delta).
// Отвечает на «Как меняется моё тело?»
import React from 'react';
import { View, Text } from 'react-native';
import { Scale } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SectionHeader } from '../SectionHeader';
import { WeightPoint } from '../../services/progressService';

interface Props {
  weightTrend: WeightPoint[];
}

export function WeightTrendRow({ weightTrend }: Props) {
  const { colors } = useTheme();

  if (weightTrend.length < 2) return null;

  const first = weightTrend[0].weightKg;
  const last = weightTrend[weightTrend.length - 1].weightKg;
  const delta = last - first;

  return (
    <View>
      <SectionHeader title="Вес тела" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.md,
          borderColor: colors.border,
          borderWidth: 1,
          padding: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Scale size={20} color={colors.primary} strokeWidth={1.8} />
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>
            {last.toFixed(1)} кг
          </Text>
          <Text style={[typography.overline, { color: colors.textTertiary }]}>
            {weightTrend.length} замеров за 8 недель
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: SPACING.sm,
            paddingVertical: SPACING.xs,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: delta <= 0 ? colors.success + '20' : colors.warning + '20',
          }}
        >
          <Text
            style={[
              typography.labelBold,
              { color: delta <= 0 ? colors.success : colors.warning },
            ]}
          >
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} кг
          </Text>
        </View>
      </View>
    </View>
  );
}