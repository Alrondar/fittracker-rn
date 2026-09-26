import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Perf (UX-1 фризы): анимируемая прозрачность родителя, внутри которого есть
   * дети с elevation/тенями, на Android каждый кадр уходит в offscreen-буфер
   * (re-raster) — это и есть «микрофризы» при stagger-входе. Для таких секций
   * (styles.section на Dashboard) включаем fade={false}: остаётся только
   * сдвиг по Y, он композится бесплатно.
   */
  fade?: boolean;
}

export function FadeIn({ children, delay = 0, style, fade = true }: FadeInProps) {
  const opacity = useSharedValue(fade ? 0 : 1);
  const translateY = useSharedValue(15);

  useEffect(() => {
    // withDelay заменяет setTimeout: задержка → плавное появление.
    if (fade) {
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    }
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
