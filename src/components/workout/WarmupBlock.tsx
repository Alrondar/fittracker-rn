import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import {
  Flame,
  RefreshCw,
  SkipForward,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { WarmupExerciseCard } from './WarmupExerciseCard';
import { WarmupExercise, InjuryExclusion } from '../../services/warmupService';

// PERF-5: модульные константы SCREEN_WIDTH / ALT_CARD_WIDTH УДАЛЕНЫ.
// Ширина окна читается реактивно через useWindowDimensions() внутри
// WarmupExerciseCard и прокидывается в WarmupAlternativeCard пропом cardWidth.

interface WarmupBlockProps {
  warmupExercises: WarmupExercise[];
  isLoading: boolean;
  activeTimerId: string | null;
  timeLeft: number;
  isAllCompleted: boolean;
  totalDuration: number;
  excludedByInjury: InjuryExclusion[];
  isCompleted: (id: string) => boolean;
  onGenerateWarmup: () => void;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkCompleted: (id: string) => void;
  onSkip: () => void;
  loadWarmupAlternatives: (id: string, muscles: string[]) => Promise<WarmupExercise[]>;
  onReplaceWarmup: (index: number, alt: WarmupExercise) => void;
}

export function WarmupBlock({
  warmupExercises,
  isLoading,
  activeTimerId,
  timeLeft,
  isAllCompleted,
  totalDuration,
  excludedByInjury,
  isCompleted,
  onGenerateWarmup,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
  onSkip,
  loadWarmupAlternatives,
  onReplaceWarmup,
}: WarmupBlockProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.35);
  const footerProgress = useSharedValue(0);

  // Пульсация скелетона при загрузке
  useEffect(() => {
    if (isLoading) {
      pulse.value = 0.35;
      pulse.value = withRepeat(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isLoading, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const completedCount = warmupExercises.filter((ex) => isCompleted(ex.id)).length;

  // Анимация прогресса в футере
  useEffect(() => {
    footerProgress.value = withTiming(completedCount / Math.max(warmupExercises.length, 1), {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [completedCount, warmupExercises.length, footerProgress]);

  const footerProgressStyle = useAnimatedStyle(() => ({
    width: `${footerProgress.value * 100}%`,
  }));

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
            { backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.lg, height: 132 },
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
        backgroundColor: colors.warning + '0D',
        borderBottomWidth: 1,
        borderBottomColor: colors.warning + '30',
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
            backgroundColor: colors.warning + '20',
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
                backgroundColor: colors.warning + '20',
                paddingHorizontal: SPACING.sm,
                paddingVertical: 2,
                borderRadius: BORDER_RADIUS.sm,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.warning, fontWeight: '700' },
                ]}
              >
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
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGenerateWarmup();
          }}
          style={{ padding: SPACING.sm }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Список упражнений */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs }}>
        {warmupExercises.map((exercise, index) => {
          const active = activeTimerId === exercise.id;
          return (
            <WarmupExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              completed={isCompleted(exercise.id)}
              isActive={active}
              // timeLeft только активной карточке → неактивные не ловят тик и
              // не перерисовываются (React.memo bail out). Фикс лага разминки.
              timeLeft={active ? timeLeft : 0}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
              onMarkCompleted={onMarkCompleted}
              loadAlternatives={loadWarmupAlternatives}
              onReplace={onReplaceWarmup}
            />
          );
        })}
      </View>

      {/* Футер: пропуск + прогресс выполнения */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xs,
          paddingBottom: SPACING.lg,
        }}
      >
        <AppButton
          title="Пропустить"
          variant="secondary"
          size="medium"
          icon={<SkipForward size={16} color={colors.primary} />}
          onPress={onSkip}
          style={{ flex: 1 }}
        />
        <View style={{ flex: 1.3 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
          >
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              Выполнено
            </Text>
            <Text
              style={[
                typography.captionSmall,
                {
                  color: isAllCompleted ? colors.success : colors.textPrimary,
                  fontWeight: '700',
                },
              ]}
            >
              {isAllCompleted ? 'Готово ✓' : `${completedCount}/${warmupExercises.length}`}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: isAllCompleted ? colors.success : colors.warning,
                  borderRadius: 3,
                },
                footerProgressStyle,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}