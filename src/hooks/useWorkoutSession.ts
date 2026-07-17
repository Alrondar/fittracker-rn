import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ExerciseData, AlternativeExercise, SetData } from '../types/workout';
import { advanceProgramProgress } from '../services/programsService';
import * as Haptics from 'expo-haptics';

export function useWorkoutSession(workoutId: string, userId: string | null) {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Состояние тренировки
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const currentTimeRef = useRef<number>(0);

  // Таймер отдыха
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Альтернативные упражнения
  const [alternativesCache, setAlternativesCache] = useState<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // Загрузка тренировки
  useEffect(() => {
    loadWorkout();
  }, [workoutId]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      
      if (isWorkoutActive && !isFinishing && currentTimeRef.current > 0) {
        supabase
          .from('workouts')
          .update({ duration_seconds: currentTimeRef.current })
          .eq('id', workoutId)
          .then(({ error }) => {
            if (error) console.error('Ошибка сохранения прогресса:', error);
          });
      }
    };
  }, [isWorkoutActive, isFinishing]);

  const loadWorkout = async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(`
          name,
          program_id,
          started_at,
          finished_at,
          duration_seconds,
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
        .eq('id', workoutId)
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

      // Загрузка интенсивности из программы
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
          primary_muscles: exercise.primary_muscles || [],
          secondary_muscles: exercise.secondary_muscles || [],
          technique: exercise.technique || '',
          equipment: exercise.equipment || [],
          settings: exercise.settings || '',
          benefits: exercise.benefits || '',
          risks: exercise.risks || '',
          injuries: exercise.injuries || [],
          alternatives: exercise.alternatives || [],
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

  // Колбэки для WorkoutTimer
  const handleTimerTick = (seconds: number) => {
    currentTimeRef.current = seconds;
  };

  const handleTimerStart = () => {
    setIsWorkoutActive(true);
    supabase
      .from('workouts')
      .update({ started_at: new Date().toISOString(), duration_seconds: 0 })
      .eq('id', workoutId)
      .then(({ error }) => {
        if (error) console.error('Ошибка сохранения started_at:', error);
      });
  };

  const handleTimerStop = () => {
    // Не меняем isWorkoutActive — тренировка всё ещё идёт, просто пауза
  };

  // Управление упражнениями
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
        primary_muscles: ex.primary_muscles || [],
        secondary_muscles: ex.secondary_muscles || [],
        technique: ex.technique || '',
        equipment: ex.equipment || [],
        settings: ex.settings || '',
        benefits: ex.benefits || '',
        risks: ex.risks || '',
        injuries: ex.injuries || [],
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

  // Таймер отдыха
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

  // Сохранение тренировки
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
            setIsFinishing(true);

            try {
              const now = new Date();
              const { error: updateError } = await supabase
                .from('workouts')
                .update({
                  finished_at: now.toISOString(),
                  duration_seconds: durationSeconds,
                })
                .eq('id', workoutId);

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

return {
  workoutName,
  programId,
  exercises,
  loading,
  saving,
  isWorkoutActive,
  setIsWorkoutActive, // ✅ ДОБАВЛЕНО
  initialTime,
  restTimer,
  restTimeLeft,
  setRestTimeLeft, // ✅ ДОБАВЛЕНО
  alternativesCache,
  replacements,
  currentTimeRef,
  loadWorkout,
  handleTimerTick,
  handleTimerStart,
  handleTimerStop,
  loadAlternatives,
  updateSet,
  isSetCompleted,
  updateExerciseSettings,
  replaceExercise,
  resetToOriginal,
  startRestTimer,
  stopRestTimer,
  saveWorkout,
};
}