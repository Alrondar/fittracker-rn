// src/components/workout/WarmupExerciseCard.tsx
// L1 компактная карточка разминки: таймер + прогресс + миниатюра техники.
// Справочная информация (техника, риски, аналоги) вынесена в WarmupExerciseSheet —
// здесь карточка остаётся тонкой строкой, вся лента видна без прокрутки.
// Тап по карточке → открыть лист; тап по номеру → быстро отметить выполненным.
import React, { useEffect, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
import { parseMediaUrls } from './TechniqueMediaSlider';
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
  /** Передаётся ТОЛЬКО активной карточке; неактивным — 0, чтобы memo не сбивался тиком. */
  timeLeft: number;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkCompleted: (id: string) => void;
  /** Открыть WarmupExerciseSheet (техника, аналоги, действия). */
  onOpen: (index: number) => void;
}

export const WarmupExerciseCard = memo(function WarmupExerciseCard({
  exercise,
  index,
  completed,
  isActive,
  timeLeft,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
  onOpen,
}: WarmupExerciseCardProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  // Плавный прогресс-бар таймера (синхронизирован с тиком раз в секунду)
  useEffect(() => {
    if (isActive && exercise.duration_seconds > 0) {
      progress.value = withTiming(timeLeft / exercise.duration_seconds, {
        duration: 950,
        easing: Easing.linear,
      });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, timeLeft, exercise.duration_seconds, progress]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const thumbnail = parseMediaUrls(exercise.media_url)[0];

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(300)}>
      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Открыть технику: ${exercise.name}`}
        onPress={() => onOpen(index)}
        style={{
          backgroundColor: isActive ? withAlpha(colors.warning, 0.071) : colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: isActive
            ? colors.warning
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
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: completed }}
            accessibilityLabel={completed ? 'Выполнено' : `Отметить выполненным: ${exercise.name}`}
            onPress={() => {
              if (!completed) onMarkCompleted(exercise.id);
            }}
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
          </TouchableOpacity>

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
              <TouchableOpacity
                onPress={onStopTimer}
                accessibilityRole="button"
                accessibilityLabel="Остановить таймер"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Pause size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onStartTimer(exercise.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Запустить таймер: ${exercise.name}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: completed ? colors.successLight : colors.warning,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {completed ? (
                <Check size={18} color={colors.success} />
              ) : (
                <Play
                  size={16}
                  color={colors.textInverse}
                  fill={colors.textInverse}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Прогресс-бар таймера */}
        {isActive && (
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
      </TouchableOpacity>
    </Animated.View>
  );
});
