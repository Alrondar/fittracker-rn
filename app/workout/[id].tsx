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
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px отступа с каждой стороны

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

      // Подтягиваем intensity из program_exercises
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
}) {
  const { colors } = useTheme();
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  const badgeStyles = createBadgeStyles(colors);

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

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);
  const inputStyles = createInputStyles(colors);

  const toggleSection = (section: 'technique' | 'equipment' | 'settings' | 'benefits' | 'risks' | 'injuries') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasSets = 'sets' in exercise;
  const sets = hasSets ? (exercise as ExerciseData).sets : [];
  const restSeconds = hasSets ? (exercise as ExerciseData).rest_seconds : 0;
  const intensity = hasSets ? (exercise as ExerciseData).intensity : 'medium';
  const intensityInfo = getIntensityInfo(intensity);

  // Разбить подходы на строки по 3
  const setsPerRow = 3;
  const setRows: SetData[][] = [];
  for (let i = 0; i < sets.length; i += setsPerRow) {
    setRows.push(sets.slice(i, i + setsPerRow));
  }

  return (
    <View style={[
  cardStyles.container,
  {
    width: CARD_WIDTH,
    marginHorizontal: 0, // ← Добавлено
  }
]}>
      {/* Шапка: название + интенсивность */}
      <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: SPACING.sm, lineHeight: 24, color: colors.textPrimary }]} numberOfLines={2}>
          {exercise.name}
        </Text>
        <View style={[{ paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: intensityInfo.bgColor }]}>
          {intensityInfo.icon}
          <Text style={[{ fontSize: 11, fontWeight: '600', color: intensityInfo.color }]}>
            {intensityInfo.label}
          </Text>
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
        <View style={[{ marginTop: SPACING.lg }]}>
          {setRows.map((row, rowIndex) => (
            <View key={rowIndex}>
              {/* Заголовки подходов */}
              <View style={[{ flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' }]}>
                <View style={[{ width: 70 }]}>
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }]}>Подход</Text>
                </View>
                {row.map((_, setIndex) => {
                  const globalIndex = rowIndex * setsPerRow + setIndex;
                  return (
                    <View key={setIndex} style={[{ flex: 1, marginHorizontal: 4, padding: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', minWidth: 60, backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary }]}>{globalIndex + 1}</Text>
                    </View>
                  );
                })}
              </View>
              {/* Вес */}
              <View style={[{ flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' }]}>
                <View style={[{ width: 70 }]}>
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }]}>Вес (кг)</Text>
                </View>
                {row.map((set, setIndex) => {
                  const globalIndex = rowIndex * setsPerRow + setIndex;
                  return (
                    <View
                      key={setIndex}
                      style={[
                        { flex: 1, marginHorizontal: 4, padding: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
                        isSetCompleted(set) ? { backgroundColor: colors.successLight } : { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <TextInput
                        style={[{ fontSize: 16, textAlign: 'center', color: colors.textPrimary, width: '100%' }]}
                        placeholder="0"
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
              <View style={[{ flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' }]}>
                <View style={[{ width: 70 }]}>
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }]}>Повт.</Text>
                </View>
                {row.map((set, setIndex) => {
                  const globalIndex = rowIndex * setsPerRow + setIndex;
                  return (
                    <View
                      key={setIndex}
                      style={[
                        { flex: 1, marginHorizontal: 4, padding: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
                        isSetCompleted(set) ? { backgroundColor: colors.successLight } : { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <TextInput
                        style={[{ fontSize: 16, textAlign: 'center', color: colors.textPrimary, width: '100%' }]}
                        placeholder="0"
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
          ))}
          <TouchableOpacity
            style={[{ marginTop: SPACING.lg, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.primary }]}
            onPress={() => startRestTimer(restSeconds)}
          >
            <Clock size={16} color="white" strokeWidth={2} />
            <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 15 }]}>Отдых {restSeconds}с</Text>
          </TouchableOpacity>
        </View>
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