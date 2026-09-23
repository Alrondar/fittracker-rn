// src/components/ui/SheetShell.tsx
// DS-4: анимированный bottom sheet — canonical паттерн приложения (PRODUCT.md §3.6).
// Enter/exit slide-up 240ms + fade бэкдропа, высота по контенту (max ~85%),
// grabber + swipe-down dismiss (жест с tap-альтернативами: backdrop/X — §3.1).
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

export interface SheetShellProps {
  visible?: boolean;
  title?: string;
  onClose: () => void;
  keyboardVerticalOffset?: number;
  children: React.ReactNode;
  /** Если true, использует flex-вёрстку вместо absolute (обязательно при использовании внутри <Modal>) */
  isModal?: boolean;
}

const ENTER_DURATION = 240;
const EXIT_DURATION = 200;
const MAX_HEIGHT_RATIO = 0.85;
const DRAG_CLOSE_DISTANCE = 80;
const DRAG_CLOSE_VELOCITY = 600;

export function SheetShell({
  visible = true,
  title,
  onClose,
  keyboardVerticalOffset = 0,
  children,
  isModal = false,
}: SheetShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [rendered, setRendered] = useState(visible);
  const enter = useSharedValue(0);
  const dragY = useSharedValue(0);

  const finishClose = () => onClose();

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_CLOSE_DISTANCE || e.velocityY > DRAG_CLOSE_VELOCITY) {
        dragY.value = withTiming(windowHeight, { duration: EXIT_DURATION }, (finished) => {
          if (finished) runOnJS(finishClose)();
        });
      } else {
        dragY.value = withSpring(0, { damping: 28, stiffness: 320 });
      }
    });

  useEffect(() => {
    if (visible) {
      setRendered(true);
      dragY.value = withTiming(0, { duration: 0 });
      enter.value = withDelay(16, withTiming(1, { duration: ENTER_DURATION }));
    } else {
      // Exit-анимация: держим в дереве до конца fade, затем размонтируем.
      enter.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
  }));

  const panelStyle = useAnimatedStyle(() => {
    const entering = interpolate(enter.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: entering,
      transform: [{ translateY: dragY.value + (1 - entering) * windowHeight }],
    };
  });

  if (!rendered) return null;

  const sheetContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={{ flex: 1 }}
      pointerEvents="box-none"
    >
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            backdropStyle,
            { backgroundColor: colors.overlay },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
          />
        </Animated.View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: windowHeight * MAX_HEIGHT_RATIO,
              backgroundColor: colors.surface,
              borderTopLeftRadius: BORDER_RADIUS.xl,
              borderTopRightRadius: BORDER_RADIUS.xl,
            },
            panelStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <View
              style={{
                paddingTop: SPACING.sm,
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderTopLeftRadius: BORDER_RADIUS.xl,
                borderTopRightRadius: BORDER_RADIUS.xl,
              }}
            >
              {/* Grabber — визуальный маркер жеста закрытия */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: withAlpha(colors.textTertiary, 0.4),
                  marginBottom: SPACING.xs,
                }}
              />
              {title ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    paddingHorizontal: SPACING.lg,
                    paddingTop: SPACING.xs,
                    paddingBottom: SPACING.md,
                  }}
                >
                  <Text
                    style={[typography.h5, { color: colors.textPrimary, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть"
                  >
                    <X size={20} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ height: SPACING.sm, alignSelf: 'stretch' }} />
              )}
            </View>
          </GestureDetector>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SPACING.lg,
              paddingBottom: Math.max(SPACING.lg, insets.bottom + SPACING.md),
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );

  if (isModal) {
    return sheetContent;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {sheetContent}
    </View>
  );
}
