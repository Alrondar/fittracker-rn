import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
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
  Play,
  Pause,
  Square,
  ShieldAlert,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advanceProgramProgress } from '../../src/services/programsService';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';
import { createWorkoutStyles } from '../../src/styles/components/workout';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { WorkoutTimer } from '../../src/components/workout/WorkoutTimer';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { ExerciseData, AlternativeExercise, SetData } from '../../src/types/workout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

// Маппинг частей тела на русские названия для поиска
const BODY_PART_RU: Record<string, string[]> = {
  'knee': ['колено', 'колен', 'коленн', 'коленях'],
  'shoulder': ['плечо', 'плеч', 'плечах', 'плечев', 'плечевой'],
  'elbow': ['локоть', 'локтев', 'локтя', 'локтях', 'локтевой'],
  'wrist': ['запястье', 'запясть', 'кисть', 'кистях', 'кисти'],
  'back': ['спина', 'спин', 'поясниц', 'поясн', 'пояснице'],
  'neck': ['шея', 'шеи', 'шей', 'шее'],
  'hip': ['бедро', 'бедр', 'тазобедр', 'бёдрах'],
  'ankle': ['голеностоп', 'щиколотк', 'лодыжк'],
};

// Маппинг типов травм на русские названия для поиска
const INJURY_TYPE_RU: Record<string, string[]> = {
  'strain': ['растяжени', 'надрыв'],
  'sprain': ['вывих', 'растяжени связок'],
  'pain': ['боль', 'болят', 'болит', 'болезнен'],
  'inflammation': ['воспалени'],
  'fracture': ['перелом', 'трещин'],
  'other': ['травм', 'повреждени'],
};

// Русские названия частей тела для отображения
const BODY_PART_LABELS: Record<string, string> = {
  'knee': 'колено',
  'shoulder': 'плечо',
  'elbow': 'локоть',
  'wrist': 'запястье',
  'back': 'спина',
  'neck': 'шея',
  'hip': 'бедро',
  'ankle': 'голеностоп',
};

// Русские названия типов травм для отображения
const INJURY_TYPE_LABELS: Record<string, string> = {
  'strain': 'растяжение',
  'sprain': 'вывих',
  'pain': 'боль',
  'inflammation': 'воспаление',
  'fracture': 'перелом',
  'other': 'травма',
};

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

  // Состояние тренировки (для WorkoutTimer)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Ref для хранения актуального времени таймера
  const currentTimeRef = useRef<number>(0);

  // Таймер отдыха
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [alternativesCache, setAlternativesCache] = useState<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // ТРАВМЫ И ПРЕДУПРЕЖДЕНИЯ
  const [activeInjuries, setActiveInjuries] = useState<any[]>([]);
  const [exerciseWarnings, setExerciseWarnings] = useState<Record<string, { level: 'avoid' | 'caution'; message: string }>>({});
  const [showInjuryBanner, setShowInjuryBanner] = useState(false);
  const [warningsRules, setWarningsRules] = useState<any[]>([]);

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const workoutStyles = createWorkoutStyles(colors);

  useEffect(() => {
    loadWorkout();
    loadActiveInjuriesAndWarnings();
  }, [id]);

  // Cleanup при размонтировании — сохраняем прогресс тренировки
  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);

      // Если тренировка активна и мы не завершаем её штатно — сохраняем прогресс
      if (isWorkoutActive && !isFinishing && currentTimeRef.current > 0) {
        supabase
          .from('workouts')
          .update({ duration_seconds: currentTimeRef.current })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Ошибка сохранения прогресса:', error);
          });
      }
    };
  }, [isWorkoutActive, isFinishing]);

  // Запускаем проверку предупреждений когда все данные загружены
  useEffect(() => {
    if (exercises.length > 0 && activeInjuries.length > 0 && warningsRules.length > 0) {
      checkExerciseWarnings(activeInjuries, warningsRules);
    }
  }, [exercises, activeInjuries, warningsRules]);

  // ===== КОЛБЭКИ ДЛЯ WorkoutTimer =====

  // Колбэк при каждом тике таймера — обновляем ref
  const handleTimerTick = (seconds: number) => {
    currentTimeRef.current = seconds;
  };

  // Колбэк при старте таймера — сохраняем started_at
  const handleTimerStart = () => {
    setIsWorkoutActive(true);
    supabase
      .from('workouts')
      .update({ started_at: new Date().toISOString(), duration_seconds: 0 })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Ошибка сохранения started_at:', error);
      });
  };

  // Колбэк при остановке таймера (пауза)
  const handleTimerStop = () => {
    // Не меняем isWorkoutActive — тренировка всё ещё идёт, просто пауза
  };

  // ===== ЗАГРУЗКА ДАННЫХ =====

  const loadActiveInjuriesAndWarnings = async () => {
    if (!userId) return;
    try {
      const { data: injuries, error: injError } = await supabase
        .from('user_injuries')
        .select('body_part, injury_type, severity')
        .eq('user_id', userId)
        .neq('status', 'recovered');

      if (injError) throw injError;
      setActiveInjuries(injuries || []);

      const { data: warnings, error: warnError } = await supabase
        .from('injury_exercise_warnings')
        .select('*');

      if (warnError) {
        return;
      }

      setWarningsRules(warnings || []);
    } catch (e) {
      console.error('Ошибка загрузки травм:', e);
    }
  };

  const checkExerciseWarnings = (injuries: any[], warnings: any[]) => {
    const newWarnings: Record<string, { level: 'avoid' | 'caution'; message: string }> = {};

    exercises.forEach(ex => {
      const exInjuries = ex.injuries || [];

      injuries.forEach(injury => {
        const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
        const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;
        const bodyPartKeywords = BODY_PART_RU[injury.body_part] || [];
        const injuryTypeKeywords = INJURY_TYPE_RU[injury.injury_type] || [];

        // УРОВЕНЬ 1: Прямое совпадение с противопоказаниями (КРАСНЫЙ)
        const directMatch = exInjuries.some((contraindication: string) => {
          const lower = contraindication.toLowerCase();
          return bodyPartKeywords.some(kw => lower.includes(kw)) ||
                 injuryTypeKeywords.some(kw => lower.includes(kw));
        });

        if (directMatch) {
          const severityPrefix = injury.severity === 'high' ? '⛔' : '🚫';
          newWarnings[ex.id] = {
            level: 'avoid',
            message: `${severityPrefix} Противопоказано при травме: ${bodyPartLabel} (${injuryTypeLabel})`,
          };
          return;
        }

        // УРОВЕНЬ 2: Косвенное совпадение через маппинг мышц (ЖЁЛТЫЙ)
        const relatedWarnings = warnings.filter(w => w.body_part === injury.body_part);
        relatedWarnings.forEach(w => {
          const targetsMuscle =
            ex.primary_muscles.includes(w.muscle_group) ||
            (ex.secondary_muscles && ex.secondary_muscles.includes(w.muscle_group));

          if (targetsMuscle && !newWarnings[ex.id]) {
            newWarnings[ex.id] = {
              level: 'caution',
              message: `⚠️ Осторожно: ${w.recommendation}`,
            };
          }
        });
      });
    });

    setExerciseWarnings(newWarnings);
  };

  const loadWorkout = async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(`name, program_id, started_at, finished_at, duration_seconds, workout_exercises (
          id, target_sets, rest_seconds,
          exercises (
            id, name, primary_muscles, secondary_muscles,
            technique, equipment, settings, benefits, risks, injuries, alternatives
          )
        )`)
        .eq('id', id)
        .single();

      if (error) throw error;

      setWorkoutName(workout.name);
      setProgramId(workout.program_id);

      // Восстановление состояния таймера
      if (workout.started_at && !workout.finished_at) {
        const savedDuration = workout.duration_seconds || 0;

        if (savedDuration > 0) {
          setInitialTime(savedDuration);
          currentTimeRef.current = savedDuration;
          setIsWorkoutActive(true);
        } else {
          const startTime = new Date(workout.started_at);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

          if (elapsed > 0 && elapsed < 86400) {
            setInitialTime(elapsed);
            currentTimeRef.current = elapsed;
            setIsWorkoutActive(true);
          }
        }
      }

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

  // ===== УПРАВЛЕНИЕ УПРАЖНЕНИЯМИ =====

  const loadAlternatives = async (exerciseId: string, primaryMuscles: string[]) => {
    if (alternativesCache[exerciseId]) return alternativesCache[exerciseId];
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
    } catch {
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

  const isSetCompleted = (set: SetData): boolean => set.weight !== '' || set.reps !== '';

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

  // ===== ТАЙМЕР ОТДЫХА =====

  const startRestTimer = (restSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimeLeft(restSeconds);
    setRestTimer(restSeconds);
    restTimerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          setRestTimer(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer(null);
    setRestTimeLeft(0);
  };

  const adjustRestTime = (delta: number) => {
    setRestTimeLeft(prev => Math.max(0, prev + delta));
  };

  // ===== СОХРАНЕНИЕ ТРЕНИРОВКИ =====

  const saveWorkout = async () => {
    if (!isWorkoutActive && currentTimeRef.current === 0) {
      Alert.alert('Тренировка не начата', 'Нажмите "Начать тренировку" перед завершением');
      return;
    }

    const durationSeconds = currentTimeRef.current;
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    Alert.alert(
      'Завершить тренировку?',
      `Время тренировки: ${formattedTime}\nВсе данные будут сохранены`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: async () => {
            setSaving(true);
            setIsFinishing(true); // Помечаем, что завершаем штатно — cleanup не будет сохранять

            try {
              const now = new Date();
              const { error: updateError } = await supabase
                .from('workouts')
                .update({
                  finished_at: now.toISOString(),
                  duration_seconds: durationSeconds,
                })
                .eq('id', id);

              if (updateError) {
                console.error('Ошибка сохранения времени:', updateError);
              }

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
                      `Время: ${formattedTime}\nСледующий день: Неделя ${progress.week}, День ${progress.day}\n\nСохранено подходов: ${totalLogs}`
                    );
                    router.replace('/(tabs)/workouts');
                  }
                } catch (progressError: any) {
                  console.error('Ошибка обновления прогресса:', progressError);
                  Alert.alert('Успех', `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`);
                  router.replace('/(tabs)/history');
                }
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Успех', `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`);
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

  // Подсчёт предупреждений
  const avoidCount = Object.values(exerciseWarnings).filter(w => w.level === 'avoid').length;
  const cautionCount = Object.values(exerciseWarnings).filter(w => w.level === 'caution').length;
  const hasWarnings = avoidCount > 0 || cautionCount > 0;

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
      {/* Таймер отдыха */}
      {restTimer !== null && (
        <RestTimer
          timeLeft={restTimeLeft}
          total={restTimer}
          onStop={stopRestTimer}
          onAdjust={(delta) => setRestTimeLeft(prev => Math.max(0, prev + delta))}
          colors={colors}
          workoutStyles={workoutStyles}
        />
      )}

      {/* Таймер тренировки (отдельный компонент) */}
      {isWorkoutActive && (
        <WorkoutTimer
          initialSeconds={initialTime}
          isActive={true}
          onTick={handleTimerTick}
          onStart={handleTimerStart}
          onStop={handleTimerStop}
          colors={colors}
        />
      )}

      {/* Компактная кнопка предупреждений о травмах */}
      {hasWarnings && !showInjuryBanner && (
        <TouchableOpacity
          onPress={() => {
            setShowInjuryBanner(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: avoidCount > 0 ? '#F44336' : '#FFC107',
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: 20,
            margin: SPACING.md,
            alignSelf: 'flex-end',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <ShieldAlert size={18} color="white" strokeWidth={2} />
          <Text style={{ color: 'white', fontWeight: '700', marginLeft: SPACING.xs, fontSize: 13 }}>
            {avoidCount > 0 ? `${avoidCount}⛔` : ''}{avoidCount > 0 && cautionCount > 0 ? ' ' : ''}{cautionCount > 0 ? `${cautionCount}⚠️` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Раскрывающийся баннер с деталями травм */}
      {showInjuryBanner && (
        <View style={{
          backgroundColor: avoidCount > 0 ? '#F4433615' : '#FFC10715',
          borderColor: avoidCount > 0 ? '#F44336' : '#FFC107',
          borderWidth: 1,
          margin: SPACING.md,
          borderRadius: BORDER_RADIUS.md,
          padding: SPACING.md,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <ShieldAlert size={20} color={avoidCount > 0 ? '#F44336' : '#FFC107'} style={{ marginRight: SPACING.sm }} />
              <Text style={[typography.labelBold, { color: colors.textPrimary, flex: 1 }]}>
                Внимание: активные травмы
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInjuryBanner(false)}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeInjuries.map((injury, index) => {
            const bodyPartLabel = BODY_PART_LABELS[injury.body_part] || injury.body_part;
            const injuryTypeLabel = INJURY_TYPE_LABELS[injury.injury_type] || injury.injury_type;
            const severityLabel = injury.severity === 'high' ? 'высокая' : injury.severity === 'medium' ? 'средняя' : 'низкая';
            return (
              <Text key={index} style={[typography.caption, { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.xs }]}>
                • {bodyPartLabel} ({injuryTypeLabel}) — {severityLabel} тяжесть
              </Text>
            );
          })}

          {avoidCount > 0 && (
            <Text style={[typography.captionSmall, { color: '#F44336', marginTop: SPACING.sm, fontWeight: '600' }]}>
              🚫 {avoidCount} упражнений противопоказаны
            </Text>
          )}
          {cautionCount > 0 && (
            <Text style={[typography.captionSmall, { color: '#FFC107', marginTop: SPACING.xs, fontWeight: '600' }]}>
              ⚠️ {cautionCount} упражнений требуют осторожности
            </Text>
          )}
        </View>
      )}

{/* Список упражнений (Виртуализированный) */}
<FlatList
  data={exercises}
  keyExtractor={(item) => item.workout_exercise_id}
  renderItem={({ item: exercise, index: exIndex }: { item: ExerciseData; index: number }) => (
    <ExerciseSlider
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
      colors={colors}
      cardStyles={cardStyles}
      warning={exerciseWarnings[exercise.id] || null}
    />
  )}
  contentContainerStyle={{ paddingBottom: 100 }}
  showsVerticalScrollIndicator={false}
  windowSize={5}
  removeClippedSubviews={true}
/>

      {/* Кнопки управления тренировкой */}
      <View style={[workoutStyles.finishButtonContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {!isWorkoutActive ? (
          <TouchableOpacity
            style={[workoutStyles.finishButton, { backgroundColor: colors.success }]}
            onPress={() => {
              setIsWorkoutActive(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={workoutStyles.finishButtonGradient}
            >
              <Play size={20} color="white" strokeWidth={2} fill="white" style={{ marginRight: SPACING.sm }} />
              <Text style={workoutStyles.finishButtonText}>Начать тренировку</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={workoutStyles.finishButton}
            onPress={saveWorkout}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={[workoutStyles.finishButtonLoading, { backgroundColor: colors.textTertiary }]}>
                <ActivityIndicator color="white" size="small" />
              </View>
            ) : (
              <LinearGradient
                colors={gradients.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={workoutStyles.finishButtonGradient}
              >
                <Square size={20} color="white" strokeWidth={2} fill="white" style={{ marginRight: SPACING.sm }} />
                <Text style={workoutStyles.finishButtonText}>Завершить</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}