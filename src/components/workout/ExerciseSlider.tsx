// src/components/workout/ExerciseSlider.tsx
// 05.08.2026 (PERF):
//  - P1-A: removeClippedSubviews={true} на горизонтальном ScrollView
//  - P1-B: stagger-загрузка альтернатив (500мс + index*100мс) — не блокирует TTI
// ENG-5: ранжирование альтернатив + подпись excludedCount
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';
import { ExerciseCard } from './ExerciseCard';
import { WorkoutCardDisplayMode } from '../../types/workout';
import { AlternativeExerciseCard } from './AlternativeExerciseCard';
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
} from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';
import { AlternativeSourceInput } from '../../engine/alternatives';
import type { FetchAlternativesResult } from '../../hooks/workout/useWorkoutSession.loader';
import type { ReadinessContext } from '../../engine/progression';

const H_GAP = 16;
const PAD = 16;

/** ENG-5: плюрализация «N вариант скрыт / варианта скрыто / вариантов скрыто». */
function formatExcluded(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} вариант скрыт`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} варианта скрыто`;
  }
  return `${count} вариантов скрыто`;
}

interface ExerciseSliderProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isReplaced: boolean;
  displayMode: WorkoutCardDisplayMode;
  loadAlternatives: (
    id: string,
    source: AlternativeSourceInput,
  ) => Promise<FetchAlternativesResult>;
  updateSet: (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  updateSetFeedback: (
    exIndex: number,
    setIndex: number,
    patch: SetFeedbackPatch,
  ) => void;
  applyProgression: (exerciseIndex: number, newWeight: number) => void;
  isSetCompleted: (set: SetData) => boolean;
  // UX-5 Feature 1: запрос замены (caller выбирает temp vs program)
  onRequestReplace: (exIndex: number, altId: string) => void;
  resetToOriginal: (exIndex: number) => void;
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
  /** ENG-3: today readiness context (optional signal). */
  readinessContext?: ReadinessContext | null;
}

export const ExerciseSlider = memo(function ExerciseSlider({
  exercise,
  exerciseIndex,
  isReplaced,
  displayMode,
  loadAlternatives,
  updateSet,
  updateSetFeedback,
  applyProgression,
  isSetCompleted,
  onRequestReplace,
  resetToOriginal,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  onOpenPain,
  colors,
  cardStyles,
  unit,
  warning = null,
  readinessContext = null,
}: ExerciseSliderProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;

  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [excludedCount, setExcludedCount] = useState(0); // ENG-5: скрытые травмами
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [altsMounted, setAltsMounted] = useState(false);

  const hasAlts = exercise.alternatives.length > 0 || isReplaced;

  // PERF P1-B: stagger-загрузка альтернатив.
  // Каждая карточка откладывает загрузку на 500мс + exerciseIndex * 100мс,
  // чтобы не блокировать TTI при одновременном открытии 6-8 карточек.
  useEffect(() => {
    if (!hasAlts) return;
    let alive = true;
    const delay = 500 + exerciseIndex * 100;

    const timeout = setTimeout(() => {
      if (!alive) return;
      setLoadingAlts(true);
      // ENG-5: контекст для ранжирования (мышцы/оборудование/боль)
      loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      })
        .then((result) => {
          if (alive) {
            setAlternatives(result.alternatives);
            setExcludedCount(result.excludedCount);
          }
        })
        .finally(() => {
          if (alive) setLoadingAlts(false);
        });
    }, delay);

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
    // ENG-5: muscles/equipment/painState читаются в эффекте (source для ранжирования).
    // Ссылки стабильны при вводе подходов (spread сохраняет), меняются при замене
    // упражнения (id) или записи боли → корректно включаем в deps.
  }, [
    hasAlts,
    exercise.id,
    exerciseIndex,
    loadAlternatives,
    exercise.primary_muscles,
    exercise.secondary_muscles,
    exercise.equipment,
    exercise.painState,
    readinessContext,
  ]);

  useEffect(() => {
    if (loadingAlts || !hasAlts || altsMounted) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      setAltsMounted(true);
    });
    return () => handle.cancel();
  }, [loadingAlts, hasAlts, altsMounted]);

  const handleScrollBeginDrag = useCallback(() => {
    if (!altsMounted && hasAlts) setAltsMounted(true);
  }, [altsMounted, hasAlts]);

  const showPlaceholder = loadingAlts;
  const showPeek = !loadingAlts && hasAlts && !altsMounted;
  const showAlts = !loadingAlts && altsMounted && alternatives.length > 0;
  // ENG-5: все альтернативы скрыты травмами → объясняем вместо пустоты
  const showAllExcluded =
    !loadingAlts && altsMounted && alternatives.length === 0 && excludedCount > 0;

  const childCount =
    1 +
    (showPlaceholder ? 1 : 0) +
    (showPeek ? 1 : 0) +
    (showAlts ? alternatives.length : 0) +
    (showAllExcluded ? 1 : 0);

  const snapOffsets = useMemo(
    () => Array.from({ length: childCount }, (_, i) => i * (cardWidth + H_GAP)),
    [childCount, cardWidth],
  );

  return (
    <View style={{ marginTop: SPACING.lg }}>
      {isReplaced && (
        <View
          style={[
            cardStyles.replacedBadgeContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Text style={[cardStyles.replacedBadgeText, { color: colors.primary }]}>
            Заменено
          </Text>
          <TouchableOpacity onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={[cardStyles.replacedResetText, { color: colors.primary }]}>
              Вернуть
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        removeClippedSubviews={true} // PERF P1-A: выгружаем невидимые карточки
        onScrollBeginDrag={handleScrollBeginDrag}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: H_GAP }}
      >
        <View style={{ width: cardWidth }}>
          <ExerciseCard
            exercise={exercise}
            isMain
            isReplaced={isReplaced}
            exerciseIndex={exerciseIndex}
            alternatives={alternatives}
            displayMode={displayMode}
            updateSet={updateSet}
            updateSetFeedback={updateSetFeedback}
            applyProgression={applyProgression}
            isSetCompleted={isSetCompleted}
            startRestTimer={startRestTimer}
            getIntensityInfo={getIntensityInfo}
            onOpenSettings={onOpenSettings}
            onOpenPain={onOpenPain}
                        colors={colors}
            cardStyles={cardStyles}
            unit={unit}
            warning={warning}
            readinessContext={readinessContext}
          />
        </View>

        {showPlaceholder && (
          <View
            style={{
              width: cardWidth,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.lg,
            }}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Загружаем замены…
            </Text>
          </View>
        )}

        {showPeek && (
          <View
            style={{
              width: cardWidth,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: BORDER_RADIUS.lg,
              paddingHorizontal: SPACING.lg,
            }}
          >
            <ChevronRight size={22} color={colors.textTertiary} strokeWidth={2} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Свайпни для замен
            </Text>
          </View>
        )}

        {showAlts &&
          alternatives.map((alt) => (
            <View key={alt.id} style={{ width: cardWidth }}>
              <AlternativeExerciseCard
                exercise={alt}
                exerciseIndex={exerciseIndex}
                onRequestReplace={onRequestReplace}
                colors={colors}
                cardStyles={cardStyles}
              />
            </View>
          ))}

        {showAllExcluded && (
          <View
            style={{
              width: cardWidth,
              justifyContent: 'center',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.lg,
              paddingHorizontal: SPACING.lg,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Все варианты замен скрыты из-за травм и противопоказаний
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ENG-5: подпись о скрытых вариантах (когда есть показанные) */}
      {showAlts && excludedCount > 0 && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 11,
            marginTop: SPACING.xs,
            paddingHorizontal: PAD,
          }}
        >
          {formatExcluded(excludedCount)} из-за травм и противопоказаний
        </Text>
      )}
    </View>
  );
});