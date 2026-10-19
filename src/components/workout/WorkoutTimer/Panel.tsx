// Раскрытая панель таймера: старт/пауза, finish, ручной корректировщик.
import React, { useEffect, memo } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Play, Pause, Clock, Square, RefreshCw } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { PressableScale } from '../../ui/PressableScale';
import { useWorkoutTimerCtx } from './timerContext';
import { PulseDot } from './PulseDot';

export const WorkoutTimerPanel = memo(function WorkoutTimerPanel({
  colors,
  onRequestFinish,
  // RESET-T: сброс начала тренировки. Панель не знает про БД — только триггерит.
  onRequestReset,
  // BUG-6 (аудит 28.09): панельный финиш должен гаситься во время сохранения —
  // иначе «Завершить» из панели повторял saveWorkout (двойной финиш).
  saving = false,
}: {
  colors: any;
  onRequestFinish: () => void;
  onRequestReset?: () => void;
  saving?: boolean;
}) {
  const { formatted, running, phase, expanded, toggle } = useWorkoutTimerCtx();

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    // 176 = строка таймера (~100) + кнопка «Завершить тренировку» (~76)
    maxHeight: progress.value * 176,
    opacity: 0.15 + progress.value * 0.85,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  const accent =
    phase === 'running'
      ? colors.success
      : phase === 'paused'
        ? colors.warning
        : colors.textTertiary;

  const statusLabel =
    phase === 'running' ? 'Тренировка идёт' : phase === 'paused' ? 'Пауза' : 'Не начата';

  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[{ overflow: 'hidden', backgroundColor: colors.surface }, panelStyle]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Clock size={16} color={colors.textTertiary} strokeWidth={2} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulseDot phase={phase} color={accent} />
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: accent,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
            <Text
              style={[
                typography.h3,
                {
                  color: colors.textPrimary,
                  fontVariant: ['tabular-nums'],
                  lineHeight: 40,
                  marginTop: 2,
                },
              ]}
            >
              {formatted}
            </Text>
          </View>
        </View>

        {/* RESET-T: сброс начала. Появляется только когда есть что сбрасывать
            (идёт или уже отсчитано), чтобы не было мёртвого контролла. Свой
            второстепенный стиль и 44 px вместо 52 — на 320 px в ряд с паузой и
            подписью статуса влезает только так. */}
        {phase !== 'idle' && onRequestReset ? (
          <PressableScale
            onPress={onRequestReset}
            accessibilityRole="button"
            accessibilityLabel="Сбросить начало тренировки"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              marginRight: SPACING.sm,
            }}
            haptic="none"
          >
            <RefreshCw size={19} color={colors.textSecondary} strokeWidth={2.2} />
          </PressableScale>
        ) : null}

        <PressableScale
          onPress={toggle}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: running ? colors.surfaceSecondary : colors.primary,
            borderWidth: running ? 1 : 0,
            borderColor: colors.border,
          }}
          haptic="none"
        >
          {running ? (
            <Pause size={22} color={colors.textPrimary} strokeWidth={2.4} />
          ) : (
            <Play
              size={22}
              color={colors.textInverse}
              strokeWidth={2.4}
              fill={colors.textInverse}
              style={{ marginLeft: 2 }}
            />
          )}
        </PressableScale>
      </View>

      {/* UX-T3: дублирующий финиш — в панели рядом с паузой (основной вход —
          тап по красной кнопке в шапке). Ведёт на тот же confirm-лист. */}
      <PressableScale
        onPress={onRequestFinish}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Завершить тренировку"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.sm,
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.md,
          paddingVertical: 10,
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: withAlpha(colors.error, 0.376),
          backgroundColor: withAlpha(colors.error, 0.102),
        }}
        haptic="none"
      >
        <Square size={13} color={colors.error} fill={colors.error} strokeWidth={2.4} />
        <Text style={[typography.captionSmall, { color: colors.error, fontWeight: '700' }]}>
          Завершить тренировку
        </Text>
      </PressableScale>
    </Animated.View>
  );
});
