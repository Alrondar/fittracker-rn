// src/components/workout/ExerciseCard.tsx
// Orchestrator карточки упражнения — рендерит вынесенные секции.
// PR 2: split на секции. PR 3: displayMode. PR 4a: Equipment. PR 4b: Actions.
// PR 4c: видимость по displayMode. PR 4d: defaultExpanded для Learn mode.
// PR6: проброс hasPainRecord в ExerciseCardHeader.
// ENG-1: проброс repsRange в SetsGrid для детерминированной прогрессии.
// ENG-4: safetyContext (pain/injury) для safety precedence в engine.
import React, { useMemo, memo } from 'react';
import { View } from 'react-native';
import { createCardStyles } from '../../styles/components/card';
import { SetsGrid } from './SetsGrid';
import { ExerciseCardHeader } from './sections/ExerciseCardHeader';
import { ExerciseCardEquipment } from './sections/ExerciseCardEquipment';
import { ExerciseWarningBanner } from './sections/ExerciseWarningBanner';
import { ExerciseCardMuscles } from './sections/ExerciseCardMuscles';
import { ExerciseCardTechnique } from './sections/ExerciseCardTechnique';
import { ExerciseCardKnowledge } from './sections/ExerciseCardKnowledge';
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
  WorkoutCardDisplayMode,
} from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';
import type { ReadinessContext } from '../../engine/progression';

type RepsRangeHolder = { reps_range?: string };

interface ExerciseCardProps {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  displayMode: WorkoutCardDisplayMode;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  updateSetFeedback: (exIndex: number, setIndex: number, patch: SetFeedbackPatch) => void;
  /** ENG-13: добавить новый сет (для warmup toggle auto-add) */
  addSet: (exerciseIndex: number) => void;
  applyProgression: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  onOpenSettings: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  onOpenPain?: (exerciseIndex: number) => void;
  onOpenAlternatives?: (exerciseIndex: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  unit: WeightUnit;
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
  /** ENG-3: today readiness context (optional signal, PRODUCT.md §7). */
  readinessContext?: ReadinessContext | null;
  // COACH-3: идентификаторы для записи feedback (пробрасываются в SetsGrid).
  workoutId: string;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  isMain,
  isReplaced,
  exerciseIndex,
  alternatives,
  displayMode,
  updateSet,
  updateSetFeedback,
  addSet,
  applyProgression,
  isSetCompleted,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  onOpenPain,
  onOpenAlternatives,
  colors,
  cardStyles,
  unit,
  warning = null,
  readinessContext = null,
  workoutId,
}: ExerciseCardProps) {
  const hasSets = 'sets' in exercise;
  // cleanup: sets через useMemo — условная [] не должна пересоздаваться каждый
  // рендер (от sets зависит borderColor useMemo).
  const sets = useMemo(
    () => (hasSets ? (exercise as ExerciseData).sets : []),
    [hasSets, exercise],
  );
  const targetSets = hasSets ? (exercise as ExerciseData).target_sets : sets.length;
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';
  const repsRange = (exercise as RepsRangeHolder).reps_range;
  const intensityInfo = useMemo(
    () => getIntensityInfo(intensity),
    [getIntensityInfo, intensity],
  );
  const mediaUrl = exercise.media_url ?? null;
  const settingsText = exercise.settings || '';
  const equipment = exercise.equipment ?? [];

  // ENG-4: safety context для SetsGrid (pain/injury → recommendation precedence).
  // Стабильная ссылка через useMemo; пересчёт только при смене exercise.painState
  // или warning.level. ExerciseWarningBanner уже показывает причину на L1,
  // поэтому здесь только контекст для engine.
  const safetyContext = useMemo(() => {
    if (!hasSets) return null;
    const painState = (exercise as ExerciseData).painState ?? null;
    return {
      hasPain: painState != null,
      stopExercise: painState?.stopExercise === true,
      warningLevel: (warning?.level ?? null) as 'avoid' | 'caution' | null,
    };
  }, [hasSets, exercise, warning?.level]);

  // PR 4c: в Training mode скрываем мышцы и knowledge для основной карточки,
  // но техника остаётся доступной всегда (safety: правильная техника = безопасность).
  // Для альтернативных карточек (!isMain) все секции видны всегда.
  const hideSecondaryInTraining = displayMode === 'training' && isMain;

  // PR6: есть ли запись боли в pain_events для этого упражнения — для visual affordance в header
  const hasPainRecord = !!((exercise as ExerciseData).painState);

  // PERF: единый useMemo вместо пересчёта в рендере
  const { borderColor } = useMemo(() => {
    const completed = sets.filter((s) => isSetCompleted(s)).length;
    const done = hasSets && sets.length > 0 && completed === sets.length;
    const border =
      warning?.level === 'avoid'
        ? colors.error
        : warning?.level === 'caution'
          ? colors.warning
          : isReplaced
            ? colors.primary
            : done
              ? colors.success + '60'
              : colors.border;
    return { borderColor: border };
  }, [sets, isSetCompleted, hasSets, isReplaced, warning?.level, colors]);

  return (
    <View
      style={[cardStyles.container, cardStyles.workoutExerciseCard, { borderWidth: 1, borderColor }]}
    >
      {/* 1. Header: название + Settings + repsRange + intensity */}
      <ExerciseCardHeader
        exerciseName={exercise.name}
        isMain={isMain}
        exerciseIndex={exerciseIndex}
        setsCount={sets.length}
        restSeconds={restSeconds}
        repsRange={repsRange}
        intensityInfo={intensityInfo}
        hasAlternatives={alternatives.length > 0}
        alternativesCount={alternatives.length}
        hasPainRecord={hasPainRecord}
        onOpenSettings={onOpenSettings}
        onOpenPain={onOpenPain}
        onOpenAlternatives={onOpenAlternatives}
        colors={colors}
        cardStyles={cardStyles}
      />

      {/* 2. Equipment: bubbles сразу под header (PR 4a) */}
      <ExerciseCardEquipment
        equipment={equipment}
        primaryMuscles={exercise.primary_muscles}
      />

      {/* 3. Warning banner (только основная карточка) */}
      {warning && isMain && (
        <ExerciseWarningBanner warning={warning} colors={colors} />
      )}

      {/* 4. Muscles: скрыты в Training mode для основной карточки (PR 4c) */}
      {!hideSecondaryInTraining && (
        <ExerciseCardMuscles
          primaryMuscles={exercise.primary_muscles}
          secondaryMuscles={exercise.secondary_muscles}
          colors={colors}
        />
      )}

      {/* 5. SetsGrid (только основная карточка с сетами) — ГЛАВНЫЙ РАБОЧИЙ БЛОК.
          ENG-1: проброс repsRange для детерминированной прогрессии.
          ENG-4: проброс safetyContext (pain/injury) для safety precedence в engine.
          COACH-3: проброс workoutId + exercise.id для записи feedback. */}
      {hasSets && sets.length > 0 && (
        <SetsGrid
          exerciseIndex={exerciseIndex}
          sets={sets}
          targetSets={targetSets}
          restSeconds={restSeconds}
          repsRange={repsRange}
          safetyContext={safetyContext}
          readinessContext={readinessContext}
          unit={unit}
          updateSet={updateSet}
          updateSetFeedback={updateSetFeedback}
          addSet={addSet}
          applyProgression={applyProgression}
          isSetCompleted={isSetCompleted}
          startRestTimer={startRestTimer}
          colors={colors}
          cardStyles={cardStyles}
          workoutId={workoutId}
          exerciseId={exercise.id}
        />
      )}

      {/* 6. Technique: доступна во ВСЕХ режимах (safety), включая Training (PR 4f) */}
      <ExerciseCardTechnique
        technique={exercise.technique}
        mediaUrl={mediaUrl}
        settingsText={settingsText}
        defaultExpanded={displayMode === 'learn'}
        colors={colors}
      />

      {/* 7. Knowledge: скрыт в Training mode, только основная карточка (PR 4c) */}
      {displayMode !== 'training' && isMain && (
        <ExerciseCardKnowledge
          benefits={exercise.benefits}
          risks={exercise.risks}
          injuries={exercise.injuries}
          defaultExpanded={displayMode === 'learn'}
          colors={colors}
        />
      )}
    </View>
  );
});