// src/components/workout/WorkoutsFilterSheet.tsx
// DA-P2-8: sheet фильтра списка тренировок (вынесен из app/(tabs)/workouts.tsx).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';
import type { FilterMode } from '../../utils/workoutsList';

const MODES: { mode: FilterMode; label: string }[] = [
  { mode: 'upcoming', label: 'Предстоящие (без завершённых)' },
  { mode: 'this_week', label: 'Эта неделя (с завершёнными)' },
  { mode: 'all', label: 'Все тренировки' },
];

interface WorkoutsFilterSheetProps {
  visible: boolean;
  filterMode: FilterMode;
  onSelect: (mode: FilterMode) => void;
  onClose: () => void;
}

export function WorkoutsFilterSheet({
  visible,
  filterMode,
  onSelect,
  onClose,
}: WorkoutsFilterSheetProps) {
  const { colors } = useTheme();

  return (
    <SheetShell visible={visible} title="Фильтр тренировок" onClose={onClose}>
      <View style={{ gap: SPACING.sm }}>
        {MODES.map(({ mode, label }) => {
          const isActive = filterMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                onSelect(mode);
                onClose();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Выбрать фильтр: ${label}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: SPACING.md,
                paddingHorizontal: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: isActive ? withAlpha(colors.primary, 0.1) : 'transparent',
              }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: isActive ? colors.primary : colors.textPrimary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {label}
              </Text>
              {isActive && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SheetShell>
  );
}
