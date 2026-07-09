import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advanceProgramProgress } from '../../src/servises/programsService';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { ExerciseSlider } from '../../src/components/workout/ExerciseSlider';
import { ExerciseData, AlternativeExercise, SetData } from '../../src/types/workout';

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

  useEffect(() => { loadWorkout(); }, [id]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const loadWorkout = async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(`name, program_id, workout_exercises ( id, target_sets, rest_seconds, exercises ( id, name, primary_muscles, secondary_muscles, technique, equipment, settings, benefits, risks, injuries, alternatives ) )`)
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
          programExercises.forEach((pe: any) => { intensityMap[pe.exercise_id] = pe.intensity || 'medium'; });
        }
      }

      const exercisesData: ExerciseData[] = workout.workout_exercises.map((we: any) => {
        const exercise = we.exercises;
        const sets: SetData[] = [];
        for (let i = 0; i < we.target_sets; i++) { sets.push({ weight: '', reps: '' }); }
        return {
          id: exercise.id, workout_exercise_id: we.id, name: exercise.name,
          primary_muscles: getList(exercise, 'primary_muscles'), secondary_muscles: getList(exercise, 'secondary_muscles'),
          technique: getString(exercise, 'technique'), equipment: getList(exercise, 'equipment'),
          settings: getString(exercise, 'settings'), benefits: getString(exercise, 'benefits'),
          risks: getString(exercise, 'risks'), injuries: getList(exercise, 'injuries'),
          alternatives: getList(exercise, 'alternatives'), target_sets: we.target_sets,
          rest_seconds: we.rest_seconds, intensity: intensityMap[exercise.id] || 'medium', sets,
        };
      });
      setExercises(exercisesData);
    } catch (error: any) { Alert.alert('Ошибка', error.message); } finally { setLoading(false); }
  };

  const loadAlternatives = async (exerciseId: string, primaryMuscles: string[]) => {
    if (alternativesCache[exerciseId]) return alternativesCache[exerciseId];
    try {
      let query = supabase.from('exercises').select('*').neq('id', exerciseId);
      if (primaryMuscles.length > 0) query = query.overlaps('primary_muscles', primaryMuscles);
      const { data, error } = await query.limit(10);
      if (error) throw error;
      const alternatives: AlternativeExercise[] = (data || []).map((ex: any) => ({
        id: ex.id, name: ex.name, primary_muscles: getList(ex, 'primary_muscles'),
        secondary_muscles: getList(ex, 'secondary_muscles'), technique: getString(ex, 'technique'),
        equipment: getList(ex, 'equipment'), settings: getString(ex, 'settings'),
        benefits: getString(ex, 'benefits'), risks: getString(ex, 'risks'), injuries: getList(ex, 'injuries'),
      }));
      setAlternativesCache(prev => ({ ...prev, [exerciseId]: alternatives }));
      return alternatives;
    } catch { return []; }
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
        if (i < currentSets.length) newSets.push(currentSets[i]);
        else newSets.push({ weight: '', reps: '' });
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
      updated[exerciseIndex] = { ...updated[exerciseIndex], id: alt.id, name: alt.name, primary_muscles: alt.primary_muscles, secondary_muscles: alt.secondary_muscles, technique: alt.technique, equipment: alt.equipment, settings: alt.settings, benefits: alt.benefits, risks: alt.risks, injuries: alt.injuries };
      return updated;
    });
    setReplacements(prev => ({ ...prev, [exercise.workout_exercise_id]: alternativeId }));
    Alert.alert('Заменено', `${exercise.name} → ${alt.name}`);
  };

  const resetToOriginal = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const workoutExId = exercise.workout_exercise_id;
    Alert.alert('Вернуть оригинальное упражнение?', 'Данные подходов сохранятся', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Вернуть', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); loadWorkout(); setReplacements(prev => { const updated = { ...prev }; delete updated[workoutExId]; return updated; }); } },
    ]);
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

  const saveWorkout = async () => {
    Alert.alert('Завершить тренировку?', 'Все данные будут сохранены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Завершить',
        onPress: async () => {
          setSaving(true);
          try {
            let totalLogs = 0;
            for (const exercise of exercises) {
              const logsToSave = exercise.sets.filter(set => isSetCompleted(set)).map((set, index) => ({
                workout_exercise_id: exercise.workout_exercise_id, set_number: index + 1,
                weight_kg: parseFloat(set.weight) || 0, reps: parseInt(set.reps) || 0,
              }));
              if (logsToSave.length > 0) {
                const { error } = await supabase.from('workout_logs').insert(logsToSave);
                if (error) throw error;
                totalLogs += logsToSave.length;
              }
            }
            if (programId && userId) {
              try {
                const progress = await advanceProgramProgress(userId, programId);
                if (progress.isCompleted) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Программа завершена!', 'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе "Программы".');
                  router.replace('/(tabs)/programs');
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Тренировка завершена!', `Следующий день: Неделя ${progress.week}, День ${progress.day}\n\nСохранено подходов: ${totalLogs}`);
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
          } catch (error: any) { Alert.alert('Ошибка', error.message); } finally { setSaving(false); }
        },
      },
    ]);
  };

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high': return { label: 'Высокая', color: '#F44336', bgColor: '#F4433620', icon: <TrendingUp size={14} color="#F44336" strokeWidth={2} /> };
      case 'medium': return { label: 'Средняя', color: '#FFC107', bgColor: '#FFC10720', icon: <Minus size={14} color="#FFC107" strokeWidth={2} /> };
      case 'low': return { label: 'Низкая', color: '#4CAF50', bgColor: '#4CAF5020', icon: <TrendingDown size={14} color="#4CAF50" strokeWidth={2} /> };
      default: return { label: intensity, color: colors.textSecondary, bgColor: colors.textSecondary + '20', icon: <Minus size={14} color={colors.textSecondary} strokeWidth={2} /> };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {restTimer !== null && <RestTimer timeLeft={restTimeLeft} onStop={stopRestTimer} colors={colors} cardStyles={cardStyles} />}
      
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
            colors={colors}
            cardStyles={cardStyles}
          />
        ))}
      </ScrollView>

      <View style={[cardStyles.finishButtonContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={cardStyles.finishButton} onPress={saveWorkout} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <View style={[cardStyles.finishButtonLoading, { backgroundColor: colors.textTertiary }]}>
              <ActivityIndicator color="white" size="small" />
            </View>
          ) : (
            <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyles.finishButtonGradient}>
              <Text style={cardStyles.finishButtonText}>Завершить тренировку</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}