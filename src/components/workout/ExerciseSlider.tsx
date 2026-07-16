import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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
  alternativesCache: Record<string, AlternativeExercise[]>;
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
  // НОВОЕ: предупреждение о травме
  warning?: { level: 'avoid' | 'caution'; message: string } | null;
}

export function ExerciseSlider({
  exercise,
  exerciseIndex,
  isReplaced,
  alternativesCache,
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

  useEffect(() => {
    const load = async () => {
      if (exercise.alternatives.length > 0 || isReplaced) {
        setLoadingAlts(true);
        const alts = await loadAlternatives(exercise.id, exercise.primary_muscles);
        setAlternatives(alts);
        setLoadingAlts(false);
      }
    };
    load();
  }, [exercise.id]);

  const allCards = [exercise, ...alternatives];

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
        {allCards.map((card, cardIndex) => (
          <ExerciseCard
            key={`${card.id}-${cardIndex}`}
            exercise={card}
            isMain={cardIndex === 0}
            isReplaced={isReplaced}
            exerciseIndex={exerciseIndex}
            alternatives={alternatives}
            updateSet={updateSet}
            isSetCompleted={isSetCompleted}
            replaceExercise={replaceExercise}
            startRestTimer={startRestTimer}
            loadingAlts={loadingAlts}
            getIntensityInfo={getIntensityInfo}
            updateExerciseSettings={updateExerciseSettings}
            colors={colors}
            cardStyles={cardStyles}
            // НОВОЕ: передаём warning только в главную карточку
            warning={cardIndex === 0 ? warning : null}
          />
        ))}
      </ScrollView>
    </View>
  );
}