import { useState, useEffect, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseData, AlternativeExercise, SetData } from '../../types/workout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface ExerciseSliderProps {
  exercise: ExerciseData;
  exerciseIndex: number;
  isReplaced: boolean;
  loadAlternatives: (id: string, muscles: string[]) => Promise<AlternativeExercise[]>;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  resetToOriginal: (exIndex: number) => void;
  startRestTimer: (seconds: number) => void;
  getIntensityInfo: (intensity: string) => { label: string; color: string; bgColor: string; icon: React.ReactNode };
  updateExerciseSettings: (exIndex: number, setsCount: number, restSeconds: number) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
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
  updateExerciseSettings,
  colors,
  cardStyles,
  warning = null,
}: ExerciseSliderProps) {
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  // «Есть ли потенциальные замены» известно БЕЗ загрузки полных объектов:
  // exercise.alternatives — массив ID из БД (приходит в loadWorkout).
  const hasAlts = exercise.alternatives.length > 0 || isReplaced;

  // ✅ АВТОЗАГРУЗКА альтернатив при монтировании слайдера — без кнопки-шеврона.
  //    Ленивость сохраняется на уровне списка: FlatList в workout/[id].tsx имеет
  //    windowSize={5}, поэтому ExerciseSlider монтируется только для видимых (+буфер)
  //    упражнений. При вертикальном свайпе к новому упражнению его слайдер монтируется
  //    и тянет альтернативы именно для него (loadAlternatives кэширует по id в ref).
  useEffect(() => {
    if (!hasAlts) return;
    let alive = true;
    setLoadingAlts(true);
    loadAlternatives(exercise.id, exercise.primary_muscles)
      .then((alts) => { if (alive) setAlternatives(alts); })
      .finally(() => { if (alive) setLoadingAlts(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAlts, exercise.id, loadAlternatives]);

  const showPlaceholder = loadingAlts;
  const showAlts = !loadingAlts && alternatives.length > 0;

  return (
    <View style={{ marginTop: SPACING.lg }}>
      {isReplaced && (
        <View style={[cardStyles.replacedBadgeContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={[cardStyles.replacedBadgeText, { color: colors.primary }]}>Заменено</Text>
          <TouchableOpacity onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={[cardStyles.replacedResetText, { color: colors.primary }]}>Вернуть</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={{ paddingLeft: 16, gap: 16 }}
      >
        <ExerciseCard
          key={exercise.id}
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
          updateExerciseSettings={updateExerciseSettings}
          colors={colors}
          cardStyles={cardStyles}
          warning={warning}
        />
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
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Загружаем замены…</Text>
          </View>
        )}
        {showAlts &&
          alternatives.map((alt) => (
            <ExerciseCard
              key={alt.id}
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
              updateExerciseSettings={updateExerciseSettings}
              colors={colors}
              cardStyles={cardStyles}
              warning={null}
            />
          ))}
      </ScrollView>
    </View>
  );
});