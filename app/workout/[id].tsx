import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  Minus,
  TrendingDown,
  X,
  Play,
  Square,
  ShieldAlert,
  Flame,
  ChevronDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkoutSession } from '../../src/hooks/useWorkoutSession';
import { useInjuryWarnings } from '../../src/hooks/useInjuryWarnings';
import { useWarmup } from '../../src/hooks/useWarmup';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { WorkoutTimer } from '../../src/components/workout/WorkoutTimer';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { WarmupBlock } from '../../src/components/workout/WarmupBlock';
import { createCardStyles } from '../../src/styles/components/card';
import { createWorkoutStyles } from '../../src/styles/components/workout';

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors, gradients } = useTheme();

  // Хук сессии тренировки
  const {
    exercises,
    loading,
    saving,
    isWorkoutActive,
    setIsWorkoutActive,
    initialTime,
    restTimer,
    restTimeLeft,
    setRestTimeLeft,
    alternativesCache,
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

  // Хук предупреждений о травмах
  const { activeInjuries, exerciseWarnings } = useInjuryWarnings(userId, exercises);

  // Хук разминки (передаём объекты упражнений — сервис подбирает по целевым мышцам)
  const {
    warmupExercises,
    isLoading: isWarmupLoading,
    activeTimerId,
    timeLeft,
    isAllCompleted: isWarmupCompleted,
    totalDuration: warmupTotalDuration,
    generateWarmup,
    startExerciseTimer,
    stopTimer: stopWarmupTimer,
    markAsCompleted: markWarmupCompleted,
    isCompleted: isWarmupExerciseCompleted,
  } = useWarmup(exercises);

  const [showInjuryBanner, setShowInjuryBanner] = useState(false);
  const [showWarmup, setShowWarmup] = useState(true);

  // Подсчёт предупреждений
  const avoidCount = Object.values(exerciseWarnings).filter(w => w.level === 'avoid').length;
  const cautionCount = Object.values(exerciseWarnings).filter(w => w.level === 'caution').length;
  const hasWarnings = avoidCount > 0 || cautionCount > 0;

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return {
          label: 'Высокая',
          color: colors.error,
          bgColor: colors.error + '20',
          icon: <TrendingUp size={14} color={colors.error} strokeWidth={2} />,
        };
      case 'medium':
        return {
          label: 'Средняя',
          color: colors.warning,
          bgColor: colors.warning + '20',
          icon: <Minus size={14} color={colors.warning} strokeWidth={2} />,
        };
      case 'low':
        return {
          label: 'Низкая',
          color: colors.success,
          bgColor: colors.success + '20',
          icon: <TrendingDown size={14} color={colors.success} strokeWidth={2} />,
        };
      default:
        return {
          label: intensity,
          color: colors.textSecondary,
          bgColor: colors.textSecondary + '20',
          icon: <Minus size={14} color={colors.textSecondary} strokeWidth={2} />,
        };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Таймер отдыха */}
      {restTimer !== null && (
        <RestTimer
          timeLeft={restTimeLeft}
          total={restTimer}
          onStop={stopRestTimer}
          onAdjust={(delta) => setRestTimeLeft((prev: number) => Math.max(0, prev + delta))}
          colors={colors}
          workoutStyles={createWorkoutStyles(colors)}
        />
      )}

      {/* Таймер тренировки */}
      {isWorkoutActive && (
        <WorkoutTimer
          initialSeconds={initialTime}
          isActive={true}
          onTick={handleTimerTick}
          onStart={handleTimerStart}
          onStop={handleTimerStop}
          colors={colors}
        />
      )}

      {/* Компактная кнопка предупреждений о травмах */}
      {hasWarnings && !showInjuryBanner && (
        <TouchableOpacity
          onPress={() => {
            setShowInjuryBanner(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: avoidCount > 0 ? colors.error : colors.warning,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: 20,
            margin: SPACING.md,
            alignSelf: 'flex-end',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <ShieldAlert size={18} color={colors.textInverse} strokeWidth={2} />
          <Text style={{ color: colors.textInverse, fontWeight: '700', marginLeft: SPACING.xs, fontSize: 13 }}>
            {avoidCount > 0 ? `${avoidCount}⛔` : ''}{avoidCount > 0 && cautionCount > 0 ? ' ' : ''}{cautionCount > 0 ? `${cautionCount}⚠️` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Раскрывающийся баннер с деталями травм */}
      {showInjuryBanner && (
        <View style={{
          backgroundColor: avoidCount > 0 ? colors.error + '15' : colors.warning + '15',
          borderColor: avoidCount > 0 ? colors.error : colors.warning,
          borderWidth: 1,
          margin: SPACING.md,
          borderRadius: BORDER_RADIUS.md,
          padding: SPACING.md,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <ShieldAlert size={20} color={avoidCount > 0 ? colors.error : colors.warning} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, flex: 1 }]}>
                Внимание: активные травмы
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInjuryBanner(false)}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {activeInjuries.map((injury, index) => {
            const bodyPartLabel = injury.body_part;
            const injuryTypeLabel = injury.injury_type;
            const severityLabel = injury.severity === 'high' ? 'высокая' : injury.severity === 'medium' ? 'средняя' : 'низкая';
            return (
              <Text key={index} style={[typography.caption, { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.xs }]}>
                • {bodyPartLabel} ({injuryTypeLabel}) — {severityLabel} тяжесть
              </Text>
            );
          })}
          {avoidCount > 0 && (
            <Text style={[typography.captionSmall, { color: colors.error, marginTop: SPACING.sm, fontWeight: '600' }]}>
              🚫 {avoidCount} упражнений противопоказаны
            </Text>
          )}
          {cautionCount > 0 && (
            <Text style={[typography.captionSmall, { color: colors.warning, marginTop: SPACING.xs, fontWeight: '600' }]}>
              ⚠️ {cautionCount} упражнений требуют осторожности
            </Text>
          )}
        </View>
      )}

      {/* Список упражнений (виртуализированный) */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.workout_exercise_id}
        ListHeaderComponent={
          <>
            {/* Блок разминки — внутри списка, скроллится вместе с контентом */}
            {showWarmup && !isWorkoutActive && (warmupExercises.length > 0 || isWarmupLoading) && (
              <WarmupBlock
                warmupExercises={warmupExercises}
                isLoading={isWarmupLoading}
                activeTimerId={activeTimerId}
                timeLeft={timeLeft}
                isAllCompleted={isWarmupCompleted}
                totalDuration={warmupTotalDuration}
                isCompleted={isWarmupExerciseCompleted}
                onGenerateWarmup={generateWarmup}
                onStartTimer={startExerciseTimer}
                onStopTimer={stopWarmupTimer}
                onMarkCompleted={markWarmupCompleted}
                onSkip={() => setShowWarmup(false)}
              />
            )}

            {/* Пилюля повторного открытия разминки */}
            {!showWarmup && !isWorkoutActive && warmupExercises.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowWarmup(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: SPACING.sm,
                  marginHorizontal: SPACING.lg,
                  marginTop: SPACING.md,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: SPACING.sm,
                  backgroundColor: colors.warning + '12',
                  borderRadius: BORDER_RADIUS.full,
                  borderWidth: 1,
                  borderColor: colors.warning + '40',
                }}
              >
                <Flame size={14} color={colors.warning} />
                <Text style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {isWarmupCompleted ? 'Разминка завершена · Показать снова' : 'Показать разминку'}
                </Text>
                <ChevronDown size={14} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}
          </>
        }
        renderItem={({ item: exercise, index: exIndex }) => (
          <ExerciseSlider
            exercise={exercise}
            exerciseIndex={exIndex}
            isReplaced={!!replacements[exercise.workout_exercise_id]}
            alternativesCache={alternativesCache}
            loadAlternatives={loadAlternatives}
            updateSet={updateSet}
            isSetCompleted={isSetCompleted}
            replaceExercise={replaceExercise}
            resetToOriginal={resetToOriginal}
            startRestTimer={startRestTimer}
            getIntensityInfo={getIntensityInfo}
            updateExerciseSettings={updateExerciseSettings}
            colors={colors}
            cardStyles={createCardStyles(colors)}
            warning={exerciseWarnings[exercise.id] || null}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Кнопки управления тренировкой */}
      <View style={{
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        padding: SPACING.lg,
      }}>
        {!isWorkoutActive ? (
          <TouchableOpacity
            onPress={() => {
              setIsWorkoutActive(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: SPACING.md,
                paddingHorizontal: SPACING.xl,
                borderRadius: BORDER_RADIUS.lg,
              }}
            >
              <Play size={20} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.button, { color: colors.textInverse }]}>Начать тренировку</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={saveWorkout}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ paddingVertical: SPACING.lg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : (
              <LinearGradient
                colors={gradients.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: SPACING.md,
                  paddingHorizontal: SPACING.xl,
                  borderRadius: BORDER_RADIUS.lg,
                }}
              >
                <Square size={20} color={colors.textInverse} strokeWidth={2} fill={colors.textInverse} style={{ marginRight: SPACING.sm }} />
                <Text style={[typography.button, { color: colors.textInverse }]}>Завершить</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}