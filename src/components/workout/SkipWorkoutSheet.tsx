// src/components/workout/SkipWorkoutSheet.tsx
// DA-P2-8: sheet подтверждения пропуска тренировки (UX-5 F2, вынесен из workouts.tsx).
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SkipForward } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';

interface SkipWorkoutSheetProps {
  target: { id: string; name: string } | null;
  skipping: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SkipWorkoutSheet({ target, skipping, onConfirm, onCancel }: SkipWorkoutSheetProps) {
  const { colors } = useTheme();

  return (
    <SheetShell visible={!!target} title="Пропустить тренировку?" onClose={onCancel}>
      {target && (
        <View>
          <Text
            style={[
              typography.body,
              { color: colors.textPrimary, fontWeight: '600', marginBottom: SPACING.xs },
            ]}
          >
            {target.name}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.lg },
            ]}
          >
            Программа перейдёт к следующему дню. Подходы не будут записаны. Это действие нельзя
            отменить.
          </Text>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={skipping}
            accessibilityRole="button"
            accessibilityLabel="Подтвердить пропуск тренировки"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.sm,
              paddingVertical: SPACING.md,
              borderRadius: BORDER_RADIUS.lg,
              backgroundColor: colors.warning,
              marginBottom: SPACING.sm,
            }}
          >
            {skipping ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <SkipForward size={18} color={colors.textInverse} strokeWidth={2} />
                <Text style={[typography.button, { color: colors.textInverse }]}>
                  Пропустить тренировку
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancel}
            disabled={skipping}
            accessibilityRole="button"
            accessibilityLabel="Отменить пропуск"
            style={{
              alignItems: 'center',
              paddingVertical: SPACING.md,
              borderRadius: BORDER_RADIUS.lg,
              backgroundColor: colors.surfaceSecondary,
            }}
          >
            <Text style={[typography.button, { color: colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
      )}
    </SheetShell>
  );
}
