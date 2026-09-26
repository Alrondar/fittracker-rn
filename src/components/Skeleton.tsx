import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  // Фаза пульсации 0→1→0 (бесконечный цикл на Reanimated: withRepeat + withSequence).
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1, // бесконечно
      false // sequence сам делает 0→1→0, reverse не нужен
    );
    // При размонтировании shared value уничтожается → анимация останавливается сама.
  }, [phase]);

  // Интерполяция [0,1] → [0.3, 0.7] (как в оригинале).
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + phase.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, backgroundColor: colors.surfaceSecondary },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Skeleton width="70%" height={20} borderRadius={4} />
      <View style={styles.row}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.textBlock}>
          <Skeleton width="80%" height={16} borderRadius={4} />
          <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    // backgroundColor берётся из темы
  },
  container: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
  },
});
// ---------------------------------------------------------------------------
// UX-2 (L-2): shimmer — бегущий диагональный блик поверх группы скелетонов.
// Один SharedValue на контейнер, а не на блок (performance gate, CLAUDE.md §8):
// <ShimmerWrap><DashboardSkeleton/></ShimmerWrap>. Пульс opacity остаётся базой.
// ---------------------------------------------------------------------------
const STRIPE_RATIO = 0.55; // ширина блика относительно контейнера

export function ShimmerWrap({ children, style }: { children: ReactNode; style?: any }) {
  const { isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) {
      setWidth(w);
      x.value = -w * STRIPE_RATIO;
    }
  };

  useEffect(() => {
    if (width <= 0) return;
    const stripe = width * STRIPE_RATIO;
    x.value = withRepeat(
      withTiming(width + stripe, { duration: 1150, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, [width, x]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    // ВАЖНО (perf): без rotate — повёрнутый градиентный слой на Android
    // пересобирается каждый кадр (offscreen raster) = микрофризы. Наклон
    // имитируется самим углом линейного градиента (бесплатно).
  }));

  return (
    <View style={style} onLayout={onLayout}>
      {children}
      {width > 0 ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <Animated.View
            style={[
              stripeStyle,
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: width * STRIPE_RATIO,
              },
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)',
                'transparent',
              ]}
              // Диагональ вместо поворота вью: x1/y1 → x2/y2 под наклоном.
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// UX-2 (L-3): anti-flash — skeleton не прячется раньше minMs с момента появления,
// иначе на быстром интернете заметен «чпок» скелетон→данные→скелетон-кадр.
// ---------------------------------------------------------------------------
export function useMinPending(pending: boolean, minMs = 250): boolean {
  const [shown, setShown] = useState(pending);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (pending) {
      if (startRef.current == null) startRef.current = Date.now();
      setShown(true);
      return undefined;
    }
    if (startRef.current == null) {
      setShown(false);
      return undefined;
    }
    const remain = minMs - (Date.now() - startRef.current);
    if (remain <= 0) {
      startRef.current = null;
      setShown(false);
      return undefined;
    }
    const t = setTimeout(() => {
      startRef.current = null;
      setShown(false);
    }, remain);
    return () => clearTimeout(t);
  }, [pending, minMs]);

  return shown;
}
