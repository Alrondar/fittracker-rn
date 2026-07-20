import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Dumbbell } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { EquipmentIcon } from '../EquipmentIcon';

interface EquipmentBubblesProps {
  equipment: string[] | null;
  primaryMuscles?: string[];
  style?: ViewStyle;
}

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/**
 * Баблы оборудования: отдельный чип с SVG-иконкой на каждую единицу.
 * Цвет иконки кодируется по первой целевой мышце (EquipmentIcon).
 */
export function EquipmentBubbles({ equipment, primaryMuscles = [], style }: EquipmentBubblesProps) {
  const { colors } = useTheme();
  const items = equipment ?? [];

  const chipStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  };

  if (items.length === 0) {
    return (
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
        <View style={chipStyle}>
          <Dumbbell size={12} color={colors.textTertiary} />
          <Text style={[typography.captionSmall, { color: colors.textTertiary, fontWeight: '600' }]}>
            Без оборудования
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>
      {items.map((eq, i) => (
        <View key={`eq-${i}-${eq}`} style={chipStyle}>
          <EquipmentIcon name={eq} size={16} primaryMuscles={primaryMuscles} />
          <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>
            {formatEquipmentName(eq)}
          </Text>
        </View>
      ))}
    </View>
  );
}