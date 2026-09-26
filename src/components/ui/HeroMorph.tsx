// src/components/ui/HeroMorph.tsx
// UX-1h (I-4): «псевдо-shared-element» без новых зависимостей. Честный morph
// между экранами требует навигационной библиотеки с hero-транзишенами; здесь
// тот же эффект собирается из двух одноузловых трансформ:
//   HeroOut — source-карточка на Dashboard при тапе увеличивается на 5%
//             (transform-only: без opacity — карточка с elevation иначе уходит
//             в offscreen-raster, см. UX-M6) и «улетает» под навигацию;
//   HeroIn  — header принимающего экрана тренировки въезжает scale 0.9→1+fade
//             с маленьким delay, создавая ощущение, что та же карточка
//             «приземлилась» на новом экране.
// Активность HeroIn включается только параметром маршрута ?hero=1, который
// прокидывается Dashboard → workout/create → workout/[id]; обычные входы на
// экран тренировки анимацию НЕ проигрывают.
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const OUT_DURATION = 160;

export function HeroOut({
  start,
  children,
  style,
}: {
  start: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (start) {
      p.value = withTiming(1, { duration: OUT_DURATION, easing: Easing.out(Easing.quad) });
    }
  }, [start, p]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.05 }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

const IN_DURATION = 320;
const IN_DELAY = 120; // переживаем основную часть навигационного слайда

export function HeroIn({
  active,
  children,
  style,
}: {
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(active ? 0 : 1);

  useEffect(() => {
    if (active) {
      p.value = withDelay(
        IN_DELAY,
        withTiming(1, { duration: IN_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [active, p]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.9 + p.value * 0.1 }],
  }));

  return (
    <Animated.View style={[active ? animatedStyle : undefined, style]}>{children}</Animated.View>
  );
}
