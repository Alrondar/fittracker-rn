import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Check, X, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_COLORS } from '../constants/semanticColors';
import { SHADOWS } from '../constants/theme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', visible, onHide, duration = 2500 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Появление: выезд сверху (spring) + fade-in.
      translateY.value = withSpring(0, { stiffness: 80, damping: 12 });
      opacity.value = withTiming(1, { duration: 250 });

      // Исчезновение через duration; onHide — после завершения анимации.
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        translateY.value = withTiming(-150, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onHide)();
        });
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration, onHide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const config = {
    success: { icon: Check, bgColor: TOAST_COLORS.success },
    error: { icon: X, bgColor: TOAST_COLORS.error },
    info: { icon: Info, bgColor: TOAST_COLORS.info },
  };
  const { icon: Icon, bgColor } = config[type];

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 16, backgroundColor: bgColor }, animatedStyle]}
    >
      <View style={styles.iconWrapper}>
        <Icon size={20} color="#fff" strokeWidth={2.5} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    ...SHADOWS.lg,
    zIndex: 9999,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
});
