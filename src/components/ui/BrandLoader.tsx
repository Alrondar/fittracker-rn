// src/components/ui/BrandLoader.tsx
// UX-3b (L-5): брендовый загрузчик вместо системного спиннера.
// Знак — equipment-icons/bench-press.svg (он же лёг в иконку приложения):
// inline-SVG, а не текст — в момент корневого гейта кастомные шрифты ещё не
// гарантированно загружены (урок UX-T1: текст до useFonts → системный «чпок»).
// «Дыхание» — transform/opacity на Reanimated (UI-поток), без elevation-родителя.
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import BenchPressIcon from '../../assets/equipment-icons/bench-press.svg';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';

export function BrandLoader({
  label = 'Загрузка...',
  size = 144,
}: {
  label?: string;
  size?: number;
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
    transform: [{ scale: 1 + p.value * 0.07 }],
    opacity: 0.7 + p.value * 0.3,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
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
      {/* Системный шрифт намеренно: шрифты могут быть ещё не готовы */}
      <Text style={{ marginTop: SPACING.md, fontSize: 14, color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}
