import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface MacroPieChartProps {
  proteins: number;
  fats: number;
  carbs: number;
}

const PROTEIN_COLOR = '#4CAF50';
const FAT_COLOR = '#FFC107';
const CARB_COLOR = '#2196F3';

export function MacroPieChart({ proteins, fats, carbs }: MacroPieChartProps) {
  const { colors } = useTheme();
  const total = proteins + fats + carbs;
  if (total === 0) return null;

  const proteinPercent = (proteins / total) * 100;
  const fatPercent = (fats / total) * 100;
  const carbPercent = (carbs / total) * 100;

  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = {
      x: 50 + radius * Math.cos((startAngle - 90) * Math.PI / 180),
      y: 50 + radius * Math.sin((startAngle - 90) * Math.PI / 180),
    };
    const end = {
      x: 50 + radius * Math.cos((endAngle - 90) * Math.PI / 180),
      y: 50 + radius * Math.sin((endAngle - 90) * Math.PI / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 50 50 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };

  const currentAngle = 0;
  const proteinAngle = (proteinPercent / 100) * 360;
  const fatAngle = (fatPercent / 100) * 360;
  const carbAngle = (carbPercent / 100) * 360;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
      <Svg width={120} height={120} viewBox="0 0 100 100">
        <G>
          <Path d={createArc(currentAngle, currentAngle + proteinAngle, 40)} fill={PROTEIN_COLOR} />
          <Path d={createArc(currentAngle + proteinAngle, currentAngle + proteinAngle + fatAngle, 40)} fill={FAT_COLOR} />
          <Path d={createArc(currentAngle + proteinAngle + fatAngle, currentAngle + proteinAngle + fatAngle + carbAngle, 40)} fill={CARB_COLOR} />
        </G>
        <Circle cx="50" cy="50" r="25" fill={colors.background} />
      </Svg>
      <View style={{ marginLeft: SPACING.lg, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: PROTEIN_COLOR, marginRight: SPACING.sm }} />
          <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]}>Белки</Text>
          <Text style={[typography.caption, { color: PROTEIN_COLOR, fontWeight: '600' }]}>{Math.round(proteinPercent)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FAT_COLOR, marginRight: SPACING.sm }} />
          <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]}>Жиры</Text>
          <Text style={[typography.caption, { color: FAT_COLOR, fontWeight: '600' }]}>{Math.round(fatPercent)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: CARB_COLOR, marginRight: SPACING.sm }} />
          <Text style={[typography.caption, { color: colors.textPrimary, flex: 1 }]}>Углеводы</Text>
          <Text style={[typography.caption, { color: CARB_COLOR, fontWeight: '600' }]}>{Math.round(carbPercent)}%</Text>
        </View>
      </View>
    </View>
  );
}