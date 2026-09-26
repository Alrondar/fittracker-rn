// src/components/ui/ThemeCrossFade.tsx
// UX-3c (L-8): кросс-фейд темы при смене акцента/режима.
// Механика: в том же рендере, где пришли новые colors, оверлей ставит
// opacity=1 (render-time запись в SharedValue — до коммита нативных вью,
// иначе один кадр «новой» палитры просвечивает до эффекта) и затем гаснет за
// 320мс. Оверлей — сплошной новый background: палитра «перетекает» из него,
// а не скачком. pointerEvents none, теней нет — нет offscreen-raster (урок
// FadeIn/UX-M6).
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

export function ThemeCrossFade() {
  const { colors, themeAccent, themeMode } = useTheme();
  const o = useSharedValue(0);
  const prevKey = useRef(`${themeAccent}|${themeMode}`);
  const key = `${themeAccent}|${themeMode}`;

  if (key !== prevKey.current) {
    prevKey.current = key;
    o.value = 1;
  }

  useEffect(() => {
    if (o.value <= 0) return;
    o.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, style]}
    />
  );
}
