import React, { useState, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Settings,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  Dumbbell,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { getMuscleColor } from '../../constants/muscleColors';
import { EquipmentIcon } from '../EquipmentIcon';
import { TechniqueMediaSlider } from './TechniqueMediaSlider';
import { ExerciseInfoAccordion } from './ExerciseInfoAccordion';
import { SetsGrid } from './SetsGrid';
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
} from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';

// Мост к reps_range (поле опционально — компонент компилируется и без него).
type RepsRangeHolder = { reps_range?: string };

type SectionKey = 'technique' | 'info' | 'benefits' | 'risks' | 'injuries';

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface ExerciseCardProps {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  updateSet: (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  // FEAT-7: патч фидбека подхода (rpe → авто-rir/difficulty).
  updateSetFeedback: (
    exIndex: number,
    setIndex: number,
    patch: SetFeedbackPatch,
  ) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  onOpenSettings: (
    exerciseIndex: number,
    setsCount: number,
    restSeconds: number,
  ) => void;
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
  isSetCompleted,
  replaceExercise,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  colors,
  cardStyles,
  unit,
  warning = null,
}: ExerciseCardProps) {
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [everOpened, setEverOpened] = useState<Set<SectionKey>>(new Set());

  const toggleSection = (key: SectionKey) => {
    setEverOpened((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    setOpenSection((prev) => (prev === key ? null : key));
  };

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
  const hasTechniqueContent = !!(exercise.technique || mediaUrl);
  const hasEquipmentContent = exercise.equipment.length > 0 || !!settingsText;

  const completedSets = sets.filter((s) => isSetCompleted(s)).length;
  const allSetsDone = hasSets && sets.length > 0 && completedSets === sets.length;

  const borderColor =
    warning?.level === 'avoid'
      ? colors.error
      : warning?.level === 'caution'
        ? colors.warning
        : isReplaced
          ? colors.primary
          : allSetsDone
            ? colors.success + '60'
            : colors.border;

  const warningColor = warning?.level === 'avoid' ? colors.error : colors.warning;

  return (
    <View
      style={[
        cardStyles.container,
        cardStyles.workoutExerciseCard,
        { borderWidth: 1, borderColor },
      ]}
    >
      {/* Шапка: имя СВЕРХУ во всю ширину карточки, все иконки и бейджи — рядом ниже. */}
      <View
        style={[
          cardStyles.workoutExerciseHeader,
          { flexDirection: 'column', alignItems: 'stretch', gap: SPACING.sm },
        ]}
      >
        <Text
          style={[cardStyles.workoutExerciseName, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: SPACING.xs,
          }}
        >
          {isMain && alternatives.length > 0 && (
            <View
              style={[
                cardStyles.workoutSwipeIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
            </View>
          )}
          {isMain && (
            <TouchableOpacity
              onPress={() => onOpenSettings(exerciseIndex, sets.length, restSeconds)}
              style={[
                cardStyles.workoutSettingsButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {!!repsRange && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textSecondary, fontWeight: '700' },
                ]}
              >
                {repsRange} повт.
              </Text>
            </View>
          )}
          <View
            style={[
              cardStyles.workoutIntensityBadge,
              { backgroundColor: intensityInfo.bgColor },
            ]}
          >
            {intensityInfo.icon}
            <Text style={[cardStyles.workoutIntensityText, { color: intensityInfo.color }]}>
              {intensityInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {warning && isMain && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: warningColor + '15',
            borderColor: warningColor,
            borderWidth: 1,
            borderRadius: BORDER_RADIUS.sm,
            padding: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <ShieldAlert
            size={16}
            color={warningColor}
            strokeWidth={2}
            style={{ marginRight: SPACING.xs, marginTop: 1 }}
          />
          <Text
            style={{
              color: warningColor,
              flex: 1,
              fontSize: 12,
              fontWeight: '600',
              lineHeight: 16,
            }}
          >
            {warning.message}
          </Text>
        </View>
      )}

      {exercise.primary_muscles.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: exercise.secondary_muscles.length > 0 ? 6 : SPACING.md,
          }}
        >
          {exercise.primary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`p-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c + '1A',
                  borderWidth: 1,
                  borderColor: c + '55',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c,
                    marginRight: 5,
                  }}
                />
                <Text style={[typography.captionSmall, { color: c, fontWeight: '700' }]}>
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {exercise.secondary_muscles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md }}>
          {exercise.secondary_muscles.map((m, i) => {
            const c = getMuscleColor(m);
            return (
              <View
                key={`s-${i}`}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: c + '40',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {hasTechniqueContent || hasEquipmentContent ? (
        <ExerciseInfoAccordion
          icon={
            hasTechniqueContent ? (
              <BookOpen size={14} color={colors.primary} />
            ) : (
              <Dumbbell size={14} color={colors.primary} />
            )
          }
          title={
            hasTechniqueContent ? 'Техника выполнения' : 'Оборудование и настройки'
          }
          titleColor={colors.primary}
          expanded={openSection === 'technique'}
          onToggle={() => toggleSection('technique')}
          maxHeight={hasTechniqueContent ? 900 : 400}
        >
          {hasTechniqueContent && (
            <>
              {everOpened.has('technique') && (
                <TechniqueMediaSlider
                  mediaUrl={mediaUrl}
                  autoPlay={openSection === 'technique'}
                />
              )}
              {exercise.technique ? (
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: colors.textSecondary,
                      lineHeight: 18,
                      marginTop: SPACING.sm,
                    },
                  ]}
                >
                  {exercise.technique}
                </Text>
              ) : null}
            </>
          )}
          {exercise.equipment.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: hasTechniqueContent ? SPACING.md : 0,
              }}
            >
              {exercise.equipment.map((eq, i) => (
                <View
                  key={`eq-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: 6,
                    borderRadius: BORDER_RADIUS.full,
                  }}
                >
                  <EquipmentIcon
                    name={eq}
                    size={32}
                    primaryMuscles={exercise.primary_muscles}
                  />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.textSecondary, fontWeight: '600' },
                    ]}
                  >
                    {formatEquipmentName(eq)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {settingsText ? (
            <>
              {(hasTechniqueContent || exercise.equipment.length > 0) && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: SPACING.sm,
                  }}
                />
              )}
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {settingsText}
              </Text>
            </>
          ) : null}
        </ExerciseInfoAccordion>
      ) : null}

      {isMain &&
        (exercise.benefits || exercise.risks || exercise.injuries.length > 0) && (
          <ExerciseInfoAccordion
            icon={<ShieldAlert size={14} color={colors.warning} />}
            title="Важно знать"
            titleColor={colors.warning}
            expanded={openSection === 'info'}
            onToggle={() => toggleSection('info')}
            maxHeight={600}
          >
            {exercise.benefits ? (
              <View style={{ marginBottom: SPACING.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <Sparkles size={12} color={colors.success} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.success, fontWeight: '700' },
                    ]}
                  >
                    Польза
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, lineHeight: 18 },
                  ]}
                >
                  {exercise.benefits}
                </Text>
              </View>
            ) : null}
            {exercise.risks ? (
              <View style={{ marginBottom: SPACING.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle size={12} color={colors.warning} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.warning, fontWeight: '700' },
                    ]}
                  >
                    Риски
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, lineHeight: 18 },
                  ]}
                >
                  {exercise.risks}
                </Text>
              </View>
            ) : null}
            {exercise.injuries.length > 0 ? (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <ShieldAlert size={12} color={colors.error} />
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.error, fontWeight: '700' },
                    ]}
                  >
                    Противопоказания
                  </Text>
                </View>
                {exercise.injuries.map((inj, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.error, marginRight: 6 },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                      ]}
                    >
                      {inj}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ExerciseInfoAccordion>
        )}

      {!isMain && (
        <>
          {exercise.benefits ? (
            <ExerciseInfoAccordion
              icon={<Sparkles size={14} color={colors.success} />}
              title="Польза"
              titleColor={colors.success}
              expanded={openSection === 'benefits'}
              onToggle={() => toggleSection('benefits')}
            >
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {exercise.benefits}
              </Text>
            </ExerciseInfoAccordion>
          ) : null}
          {exercise.risks ? (
            <ExerciseInfoAccordion
              icon={<AlertTriangle size={14} color={colors.warning} />}
              title="Риски"
              titleColor={colors.warning}
              expanded={openSection === 'risks'}
              onToggle={() => toggleSection('risks')}
            >
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {exercise.risks}
              </Text>
            </ExerciseInfoAccordion>
          ) : null}
          {exercise.injuries.length > 0 ? (
            <ExerciseInfoAccordion
              icon={<ShieldAlert size={14} color={colors.error} />}
              title="Противопоказания"
              titleColor={colors.error}
              expanded={openSection === 'injuries'}
              onToggle={() => toggleSection('injuries')}
            >
              {exercise.injuries.map((inj, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.error, marginRight: 6 },
                    ]}
                  >
                    •
                  </Text>
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                    ]}
                  >
                    {inj}
                  </Text>
                </View>
              ))}
            </ExerciseInfoAccordion>
          ) : null}
          <TouchableOpacity
            style={[
              cardStyles.replaceButton,
              { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            ]}
            onPress={() => replaceExercise(exerciseIndex, exercise.id)}
          >
            <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>
              Заменить на это
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* FEAT-7: сетка подходов + фидбек вынесены в SetsGrid (SCALE-5) */}
      {hasSets && sets.length > 0 && (
        <SetsGrid
          exerciseIndex={exerciseIndex}
          sets={sets}
          restSeconds={restSeconds}
          unit={unit}
          updateSet={updateSet}
          updateSetFeedback={updateSetFeedback}
          isSetCompleted={isSetCompleted}
          startRestTimer={startRestTimer}
          colors={colors}
          cardStyles={cardStyles}
        />
      )}
    </View>
  );
});