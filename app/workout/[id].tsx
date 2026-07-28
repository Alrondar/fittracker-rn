import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle,
  TrendingUp,
  Minus,
  TrendingDown,
  Dumbbell,
} from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkoutSession } from '../../src/hooks/useWorkoutSession';
import { useWarmup } from '../../src/hooks/useWarmup';
import { useInjuryWarnings } from '../../src/hooks/useInjuryWarnings';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createWorkoutStyles } from '../../src/styles/components/workout';
import { typography } from '../../src/styles/typography';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { WarmupBlock } from '../../src/components/workout/WarmupBlock';
import { WorkoutTimer } from '../../src/components/workout/WorkoutTimer';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import type { ExerciseData } from '../../src/types/workout';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();

  // Фабрики стилей — только через useMemo на уровне экрана
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const workoutStyles = useMemo(() => createWorkoutStyles(colors), [colors]);

  const {
    workoutName,
    exercises,
    loading,
    saving,
    isWorkoutActive,
    initialTime,
    restTimer,
    restTimeLeft,
    isRestFinished,
    adjustRestTimer,
    replacements,
    handleTimerTick,
    handleTimerStart,
    handleTimerStop,
    loadAlternatives,
    updateSet,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    resetToOriginal,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  } = useWorkoutSession(id as string, userId);

  // Предупреждения о травмах (avoid/caution) для упражнений
  const { activeInjuries, exerciseWarnings } = useInjuryWarnings(userId, exercises);

  // Авторазминка: источник — целевые мышцы тренировки, с учётом активных травм
  const warmupSource = useMemo(
    () =>
      exercises.map((e) => ({
        id: e.id,
        primary_muscles: e.primary_muscles,
        secondary_muscles: e.secondary_muscles,
        equipment: e.equipment,
      })),
    [exercises]
  );
  const {
    warmupExercises,
    excludedByInjury,
    isLoading: warmupLoading,
    activeTimerId: warmupTimerId,
    timeLeft: warmupTimeLeft,
    isAllCompleted: warmupAllDone,
    totalDuration: warmupTotalDuration,
    generateWarmup,
    startExerciseTimer,
    stopTimer: stopWarmupTimer,
    markAsCompleted,
    isCompleted: isWarmupCompleted,
  } = useWarmup(warmupSource, activeInjuries);

  const [showWarmup, setShowWarmup] = useState(true);

  const getIntensityInfo = useCallback(
    (intensity: string) => {
      switch (intensity) {
        case 'high':
          return {
            label: 'Высокая',
            color: colors.error,
            bgColor: colors.error + '20',
            icon: <TrendingUp size={12} color={colors.error} strokeWidth={2} />,
          };
        case 'medium':
          return {
            label: 'Средняя',
            color: colors.warning,
            bgColor: colors.warning + '20',
            icon: <Minus size={12} color={colors.warning} strokeWidth={2} />,
          };
        case 'low':
          return {
            label: 'Низкая',
            color: colors.success,
            bgColor: colors.success + '20',
            icon: <TrendingDown size={12} color={colors.success} strokeWidth={2} />,
          };
        default:
          return {
            label: intensity,
            color: colors.textSecondary,
            bgColor: colors.surfaceSecondary,
            icon: <Minus size={12} color={colors.textSecondary} strokeWidth={2} />,
          };
      }
    },
    [colors]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ExerciseData; index: number }) => (
      <ExerciseSlider
        exercise={item}
        exerciseIndex={index}
        isReplaced={!!replacements[item.workout_exercise_id]}
        loadAlternatives={loadAlternatives}
        updateSet={updateSet}
        isSetCompleted={isSetCompleted}
        replaceExercise={replaceExercise}
        resetToOriginal={resetToOriginal}
        startRestTimer={startRestTimer}
        getIntensityInfo={getIntensityInfo}
        updateExerciseSettings={updateExerciseSettings}
        colors={colors}
        cardStyles={cardStyles}
        warning={exerciseWarnings[item.id] || null}
      />
    ),
    [
      replacements,
      loadAlternatives,
      updateSet,
      isSetCompleted,
      replaceExercise,
      resetToOriginal,
      startRestTimer,
      getIntensityInfo,
      updateExerciseSettings,
      colors,
      cardStyles,
      exerciseWarnings,
    ]
  );

  const renderEmpty = () => (
    <FadeIn delay={150} style={commonStyles.emptyContainer}>
      <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Нет упражнений
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        В этой тренировке пока нет упражнений
      </Text>
    </FadeIn>
  );

  // Шапка списка: таймер тренировки + авторазминка (полной шириной)
  const listHeader = (
    <>
      <WorkoutTimer
        initialSeconds={initialTime}
        isActive={isWorkoutActive}
        onTick={handleTimerTick}
        onStart={handleTimerStart}
        onStop={handleTimerStop}
        colors={colors}
      />
      {showWarmup && (
        <WarmupBlock
          warmupExercises={warmupExercises}
          isLoading={warmupLoading}
          activeTimerId={warmupTimerId}
          timeLeft={warmupTimeLeft}
          isAllCompleted={warmupAllDone}
          totalDuration={warmupTotalDuration}
          excludedByInjury={excludedByInjury}
          isCompleted={isWarmupCompleted}
          onGenerateWarmup={generateWarmup}
          onStartTimer={startExerciseTimer}
          onStopTimer={stopWarmupTimer}
          onMarkCompleted={markAsCompleted}
          onSkip={() => setShowWarmup(false)}
        />
      )}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка: назад + название тренировки */}
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text
          style={[typography.h4, { color: colors.textPrimary, flex: 1 }]}
          numberOfLines={1}
        >
          {workoutName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Список упражнений (слайдеры). Отступы по горизонтали ExerciseSlider
          задаёт сам (CARD_WIDTH = SCREEN_WIDTH - 32, paddingLeft: 16). */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.workout_exercise_id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        windowSize={5}
        showsVerticalScrollIndicator={false}
      />

      {/* Таймер отдыха — поверх списка, над футером */}
      {restTimer !== null && (
        <View style={{ position: 'absolute', bottom: 88, left: 0, right: 0, zIndex: 10 }}>
          <RestTimer
            timeLeft={restTimeLeft}
            total={restTimer}
            isFinished={isRestFinished}
            onStop={stopRestTimer}
            onAdjust={adjustRestTimer}
            colors={colors}
            workoutStyles={workoutStyles}
          />
        </View>
      )}

      {/* Футер: завершение тренировки */}
      <View
        style={[
          commonStyles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.sm,
            backgroundColor: colors.success,
            paddingVertical: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <CheckCircle size={20} color={colors.textInverse} strokeWidth={2} />
          <Text style={[typography.labelBold, { color: colors.textInverse }]}>
            {saving ? 'Сохраняем...' : 'Завершить тренировку'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}