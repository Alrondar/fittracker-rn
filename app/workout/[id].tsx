import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../src/constants/theme';
import { RotateCcw, Clock, ChevronDown, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Save } from 'lucide-react-native'; // Добавь этот импорт

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface SetData {
  weight: string;
  reps: string;
}

interface ExerciseData {
  id: string;
  workout_exercise_id: string;
  name: string;
  primary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
  alternatives: string[];
  target_sets: number;
  rest_seconds: number;
  sets: SetData[];
}

interface AlternativeExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [alternativesCache, setAlternativesCache] = useState<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadWorkout = async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(`
          name, 
          workout_exercises (
            id, 
            target_sets, 
            rest_seconds, 
            exercises (
              id, 
              name, 
              primary_muscles, 
              technique, 
              equipment, 
              settings, 
              alternatives
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setWorkoutName(workout.name);

      const exercisesData: ExerciseData[] = workout.workout_exercises.map((we: any) => {
        const exercise = we.exercises;
        const sets: SetData[] = [];
        for (let i = 0; i < we.target_sets; i++) {
          sets.push({ weight: '', reps: '' });
        }
        return {
          id: exercise.id,
          workout_exercise_id: we.id,
          name: exercise.name,
          primary_muscles: getList(exercise, 'primary_muscles'),
          technique: getString(exercise, 'technique'),
          equipment: getList(exercise, 'equipment'),
          settings: getString(exercise, 'settings'),
          alternatives: getList(exercise, 'alternatives'),
          target_sets: we.target_sets,
          rest_seconds: we.rest_seconds,
          sets,
        };
      });

      setExercises(exercisesData);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlternatives = async (exerciseId: string, primaryMuscles: string[]) => {
    if (alternativesCache[exerciseId]) {
      return alternativesCache[exerciseId];
    }

    try {
      let query = supabase
        .from('exercises')
        .select('*')
        .neq('id', exerciseId);

      if (primaryMuscles.length > 0) {
        query = query.overlaps('primary_muscles', primaryMuscles);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;

      const alternatives: AlternativeExercise[] = (data || []).map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        primary_muscles: getList(ex, 'primary_muscles'),
        technique: getString(ex, 'technique'),
        equipment: getList(ex, 'equipment'),
        settings: getString(ex, 'settings'),
      }));

      setAlternativesCache(prev => ({ ...prev, [exerciseId]: alternatives }));
      return alternatives;
    } catch (error: any) {
      return [];
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const sets = [...exercise.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      exercise.sets = sets;
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const isSetCompleted = (set: SetData): boolean => {
    return set.weight !== '' || set.reps !== '';
  };

  const replaceExercise = async (exerciseIndex: number, alternativeId: string) => {
    const exercise = exercises[exerciseIndex];
    const alternatives = await loadAlternatives(exercise.id, exercise.primary_muscles);
    const alt = alternatives.find(a => a.id === alternativeId);
    if (!alt) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        id: alt.id,
        name: alt.name,
        primary_muscles: alt.primary_muscles,
        technique: alt.technique,
        equipment: alt.equipment,
        settings: alt.settings,
      };
      return updated;
    });

    setReplacements(prev => ({
      ...prev,
      [exercise.workout_exercise_id]: alternativeId,
    }));

    Alert.alert('Заменено', `${exercise.name} → ${alt.name}`);
  };

  const resetToOriginal = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const workoutExId = exercise.workout_exercise_id;

    Alert.alert(
      'Вернуть оригинальное упражнение?',
      'Данные подходов сохранятся',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Вернуть',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            loadWorkout();
            setReplacements(prev => {
              const updated = { ...prev };
              delete updated[workoutExId];
              return updated;
            });
          },
        },
      ]
    );
  };

  const startRestTimer = (restSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimeLeft(restSeconds);
    setRestTimer(restSeconds);

    timerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRestTimer(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(null);
    setRestTimeLeft(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveWorkout = async () => {
    Alert.alert(
      'Завершить тренировку?',
      'Все данные будут сохранены',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: async () => {
            setSaving(true);
            try {
              let totalLogs = 0;

              for (const exercise of exercises) {
                const logsToSave = exercise.sets
                  .filter(set => isSetCompleted(set))
                  .map((set, index) => ({
                    workout_exercise_id: exercise.workout_exercise_id,
                    set_number: index + 1,
                    weight_kg: parseFloat(set.weight) || 0,
                    reps: parseInt(set.reps) || 0,
                  }));

                if (logsToSave.length > 0) {
                  const { error } = await supabase
                    .from('workout_logs')
                    .insert(logsToSave);
                  if (error) throw error;
                  totalLogs += logsToSave.length;
                }
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Успех', `Тренировка завершена! Сохранено подходов: ${totalLogs}`);
              router.replace('/(tabs)/history');
            } catch (error: any) {
              Alert.alert('Ошибка', error.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <View style={[styles.finishButton, { backgroundColor: colors.textTertiary }]}>
              <ActivityIndicator color="white" size="small" />
            </View>
          ) : (
            <LinearGradient
              colors={GRADIENTS.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finishButton}
            >
              <Text style={styles.finishButtonText}>Завершить</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Таймер отдыха */}
      {restTimer !== null && (
        <View style={[styles.restTimer, { backgroundColor: colors.warningLight, borderBottomColor: colors.warning }]}>
          <Text style={[styles.restTimerLabel, { color: colors.warning }]}>Отдых</Text>
          <Text style={[styles.restTimerTime, { color: colors.warning }]}>{formatTime(restTimeLeft)}</Text>
          <TouchableOpacity style={[styles.skipButton, { backgroundColor: colors.warning }]} onPress={stopRestTimer}>
            <Text style={styles.skipButtonText}>Пропустить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Список упражнений */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {exercises.map((exercise, exIndex) => (
          <ExerciseSlider
            key={exercise.workout_exercise_id}
            exercise={exercise}
            exerciseIndex={exIndex}
            isReplaced={!!replacements[exercise.workout_exercise_id]}
            alternativesCache={alternativesCache}
            loadAlternatives={loadAlternatives}
            updateSet={updateSet}
            isSetCompleted={isSetCompleted}
            replaceExercise={replaceExercise}
            resetToOriginal={resetToOriginal}
            startRestTimer={startRestTimer}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ExerciseSlider({
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
}: {
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
}) {
  const { colors } = useTheme();
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
    <View style={styles.exerciseSection}>
      {isReplaced && (
        <View style={[styles.replacedBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.replacedText, { color: colors.primary }]}>Заменено</Text>
          <TouchableOpacity onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={[styles.resetText, { color: colors.primary }]}>Вернуть</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.sliderContainer}
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
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ExerciseCard({
  exercise,
  isMain,
  isReplaced,
  exerciseIndex,
  alternatives,
  updateSet,
  isSetCompleted,
  replaceExercise,
  startRestTimer,
  loadingAlts,
}: {
  exercise: ExerciseData | AlternativeExercise;
  isMain: boolean;
  isReplaced: boolean;
  exerciseIndex: number;
  alternatives: AlternativeExercise[];
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  startRestTimer: (seconds: number) => void;
  loadingAlts: boolean;
}) {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    technique: false,
    equipment: false,
    settings: false,
  });

  const toggleSection = (section: 'technique' | 'equipment' | 'settings') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;

  return (
    <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {exercise.name}
        </Text>
        {'primary_muscles' in exercise && (exercise as ExerciseData).primary_muscles.length > 0 && (
          <Text style={[styles.musclesText, { color: colors.textSecondary }]}>
            {(exercise as ExerciseData).primary_muscles.join(', ')}
          </Text>
        )}
      </View>

      {'technique' in exercise && (exercise as ExerciseData).technique ? (
        <CollapsibleSection
          title="Техника выполнения"
          expanded={expandedSections.technique}
          onToggle={() => toggleSection('technique')}
        >
          <Text style={[styles.sectionText, { color: colors.textPrimary }]}>
            {(exercise as ExerciseData).technique}
          </Text>
        </CollapsibleSection>
      ) : null}

      {'equipment' in exercise && (exercise as ExerciseData).equipment.length > 0 && (
        <CollapsibleSection
          title="Оборудование"
          expanded={expandedSections.equipment}
          onToggle={() => toggleSection('equipment')}
        >
          <Text style={[styles.sectionText, { color: colors.textPrimary }]}>
            {(exercise as ExerciseData).equipment.join(', ')}
          </Text>
        </CollapsibleSection>
      )}

      {'settings' in exercise && (exercise as ExerciseData).settings ? (
        <CollapsibleSection
          title="Настройки"
          expanded={expandedSections.settings}
          onToggle={() => toggleSection('settings')}
        >
          <Text style={[styles.sectionText, { color: colors.textPrimary }]}>
            {(exercise as ExerciseData).settings}
          </Text>
        </CollapsibleSection>
      ) : null}

      {!isMain && (
        <TouchableOpacity
          style={[styles.replaceButton, { backgroundColor: colors.primary }]}
          onPress={() => replaceExercise(exerciseIndex, exercise.id)}
        >
          <View style={styles.replaceButtonContent}>
            <RotateCcw size={16} color="white" strokeWidth={2} />
            <Text style={styles.replaceButtonText}>Заменить на это</Text>
          </View>
        </TouchableOpacity>
      )}

      {hasSets && sets.length > 0 && (
        <View style={styles.setsSection}>
          <View style={styles.setsHeader}>
            <View style={styles.setLabelCell}>
              <Text style={[styles.setLabelText, { color: colors.textSecondary }]}>Подход</Text>
            </View>
            {sets.map((_, setIndex) => (
              <View key={setIndex} style={styles.setDataCell}>
                <Text style={[styles.setDataText, { color: colors.textPrimary }]}>{setIndex + 1}</Text>
              </View>
            ))}
          </View>

          <View style={styles.setsRow}>
            <View style={styles.setLabelCell}>
              <Text style={[styles.setLabelText, { color: colors.textSecondary }]}>Вес (кг)</Text>
            </View>
            {sets.map((set, setIndex) => (
              <View
                key={setIndex}
                style={[
                  styles.setDataCell,
                  { backgroundColor: isSetCompleted(set) ? colors.successLight : colors.surfaceSecondary },
                ]}
              >
                <TextInput
                  style={[styles.setInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  value={set.weight}
                  onChangeText={(val) => updateSet(exerciseIndex, setIndex, 'weight', val)}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ))}
          </View>

          <View style={styles.setsRow}>
            <View style={styles.setLabelCell}>
              <Text style={[styles.setLabelText, { color: colors.textSecondary }]}>Повт.</Text>
            </View>
            {sets.map((set, setIndex) => (
              <View
                key={setIndex}
                style={[
                  styles.setDataCell,
                  { backgroundColor: isSetCompleted(set) ? colors.successLight : colors.surfaceSecondary },
                ]}
              >
                <TextInput
                  style={[styles.setInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  value={set.reps}
                  onChangeText={(val) => updateSet(exerciseIndex, setIndex, 'reps', val)}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.restButton, { backgroundColor: colors.primary }]}
            onPress={() => startRestTimer(restSeconds)}
          >
            <View style={styles.replaceButtonContent}>
              <Clock size={16} color="white" strokeWidth={2} />
              <Text style={styles.restButtonText}>Отдых {restSeconds}с</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
    <View style={[styles.collapsibleSection, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.collapsibleHeader, { backgroundColor: colors.surfaceSecondary }]}
        onPress={onToggle}
      >
        <Text style={[styles.collapsibleTitle, { color: colors.textPrimary }]}>{title}</Text>
        {expanded ? (
          <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.collapsibleContent, { backgroundColor: colors.surface }]}>
          {children}
        </View>
      )}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: SPACING.md,
  },
  finishButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  restTimer: {
    padding: SPACING.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  restTimerLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  restTimerTime: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  skipButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
  },
  skipButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: { flex: 1 },
  exerciseSection: {
    marginTop: SPACING.lg,
  },
  replacedBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  replacedText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  resetText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  sliderContainer: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: SPACING.md,
    minHeight: 50,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  musclesText: {
    fontSize: 14,
  },
  collapsibleSection: {
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  collapsibleArrow: {
    fontSize: 12,
  },
  collapsibleContent: {
    padding: SPACING.md,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  replaceButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  replaceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  replaceButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  setsSection: {
    marginTop: SPACING.lg,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  setsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  setLabelCell: {
    width: 70,
    justifyContent: 'center',
  },
  setLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setDataCell: {
    flex: 1,
    marginHorizontal: 2,
    padding: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setDataText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  setInput: {
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  restButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  restButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});