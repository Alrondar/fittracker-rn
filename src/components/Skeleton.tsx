import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
    // Фаза пульсации 0→1→0 (бесконечный цикл на Reanimated: withRepeat + withSequence).
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1, // бесконечно
      false, // sequence сам делает 0→1→0, reverse не нужен
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