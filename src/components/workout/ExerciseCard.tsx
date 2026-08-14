// src/components/workout/ExerciseCard.tsx
// Orchestrator карточки упражнения — рендерит вынесенные секции.
// 14.08.2026 (PR 2): split на секции без изменения визуального поведения.
import React, { useMemo, memo } from 'react';
import { View } from 'react-native';
import { createCardStyles } from '../../styles/components/card';
import { SetsGrid } from './SetsGrid';
import { ExerciseCardHeader } from './sections/ExerciseCardHeader';
import { ExerciseWarningBanner } from './sections/ExerciseWarningBanner';
import { ExerciseCardMuscles } from './sections/ExerciseCardMuscles';
import { ExerciseCardTechnique } from './sections/ExerciseCardTechnique';
import { ExerciseCardKnowledge } from './sections/ExerciseCardKnowledge';
import { AlternativeExerciseContent } from './sections/AlternativeExerciseContent';
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
} from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';

type RepsRangeHolder = { reps_range?: string };

interface ExerciseCardProps {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  updateSetFeedback: (exIndex: number, setIndex: number, patch: SetFeedbackPatch) => void;
  applyProgression: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  onOpenSettings: (exerciseIndex: number, setsCount: number, restSeconds: number) => void;
  /** FEAT-1.9: открыть шторку боли (только основная карточка) */
  onOpenPain?: (exerciseIndex: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  unit: WeightUnit;
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  isMain,
  isReplaced,
  exerciseIndex,
  alternatives,
  updateSet,
  updateSetFeedback,
  applyProgression,
  isSetCompleted,
  replaceExercise,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  onOpenPain,
  colors,
  cardStyles,
  unit,
  warning = null,
}: ExerciseCardProps) {
  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
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
      <ExerciseCardHeader
        exerciseName={exercise.name}
        isMain={isMain}
        hasAlternatives={alternatives.length > 0}
        exerciseIndex={exerciseIndex}
        setsCount={sets.length}
        restSeconds={restSeconds}
        repsRange={repsRange}
        intensityInfo={intensityInfo}
        onOpenSettings={onOpenSettings}
        onOpenPain={onOpenPain}
        colors={colors}
        cardStyles={cardStyles}
      />

      {warning && isMain && (
        <ExerciseWarningBanner warning={warning} colors={colors} />
      )}

      <ExerciseCardMuscles
        primaryMuscles={exercise.primary_muscles}
        secondaryMuscles={exercise.secondary_muscles}
        colors={colors}
      />

      <ExerciseCardTechnique
        technique={exercise.technique}
        mediaUrl={mediaUrl}
        equipment={equipment}
        settingsText={settingsText}
        primaryMuscles={exercise.primary_muscles}
        colors={colors}
      />

      {isMain && (
        <ExerciseCardKnowledge
          benefits={exercise.benefits}
          risks={exercise.risks}
          injuries={exercise.injuries}
          colors={colors}
        />
      )}

      {!isMain && (
        <AlternativeExerciseContent
          benefits={exercise.benefits}
          risks={exercise.risks}
          injuries={exercise.injuries}
          exerciseId={exercise.id}
          exerciseIndex={exerciseIndex}
          replaceExercise={replaceExercise}
          colors={colors}
          cardStyles={cardStyles}
        />
      )}

      {hasSets && sets.length > 0 && (
        <SetsGrid
          exerciseIndex={exerciseIndex}
          sets={sets}
          restSeconds={restSeconds}
          unit={unit}
          updateSet={updateSet}
          updateSetFeedback={updateSetFeedback}
          applyProgression={applyProgression}
          isSetCompleted={isSetCompleted}
          startRestTimer={startRestTimer}
          colors={colors}
          cardStyles={cardStyles}
        />
      )}
    </View>
  );
});