// src/components/ui/StaleBanner.tsx
// EDGE-10 (аудит 06.10): неудачная фоновая перезагрузка при живом кэше — не повод
// выбрасывать рабочий экран в полноэкранный отказ. Данные остаются на месте,
// устаревание становится явным, а лечится одним тапом.
// Инлайн (в отличие от LoadingChip): занимает место в потоке экрана, тапаемый.
import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha, fontScale } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { PressableScale } from './PressableScale';

export function StaleBanner({
  label = 'Не удалось обновить данные',
  actionLabel = 'Обновить',
  onRetry,
  style,
}: {
  label?: string;
  actionLabel?: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${actionLabel}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: withAlpha(colors.warning, 0.35),
          backgroundColor: withAlpha(colors.warning, 0.08),
        },
        style,
      ]}
    >
      <AlertTriangle size={fontScale(18)} color={colors.warning} strokeWidth={2} />
      <Text style={[typography.bodySmall, { flex: 1, color: colors.textPrimary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        <RefreshCw size={fontScale(14)} color={colors.primary} strokeWidth={2.2} />
        <Text style={[typography.labelBold, { color: colors.primary }]}>{actionLabel}</Text>
      </View>
    </PressableScale>
  );
}
