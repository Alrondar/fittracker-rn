// src/components/workout/RestTimer.tsx
// v2 (05.08.2026): Pill-режим + пресеты (+30/+60) + вибрация до сброса + sticky-оверлей.
// Sticky-позиция реализуется в [id].tsx (обёртка в Animated.View с absoluteFillObject).
import React, { useState, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { X, Minus, Plus, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createWorkoutStyles } from '../../styles/components/workout';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

// Параметры большого круга (Panel-режим)
const RADIUS = 90;
const STROKE_WIDTH = 12;
const SIZE = RADIUS * 2 + STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Параметры маленького круга (Pill-режим)
const SMALL_RADIUS = 20;
const SMALL_SIZE = SMALL_RADIUS * 2 + 8;
const SMALL_CIRCUMFERENCE = 2 * Math.PI * SMALL_RADIUS;

interface RestTimerProps {
  timeLeft: number;
  total: number;
  isFinished: boolean;
  onStop: () => void;
  onAdjust: (delta: number) => void;
  colors: any;
  workoutStyles: ReturnType<typeof createWorkoutStyles>;
}

export const RestTimer = memo(function RestTimer({
  timeLeft,
  total,
  isFinished,
  onStop,
  onAdjust,
  colors,
  workoutStyles,
}: RestTimerProps) {
  const { settings } = useTimerSettings();
  const [expanded, setExpanded] = useState(true); // по умолчанию развёрнут
  const progress = total > 0 ? timeLeft / total : 0;
  const scale = useSharedValue(1);

  // Пульсация в последние 3 секунды
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !isFinished) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }
  }, [timeLeft, isFinished, scale]);

  // Вибрация "до сброса" (каждые 3 сек когда finished + настройка включена)
  useEffect(() => {
    if (!isFinished || !settings.vibrateUntilDismissed) return;
    const interval = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFinished, settings.vibrateUntilDismissed]);

  // Анимация раскрытия/сворачивания
  const expandProgress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, expandProgress]);

  const panelStyle = useAnimatedStyle(() => ({
    maxHeight: expandProgress.value * 500,
    opacity: 0.15 + expandProgress.value * 0.85,
    transform: [{ translateY: (1 - expandProgress.value) * -8 }],
  }));

  // Цвет в зависимости от фазы
  const timeColor = isFinished
    ? colors.success
    : timeLeft <= 10
    ? colors.error
    : timeLeft <= 30
    ? colors.warning
    : colors.textPrimary;

  // Анимированные props для SVG circle
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - (isFinished ? 1 : progress)),
  }));

  const smallAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: SMALL_CIRCUMFERENCE * (1 - (isFinished ? 1 : progress)),
  }));

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  return (
    <View
      style={[
        workoutStyles.workoutTimerContainer,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingVertical: expanded ? 24 : 12,
          alignItems: 'center',
        },
      ]}
    >
      {/* Pill-режим (свёрнутый) */}
      {!expanded && (
        <TouchableOpacity
          onPress={toggleExpand}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.sm,
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Svg width={SMALL_SIZE} height={SMALL_SIZE}>
              <Circle
                cx={SMALL_SIZE / 2}
                cy={SMALL_SIZE / 2}
                r={SMALL_RADIUS}
                stroke={colors.surfaceSecondary}
                strokeWidth={4}
                fill="none"
              />
              <AnimatedCircle
                cx={SMALL_SIZE / 2}
                cy={SMALL_SIZE / 2}
                r={SMALL_RADIUS}
                stroke={isFinished ? colors.success : timeColor}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${SMALL_CIRCUMFERENCE} ${SMALL_CIRCUMFERENCE}`}
                animatedProps={smallAnimatedProps}
                rotation="-90"
                origin={`${SMALL_SIZE / 2}, ${SMALL_SIZE / 2}`}
              />
            </Svg>
          </Animated.View>
          <Text
            style={[
              typography.h3,
              { color: timeColor, fontVariant: ['tabular-nums'], fontWeight: '700' },
            ]}
          >
            {isFinished ? '💪' : formatTime(timeLeft)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Panel-режим (развёрнутый) */}
      {expanded && (
        <Animated.View style={[{ width: '100%' }, panelStyle]}>
          {/* Шапка */}
          <View
            style={[
              workoutStyles.workoutTimerHeader,
              { width: '100%', paddingHorizontal: 16 },
            ]}
          >
            <Text
              style={[workoutStyles.workoutTimerTitle, { color: colors.textSecondary }]}
            >
              {isFinished ? 'Отдых окончен' : 'Таймер отдыха'}
            </Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity
                onPress={toggleExpand}
                style={workoutStyles.workoutTimerCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                  Свернуть
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onStop();
                }}
                style={workoutStyles.workoutTimerCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Круговой прогресс-бар + время */}
          <View style={{ marginVertical: 16, alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Svg width={SIZE} height={SIZE}>
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={colors.surfaceSecondary}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                <AnimatedCircle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={isFinished ? colors.success : timeColor}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  animatedProps={animatedProps}
                  rotation="-90"
                  origin={`${SIZE / 2}, ${SIZE / 2}`}
                />
              </Svg>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isFinished ? 48 : 56,
                    fontWeight: '700',
                    color: timeColor,
                  }}
                >
                  {isFinished ? '💪' : formatTime(timeLeft)}
                </Text>
                {!isFinished && total > 60 && (
                  <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 4 }}>
                    из {formatTime(total)}
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* Управление */}
          {isFinished ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onStop();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.success,
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 16,
                marginTop: 8,
              }}
            >
              <CheckCircle size={20} color={colors.textInverse} strokeWidth={2} />
              <Text
                style={[
                  workoutStyles.workoutTimerControlText,
                  { color: colors.textInverse, fontWeight: '600' },
                ]}
              >
                Продолжить тренировку
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                workoutStyles.workoutTimerControls,
                { flexDirection: 'row', gap: SPACING.sm },
              ]}
            >
              <TouchableOpacity
                onPress={() => onAdjust(-15)}
                disabled={total <= 15}
                style={[
                  workoutStyles.workoutTimerControlButton,
                  { opacity: total <= 15 ? 0.4 : 1, flex: 1 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Minus size={18} color={colors.textSecondary} strokeWidth={2} />
                  <Text
                    style={[
                      workoutStyles.workoutTimerControlText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    15с
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAdjust(30)}
                style={[workoutStyles.workoutTimerControlButton, { flex: 1 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Plus size={18} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[workoutStyles.workoutTimerControlText, { color: colors.primary }]}
                  >
                    30с
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAdjust(60)}
                style={[workoutStyles.workoutTimerControlButton, { flex: 1 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Plus size={18} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[workoutStyles.workoutTimerControlText, { color: colors.primary }]}
                  >
                    60с
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
});

// Обёртка для анимации SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);