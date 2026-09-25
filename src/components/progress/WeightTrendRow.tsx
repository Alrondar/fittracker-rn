// src/components/progress/WeightTrendRow.tsx
// Компактный тренд веса (sparkline + delta).
// Отвечает на «Как меняется моё тело?»
import React from 'react';
import { View, Text } from 'react-native';
import { Scale } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useUnitPreferences, kgToLb } from '../../hooks/useUnitPreferences';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { WeightPoint } from '../../services/progressService';

interface Props {
  weightTrend: WeightPoint[];
}

export function WeightTrendRow({ weightTrend }: Props) {
  const { colors } = useTheme();
  // VF-8: вес показываем в выбранных единицах; без roundToHalf — история замеров
  // не должна «съезжать» с 82.3 на 82.5 только из-за формата вывода
  const { unit } = useUnitPreferences();
  const unitLabel = unit === 'kg' ? 'кг' : 'lb';
  const w = (kg: number) => (unit === 'kg' ? kg : kgToLb(kg));

  if (weightTrend.length < 2) return null;

  const first = weightTrend[0].weightKg;
  const last = weightTrend[weightTrend.length - 1].weightKg;
  const delta = last - first;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: withAlpha(colors.warning, 0.102),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Scale size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Вес</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Последние измерения
          </Text>
        </View>
      </View>
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
            {w(last).toFixed(1)} {unitLabel}
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
            backgroundColor:
              delta <= 0 ? withAlpha(colors.success, 0.125) : withAlpha(colors.warning, 0.125),
          }}
        >
          <Text
            style={[typography.labelBold, { color: delta <= 0 ? colors.success : colors.warning }]}
          >
            {delta > 0 ? '+' : ''}
            {w(delta).toFixed(1)} {unitLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
