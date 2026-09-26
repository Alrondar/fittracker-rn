// src/components/workout/SetFeedbackControl.tsx
// FEAT-7 v2 (05.08.2026): RPE feedback — чип в ряду подходов.
// Редактор шкалы lives в RpeEditor.tsx (UX-RPE-1, 26.09: инлайн-морфинг
// вместо RpeOverlay); старый inline-редактор SetFeedbackEditor удалён как
// dead code (дизайн-аудит 23.09.2026, DA-P2).
import React, { memo } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface SetFeedbackChipProps {
  rpe: number | null;
  onPress: () => void;
  colors: any;
}

export const SetFeedbackChip = memo(function SetFeedbackChip({
  rpe,
  onPress,
  colors,
}: SetFeedbackChipProps) {
  const filled = rpe != null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
        backgroundColor: filled ? withAlpha(colors.primary, 0.082) : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: filled ? withAlpha(colors.primary, 0.251) : colors.border,
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color: filled ? colors.primary : colors.textTertiary,
            fontWeight: '700',
          },
        ]}
      >
        {filled ? `RPE ${rpe}` : 'RPE?'}
      </Text>
    </TouchableOpacity>
  );
});
