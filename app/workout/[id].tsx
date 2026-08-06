import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  TrendingUp,
  Minus,
  TrendingDown,
  Dumbbell,
  ShieldAlert,
  X,
  Play,
  Square,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BODY_PART_LABELS, INJURY_TYPE_LABELS } from '../../src/constants/injuries';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkoutSession } from '../../src/hooks/useWorkoutSession';
import { useInjuryWarnings } from '../../src/hooks/useInjuryWarnings';
import { useWarmup } from '../../src/hooks/useWarmup';
import { useUnitPreferences } from '../../src/hooks/useUnitPreferences';
import { getWorkoutProgramInfo } from '../../src/services/programsService';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { SetData } from '../../src/types/workout';
import { RestTimer } from '../../src/components/workout/RestTimer';
import {
  WorkoutTimerProvider,
  WorkoutTimerPill,
  WorkoutTimerPanel,
} from '../../src/components/workout/WorkoutTimer';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { WarmupBlock } from '../../src/components/workout/WarmupBlock';
import { WorkoutTabs, WorkoutTabKey } from '../../src/components/workout/WorkoutTabs';
import { UnitToggle } from '../../src/components/workout/UnitToggle';
import {
  ExerciseSettingsModal,
  ExerciseSettingsTarget,
} from '../../src/components/workout/ExerciseSettingsModal';
import { createCardStyles } from '../../src/styles/components/card';
import { createWorkoutStyles } from '../../src/styles/components/workout';

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { unit, setUnit } = useUnitPreferences();

  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const workoutStyles = useMemo(() => createWorkoutStyles(colors), [colors]);

  const {
    workoutName,
    exercises,
    loading,
    saving,
    isWorkoutActive,
    setIsWorkoutActive,
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
    updateSetFeedback,
    applyProgression,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    resetToOriginal,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  } = useWorkoutSession(id as string, userId);

  const { data: workoutProgramInfo } = useQuery({
    queryKey: ['workoutProgramInfo', id],
    queryFn: () => getWorkoutProgramInfo(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });

  const { activeInjuries, exerciseWarnings } = useInjuryWarnings(userId, exercises);

  const warmupSource = useMemo(
    () =>
      exercises.map((e) => ({
        id: e.id,
        primary_muscles: e.primary_muscles,
        secondary_muscles: e.secondary_muscles,
        equipment: e.equipment,
      })),
    [exercises],
  );

  const {
    warmupExercises,
    excludedByInjury,
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
    loadWarmupAlternatives,
    replaceWarmupExercise,
  } = useWarmup(warmupSource, activeInjuries);

  const [showInjuryBanner, setShowInjuryBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkoutTabKey>('warmup');
  const [settingsTarget, setSettingsTarget] = useState<ExerciseSettingsTarget | null>(null);

  const exercisesRef = useRef(exercises);
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    if (!isWarmupLoading && warmupExercises.length === 0 && activeTab === 'warmup') {
      setActiveTab('workout');
    }
  }, [isWarmupLoading, warmupExercises.length, activeTab]);

  useEffect(() => {
    if (isWarmupCompleted && warmupExercises.length > 0) {
      setActiveTab('workout');
    }
  }, [isWarmupCompleted, warmupExercises.length]);

  const { avoidCount, cautionCount, hasWarnings } = useMemo(() => {
    const values = Object.values(exerciseWarnings);
    const avoid = values.filter((w) => w.level === 'avoid').length;
    const caution = values.filter((w) => w.level === 'caution').length;
    return { avoidCount: avoid, cautionCount: caution, hasWarnings: avoid > 0 || caution > 0 };
  }, [exerciseWarnings]);

  const openExerciseSettings = useCallback(
    (exerciseIndex: number, setsCount: number, restSeconds: number) => {
      const currentSets: SetData[] = exercisesRef.current[exerciseIndex]?.sets ?? [];
      setSettingsTarget({ exerciseIndex, setsCount, restSeconds, currentSets });
    },
    [],
  );

  const closeExerciseSettings = useCallback(() => setSettingsTarget(null), []);

  const saveExerciseSettings = useCallback(
    (exerciseIndex: number, setsCount: number, restSeconds: number) => {
      updateExerciseSettings(exerciseIndex, setsCount, restSeconds);
      setSettingsTarget(null);
    },
    [updateExerciseSettings],
  );

  const getIntensityInfo = useCallback(
    (intensity: string) => {
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
    },
    [colors],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <ExerciseSlider
        exercise={item}
        exerciseIndex={index}
        isReplaced={!!replacements[item.workout_exercise_id]}
        loadAlternatives={loadAlternatives}
        updateSet={updateSet}
        updateSetFeedback={updateSetFeedback}
        applyProgression={applyProgression}
        isSetCompleted={isSetCompleted}
        replaceExercise={replaceExercise}
        resetToOriginal={resetToOriginal}
        startRestTimer={startRestTimer}
        getIntensityInfo={getIntensityInfo}
        onOpenSettings={openExerciseSettings}
        colors={colors}
        cardStyles={cardStyles}
        unit={unit}
        warning={exerciseWarnings[item.id] || null}
      />
    ),
    [
      replacements,
      loadAlternatives,
      updateSet,
      updateSetFeedback,
      applyProgression,
      isSetCompleted,
      replaceExercise,
      resetToOriginal,
      startRestTimer,
      getIntensityInfo,
      openExerciseSettings,
      colors,
      cardStyles,
      unit,
      exerciseWarnings,
    ],
  );

  const renderEmpty = () => (
    <View style={commonStyles.emptyContainer}>
      <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Нет упражнений
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        В этой тренировке пока нет упражнений
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasWarmup = warmupExercises.length > 0 || isWarmupLoading;

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <WorkoutTimerProvider
        initialSeconds={initialTime}
        isActive={isWorkoutActive}
        onTick={handleTimerTick}
        onStart={handleTimerStart}
        onStop={handleTimerStop}
      >
        <View
          style={[
            commonStyles.navHeader,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={commonStyles.backButton}
          >
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {workoutProgramInfo?.programName ? (
              <>
                <Text
                  style={[typography.captionSmall, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {workoutProgramInfo.programName}
                  {workoutProgramInfo.phaseName ? ` · ${workoutProgramInfo.phaseName}` : ''}
                </Text>
                <Text
                  style={[typography.h5, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {workoutName}
                </Text>
              </>
            ) : (
              <Text
                style={[typography.h4, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {workoutName}
              </Text>
            )}
          </View>
          <WorkoutTimerPill colors={colors} />
        </View>
        <WorkoutTimerPanel colors={colors} />
      </WorkoutTimerProvider>

      {hasWarmup && (
        <WorkoutTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          warmupCount={warmupExercises.length}
          warmupCompleted={isWarmupCompleted}
        />
      )}

      {hasWarnings && !showInjuryBanner && activeTab === 'workout' && (
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
            marginHorizontal: SPACING.md,
            marginTop: SPACING.sm,
            alignSelf: 'flex-end',
            elevation: 4,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <ShieldAlert size={18} color={colors.textInverse} strokeWidth={2} />
          <Text
            style={{
              color: colors.textInverse,
              fontWeight: '700',
              marginLeft: SPACING.xs,
              fontSize: 13,
            }}
          >
            {avoidCount > 0 ? `${avoidCount}` : ''}
            {avoidCount > 0 && cautionCount > 0 ? ' ' : ''}
            {cautionCount > 0 ? `${cautionCount}⚠️` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {showInjuryBanner && (
        <View
          style={{
            backgroundColor: avoidCount > 0 ? colors.error + '15' : colors.warning + '15',
            borderColor: avoidCount > 0 ? colors.error : colors.warning,
            borderWidth: 1,
            margin: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: SPACING.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <ShieldAlert
                size={20}
                color={avoidCount > 0 ? colors.error : colors.warning}
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary, flex: 1 }]}>
                Внимание: активные травмы
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInjuryBanner(false)}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {activeInjuries.map((injury, index) => {
            const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
            const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;
            const severityLabel =
              injury.severity === 'high' ? 'высокая' : injury.severity === 'medium' ? 'средняя' : 'низкая';
            return (
              <Text
                key={index}
                style={[
                  typography.caption,
                  { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.xs },
                ]}
              >
                • {bodyPartLabel} ({injuryTypeLabel}) — {severityLabel} тяжесть
              </Text>
            );
          })}
          {avoidCount > 0 && (
            <Text
              style={[
                typography.captionSmall,
                { color: colors.error, marginTop: SPACING.sm, fontWeight: '600' },
              ]}
            >
              🚫 {avoidCount} упражнений противопоказаны
            </Text>
          )}
          {cautionCount > 0 && (
            <Text
              style={[
                typography.captionSmall,
                { color: colors.warning, marginTop: SPACING.xs, fontWeight: '600' },
              ]}
            >
              ⚠️ {cautionCount} упражнений требуют осторожности
            </Text>
          )}
        </View>
      )}

      {hasWarmup && activeTab === 'warmup' && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <WarmupBlock
            warmupExercises={warmupExercises}
            isLoading={isWarmupLoading}
            excludedByInjury={excludedByInjury}
            activeTimerId={activeTimerId}
            timeLeft={timeLeft}
            isAllCompleted={isWarmupCompleted}
            totalDuration={warmupTotalDuration}
            isCompleted={isWarmupExerciseCompleted}
            onGenerateWarmup={generateWarmup}
            onStartTimer={startExerciseTimer}
            onStopTimer={stopWarmupTimer}
            onMarkCompleted={markWarmupCompleted}
            onSkip={() => setActiveTab('workout')}
            loadWarmupAlternatives={loadWarmupAlternatives}
            onReplaceWarmup={replaceWarmupExercise}
          />
        </ScrollView>
      )}

      {(!hasWarmup || activeTab === 'workout') && (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.xs,
              gap: SPACING.sm,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, fontWeight: '600' },
              ]}
            >
              Единицы веса
            </Text>
            <UnitToggle unit={unit} onChange={setUnit} />
          </View>
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.workout_exercise_id}
            renderItem={renderItem}
            extraData={unit}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            windowSize={5}
            removeClippedSubviews={false}
          />
        </>
      )}

      {restTimer !== null && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              top: undefined, // только снизу
              bottom: 0,
              zIndex: 1000,
              pointerEvents: 'auto',
            },
          ]}
        >
          <RestTimer
            timeLeft={restTimeLeft}
            total={restTimer}
            isFinished={isRestFinished}
            onStop={stopRestTimer}
            onAdjust={adjustRestTimer}
            colors={colors}
            workoutStyles={workoutStyles}
          />
        </Animated.View>
      )}

      <ExerciseSettingsModal
        target={settingsTarget}
        onClose={closeExerciseSettings}
        onSave={saveExerciseSettings}
        colors={colors}
        cardStyles={cardStyles}
      />

      <View
        style={{
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          padding: SPACING.lg,
          paddingBottom: insets.bottom + SPACING.lg,
        }}
      >
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
              <Play
                size={20}
                color={colors.textInverse}
                strokeWidth={2}
                fill={colors.textInverse}
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={[typography.button, { color: colors.textInverse }]}>
                Начать тренировку
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={saveWorkout} disabled={saving} activeOpacity={0.8}>
            {saving ? (
              <View
                style={{
                  paddingVertical: SPACING.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
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
                <Square
                  size={20}
                  color={colors.textInverse}
                  strokeWidth={2}
                  fill={colors.textInverse}
                  style={{ marginRight: SPACING.sm }}
                />
                <Text style={[typography.button, { color: colors.textInverse }]}>Завершить</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}