// src/components/workout/WarmupExerciseCard.tsx
// L1 компактная карточка разминки: таймер + прогресс + миниатюра техники.
// Справочная информация (техника, риски, аналоги) вынесена в WarmupExerciseSheet —
// здесь карточка остаётся тонкой строкой, вся лента видна без прокрутки.
// Тап по карточке → открыть лист; тап по номеру → быстро отметить выполненным.
import React, { useEffect, memo } from 'react';
import { View, Text } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Play, Pause, Check, Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { parseMediaUrls } from '../../utils/mediaScheme';
import { useMediaGender } from '../../hooks/useMediaGender';
import { WarmupExercise } from '../../services/warmupService';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

/** Чип типа разминки: Активация (warning) / Растяжка (info). Общий с WarmupExerciseSheet. */
export function WarmupTypeChip({ canBeActivation }: { canBeActivation: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: canBeActivation
          ? withAlpha(colors.warning, 0.125)
          : withAlpha(colors.info, 0.125),
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: BORDER_RADIUS.sm,
      }}
    >
      <Text
        style={[
          typography.captionSmall,
          {
            color: canBeActivation ? colors.warning : colors.info,
            fontWeight: '700',
          },
        ]}
      >
        {canBeActivation ? 'Активация' : 'Растяжка'}
      </Text>
    </View>
  );
}

interface WarmupExerciseCardProps {
  exercise: WarmupExercise;
  index: number;
  completed: boolean;
  isActive: boolean;
  /** WARMUP-3c: стоит на паузе — показываем остаток и ▶ «продолжить». */
  isPaused: boolean;
  /** Передаётся ТОЛЬКО активной/приостановленной карточке; остальным — 0. */
  timeLeft: number;
  onStartTimer: (id: string) => void;
  /** ⏸ — пауза с сохранением остатка. */
  onPauseTimer: () => void;
  /** Долгий тап на ⏸ — сброс остатка (упражнение остаётся невыполненным). */
  onResetTimer: (id: string) => void;
  /** Тап по ✓ — поставить или снять отметку (WARMUP-3c). */
  onToggleCompleted: (id: string) => void;
  /** Открыть WarmupExerciseSheet — по id, чтобы перестановка ленты не сдвигала лист. */
  onOpen: (id: string) => void;
}

export const WarmupExerciseCard = memo(function WarmupExerciseCard({
  exercise,
  index,
  completed,
  isActive,
  isPaused,
  timeLeft,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleCompleted,
  onOpen,
}: WarmupExerciseCardProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  // Плавный прогресс-бар таймера (синхронизирован с тиком раз в секунду)
  useEffect(() => {
    if ((isActive || isPaused) && exercise.duration_seconds > 0) {
      progress.value = withTiming(timeLeft / exercise.duration_seconds, {
        duration: isActive ? 950 : 200,
        easing: Easing.linear,
      });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, isPaused, timeLeft, exercise.duration_seconds, progress]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const mediaGender = useMediaGender();
  const thumbnail = parseMediaUrls(exercise.media_url, mediaGender)[0];

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(300)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Открыть технику: ${exercise.name}`}
        onPress={() => onOpen(exercise.id)}
        // WEB-3a: в теле карточки — чекбокс «выполнено» и кнопки таймера,
        // на вебе обёртка не должна становиться <button>.
        wrapActions
        style={{
          backgroundColor: isActive
            ? withAlpha(colors.warning, 0.071)
            : isPaused
              ? withAlpha(colors.warning, 0.04)
              : colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: isActive
            ? colors.warning
            : isPaused
              ? withAlpha(colors.warning, 0.55)
              : completed
                ? withAlpha(colors.success, 0.376)
                : colors.border,
          marginBottom: SPACING.sm,
          opacity: completed && !isActive ? 0.7 : 1,
          padding: SPACING.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Номер/галочка: тап = быстро отметить выполненным */}
          <PressableScale
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: completed }}
            accessibilityLabel={
              completed
                ? `Снять отметку: ${exercise.name}`
                : `Отметить выполненным: ${exercise.name}`
            }
            onPress={() => onToggleCompleted(exercise.id)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: completed ? colors.success : withAlpha(colors.warning, 0.125),
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.sm,
            }}
          >
            {completed ? (
              <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)}>
                <Check size={18} color={colors.textInverse} strokeWidth={3} />
              </Animated.View>
            ) : (
              <Text style={[typography.labelBold, { color: colors.warning }]}>{index + 1}</Text>
            )}
          </PressableScale>

          {/* Миниатюра техники — картинка видна сразу, без аккордеонов */}
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={{
                width: 48,
                height: 48,
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: colors.surfaceSecondary,
                marginRight: SPACING.sm,
              }}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.labelBold,
                {
                  color: colors.textPrimary,
                  textDecorationLine: completed ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={2}
            >
              {exercise.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                {exercise.duration_seconds} сек
              </Text>
              <WarmupTypeChip canBeActivation={exercise.can_be_activation} />
            </View>
          </View>

          {isActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text
                style={[typography.h5, { color: colors.warning, fontVariant: ['tabular-nums'] }]}
              >
                {formatTime(timeLeft)}
              </Text>
              <PressableScale
                onPress={onPauseTimer}
                onLongPress={() => onResetTimer(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel="Пауза; долгое нажатие — сбросить остаток"
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Pause size={18} color={colors.textPrimary} />
              </PressableScale>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 2 }}>
              {isPaused && (
                <Text style={[typography.captionSmall, { color: colors.warning }]}>
                  {formatTime(timeLeft)}
                </Text>
              )}
              <PressableScale
                onPress={() => onStartTimer(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  isPaused
                    ? `Продолжить таймер: ${exercise.name}`
                    : `Запустить таймер: ${exercise.name}`
                }
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: completed ? colors.successLight : colors.warning,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {completed ? (
                  <Check size={18} color={colors.success} />
                ) : (
                  <Play
                    size={17}
                    color={colors.textInverse}
                    fill={colors.textInverse}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </PressableScale>
            </View>
          )}
        </View>

        {/* Прогресс-бар таймера (и на паузе — остаток виден) */}
        {(isActive || isPaused) && (
          <View
            style={{
              height: 4,
              backgroundColor: withAlpha(colors.warning, 0.145),
              marginTop: SPACING.md,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                { height: '100%', backgroundColor: colors.warning, borderRadius: 2 },
                progressStyle,
              ]}
            />
          </View>
        )}

        {/* Подсказка: карточка открывает лист с техникой и аналогами */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-end',
            gap: 2,
            marginTop: SPACING.xs,
          }}
        >
          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
            Техника и варианты
          </Text>
          <ChevronRight size={12} color={colors.textTertiary} />
        </View>
      </PressableScale>
    </Animated.View>
  );
});
