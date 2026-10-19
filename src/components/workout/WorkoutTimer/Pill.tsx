// Компактная пилюля таймера в шапке экрана тренировки.
import React, { memo } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { Play, Square } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { PressableScale } from '../../ui/PressableScale';
import * as Haptics from 'expo-haptics';
import { useWorkoutTimerCtx } from './timerContext';

export const WorkoutTimerPill = memo(function WorkoutTimerPill({
  colors,
  onRequestFinish,
  saving,
}: {
  colors: any;
  /** FX-1-паттерн: экран держит confirm-лист в своём корне — сюда только триггер. */
  onRequestFinish: () => void;
  saving: boolean;
}) {
  const { formatted, phase, toggle, toggleExpand } = useWorkoutTimerCtx();

  const onPress = saving
    ? undefined
    : phase === 'running'
      ? () => {
          // хаптика как у прежней кнопки «Завершить» (toggle/toggleExpand
          // дают свою внутри провайдера)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRequestFinish();
        }
      : toggle;
  const onLongPress =
    !saving && (phase === 'running' || phase === 'paused') ? toggleExpand : undefined;

  // running/paused — живой счётчик вместо слова: часы видимы всегда.
  const showTime = !saving && (phase === 'running' || phase === 'paused');
  const label = saving ? 'Сохранение...' : phase === 'idle' ? 'Начать' : formatted;

  const a11yLabel = saving
    ? 'Сохранение тренировки'
    : phase === 'running'
      ? 'Завершить тренировку'
      : phase === 'paused'
        ? 'Пауза — возобновить тренировку'
        : 'Начать тренировку';

  const backgroundColor = saving
    ? colors.surfaceSecondary
    : phase === 'running'
      ? colors.error
      : phase === 'paused'
        ? withAlpha(colors.warning, 0.102)
        : colors.success;

  const textColor = saving
    ? colors.textSecondary
    : phase === 'running'
      ? colors.textInverse
      : phase === 'paused'
        ? colors.warning
        : colors.textInverse;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        phase === 'running' || phase === 'paused'
          ? 'Удерживайте, чтобы открыть таймер и паузу'
          : undefined
      }
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.full,
        minHeight: 36,
        backgroundColor,
        borderWidth: 1,
        borderColor: saving
          ? colors.border
          : phase === 'paused'
            ? withAlpha(colors.warning, 0.376)
            : 'transparent',
      }}
      haptic="none"
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : phase === 'running' ? (
        <Square size={12} color={textColor} fill={textColor} strokeWidth={2.4} />
      ) : (
        <Play size={12} color={textColor} fill={textColor} strokeWidth={2.4} />
      )}
      <Text
        style={[
          typography.captionSmall,
          {
            color: textColor,
            fontWeight: '700',
            // табличные цифры — счётчик не «прыгает» по ширине каждый тик
            ...(showTime && { fontVariant: ['tabular-nums'] }),
          },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
});

// ===== Раскрытое состояние: аккордеон-панель под шапкой =====

/**
 * UX-T3: панель раскрывается долгим тапом по единой кнопке (running/paused).
 * Здесь большой таймер, пауза/возобновление и дублирующий «Завершить
 * тренировку» — чтобы финиш был доступен и из панели (там же, где пауза).
 */
