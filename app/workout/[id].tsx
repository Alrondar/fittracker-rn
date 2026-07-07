import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronRight,
  Settings,
  Wrench,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Minus,
  TrendingDown,
  X,
  Plus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advanceProgramProgress } from '../../src/servises/programsService';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { createInputStyles } from '../../src/styles/components/input';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface SetData {
  weight: string;
  reps: string;
}

interface ExerciseData {
  id: string;
  workout_exercise_id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
  benefits: string;
  risks: string;
  injuries: string[];
  alternatives: string[];
  target_sets: number;
  rest_seconds: number;
  intensity: string;
  sets: SetData[];
}

interface AlternativeExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
  benefits: string;
  risks: string;
  injuries: string[];
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors, gradients } = useTheme();
  const [workoutName, setWorkoutName] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [alternativesCache, setAlternativesCache] = useState<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);
  const inputStyles = createInputStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

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
          program_id,
          workout_exercises (
            id,
            target_sets,
            rest_seconds,
            exercises (
              id,
              name,
              primary_muscles,
              secondary_muscles,
              technique,
              equipment,
              settings,
              benefits,
              risks,
              injuries,
              alternatives
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setWorkoutName(workout.name);
      setProgramId(workout.program_id);

      let intensityMap: Record<string, string> = {};
      if (workout.program_id) {
        const { data: programExercises, error: peError } = await supabase
          .from('program_exercises')
          .select('exercise_id, intensity')
          .eq('program_id', workout.program_id);

        if (!peError && programExercises) {
          programExercises.forEach((pe: any) => {
            intensityMap[pe.exercise_id] = pe.intensity || 'medium';
          });
        }
      }

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
          secondary_muscles: getList(exercise, 'secondary_muscles'),
          technique: getString(exercise, 'technique'),
          equipment: getList(exercise, 'equipment'),
          settings: getString(exercise, 'settings'),
          benefits: getString(exercise, 'benefits'),
          risks: getString(exercise, 'risks'),
          injuries: getList(exercise, 'injuries'),
          alternatives: getList(exercise, 'alternatives'),
          target_sets: we.target_sets,
          rest_seconds: we.rest_seconds,
          intensity: intensityMap[exercise.id] || 'medium',
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
        secondary_muscles: getList(ex, 'secondary_muscles'),
        technique: getString(ex, 'technique'),
        equipment: getList(ex, 'equipment'),
        settings: getString(ex, 'settings'),
        benefits: getString(ex, 'benefits'),
        risks: getString(ex, 'risks'),
        injuries: getList(ex, 'injuries'),
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

  // Обновление количества подходов и времени отдыха
  const updateExerciseSettings = (exerciseIndex: number, newSetsCount: number, newRestSeconds: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const currentSets = exercise.sets;
      const newSets: SetData[] = [];
      
      for (let i = 0; i < newSetsCount; i++) {
        if (i < currentSets.length) {
          newSets.push(currentSets[i]);
        } else {
          newSets.push({ weight: '', reps: '' });
        }
      }
      
      exercise.sets = newSets;
      exercise.rest_seconds = newRestSeconds;
      updated[exerciseIndex] = exercise;
      return updated;
    });
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
        secondary_muscles: alt.secondary_muscles,
        technique: alt.technique,
        equipment: alt.equipment,
        settings: alt.settings,
        benefits: alt.benefits,
        risks: alt.risks,
        injuries: alt.injuries,
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
              if (programId && userId) {
                try {
                  const progress = await advanceProgramProgress(userId, programId);
                  if (progress.isCompleted) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                      'Программа завершена!',
                      'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе "Программы".'
                    );
                    router.replace('/(tabs)/programs');
                  } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                      'Тренировка завершена!',
                      `Следующий день: Неделя ${progress.week}, День ${progress.day}\n\nСохранено подходов: ${totalLogs}`
                    );
                    router.replace('/(tabs)/workouts');
                  }
                } catch (progressError: any) {
                  console.error('Ошибка обновления прогресса:', progressError);
                  Alert.alert('Успех', `Тренировка завершена! Сохранено подходов: ${totalLogs}`);
                  router.replace('/(tabs)/history');
                }
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Успех', `Тренировка завершена! Сохранено подходов: ${totalLogs}`);
                router.replace('/(tabs)/history');
              }
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

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return {
          label: 'Высокая',
          color: '#F44336',
          bgColor: '#F4433620',
          icon: <TrendingUp size={14} color="#F44336" strokeWidth={2} />,
        };
      case 'medium':
        return {
          label: 'Средняя',
          color: '#FFC107',
          bgColor: '#FFC10720',
          icon: <Minus size={14} color="#FFC107" strokeWidth={2} />,
        };
      case 'low':
        return {
          label: 'Низкая',
          color: '#4CAF50',
          bgColor: '#4CAF5020',
          icon: <TrendingDown size={14} color="#4CAF50" strokeWidth={2} />,
        };
      default:
        return {
          label: intensity,
          color: colors.textSecondary,
          bgColor: colors.textSecondary + '20',
          icon: <Minus size={14} color={colors.textSecondary} strokeWidth={2} />,
        };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Таймер отдыха (глобальный) */}
      {restTimer !== null && (
        <View style={[{ padding: SPACING.lg, alignItems: 'center', borderBottomWidth: 1, backgroundColor: colors.warningLight, borderBottomColor: colors.warning }]}>
          <Text style={[{ fontSize: 14, color: colors.warning, marginBottom: 4 }]}>Отдых</Text>
          <Text style={[{ fontSize: 32, fontWeight: 'bold', color: colors.warning, marginBottom: SPACING.md }]}>{formatTime(restTimeLeft)}</Text>
          <TouchableOpacity style={[{ paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: 16, backgroundColor: colors.warning }]} onPress={stopRestTimer}>
            <Text style={[{ color: 'white', fontWeight: 'bold' }]}>Пропустить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Список упражнений */}
      <ScrollView style={commonStyles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
            getIntensityInfo={getIntensityInfo}
            updateExerciseSettings={updateExerciseSettings}
          />
        ))}
      </ScrollView>

      {/* Floating кнопка "Завершить" */}
      <View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[{ borderRadius: BORDER_RADIUS.xl, overflow: 'hidden' }]}
          onPress={saveWorkout}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <View style={[{ paddingVertical: 16, alignItems: 'center', backgroundColor: colors.textTertiary }]}>
              <ActivityIndicator color="white" size="small" />
            </View>
          ) : (
            <LinearGradient
              colors={gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 16 }]}>Завершить тренировку</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  getIntensityInfo,
  updateExerciseSettings,
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
  getIntensityInfo: (intensity: string) => { label: string; color: string; bgColor: string; icon: React.ReactNode };
  updateExerciseSettings: (exIndex: number, setsCount: number, restSeconds: number) => void;
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
    <View style={{ marginTop: SPACING.lg }}>
      {isReplaced && (
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm }]}>
          <Text style={[{ fontWeight: 'bold', fontSize: 14, color: colors.primary }]}>Заменено</Text>
          <TouchableOpacity onPress={() => resetToOriginal(exerciseIndex)}>
            <Text style={[{ fontSize: 14, color: colors.primary, textDecorationLine: 'underline' }]}>Вернуть</Text>
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
  getIntensityInfo,
  updateExerciseSettings,
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
  getIntensityInfo: (intensity: string) => { label: string; color: string; bgColor: string; icon: React.ReactNode };
  updateExerciseSettings: (exIndex: number, setsCount: number, restSeconds: number) => void;
}) {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    technique: false,
    equipment: false,
    settings: false,
    benefits: false,
    risks: false,
    injuries: false,
  });
  
  // Состояние для bottom sheet
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [localSets, setLocalSets] = useState(0);
  const [localRest, setLocalRest] = useState(0);

  const cardStyles = createCardStyles(colors);

  const toggleSection = (section: 'technique' | 'equipment' | 'settings' | 'benefits' | 'risks' | 'injuries') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';
  const intensityInfo = getIntensityInfo(intensity);

  const setsPerRow = 3;
  const setRows: SetData[][] = [];
  for (let i = 0; i < sets.length; i += setsPerRow) {
    setRows.push(sets.slice(i, i + setsPerRow));
  }

  // Открытие bottom sheet с текущими значениями
  const openSettingsSheet = () => {
    setLocalSets(sets.length);
    setLocalRest(restSeconds);
    setShowSettingsSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Сохранение настроек
  const saveSettings = () => {
    // Проверяем, не удаляем ли мы заполненные подходы
    if (localSets < sets.length) {
      const removedSets = sets.slice(localSets);
      const hasData = removedSets.some(s => s.weight !== '' || s.reps !== '');
      if (hasData) {
        Alert.alert(
          'Удалить подходы?',
          `Будут удалены подходы ${localSets + 1}-${sets.length} с введёнными данными. Продолжить?`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                updateExerciseSettings(exerciseIndex, localSets, localRest);
                setShowSettingsSheet(false);
              },
            },
          ]
        );
        return;
      }
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateExerciseSettings(exerciseIndex, localSets, localRest);
    setShowSettingsSheet(false);
  };

  const changeSets = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, localSets + delta));
    if (newValue !== localSets) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLocalSets(newValue);
    }
  };

  const changeRest = (delta: number) => {
    const newValue = Math.max(30, Math.min(300, localRest + delta));
    if (newValue !== localRest) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLocalRest(newValue);
    }
  };

// Функция для получения конфигурации строк подходов
const getSetRowsConfig = (totalSets: number): number[] => {
  if (totalSets <= 3) return [totalSets];
  if (totalSets === 4) return [4];
  if (totalSets === 5) return [3, 2];
  if (totalSets === 6) return [3, 3];
  if (totalSets === 7) return [4, 3];
  if (totalSets === 8) return [4, 4];
  if (totalSets === 9) return [3, 3, 3];
  if (totalSets === 10) return [4, 3, 3];
  if (totalSets === 11) return [4, 4, 3];
  if (totalSets === 12) return [4, 4, 4];
  return [3]; // fallback
};

const setRowsConfig = getSetRowsConfig(sets.length);

  return (
    <View style={[cardStyles.container, { width: CARD_WIDTH, marginHorizontal: 0 }]}>
{/* Шапка: название + иконка свайпа + настройки + интенсивность */}
<View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }]}>
  <Text style={[{ fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: SPACING.sm, lineHeight: 24, color: colors.textPrimary }]} numberOfLines={2}>
    {exercise.name}
  </Text>
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }]}>
    {/* Иконка свайпа (только для основной карточки с альтернативами) */}
    {isMain && alternatives.length > 0 && (
      <View style={[{ paddingHorizontal: 6, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary }]}>
        <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
      </View>
    )}
    {/* Кнопка настроек (только для основных) */}
    {isMain && (
      <TouchableOpacity
        onPress={openSettingsSheet}
        style={[{ padding: 6, borderRadius: BORDER_RADIUS.sm, backgroundColor: colors.surfaceSecondary }]}
      >
        <Settings size={18} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    )}
    {/* Интенсивность */}
    <View style={[{ paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: intensityInfo.bgColor }]}>
      {intensityInfo.icon}
      <Text style={[{ fontSize: 11, fontWeight: '600', color: intensityInfo.color }]}>
        {intensityInfo.label}
      </Text>
    </View>
  </View>
</View>

      {/* Мышцы-теги: основные */}
      {'primary_muscles' in exercise && (exercise as ExerciseData).primary_muscles.length > 0 && (
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md }]}>
          {(exercise as ExerciseData).primary_muscles.map((muscle, idx) => (
            <View key={idx} style={[{ paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
              <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.primary }]}>{muscle}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Мышцы-теги: вспомогательные */}
      {'secondary_muscles' in exercise && (exercise as ExerciseData).secondary_muscles.length > 0 && (
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md }]}>
          {(exercise as ExerciseData).secondary_muscles.map((muscle, idx) => (
            <View key={idx} style={[{ paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }]}>{muscle}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Коллапсируемая секция: Техника выполнения */}
      {'technique' in exercise && (exercise as ExerciseData).technique ? (
        <CollapsibleSection
          title="Техника выполнения"
          icon={<Settings size={16} color={colors.primary} strokeWidth={2} />}
          expanded={expandedSections.technique}
          onToggle={() => toggleSection('technique')}
          borderColor={colors.primary}
        >
          <Text style={[{ color: colors.textPrimary }]}>
            {(exercise as ExerciseData).technique}
          </Text>
        </CollapsibleSection>
      ) : null}

      {/* Сгруппированная секция: Оборудование + Настройки */}
      {('equipment' in exercise && (exercise as ExerciseData).equipment.length > 0) ||
       ('settings' in exercise && (exercise as ExerciseData).settings) ? (
        <GroupedSection borderColor={colors.primary}>
          {'equipment' in exercise && (exercise as ExerciseData).equipment.length > 0 && (
            <View style={[{ marginBottom: SPACING.md }]}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }]}>
                <Wrench size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }]}>Оборудование</Text>
              </View>
              <Text style={[{ fontSize: 14, color: colors.textPrimary }]}>
                {(exercise as ExerciseData).equipment.join(', ')}
              </Text>
            </View>
          )}
          {'equipment' in exercise && (exercise as ExerciseData).equipment.length > 0 &&
           'settings' in exercise && (exercise as ExerciseData).settings && (
            <View style={[{ height: 1, backgroundColor: colors.border, marginVertical: SPACING.md }]} />
          )}
          {'settings' in exercise && (exercise as ExerciseData).settings ? (
            <View style={[{ marginBottom: SPACING.md }]}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }]}>
                <Settings size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }]}>Настройки</Text>
              </View>
              <Text style={[{ fontSize: 14, color: colors.textPrimary }]}>
                {(exercise as ExerciseData).settings}
              </Text>
            </View>
          ) : null}
        </GroupedSection>
      ) : null}

      {/* Коллапсируемые секции (только для альтернатив) */}
      {!isMain && (
        <>
          {'benefits' in exercise && (exercise as ExerciseData).benefits ? (
            <CollapsibleSection
              title="Польза"
              icon={<CheckCircle size={16} color="#4CAF50" strokeWidth={2} />}
              expanded={expandedSections.benefits}
              onToggle={() => toggleSection('benefits')}
              borderColor="#4CAF50"
            >
              <Text style={[{ color: colors.textPrimary }]}>
                {(exercise as ExerciseData).benefits}
              </Text>
            </CollapsibleSection>
          ) : null}

          {'risks' in exercise && (exercise as ExerciseData).risks ? (
            <CollapsibleSection
              title="Риски"
              icon={<AlertTriangle size={16} color="#FF9800" strokeWidth={2} />}
              expanded={expandedSections.risks}
              onToggle={() => toggleSection('risks')}
              borderColor="#FF9800"
            >
              <Text style={[{ color: colors.textPrimary }]}>
                {(exercise as ExerciseData).risks}
              </Text>
            </CollapsibleSection>
          ) : null}

          {'injuries' in exercise && (exercise as ExerciseData).injuries.length > 0 && (
            <CollapsibleSection
              title="Противопоказания"
              icon={<AlertCircle size={16} color="#F44336" strokeWidth={2} />}
              expanded={expandedSections.injuries}
              onToggle={() => toggleSection('injuries')}
              borderColor="#F44336"
            >
              {(exercise as ExerciseData).injuries.map((injury, idx) => (
                <Text key={idx} style={[{ color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                  • {injury}
                </Text>
              ))}
            </CollapsibleSection>
          )}
        </>
      )}

      {/* Кнопка замены (только для альтернатив) */}
      {!isMain && (
        <TouchableOpacity
          style={[{ marginTop: SPACING.lg, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
          onPress={() => replaceExercise(exerciseIndex, exercise.id)}
        >
          <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[{ fontWeight: '600', fontSize: 14, color: colors.primary }]}>Заменить на это</Text>
        </TouchableOpacity>
      )}

      {/* Подходы (только для основных) */}
{hasSets && sets.length > 0 && (
  <View style={[{ marginTop: SPACING.lg, borderWidth: 1.5, borderColor: colors.primary, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' }]}>
    {/* Заголовок секции */}
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, backgroundColor: colors.surfaceSecondary }]}>
      <TrendingUp size={16} color={colors.primary} strokeWidth={2} />
      <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }]}>Подходы</Text>
    </View>
    
    {/* Содержимое */}
    <View style={[{ padding: SPACING.md, backgroundColor: colors.surface }]}>
      {setRowsConfig.map((rowSize, rowIndex) => {
        const startIndex = setRowsConfig.slice(0, rowIndex).reduce((sum, size) => sum + size, 0);
        const rowSets = sets.slice(startIndex, startIndex + rowSize);
        
        return (
          <View key={rowIndex} style={{ marginBottom: SPACING.md }}>
            {/* Номера подходов */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {rowSets.map((_, setIndex) => {
                const globalIndex = startIndex + setIndex;
                return (
                  <View key={setIndex} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary }]}>
                      {globalIndex + 1}
                    </Text>
                  </View>
                );
              })}
            </View>
            {/* Вес */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {rowSets.map((set, setIndex) => {
                const globalIndex = startIndex + setIndex;
                return (
                  <View
                    key={setIndex}
                    style={[
                      { flex: 1, padding: 8, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
                      isSetCompleted(set) ? { backgroundColor: colors.successLight } : { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <TextInput
                      style={[{ fontSize: 12, textAlign: 'center', color: colors.textPrimary, width: '100%' }]}
                      placeholder="вес (кг)"
                      value={set.weight}
                      onChangeText={(val) => updateSet(exerciseIndex, globalIndex, 'weight', val)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                );
              })}
            </View>
            {/* Повторения */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {rowSets.map((set, setIndex) => {
                const globalIndex = startIndex + setIndex;
                return (
                  <View
                    key={setIndex}
                    style={[
                      { flex: 1, padding: 8, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
                      isSetCompleted(set) ? { backgroundColor: colors.successLight } : { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <TextInput
                      style={[{ fontSize: 12, textAlign: 'center', color: colors.textPrimary, width: '100%' }]}
                      placeholder="повт."
                      value={set.reps}
                      onChangeText={(val) => updateSet(exerciseIndex, globalIndex, 'reps', val)}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      <TouchableOpacity
        style={[{ marginTop: SPACING.md, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.primary }]}
        onPress={() => startRestTimer(restSeconds)}
      >
        <Clock size={16} color="white" strokeWidth={2} />
        <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 15 }]}>Отдых {restSeconds}с</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
      {/* Bottom Sheet для настроек */}
      {isMain && (
        <Modal
          visible={showSettingsSheet}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsSheet(false)}
        >
          <Pressable
            style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }]}
            onPress={() => setShowSettingsSheet(false)}
          >
            <Pressable
              style={[{ 
                backgroundColor: colors.surface, 
                borderTopLeftRadius: 20, 
                borderTopRightRadius: 20, 
                padding: SPACING.lg,
                maxHeight: '70%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 10,
              }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }]}>
                <Text style={[{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }]}>Настройки упражнения</Text>
                <TouchableOpacity onPress={() => setShowSettingsSheet(false)}>
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Подходы */}
              <View style={[{ marginBottom: SPACING.lg }]}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: SPACING.md }]}>Количество подходов</Text>
                <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }]}>
                  <TouchableOpacity
                    onPress={() => changeSets(-1)}
                    disabled={localSets <= 1}
                    style={[{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 22, 
                      backgroundColor: localSets <= 1 ? colors.surfaceSecondary : colors.primaryLight,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      opacity: localSets <= 1 ? 0.5 : 1,
                    }]}
                  >
                    <Minus size={20} color={localSets <= 1 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <Text style={[{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, minWidth: 40, textAlign: 'center' }]}>
                    {localSets}
                  </Text>
                  <TouchableOpacity
                    onPress={() => changeSets(1)}
                    disabled={localSets >= 10}
                    style={[{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 22, 
                      backgroundColor: localSets >= 10 ? colors.surfaceSecondary : colors.primaryLight,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      opacity: localSets >= 10 ? 0.5 : 1,
                    }]}
                  >
                    <Plus size={20} color={localSets >= 10 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Отдых */}
              <View style={[{ marginBottom: SPACING.lg }]}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: SPACING.md }]}>Отдых между подходами</Text>
                <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }]}>
                  <TouchableOpacity
                    onPress={() => changeRest(-15)}
                    disabled={localRest <= 30}
                    style={[{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 22, 
                      backgroundColor: localRest <= 30 ? colors.surfaceSecondary : colors.primaryLight,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      opacity: localRest <= 30 ? 0.5 : 1,
                    }]}
                  >
                    <Minus size={20} color={localRest <= 30 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <Text style={[{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, minWidth: 80, textAlign: 'center' }]}>
                    {localRest}с
                  </Text>
                  <TouchableOpacity
                    onPress={() => changeRest(15)}
                    disabled={localRest >= 300}
                    style={[{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 22, 
                      backgroundColor: localRest >= 300 ? colors.surfaceSecondary : colors.primaryLight,
                      alignItems: 'center', 
                      justifyContent: 'center',
                      opacity: localRest >= 300 ? 0.5 : 1,
                    }]}
                  >
                    <Plus size={20} color={localRest >= 300 ? colors.textTertiary : colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Кнопка сохранить */}
              <TouchableOpacity
                onPress={saveSettings}
                style={[{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' }]}
              >
                <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 16 }]}>Сохранить</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  borderColor,
  children
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  borderColor: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[{ marginBottom: SPACING.sm, borderWidth: 1.5, borderColor, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' }]}>
      <TouchableOpacity
        style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, backgroundColor: colors.surfaceSecondary }]}
        onPress={onToggle}
      >
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }]}>
          {icon}
          <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }]}>{title}</Text>
        </View>
        {expanded ? (
          <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
        ) : (
          <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={[{ padding: SPACING.md, backgroundColor: colors.surface }]}>
          {children}
        </View>
      )}
    </View>
  );
}

function GroupedSection({
  borderColor,
  children
}: {
  borderColor: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[{ marginBottom: SPACING.sm, borderWidth: 1.5, borderColor, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' }]}>
      <View style={[{ padding: SPACING.md, backgroundColor: colors.surface }]}>
        {children}
      </View>
    </View>
  );
}