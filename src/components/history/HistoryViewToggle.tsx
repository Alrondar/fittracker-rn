// src/components/history/HistoryViewToggle.tsx
// UX-10: segmented control Calendar/List на экране Истории.
// Паттерн сегментированных контролов темы (settings.tsx) и WorkoutDisplayModePicker.
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CalendarDays, List } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { HistoryView } from '../../hooks/useHistoryView';

interface HistoryViewToggleProps {
  view: HistoryView;
  onChange: (view: HistoryView) => void;
  colors: any;
}

export const HistoryViewToggle = memo(function HistoryViewToggle({
  view,
  onChange,
  colors,
}: HistoryViewToggleProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceSecondary,
        borderRadius: BORDER_RADIUS.md,
        padding: 4,
      }}
    >
      {(['calendar', 'list'] as const).map((mode) => {
        const active = view === mode;
        const Icon = mode === 'calendar' ? CalendarDays : List;
        return (
          <TouchableOpacity
            key={mode}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.sm,
              backgroundColor: active ? colors.primary : 'transparent',
            }}
            onPress={() => {
              onChange(mode);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Icon
              size={16}
              color={active ? colors.textInverse : colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: active ? colors.textInverse : colors.textSecondary,
                  fontWeight: active ? '600' : '400',
                },
              ]}
            >
              {mode === 'calendar' ? 'Календарь' : 'Список'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});