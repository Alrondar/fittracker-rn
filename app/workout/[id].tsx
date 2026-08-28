// app/(tabs)/workout/[id].tsx
// Сессия тренировки + шапка программы (FIT-6).
// 05.08.2026 (PERF): FlatList — removeClippedSubviews + батчинг рендера.
// PR8: split на WorkoutScreenHeader / WorkoutInjuryBanner / WorkoutScreenFooter + utils/intensityInfo.
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  InteractionManager,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { perfMark, perfSince, useFreezeDetector } from '../../src/utils/perf';
import { getIntensityInfo as getIntensityInfoUtil } from '../../src/utils/intensityInfo';
import { useWorkoutSession } from '../../src/hooks/useWorkoutSession';
import { useInjuryWarnings } from '../../src/hooks/useInjuryWarnings';
import { useWarmup } from '../../src/hooks/useWarmup';
import { useUnitPreferences } from '../../src/hooks/useUnitPreferences';
import { getWorkoutProgramInfo } from '../../src/services/programsService';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { SetData, ExercisePainState } from '../../src/types/workout';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { WorkoutTimerProvider } from '../../src/components/workout/WorkoutTimer';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { WarmupBlock } from '../../src/components/workout/WarmupBlock';
import { WorkoutTabs, WorkoutTabKey } from '../../src/components/workout/WorkoutTabs';
import {
  ExerciseSettingsModal,
  ExerciseSettingsTarget,
} from '../../src/components/workout/ExerciseSettingsModal';
import { PainSheet } from '../../src/components/workout/PainSheet';
import { WorkoutScreenHeader } from '../../src/components/workout/WorkoutScreenHeader';
import { WorkoutInjuryBanner } from '../../src/components/workout/WorkoutInjuryBanner';
import { WorkoutScreenFooter } from '../../src/components/workout/WorkoutScreenFooter';
import { createCardStyles } from '../../src/styles/components/card';
import { createWorkoutStyles } from '../../src/styles/components/workout';
import { useWorkoutDisplayMode } from '../../src/hooks/useWorkoutDisplayMode';
import { useTodayReadiness } from '../../src/hooks/useTodayReadiness';

export default function WorkoutSessionScreen() {
  useFreezeDetector(); // логирует блокировки JS > 100 мс
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const { unit, setUnit } = useUnitPreferences();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const workoutStyles = useMemo(() => createWorkoutStyles(colors), [colors]);
  const { mode: displayMode } = useWorkoutDisplayMode();

  // ===== TTI: фиксируем момент первого рендера экрана (однократно) =====
  const ttiMountedRef = useRef(false);
  if (!ttiMountedRef.current) {
    ttiMountedRef.current = true;
    perfMark('tti:mount');
  }

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
  programId,
  replaceExercise,
  replaceExerciseInProgram,
  resetToOriginal,
  savePainState,
  clearPainState,
  startRestTimer,
  stopRestTimer,
  addSet,
  saveWorkout,
} = useWorkoutSession(id as string, userId);

  const { data: workoutProgramInfo } = useQuery({
    queryKey: ['workoutProgramInfo', id],
    queryFn: () => getWorkoutProgramInfo(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });

  const { activeInjuries, exerciseWarnings } = useInjuryWarnings(userId, exercises);

  // ENG-3: today readiness (1-5) — optional signal для recommendation engine.
  // null (check-in не сделан) не блокирует и не меняет recommendation (PRODUCT.md §7).
  const { data: todayReadiness } = useTodayReadiness(userId);
  const readinessContext = useMemo(
    () => ({ readiness: todayReadiness ?? null }),
    [todayReadiness],
  );

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

  const [activeTab, setActiveTab] = useState<WorkoutTabKey>('warmup');
  const [settingsTarget, setSettingsTarget] = useState<ExerciseSettingsTarget | null>(null);

  // FEAT-1.9: шторка боли
  const [painIndex, setPainIndex] = useState<number | null>(null);
  const openPain = useCallback((exerciseIndex: number) => setPainIndex(exerciseIndex), []);
  const closePain = useCallback(() => setPainIndex(null), []);

  // PR6: обёртки для PainSheet — привязывают save/clear к текущему painIndex
  const savePainForCurrent = useCallback(
    async (painState: ExercisePainState) => {
      if (painIndex === null) return;
      await savePainState(painIndex, painState);
    },
    [painIndex, savePainState],
  );

  const clearPainForCurrent = useCallback(async () => {
    if (painIndex === null) return;
    await clearPainState(painIndex);
  }, [painIndex, clearPainState]);

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

  // ===== TTI: когда данные пришли → замеряем и ждём "interactive" =====
  const ttiMeasuredRef = useRef(false);
  useEffect(() => {
    if (loading || ttiMeasuredRef.current) return;
    ttiMeasuredRef.current = true;
    perfMark('tti:data-loaded');
    perfSince('tti:mount', 'TTI: mount → данные');
    const handle = InteractionManager.runAfterInteractions(() => {
      perfMark('tti:interactive');
      perfSince('tti:mount', 'TTI: mount → interactive (полный)');
    });
    return () => handle.cancel();
  }, [loading]);

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

  // PR8: чистая функция из utils/intensityInfo
  const getIntensityInfo = useCallback(
    (intensity: string) => getIntensityInfoUtil(intensity, colors),
    [colors],
  );

  // UX-5 Feature 1: выбор типа замены (temp vs program)
  // - Без программы: только временная замена (без выбора).
  // - С программой: Alert с 3 кнопками — Отмена / Только сегодня / В программе.
  //   «В программе» помечен destructive для визуального различения (PRODUCT.md §3.3).
  //   Для готовых (seeded) программ replaceExerciseInProgram упадёт
  //   («Program not found» из RPC) → rollback + Alert с объяснением.
  const handleReplaceChoice = useCallback(
    (exerciseIndex: number, alternativeId: string) => {
      if (!programId) {
        // Ad-hoc тренировка — только временная замена, без выбора
        replaceExercise(exerciseIndex, alternativeId);
        return;
      }
      Alert.alert(
        'Заменить упражнение?',
        'Только сегодня — замена в этой тренировке.\nВ программе — замена также в будущих тренировках программы.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Только сегодня',
            onPress: () => replaceExercise(exerciseIndex, alternativeId),
          },
          {
            text: 'В программе',
            style: 'destructive',
            onPress: () => replaceExerciseInProgram(exerciseIndex, alternativeId),
          },
        ],
      );
    },
    [programId, replaceExercise, replaceExerciseInProgram],
  );

const renderItem = useCallback(
  ({ item, index }: { item: any; index: number }) => (
    <ExerciseSlider
      exercise={item}
      exerciseIndex={index}
      isReplaced={!!replacements[item.workout_exercise_id]}
      displayMode={displayMode}
      loadAlternatives={loadAlternatives}
      updateSet={updateSet}
      updateSetFeedback={updateSetFeedback}
      applyProgression={applyProgression}
      isSetCompleted={isSetCompleted}
      onRequestReplace={handleReplaceChoice}
      resetToOriginal={resetToOriginal}
      startRestTimer={startRestTimer}
      getIntensityInfo={getIntensityInfo}
      onOpenSettings={openExerciseSettings}
      onOpenPain={openPain}
      colors={colors}
      cardStyles={cardStyles}
      unit={unit}
      warning={exerciseWarnings[item.id] || null}
      readinessContext={readinessContext}
      workoutId={id as string}
      addSet={addSet}
    />
  ),
  [
    id,
    replacements,
    displayMode,
    loadAlternatives,
    updateSet,
    updateSetFeedback,
    applyProgression,
    isSetCompleted,
    handleReplaceChoice,
    resetToOriginal,
    startRestTimer,
    getIntensityInfo,
    openExerciseSettings,
    openPain,
    colors,
    cardStyles,
    unit,
    exerciseWarnings,
    readinessContext,
    addSet,
  ],
);

  const renderEmpty = useCallback(
    () => (
      <View style={commonStyles.emptyContainer}>
        <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
          Нет упражнений
        </Text>
        <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
          В этой тренировке пока нет упражнений
        </Text>
      </View>
    ),
    [colors],
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
      {/* PR8: header вынесен в WorkoutScreenHeader (внутри TimerProvider — Pill/Panel используют контекст) */}
      <WorkoutTimerProvider
        initialSeconds={initialTime}
        isActive={isWorkoutActive}
        onTick={handleTimerTick}
        onStart={handleTimerStart}
        onStop={handleTimerStop}
      >
        <WorkoutScreenHeader
          workoutName={workoutName}
          programName={workoutProgramInfo?.programName}
          phaseName={workoutProgramInfo?.phaseName}
          unit={unit}
          onUnitChange={setUnit}
          colors={colors}
        />
      </WorkoutTimerProvider>

      {hasWarmup && (
        <WorkoutTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          warmupCount={warmupExercises.length}
          warmupCompleted={isWarmupCompleted}
        />
      )}

      {/* PR8: injury banner вынесен в WorkoutInjuryBanner (инкапсулирует showBanner state) */}
      <WorkoutInjuryBanner
        hasWarnings={hasWarnings}
        avoidCount={avoidCount}
        cautionCount={cautionCount}
        activeInjuries={activeInjuries}
        activeTab={activeTab}
        colors={colors}
      />

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
          {/* PERF: removeClippedSubviews + батчинг для плавного скролла */}
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.workout_exercise_id}
            renderItem={renderItem}
            extraData={unit}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            windowSize={5}
            removeClippedSubviews={true}
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={50}
          />
        </>
      )}

      {/* Sticky-оверлей таймера отдыха (v2 05.08.2026) */}
      {restTimer !== null && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              top: undefined,
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

      {/* FEAT-1.9 + PR6: шторка боли с prefill и upsert/delete */}
      <PainSheet
        exercise={painIndex !== null ? exercises[painIndex] ?? null : null}
        workoutId={id as string}
        userId={userId}
        onClose={closePain}
        onSavePain={savePainForCurrent}
        onClearPain={clearPainForCurrent}
      />

      <ExerciseSettingsModal
        target={settingsTarget}
        onClose={closeExerciseSettings}
        onSave={saveExerciseSettings}
        colors={colors}
        cardStyles={cardStyles}
      />

      {/* PR8: footer вынесен в WorkoutScreenFooter */}
      <WorkoutScreenFooter
  isWorkoutActive={isWorkoutActive}
  saving={saving}
  onStart={handleTimerStart}  // ✅ Теперь записывает started_at
  onFinish={saveWorkout}
  colors={colors}
  gradients={gradients}
  insetsBottom={insets.bottom}
/>
    </SafeAreaView>
  );
}