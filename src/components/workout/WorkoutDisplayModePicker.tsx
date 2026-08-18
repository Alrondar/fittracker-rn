// src/components/workout/WorkoutDisplayModePicker.tsx
// Picker режима отображения карточки упражнения: training / balanced / learn.
// Используется в profile/settings. UX-2: progressive disclosure density.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Dumbbell, LayoutGrid, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { useWorkoutDisplayMode } from '../../hooks/useWorkoutDisplayMode';
import { WorkoutCardDisplayMode } from '../../types/workout';

const MODES: {
  key: WorkoutCardDisplayMode;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { key: 'training', label: 'Тренировка', icon: Dumbbell },
  { key: 'balanced', label: 'Баланс', icon: LayoutGrid },
  { key: 'learn', label: 'Изучение', icon: BookOpen },
];

export function WorkoutDisplayModePicker() {
  const { colors } = useTheme();
  const { mode, updateMode } = useWorkoutDisplayMode();

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceSecondary,
          borderRadius: BORDER_RADIUS.md,
          padding: 4,
        }}
      >
        {MODES.map(({ key, label, icon: Icon }) => {
          const selected = mode === key;
          return (
            <TouchableOpacity
              key={key}
              style={{
                flex: 1,
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.sm,
                alignItems: 'center',
                backgroundColor: selected ? colors.primary : 'transparent',
              }}
              onPress={() => {
                updateMode(key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <Icon
                size={18}
                color={selected ? colors.textInverse : colors.textSecondary}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: selected ? colors.textInverse : colors.textSecondary,
                    fontWeight: selected ? '600' : '400',
                    marginTop: SPACING.xs,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text
        style={[
          typography.caption,
          { color: colors.textTertiary, marginTop: SPACING.sm, lineHeight: 16 },
        ]}
      >
        {mode === 'training'
          ? 'Минимум информации — фокус на подходах'
          : mode === 'learn'
          ? 'Техника и детали упражнения на виду'
          : 'Подходы + контекст упражнения'}
      </Text>
    </View>
  );
}