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
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48; // отступы по 24 с каждой стороны

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
  alternatives: string[];
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Таймер отдыха
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Кэш альтернативных упражнений (чтобы не грузить каждый раз)
  const [alternativesCache, setAlternativesCache] = useState<Record<string, AlternativeExercise[]>>({});

  // Отслеживание замен: workout_exercise_id -> alternative_exercise_id
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  useEffect(() => {
    console.log('🔵 WorkoutSession: Загрузка тренировки', id);
    loadWorkout();
  }, [id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadWorkout = async () => {
    try {
      console.log(' Запрос тренировки из Supabase');
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

      console.log('✅ Тренировка загружена:', workout.name);
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
      console.log('✅ Упражнений загружено:', exercisesData.length);
    } catch (error: any) {
      console.error('🔴 Ошибка загрузки тренировки:', error);
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlternatives = async (exerciseId: string) => {
    if (alternativesCache[exerciseId]) {
      console.log('✅ Альтернативы из кэша для:', exerciseId);
      return alternativesCache[exerciseId];
    }

    try {
      console.log('🔍 Загрузка альтернатив для упражнения:', exerciseId);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .neq('id', exerciseId)
        .limit(10);

      if (error) throw error;

      const alternatives: AlternativeExercise[] = (data || []).map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        primary_muscles: getList(ex, 'primary_muscles'),
        technique: getString(ex, 'technique'),
        equipment: getList(ex, 'equipment'),
        settings: getString(ex, 'settings'),
        alternatives: getList(ex, 'alternatives'),
      }));

      setAlternativesCache(prev => ({ ...prev, [exerciseId]: alternatives }));
      console.log('✅ Найдено альтернатив:', alternatives.length);
      return alternatives;
    } catch (error: any) {
      console.error('🔴 Ошибка загрузки альтернатив:', error);
      return [];
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    console.log(`📝 Обновление: упр.${exerciseIndex}, подход ${setIndex + 1}, ${field} = ${value}`);
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
    console.log(`🔄 Замена упражнения ${exercise.name} на альтернативу ${alternativeId}`);
    
    const alternatives = await loadAlternatives(exercise.id);
    const alt = alternatives.find(a => a.id === alternativeId);
    
    if (!alt) {
      console.error('🔴 Альтернатива не найдена');
      return;
    }

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
        alternatives: alt.alternatives,
      };
      return updated;
    });

    setReplacements(prev => ({
      ...prev,
      [exercise.workout_exercise_id]: alternativeId,
    }));

    Alert.alert('✅ Заменено', `${exercise.name} → ${alt.name}`);
  };

  const resetToOriginal = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const workoutExId = exercise.workout_exercise_id;
    
    console.log(`↩️ Сброс к оригинальному упражнению для ${workoutExId}`);
    
    // Нужно загрузить оригинальное упражнение из БД
    // Для простоты - перезагружаем всю тренировку
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
    console.log(`⏱ Запуск таймера отдыха: ${restSeconds} сек`);
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
          console.log('✅ Таймер отдыха завершён');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    console.log('⏹ Остановка таймера отдыха');
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
    console.log(' Сохранение тренировки');
    
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
                  console.log(`📤 Сохранение ${logsToSave.length} подходов для ${exercise.name}`);
                  const { error } = await supabase
                    .from('workout_logs')
                    .insert(logsToSave);
                  
                  if (error) throw error;
                  totalLogs += logsToSave.length;
                }
              }

              console.log(`✅ Тренировка сохранена! Подходов: ${totalLogs}`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Успех', `Тренировка завершена! Сохранено подходов: ${totalLogs}`);
              router.replace('/(tabs)/history');
            } catch (error: any) {
              console.error('🔴 Ошибка сохранения:', error);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{workoutName}</Text>
        <TouchableOpacity 
          style={[styles.finishButton, saving && styles.finishButtonDisabled]} 
          onPress={saveWorkout}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.finishButtonText}>Завершить</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Таймер отдыха */}
      {restTimer !== null && (
        <View style={styles.restTimer}>
          <Text style={styles.restTimerLabel}>Отдых</Text>
          <Text style={styles.restTimerTime}>{formatTime(restTimeLeft)}</Text>
          <TouchableOpacity style={styles.skipButton} onPress={stopRestTimer}>
            <Text style={styles.skipButtonText}>Пропустить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Список упражнений со слайдерами */}
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
            onSetCompleted={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Компонент слайдера упражнения
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
  onSetCompleted,
}: {
  exercise: ExerciseData;
  exerciseIndex: number;
  isReplaced: boolean;
  alternativesCache: Record<string, AlternativeExercise[]>;
  loadAlternatives: (id: string) => Promise<AlternativeExercise[]>;
  updateSet: (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  isSetCompleted: (set: SetData) => boolean;
  replaceExercise: (exIndex: number, altId: string) => void;
  resetToOriginal: (exIndex: number) => void;
  startRestTimer: (seconds: number) => void;
  onSetCompleted: () => void;
}) {
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (exercise.alternatives.length > 0 || isReplaced) {
        setLoadingAlts(true);
        const alts = await loadAlternatives(exercise.id);
        setAlternatives(alts);
        setLoadingAlts(false);
      }
    };
    load();
  }, [exercise.id]);

  const allCards = [exercise, ...alternatives];

  return (
    <View style={styles.exerciseSection}>
      {/* Индикатор замены */}
      {isReplaced && (
        <View style={styles.replacedBadge}>
          <Text style={styles.replacedText}>🔄 Заменено</Text>
          <TouchableOpacity onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={styles.resetText}>Вернуть</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Слайдер карточек */}
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
            onSetCompleted={onSetCompleted}
            loadingAlts={loadingAlts}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Компонент карточки упражнения
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
  onSetCompleted,
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
  onSetCompleted: () => void;
  loadingAlts: boolean;
}) {
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
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      {/* Заголовок */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{exercise.name}</Text>
        {exercise.primary_muscles.length > 0 && (
          <Text style={styles.musclesText}>
            {exercise.primary_muscles.join(', ')}
          </Text>
        )}
      </View>

      {/* Сворачиваемые секции */}
      {exercise.technique ? (
        <CollapsibleSection
          title="Техника выполнения"
          expanded={expandedSections.technique}
          onToggle={() => toggleSection('technique')}
        >
          <Text style={styles.sectionText}>{exercise.technique}</Text>
        </CollapsibleSection>
      ) : null}

      {exercise.equipment.length > 0 && (
        <CollapsibleSection
          title="Оборудование"
          expanded={expandedSections.equipment}
          onToggle={() => toggleSection('equipment')}
        >
          <Text style={styles.sectionText}>{exercise.equipment.join(', ')}</Text>
        </CollapsibleSection>
      )}

{exercise.settings ? (
  <CollapsibleSection
    title="Настройки"
    expanded={expandedSections.settings}
    onToggle={() => toggleSection('settings')}
  >
    <Text style={styles.sectionText}>{exercise.settings}</Text>
  </CollapsibleSection>
) : null}

      {/* Кнопка замены (только для альтернатив или если уже заменено) */}
      {!isMain && (
        <TouchableOpacity
          style={styles.replaceButton}
          onPress={() => replaceExercise(exerciseIndex, exercise.id)}
        >
          <Text style={styles.replaceButtonText}> Заменить на это</Text>
        </TouchableOpacity>
      )}

      {/* Таблица подходов (только для основного/заменённого упражнения) */}
      {hasSets && sets.length > 0 && (
        <View style={styles.setsSection}>
          <View style={styles.setsHeader}>
            <View style={styles.setLabelCell}>
              <Text style={styles.setLabelText}>Подход</Text>
            </View>
            {sets.map((_, setIndex) => (
              <View key={setIndex} style={styles.setDataCell}>
                <Text style={styles.setDataText}>{setIndex + 1}</Text>
              </View>
            ))}
          </View>

          {/* Строка веса */}
          <View style={styles.setsRow}>
            <View style={styles.setLabelCell}>
              <Text style={styles.setLabelText}>Вес (кг)</Text>
            </View>
            {sets.map((set, setIndex) => (
              <View 
                key={setIndex} 
                style={[
                  styles.setDataCell,
                  isSetCompleted(set) && styles.completedCell,
                ]}
              >
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.weight}
                  onChangeText={(val) => {
                    updateSet(exerciseIndex, setIndex, 'weight', val);
                    if (val) onSetCompleted();
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ))}
          </View>

          {/* Строка повторений */}
          <View style={styles.setsRow}>
            <View style={styles.setLabelCell}>
              <Text style={styles.setLabelText}>Повт.</Text>
            </View>
            {sets.map((set, setIndex) => (
              <View 
                key={setIndex} 
                style={[
                  styles.setDataCell,
                  isSetCompleted(set) && styles.completedCell,
                ]}
              >
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  value={set.reps}
                  onChangeText={(val) => {
                    updateSet(exerciseIndex, setIndex, 'reps', val);
                    if (val) onSetCompleted();
                  }}
                  keyboardType="number-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ))}
          </View>

          {/* Кнопка отдыха */}
          <TouchableOpacity
            style={styles.restButton}
            onPress={() => startRestTimer(restSeconds)}
          >
            <Text style={styles.restButtonText}>⏱ Отдых {restSeconds}с</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Компонент сворачиваемой секции
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
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity style={styles.collapsibleHeader} onPress={onToggle}>
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Text style={styles.collapsibleArrow}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  finishButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  restTimer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  restTimerLabel: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  restTimerTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  skipButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  skipButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  scrollView: { flex: 1 },
  exerciseSection: {
    marginTop: 16,
  },
  replacedBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  replacedText: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resetText: {
    color: '#7c3aed',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  sliderContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 12,
    minHeight: 50,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  musclesText: {
    fontSize: 14,
    color: '#6b7280',
  },

  collapsibleSection: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  collapsibleArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  collapsibleContent: {
    padding: 12,
    backgroundColor: 'white',
  },
  sectionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  replaceButton: {
    backgroundColor: '#7c3aed',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  replaceButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  setsSection: {
    marginTop: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setLabelCell: {
    width: 70,
    justifyContent: 'center',
  },
  setLabelText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  setDataCell: {
    flex: 1,
    marginHorizontal: 2,
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCell: {
    backgroundColor: '#d1fae5',
  },
  setDataText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  setInput: {
    fontSize: 16,
    textAlign: 'center',
    color: '#1f2937',
    width: '100%',
  },

  restButton: {
    backgroundColor: '#7c3aed',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  restButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});