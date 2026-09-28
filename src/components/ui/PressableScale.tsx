// src/components/ui/PressableScale.tsx
// UX-1 (audit-6): канонический press-примитив приложения — spring-масштаб вместо
// плоского activeOpacity. Все «нажимаемые» поверхности (кнопки, карточки, FAB,
// строки списков) должны проходить через него, чтобы pressed-язык был единым.
//
// Реализация: RN Pressable (не RNGH — безопасно вкладывается в FlatList/FlashList),
// обёрнутый createAnimatedComponent: единственный узел несёт и responder, и
// анимацию, и переданный style — absolute-позиционирование (FAB) и layout-стили
// работают ровно как с TouchableOpacity. Вложенные pressable-детти получают
// responder первыми — родитель не анимируется при тапе по ребёнку.
import React, { memo, useCallback } from 'react';
import {
  AccessibilityRole,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Упругий, без явного overshoot: 0.97 за ~120ms туда и обратно.
const PRESS_SPRING = { damping: 20, stiffness: 400, mass: 0.6 };

// WEB-3: роль-обёртка (`group` вместо `button`) нужна только на вебе — там
// accessibilityRole роняется в нативный <button> и ломает валидную вложенность.
const IS_WEB = Platform.OS === 'web';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps {
  // Сигнатура как у Pressable: обработчики без аргументов остаются валидны
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  delayLongPress?: number;
  disabled?: boolean;
  /** Целевой масштаб при нажатии (default 0.97). */
  scaleTo?: number;
  /** Хаптика на start нажатия; 'none' — где хаптика уже идёт в обработчике. */
  haptic?: 'light' | 'medium' | 'none';
  /** Стиль нажимной поверхности (всё, что раньше шло в TouchableOpacity style). */
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: ViewProps['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: Record<string, boolean | undefined>;
  hitSlop?: ViewProps['hitSlop'];
  /**
   * WEB-3: поверхность, внутри которой есть другие действия (кнопки, ссылки).
   *
   * На вебе `accessibilityRole="button"` роняется в нативный `<button>`, а `<button>`
   * внутри `<button>` — невалидный HTML: React кричит «cannot be a descendant of
   * <button>», а вспомогательные технологии перестают видеть вложенные действия.
   * Для таких обёрток ставим роль `group` — RNW оставляет `<div role="group">`.
   * На нативных платформах роль не меняется (вложенность accessibilityRole там
   * безопасна), то есть поведение устройства не затрагивается.
   */
  wrapActions?: boolean;
  children: React.ReactNode;
}

export const PressableScale = memo(function PressableScale({
  onPress,
  onLongPress,
  delayLongPress,
  disabled = false,
  scaleTo = 0.97,
  haptic = 'light',
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  wrapActions = false,
  children,
}: PressableScaleProps) {
  const pressSV = useSharedValue(0); // 0 = idle, 1 = pressed

  const onPressIn = useCallback(() => {
    if (disabled) return;
    pressSV.value = withSpring(1, PRESS_SPRING);
    // WEB-3d: на вебе expo-haptics дёргает navigator.vibrate; без user-activation
    // браузер пишет «Blocked call» в консоль (шум на автотестах), а пользы нет —
    // iOS Safari vibrate не поддерживает вовсе. Гасим только на вебе.
    if (IS_WEB) return;
    if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (haptic === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [disabled, haptic, pressSV]);

  const onPressOut = useCallback(() => {
    pressSV.value = withSpring(0, PRESS_SPRING);
  }, [pressSV]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressSV.value, [0, 1], [1, scaleTo], Extrapolation.CLAMP) }],
    // ВАЖНО (perf): здесь НЕТ анимации opacity. Анимируемая прозрачность
    // контейнера с elevation/tеними на Android переводит слой в offscreen
    // буфер → re-raster каждого кадра → те самые «микрофризы на тапах».
    // Отклик обеспечивает один spring-масштаб.
  }));

  // WEB-3: обёртка с вложенными действиями не должна становиться <button> на вебе.
  // 'group' — ARIA-роль: в union RN `AccessibilityRole` её нет, но RNW пробрасывает
  // неизвестные роли в `role` атрибут div'а (propsToAriaRole), поэтому каст точечный
  // и только для веб-ветки.
  const role = (wrapActions && IS_WEB ? 'group' : accessibilityRole) as
    AccessibilityRole | undefined;

  return (
    <AnimatedPressable
      accessibilityRole={role === 'none' ? undefined : role}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});
