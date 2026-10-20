import React, { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { feedback } from '../../lib/feedback';
import { useWarmupTick } from '../../hooks/useWarmup';
import { PressableScale } from '../ui/PressableScale';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Flame, RefreshCw, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { WarmupExerciseCard } from './WarmupExerciseCard';
import { WarmupQueueRow } from './WarmupQueueRow';
import { WarmupExercise, InjuryExclusion } from '../../services/warmupService';

interface WarmupBlockProps {
  warmupExercises: WarmupExercise[];
  isLoading: boolean;
  activeTimerId: string | null;
  pausedId: string | null;
  /** WARMUP-3c: «текущее» показывается крупной карточкой, остальные — строками. */
  currentId: string | null;
  /** Суммарная длительность ленты — считается в useWarmup, здесь только показываем. */
  totalDuration: number;
  // FZ-6 (аудит 28.09): timeLeft больше не prop — тик читается из стора
  // (useWarmupTick), экран от него не перерендеривается.
  excludedByInjury: InjuryExclusion[];
  isCompleted: (id: string) => boolean;
  onGenerateWarmup: () => void;
  onStartTimer: (id: string) => void;
  onPauseTimer: () => void;
  onResetTimer: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onFocus: (id: string) => void;
  /** Открыть L2 лист разминки (рендерится в корне экрана, WARMUP-1). */
  onOpenDetails: (id: string) => void;
  /** WARMUP-2: долгий тап на ⟳ — забыть запомненные замены (caller сам перезапускает генерацию). */
  onResetPreferences?: () => void;
}

export function WarmupBlock({
  warmupExercises,
  isLoading,
  activeTimerId,
  pausedId,
  currentId,
  totalDuration,
  excludedByInjury,
  isCompleted,
  onGenerateWarmup,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleCompleted,
  onFocus,
  onOpenDetails,
  onResetPreferences,
}: WarmupBlockProps) {
  // FZ-6: подписка на тик внутри блока. memo-карточки (передаются стабильные
  // props, кроме активной) не ловят ре-рендер — дёргается только сам блок
  // (небольшое дерево) и активная карточка, а не весь workout-экран.
  const timeLeft = useWarmupTick();
  const { colors } = useTheme();
  const pulse = useSharedValue(0.35);

  // Пульсация скелетона при загрузке
  useEffect(() => {
    if (isLoading) {
      pulse.value = 0.35;
      pulse.value = withRepeat(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [isLoading, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach((ex) => ex.primary_muscles.forEach((m) => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  const mins = Math.max(1, Math.round(totalDuration / 60));

  // Скелетон загрузки
  if (isLoading) {
    return (
      <View style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.md }}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.lg,
              height: 132,
            },
            pulseStyle,
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: SPACING.sm,
          }}
        >
          <ActivityIndicator size="small" color={colors.warning} />
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary, marginLeft: SPACING.sm },
            ]}
          >
            Подбираем упражнения под твою тренировку...
          </Text>
        </View>
      </View>
    );
  }

  if (warmupExercises.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: withAlpha(colors.warning, 0.051),
        borderBottomWidth: 1,
        borderBottomColor: withAlpha(colors.warning, 0.188),
      }}
    >
      {/* Заголовок */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: withAlpha(colors.warning, 0.125),
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Flame size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>Разминка</Text>
            <View
              style={{
                backgroundColor: withAlpha(colors.warning, 0.125),
                paddingHorizontal: SPACING.sm,
                paddingVertical: 2,
                borderRadius: BORDER_RADIUS.sm,
              }}
            >
              <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
                ~{mins} мин
              </Text>
            </View>
          </View>
          {targetMuscles.length > 0 && (
            <Text
              style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              Под твою тренировку: {targetMuscles.join(' · ')}
            </Text>
          )}
          {excludedByInjury.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <AlertTriangle size={12} color={colors.warning} />
              <Text
                style={[typography.captionSmall, { color: colors.warning, fontWeight: '600' }]}
                numberOfLines={2}
              >
                Учтены травмы:{' '}
                {excludedByInjury.map((e) => `${e.bodyPartLabel} (−${e.count})`).join(' · ')}
              </Text>
            </View>
          )}
        </View>
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGenerateWarmup();
          }}
          onLongPress={
            onResetPreferences
              ? () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  feedback.alert(
                    'Запомненные замены',
                    'Забыть выбранные варианты замен? Следующие разминки снова будут подбираться с нуля.',
                    [
                      { text: 'Отмена', style: 'cancel' },
                      { text: 'Забыть', style: 'destructive', onPress: onResetPreferences },
                    ]
                  );
                }
              : undefined
          }
          style={{ padding: SPACING.sm }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Обновить разминку; долгое нажатие — сброс запомненных замен"
          haptic="none"
        >
          <RefreshCw size={18} color={colors.primary} />
        </PressableScale>
      </View>

      {/* Лента: текущее — крупной карточкой, остальные — строками очереди */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs }}>
        {warmupExercises.map((exercise, index) => {
          if (exercise.id !== currentId) {
            return (
              <WarmupQueueRow
                key={exercise.id}
                exercise={exercise}
                index={index}
                completed={isCompleted(exercise.id)}
                onStartTimer={onStartTimer}
                onToggleCompleted={onToggleCompleted}
                onFocus={onFocus}
              />
            );
          }
          return (
            <WarmupExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              completed={isCompleted(exercise.id)}
              isActive={activeTimerId === exercise.id}
              isPaused={pausedId === exercise.id}
              // timeLeft только текущей карточке → остальные не ловят тик и
              // не перерисовываются (React.memo bail out). Фикс лага разминки.
              timeLeft={timeLeft}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
              onToggleCompleted={onToggleCompleted}
              onOpen={onOpenDetails}
            />
          );
        })}
      </View>
    </View>
  );
}
