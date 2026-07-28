import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTimerSettings } from './useTimerSettings';
import { initSounds, playBeep, playFinishSound } from '../lib/timerSounds';
import { supabase } from '../lib/supabase';
import { ExerciseData, AlternativeExercise, SetData } from '../types/workout';
import { advanceProgramProgress } from '../services/programsService';

export function useWorkoutSession(workoutId: string, userId: string | null) {
  const router = useRouter();

  const [workoutName, setWorkoutName] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const currentTimeRef = useRef<number>(0);

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Кэш альтернатив — только ref (без setState → без ререндеров экрана)
  const alternativesCacheRef = useRef<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const { settings: timerSettings } = useTimerSettings();

  const [isRestFinished, setIsRestFinished] = useState(false);
  const restEndsAtRef = useRef<number>(0);
  const lastBeepRef = useRef<number>(0);

  const exercisesRef = useRef<ExerciseData[]>([]);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  const loadWorkout = useCallback(async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(
          `name, program_id, started_at, finished_at, duration_seconds,
           workout_exercises (
             id, target_sets, rest_seconds, intensity, target_reps_range,
             exercises (
               id, name, primary_muscles, secondary_muscles, technique,
               equipment, settings, benefits, risks, injuries, alternatives, media_url
             )
           )`
        )
        .eq('id', workoutId)
        .single();

      if (error) throw error;

      setWorkoutName(workout.name);
      setProgramId(workout.program_id);

      // Возобновление незавершённой тренировки
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

      // Подгрузка сохранённых логов (для возобновления)
      const workoutExercises = workout.workout_exercises || [];
      const workoutExerciseIds = workoutExercises.map((we: any) => we.id);

      const logsByWorkoutExercise: Record<
        string,
        Array<{ set_number: number; weight_kg: number | null; reps: number | null }>
      > = {};

      if (workoutExerciseIds.length > 0) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('workout_exercise_id, set_number, weight_kg, reps')
          .in('workout_exercise_id', workoutExerciseIds);

        logs?.forEach((log: any) => {
          if (!logsByWorkoutExercise[log.workout_exercise_id]) {
            logsByWorkoutExercise[log.workout_exercise_id] = [];
          }
          logsByWorkoutExercise[log.workout_exercise_id].push(log);
        });
      }

      const exercisesData = workoutExercises.map((we: any) => {
        const exercise = we.exercises;
        const targetSets = we.target_sets ?? 3;

        const sets: SetData[] = [];
        for (let i = 0; i < targetSets; i++) {
          sets.push({ weight: '', reps: '' });
        }

        // Восстанавливаем сохранённые подходы
        const savedLogs = logsByWorkoutExercise[we.id] || [];
        savedLogs.forEach((log) => {
          const index = log.set_number - 1;
          if (index >= 0 && index < sets.length) {
            sets[index] = {
              weight: log.weight_kg?.toString() || '',
              reps: log.reps?.toString() || '',
            };
          }
        });

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
          media_url: exercise.media_url || null,
          target_sets: targetSets,
          rest_seconds: we.rest_seconds ?? 90,
          intensity: we.intensity || 'medium',
          sets,
          reps_range: we.target_reps_range || undefined,
        };
      });

      setExercises(exercisesData);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить тренировку');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Сохранение прогресса при размонтировании (если тренировка активна)
  useEffect(() => {
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }

      if (isWorkoutActive && !isFinishing && currentTimeRef.current > 0) {
        supabase
          .from('workouts')
          .update({ duration_seconds: currentTimeRef.current })
          .eq('id', workoutId)
          .then(({ error }) => {
            if (error) {
              console.error('Ошибка сохранения прогресса:', error);
            }
          });
      }
    };
  }, [isWorkoutActive, isFinishing, workoutId]);

  const handleTimerTick = useCallback((seconds: number) => {
    currentTimeRef.current = seconds;
  }, []);

  // started_at пишем только при самом первом старте (currentTimeRef === 0)
  const handleTimerStart = useCallback(() => {
    setIsWorkoutActive(true);

    if (currentTimeRef.current === 0) {
      supabase
        .from('workouts')
        .update({
          started_at: new Date().toISOString(),
          duration_seconds: 0,
        })
        .eq('id', workoutId)
        .then(({ error }) => {
          if (error) {
            console.error('Ошибка сохранения started_at:', error);
          }
        });
    }
  }, [workoutId]);

  const handleTimerStop = useCallback(() => {
    // Пауза: isWorkoutActive не меняем
  }, []);

  const loadAlternatives = useCallback(
    async (exerciseId: string, primaryMuscles: string[]) => {
      if (alternativesCacheRef.current[exerciseId]) {
        return alternativesCacheRef.current[exerciseId];
      }

      try {
        // Явный select (не '*') — не тянем лишнего
        let query = supabase
          .from('exercises')
          .select(
            `id, name, primary_muscles, secondary_muscles, technique,
             equipment, settings, benefits, risks, injuries, media_url, reps_range`
          )
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
          media_url: ex.media_url || null,
          reps_range: ex.reps_range || undefined,
        }));

        // Запись только в ref — без setState, без ререндера экрана
        alternativesCacheRef.current = {
          ...alternativesCacheRef.current,
          [exerciseId]: alternatives,
        };

        return alternatives;
      } catch {
        return [];
      }
    },
    []
  );

  const updateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];

        sets[setIndex] = {
          ...sets[setIndex],
          [field]: value,
        };

        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        return updated;
      });
    },
    []
  );

  const isSetCompleted = useCallback((set: SetData): boolean => {
    return set.weight !== '' || set.reps !== '';
  }, []);

  const updateExerciseSettings = useCallback(
    (exerciseIndex: number, newSetsCount: number, newRestSeconds: number) => {
      setExercises((prev) => {
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
    },
    []
  );

  const replaceExercise = useCallback(
    async (exerciseIndex: number, alternativeId: string) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise) return;

      const alternatives = await loadAlternatives(exercise.id, exercise.primary_muscles);
      const alternative = alternatives.find((item) => item.id === alternativeId);
      if (!alternative) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
          id: alternative.id,
          name: alternative.name,
          primary_muscles: alternative.primary_muscles,
          secondary_muscles: alternative.secondary_muscles,
          technique: alternative.technique,
          equipment: alternative.equipment,
          settings: alternative.settings,
          benefits: alternative.benefits,
          risks: alternative.risks,
          injuries: alternative.injuries,
          media_url: alternative.media_url,
          reps_range: alternative.reps_range ?? updated[exerciseIndex].reps_range,
        };
        return updated;
      });

      setReplacements((prev) => ({
        ...prev,
        [exercise.workout_exercise_id]: alternativeId,
      }));

      Alert.alert('Заменено', `${exercise.name} → ${alternative.name}`);
    },
    [loadAlternatives]
  );

  const resetToOriginal = useCallback(
    (exerciseIndex: number) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise) return;

      const workoutExerciseId = exercise.workout_exercise_id;

      Alert.alert(
        'Вернуть оригинальное упражнение?',
        'Данные подходов будут перезагружены из тренировки',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Вернуть',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              loadWorkout();
              setReplacements((prev) => {
                const updated = { ...prev };
                delete updated[workoutExerciseId];
                return updated;
              });
            },
          },
        ]
      );
    },
    [loadWorkout]
  );

  const runRestInterval = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }

    restTimerRef.current = setInterval(() => {
      const msLeft = restEndsAtRef.current - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));

      setRestTimeLeft(secLeft);

      if (
        timerSettings.preBeep &&
        secLeft <= 3 &&
        secLeft > 0 &&
        lastBeepRef.current !== secLeft
      ) {
        lastBeepRef.current = secLeft;
        playBeep();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (msLeft <= 0) {
        if (restTimerRef.current) {
          clearInterval(restTimerRef.current);
        }
        restTimerRef.current = null;
        setIsRestFinished(true);

        if (timerSettings.sound) {
          playFinishSound();
        }
        if (timerSettings.vibration) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }, 250);
  }, [timerSettings]);

  const startRestTimer = useCallback(
    (restSeconds: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setIsRestFinished(false);
      lastBeepRef.current = 0;
      restEndsAtRef.current = Date.now() + restSeconds * 1000;

      setRestTimer(restSeconds);
      setRestTimeLeft(restSeconds);

      initSounds();
      runRestInterval();
    },
    [runRestInterval]
  );

  const adjustRestTimer = useCallback(
    (delta: number) => {
      if (restEndsAtRef.current === 0) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      restEndsAtRef.current += delta * 1000;

      const secLeft = Math.max(
        0,
        Math.ceil((restEndsAtRef.current - Date.now()) / 1000)
      );

      setRestTimeLeft(secLeft);
      setRestTimer((prev) => (prev ? Math.max(5, prev + delta) : prev));

      if (secLeft > 0) {
        setIsRestFinished(false);
        if (!restTimerRef.current) {
          runRestInterval();
        }
      }
    },
    [runRestInterval]
  );

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }

    restTimerRef.current = null;
    restEndsAtRef.current = 0;

    setRestTimer(null);
    setRestTimeLeft(0);
    setIsRestFinished(false);
  }, []);

  const saveWorkout = useCallback(async () => {
    if (!isWorkoutActive && currentTimeRef.current === 0) {
      Alert.alert(
        'Тренировка не начата',
        'Нажмите "Начать тренировку" перед завершением'
      );
      return;
    }

    const durationSeconds = currentTimeRef.current;
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;

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

              const workoutExerciseIds = exercisesRef.current.map(
                (exercise) => exercise.workout_exercise_id
              );

              // Удаляем старые логи (идемпотентность при повторном завершении)
              if (workoutExerciseIds.length > 0) {
                const { error: deleteError } = await supabase
                  .from('workout_logs')
                  .delete()
                  .in('workout_exercise_id', workoutExerciseIds);

                if (deleteError) throw deleteError;
              }

              // ✅ Один batch insert ВСЕХ логов (вместо N отдельных запросов).
              //    flatMap собирает логи по всем упражнениям в один массив;
              //    индекс подхода запоминается ДО фильтра (set_number не съезжает).
              const allLogsToSave = exercisesRef.current.flatMap((exercise) =>
                exercise.sets
                  .map((set, index) => ({ set, index }))
                  .filter(({ set }) => isSetCompleted(set))
                  .map(({ set, index }) => ({
                    workout_exercise_id: exercise.workout_exercise_id,
                    set_number: index + 1,
                    weight_kg: parseFloat(set.weight) || 0,
                    reps: parseInt(set.reps) || 0,
                    completed_at: now.toISOString(),
                  }))
              );

              if (allLogsToSave.length > 0) {
                const { error } = await supabase
                  .from('workout_logs')
                  .insert(allLogsToSave);

                if (error) throw error;
              }

              const totalLogs = allLogsToSave.length;

              if (programId && userId) {
                try {
                  const progress = await advanceProgramProgress(userId, programId);

                  if (progress.isCompleted) {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    Alert.alert(
                      'Программа завершена!',
                      'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе "Программы".'
                    );
                    router.replace('/(tabs)/programs');
                  } else {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                    Alert.alert(
                      'Тренировка завершена!',
                      `Время: ${formattedTime}\nСледующий день: Фаза ${progress.phase} · Неделя ${progress.week} · День ${progress.day}\n\nСохранено подходов: ${totalLogs}`
                    );
                    router.replace('/(tabs)/workouts');
                  }
                } catch (progressError: any) {
                  console.error('Ошибка обновления прогресса:', progressError);
                  Alert.alert(
                    'Успех',
                    `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
                  );
                  router.replace('/(tabs)/history');
                }
              } else {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                Alert.alert(
                  'Успех',
                  `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
                );
                router.replace('/(tabs)/history');
              }
            } catch (error: any) {
              Alert.alert('Ошибка', error.message || 'Не удалось сохранить тренировку');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [isWorkoutActive, workoutId, programId, userId, router, isSetCompleted]);

  return {
    workoutName,
    programId,
    exercises,
    loading,
    saving,
    isWorkoutActive,
    setIsWorkoutActive,
    initialTime,
    restTimer,
    restTimeLeft,
    setRestTimeLeft,
    isRestFinished,
    adjustRestTimer,
    // Возвращается для совместимости со старым [id].tsx; это ref → ререндеров не вызывает
    alternativesCache: alternativesCacheRef.current,
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