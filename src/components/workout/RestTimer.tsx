import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, Minus, Plus, CheckCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { createWorkoutStyles } from '../../styles/components/workout';

interface RestTimerProps {
  timeLeft: number;
  total: number;
  isFinished: boolean;
  onStop: () => void;
  onAdjust: (delta: number) => void;
  colors: any;
  workoutStyles: ReturnType<typeof createWorkoutStyles>;
}

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

// Параметры круга
const RADIUS = 90;
const STROKE_WIDTH = 12;
const SIZE = RADIUS * 2 + STROKE_WIDTH;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestTimer({
  timeLeft,
  total,
  isFinished,
  onStop,
  onAdjust,
  colors,
  workoutStyles,
}: RestTimerProps) {
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

  return (
    <View
      style={[
        workoutStyles.workoutTimerContainer,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          alignItems: 'center',
          paddingVertical: 24,
        },
      ]}
    >
      {/* Шапка */}
      <View
        style={[
          workoutStyles.workoutTimerHeader,
          { width: '100%', paddingHorizontal: 16 },
        ]}
      >
        <Text
          style={[
            workoutStyles.workoutTimerTitle,
            { color: colors.textSecondary },
          ]}
        >
          {isFinished ? 'Отдых окончен' : 'Таймер отдыха'}
        </Text>
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

      {/* Круговой прогресс-бар + время */}
      <View style={{ marginVertical: 16 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Svg width={SIZE} height={SIZE}>
            {/* Фоновый круг */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.surfaceSecondary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Прогресс-бар */}
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
          {/* Цифры в центре */}
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
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textTertiary,
                  marginTop: 4,
                }}
              >
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
        <View style={workoutStyles.workoutTimerControls}>
          <TouchableOpacity
            onPress={() => onAdjust(-15)}
            disabled={total <= 15}
            style={[
              workoutStyles.workoutTimerControlButton,
              { opacity: total <= 15 ? 0.4 : 1 },
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
            onPress={() => onAdjust(15)}
            style={workoutStyles.workoutTimerControlButton}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={18} color={colors.primary} strokeWidth={2} />
              <Text
                style={[
                  workoutStyles.workoutTimerControlText,
                  { color: colors.primary },
                ]}
              >
                15с
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Обёртка для анимации SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);