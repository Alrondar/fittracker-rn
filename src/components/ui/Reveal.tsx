// src/components/workout/Reveal.tsx
// MORF-REC (26.09): общая обёртка «разворот из точки» для инлайн-морфингов.
// Контент измеряется onLayout, обёртка разворачивается по maxHeight с лёгким
// scale/opacity из указанного угла (transformOrigin — RN 0.76+). Entrance-only:
// закрытие — обычный unmount (обратный проигрыватель не нужен для карточек,
// которые и так сменяются пересчётом).
import React, { useEffect, useState, useCallback, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DURATION = 240;

export function Reveal({
  children,
  origin = 'top-right',
}: {
  children: ReactNode;
  /** Угол, из которого разворачивается блок (transformOrigin). */
  origin?: 'top-right' | 'top-left' | 'top-center';
}) {
  const p = useSharedValue(0);
  const [h, setH] = useState(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
  }, [p]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setH(e.nativeEvent.layout.height);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.2 + p.value * 0.8,
    transform: [{ scaleY: 0.92 + p.value * 0.08 }],
    maxHeight: h > 0 ? h * (0.05 + p.value * 0.95) : undefined,
  }));

  return (
    <Animated.View
      style={[
        {
          overflow: 'hidden',
          transformOrigin:
            origin === 'top-right' ? '100% 0%' : origin === 'top-left' ? '0% 0%' : '50% 0%',
        },
        style,
      ]}
    >
      <View onLayout={handleLayout}>{children}</View>
    </Animated.View>
  );
}
