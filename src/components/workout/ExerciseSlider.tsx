import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseData, AlternativeExercise, SetData } from '../../types/workout';
import { WeightUnit } from '../../hooks/useUnitPreferences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Карточка = экран минус симметричные боковые отступы (по 16).
const CARD_WIDTH = SCREEN_WIDTH - 32;
const H_GAP = 16; // промежуток между карточками при свайпе
const PAD = 16;   // боковой отступ, центрирующий первую/последнюю карточку

interface ExerciseSliderProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isReplaced: boolean;
  loadAlternatives: (id: string, muscles: string[]) => Promise<AlternativeExercise[]>;
  updateSet: (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  resetToOriginal: (exIndex: number) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  };
  // ✅ ВОЛНА 3: проброс колбэка открытия общей модалки настроек
  //    (updateExerciseSettings больше не пробрасывается — модалка на экране).
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

export const ExerciseSlider = memo(function ExerciseSlider({
  exercise,
  exerciseIndex,
  isReplaced,
  loadAlternatives,
  updateSet,
  isSetCompleted,
  replaceExercise,
  resetToOriginal,
  startRestTimer,
  getIntensityInfo,
  onOpenSettings,
  colors,
  cardStyles,
  unit,
  warning = null,
}: ExerciseSliderProps) {
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  // ВОЛНА 2: тяжёлые карточки альтернатив монтируются в idle-окне либо по жесту.
  const [altsMounted, setAltsMounted] = useState(false);

  const hasAlts = exercise.alternatives.length > 0 || isReplaced;

  useEffect(() => {
    if (!hasAlts) return;
    let alive = true;
    setLoadingAlts(true);
    loadAlternatives(exercise.id, exercise.primary_muscles)
      .then((alts) => {
        if (alive) setAlternatives(alts);
      })
      .finally(() => {
        if (alive) setLoadingAlts(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAlts, exercise.id, loadAlternatives]);

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

  const childCount =
    1 +
    (showPlaceholder ? 1 : 0) +
    (showPeek ? 1 : 0) +
    (showAlts ? alternatives.length : 0);
  const snapOffsets = useMemo(
    () => Array.from({ length: childCount }, (_, i) => i * (CARD_WIDTH + H_GAP)),
    [childCount],
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
        removeClippedSubviews={true}
        onScrollBeginDrag={handleScrollBeginDrag}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: H_GAP }}
      >
        <View style={{ width: CARD_WIDTH }}>
          <ExerciseCard
            exercise={exercise}
            isMain
            isReplaced={isReplaced}
            exerciseIndex={exerciseIndex}
            alternatives={alternatives}
            updateSet={updateSet}
            isSetCompleted={isSetCompleted}
            replaceExercise={replaceExercise}
            startRestTimer={startRestTimer}
            getIntensityInfo={getIntensityInfo}
            onOpenSettings={onOpenSettings}
            colors={colors}
            cardStyles={cardStyles}
            unit={unit}
            warning={warning}
          />
        </View>

        {showPlaceholder && (
          <View
            style={{
              width: CARD_WIDTH,
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
              width: CARD_WIDTH,
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
            <View key={alt.id} style={{ width: CARD_WIDTH }}>
              <ExerciseCard
                exercise={alt}
                isMain={false}
                isReplaced={false}
                exerciseIndex={exerciseIndex}
                alternatives={alternatives}
                updateSet={updateSet}
                isSetCompleted={isSetCompleted}
                replaceExercise={replaceExercise}
                startRestTimer={startRestTimer}
                getIntensityInfo={getIntensityInfo}
                onOpenSettings={onOpenSettings}
                colors={colors}
                cardStyles={cardStyles}
                unit={unit}
                warning={null}
              />
            </View>
          ))}
      </ScrollView>
    </View>
  );
});