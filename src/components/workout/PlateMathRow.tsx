// src/components/workout/PlateMathRow.tsx
// Вариант B (Balanced): компактная строка с иконкой и разборкой веса

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { FONT_FAMILIES } from '../../constants/fonts';
import { calculatePlates, formatPlates } from '../../utils/plates';
import { BARBELL_EQUIPMENT_NAMES } from '../../constants/barbellDefaults';

interface PlateMathRowProps {
  weight: number | null;
  equipment: string | string[] | undefined;
  barWeight: number;
  unit: 'kg' | 'lb';
  colors: any;
}

/**
 * Тот же набор условий, что и рендер компонента. Экспортирован, чтобы
 * SetsGrid мог не рисовать рамку подсказки, когда внутри неё нечего показать.
 */
export function plateMathVisible(
  weight: number | null,
  equipment: string | string[] | undefined,
  barWeight: number,
  unit: 'kg' | 'lb'
): boolean {
  if (weight === null || weight <= barWeight) return false;
  const equipArray = Array.isArray(equipment) ? equipment : [equipment || ''];
  const isBarbell = equipArray.some((eq) =>
    BARBELL_EQUIPMENT_NAMES.some((barbellEq) => eq.toLowerCase().includes(barbellEq.toLowerCase()))
  );
  if (!isBarbell) return false;
  return calculatePlates(weight, barWeight, unit) !== null;
}

export const PlateMathRow = React.memo(function PlateMathRow({
  weight,
  equipment,
  barWeight,
  unit,
  colors,
}: PlateMathRowProps) {
  const plates = useMemo(() => {
    if (!plateMathVisible(weight, equipment, barWeight, unit)) return null;
    return calculatePlates(weight as number, barWeight, unit);
  }, [weight, equipment, barWeight, unit]);

  if (!plates) return null;

  const formattedText = formatPlates(barWeight, plates, unit);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: SPACING.xs,
      }}
    >
      <Dumbbell size={14} color={colors.textTertiary} strokeWidth={2} />
      <Text
        style={{
          fontSize: 12,
          fontFamily: FONT_FAMILIES.textMedium,
          color: colors.textSecondary,
          fontWeight: '500',
        }}
      >
        {formattedText}
      </Text>
    </View>
  );
});
