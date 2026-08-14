// src/components/workout/sections/ExerciseCardActions.tsx
// Actions row: "Другие варианты" + "Боль?" (только основная карточка).
// UX-4: alternatives доступны без перегрузки. FEAT-1.9: понятный pain affordance.
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, HeartPulse } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ExerciseCardActionsProps {
  exerciseIndex: number;
  hasAlternatives: boolean;
  onOpenPain?: (exerciseIndex: number) => void;
  onOpenAlternatives?: (exerciseIndex: number) => void;
  colors: any;
}

export const ExerciseCardActions = memo(function ExerciseCardActions({
  exerciseIndex,
  hasAlternatives,
  onOpenPain,
  onOpenAlternatives,
  colors,
}: ExerciseCardActionsProps) {
  const showPain = !!onOpenPain;

  // «Другие варианты» показываем, если альтернативы есть.
  // Если onOpenAlternatives не передан — тап пока ничего не делает,
  // пользователь всё равно может свайпнуть (affordance сохранён).
  if (!hasAlternatives && !showPain) return null;

  return (
    <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
      {hasAlternatives && (
        <TouchableOpacity
          onPress={() => onOpenAlternatives?.(exerciseIndex)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textPrimary, fontWeight: '600', flex: 1 },
            ]}
          >
            Другие варианты
          </Text>
          <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      )}
      {showPain && (
        <TouchableOpacity
          onPress={() => onOpenPain!(exerciseIndex)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.xs,
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: BORDER_RADIUS.md,
          }}
          activeOpacity={0.7}
        >
          <HeartPulse size={16} color={colors.warning} strokeWidth={2} />
          <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>
            Боль?
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});