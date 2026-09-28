// src/components/ui/LoadingChip.tsx
// PERF-11 (28.09): явный признак загрузки поверх макетного скелетона.
// Решение владельца (28.09): скелетоны остаются, но серые блоки сами по себе
// не читаются как «идёт загрузка» — поверх них кладется капсула с дыханием
// бренда (тот же паттерн, что BrandLoader/UX-3b) и подписью.
// Позиционируется от ближайшего контейнера экрана (position:absolute),
// pointerEvents="none" — не перехватывает тапы (грабля FadeIn, INVENTORY §12).
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import BenchPressIcon from '../../assets/equipment-icons/bench-press.svg';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, scale } from '../../constants/theme';

export function LoadingChip({
  label = 'Загрузка…',
  bottom = SPACING.xl,
}: {
  label?: string;
  bottom?: number;
}) {
  const { colors } = useTheme();
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [p]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.12 }],
    opacity: 0.7 + p.value * 0.3,
  }));

  const size = scale(16);

  return (
    <View pointerEvents="none" style={[styles.host, { bottom }]}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.primary,
          },
        ]}
      >
        <Animated.View style={markStyle}>
          <BenchPressIcon
            width={size}
            height={size}
            fill={colors.primary}
            stroke={colors.primary}
            strokeWidth={3}
            viewBox="0 0 100 100"
          />
        </Animated.View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    marginLeft: SPACING.sm,
  },
});
