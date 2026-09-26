// src/components/ui/MuscleLoadModeToggle.tsx
//
// Сегмент-контрол для переключения режима отображения нагрузки на мышцы:
// 'total' (общий объём: primary + secondary) / 'direct' (прямая нагрузка: только primary).
// Использует семантические токены темы, без хардкода цветов.

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

export type MuscleLoadMode = 'total' | 'direct';

export type MuscleLoadModeToggleProps = {
  mode: MuscleLoadMode;
  onChange: (mode: MuscleLoadMode) => void;
};

export const MuscleLoadModeToggle = memo<MuscleLoadModeToggleProps>(({ mode, onChange }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          mode === 'total' && {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        ]}
        onPress={() => onChange('total')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === 'total' }}
        accessibilityLabel="Показать общий объём нагрузки (включая вторичные мышцы)"
      >
        <Text
          style={[
            typography.label,
            {
              fontWeight: '600',
              color: mode === 'total' ? colors.surface : colors.textSecondary,
            },
          ]}
        >
          Все
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          mode === 'direct' && {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        ]}
        onPress={() => onChange('direct')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === 'direct' }}
        accessibilityLabel="Показать только прямую нагрузку (основные мышцы)"
      >
        <Text
          style={[
            typography.label,
            {
              fontWeight: '600',
              color: mode === 'direct' ? colors.surface : colors.textSecondary,
            },
          ]}
        >
          Прямые
        </Text>
      </TouchableOpacity>
    </View>
  );
});

MuscleLoadModeToggle.displayName = 'MuscleLoadModeToggle';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: 2,
    alignSelf: 'flex-start',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    // UX-2 (audit-14): масштаб выровнен с PillToggle в одном ряду (высота 48
    // против его 48; tap target >= 44pt — требование UX_AUDIT_PLAN 11.2).
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 44,
  },
});
