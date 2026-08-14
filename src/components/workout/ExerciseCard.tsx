// src/components/workout/ExerciseCard.tsx
// Orchestrator карточки упражнения — рендерит вынесенные секции.
// 14.08.2026 (PR 2): split на секции без изменения визуального поведения.
// 14.08.2026 (PR 3): displayMode prop проброшен.
// 14.08.2026 (PR 4a): Equipment вынесен из accordion в отдельную секцию.
// 14.08.2026 (PR 4b): Actions row вынесен из header.
// 14.08.2026 (PR 4c): видимость секций зависит от displayMode.
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
import { AlternativeExerciseContent } from './sections/AlternativeExerciseContent';
import { ExerciseCardActions } from './sections/ExerciseCardActions';
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
  WorkoutCardDisplayMode,
} from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';

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
  onOpenPain?: (exerciseIndex: number) => void;
  onOpenAlternatives?: (exerciseIndex: number) => void;
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
  displayMode,
  updateSet,
  updateSetFeedback,
  applyProgression,
  isSetCompleted,
  replaceExercise,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  onOpenPain,
  onOpenAlternatives,
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

  // PR 4c: в Training mode скрываем вторичные секции для основной карточки.
  // Для альтернативных карточек (!isMain) все секции видны всегда.
  const showSecondarySections = !(displayMode === 'training' && isMain);

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
      {/* 1. Header: название + controls */}
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
      {showSecondarySections && (
        <ExerciseCardMuscles
          primaryMuscles={exercise.primary_muscles}
          secondaryMuscles={exercise.secondary_muscles}
          colors={colors}
        />
      )}

      {/* 5. Technique: скрыт в Training mode для основной карточки (PR 4c) */}
      {showSecondarySections && (
        <ExerciseCardTechnique
          technique={exercise.technique}
          mediaUrl={mediaUrl}
          settingsText={settingsText}
          colors={colors}
        />
      )}

      {/* 6. Knowledge: скрыт в Training mode, только основная карточка (PR 4c) */}
      {displayMode !== 'training' && isMain && (
        <ExerciseCardKnowledge
          benefits={exercise.benefits}
          risks={exercise.risks}
          injuries={exercise.injuries}
          colors={colors}
        />
      )}

      {/* 7. Alternative content (только альтернативная карточка) */}
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

      {/* 8. SetsGrid (только основная карточка с сетами) */}
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

      {/* 9. Actions row: "Другие варианты" + "Боль?" (PR 4b) */}
      {isMain && (
        <ExerciseCardActions
          exerciseIndex={exerciseIndex}
          hasAlternatives={alternatives.length > 0}
          onOpenPain={onOpenPain}
          onOpenAlternatives={onOpenAlternatives}
          colors={colors}
        />
      )}
    </View>
  );
});