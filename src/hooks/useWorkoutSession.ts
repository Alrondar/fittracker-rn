// src/hooks/useWorkoutSession.ts
// Orchestrator workout session — использует вынесенные модули:
// - useWorkoutSession.types.ts — внутренние типы
// - useWorkoutSession.mapper.ts — чистые функции маппинга
// - useWorkoutSession.rest.ts — rest timer logic
// - useWorkoutSession.loader.ts — функции загрузки данных
import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { ExerciseData, AlternativeExercise, SetData, SetFeedbackPatch } from '../types/workout';
import { advanceProgramProgress } from '../services/programsService';
import { mapError } from '../utils/errorMapper';
import { perfMark, perfSince } from '../utils/perf';
import { useWorkoutSessionRest } from './workout/useWorkoutSession.rest';
import { fetchWorkoutSession, fetchAlternatives } from './workout/useWorkoutSession.loader';
import {
  buildExercisesData,
  buildPrevLogsByExerciseId,
  injectPreviousData,
} from './workout/useWorkoutSession.mapper';

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

  const isWorkoutActiveRef = useRef(false);
  const isFinishingRef = useRef(false);
  const currentTimeRef = useRef<number>(0);
  const alternativesCacheRef = useRef<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const exercisesRef = useRef<ExerciseData[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLogsRef = useRef<Map<string, SetData[]>>(new Map());

  // Rest timer — вынесенный hook
  const {
    restTimer,
    restTimeLeft,
    isRestFinished,
    startRestTimer,
    adjustRestTimer,
    stopRestTimer,
    cleanupRestTimer,
    setRestTimeLeft,
  } = useWorkoutSessionRest();

  // Синхронизация refs
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    isWorkoutActiveRef.current = isWorkoutActive;
  }, [isWorkoutActive]);

  useEffect(() => {
    isFinishingRef.current = isFinishing;
  }, [isFinishing]);

  // ============================================================================
  // P0-B: ПАРАЛЛЕЛЬНЫЙ flush
  // ============================================================================
  const flushPendingLogs = useCallback(async (): Promise<void> => {
    const entries = Array.from(pendingLogsRef.current.entries());
    if (entries.length === 0) return;
    pendingLogsRef.current.clear();

    const now = new Date();
    const promises = entries.map(async ([workoutExerciseId, exerciseLogs]) => {
      const formattedLogs = exerciseLogs
        .filter((set) => set.weight !== '' || set.reps !== '')
        .map((set, index) => ({
          set_number: index + 1,
          weight_kg: set.weight ? parseFloat(set.weight) : null,
          reps: set.reps ? parseInt(set.reps) : null,
          completed_at: now.toISOString(),
          rpe: set.rpe ?? null,
          rir: set.rir ?? null,
          difficulty: set.difficulty ?? null,
        }));

      if (formattedLogs.length === 0) return;

      const { error } = await supabase.rpc('upsert_workout_logs', {
        p_workout_exercise_id: workoutExerciseId,
        p_logs: formattedLogs,
      });

      if (error) {
        console.error('[flushPendingLogs] RPC error:', error);
      }
    });

    await Promise.all(promises);
  }, []);

  // ============================================================================
  // LOAD WORKOUT — использует loader + mapper
  // ============================================================================
  const loadWorkout = useCallback(async () => {
    perfMark('load:start');
    try {
      perfMark('load:q1-start');
      const data = await fetchWorkoutSession(workoutId);
      perfSince('load:q1-start', 'Q1: workout + exercises + logs (параллельно)');

      const { workoutRow, exerciseRows, logsByWorkoutExercise, recentLogs, referenceData } = data;

      setWorkoutName(workoutRow.name ?? 'Тренировка');
      setProgramId(workoutRow.program_id);

      // Восстановление активной тренировки
      if (workoutRow.started_at && !workoutRow.finished_at) {
        const startTime = new Date(workoutRow.started_at);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        if (elapsed > 0 && elapsed < 86400) {
          setInitialTime(elapsed);
          currentTimeRef.current = elapsed;
          setIsWorkoutActive(true);
        }
      }

      const workoutExercises = workoutRow.workout_exercises || [];
      const exercisesById = new Map(exerciseRows.map((ex) => [ex.id, ex]));

      // Маппинг через вынесенные чистые функции
      const exercisesData = buildExercisesData(
        workoutExercises,
        exercisesById,
        logsByWorkoutExercise,
        referenceData,
      );

      const prevLogsByExerciseId = buildPrevLogsByExerciseId(recentLogs);
      const finalExercisesData = injectPreviousData(exercisesData, prevLogsByExerciseId);

      setExercises(finalExercisesData);
      perfSince('load:start', 'loadWorkout: итого (запросы + маппинг)');
    } catch (error: any) {
      console.error('[useWorkoutSession] loadWorkout:', error);
      Alert.alert('Ошибка', mapError(error));
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      cleanupRestTimer();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      flushPendingLogs();

      if (
        isWorkoutActiveRef.current &&
        !isFinishingRef.current &&
        currentTimeRef.current > 0
      ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // TIMER CALLBACKS
  // ============================================================================
  const handleTimerTick = useCallback((seconds: number) => {
    currentTimeRef.current = seconds;
  }, []);

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

  const handleTimerStop = useCallback(() => {}, []);

  // ============================================================================
  // LOAD ALTERNATIVES — использует loader
  // ============================================================================
  const loadAlternatives = useCallback(
    async (exerciseId: string, _primaryMuscles: string[]) => {
      if (alternativesCacheRef.current[exerciseId]) {
        return alternativesCacheRef.current[exerciseId];
      }

      try {
        const alternatives = await fetchAlternatives(exerciseId);
        alternativesCacheRef.current = {
          ...alternativesCacheRef.current,
          [exerciseId]: alternatives,
        };
        return alternatives;
      } catch (error) {
        console.error('[useWorkoutSession] loadAlternatives:', error);
        return [];
      }
    },
    [],
  );

  // ============================================================================
  // SET MUTATIONS
  // ============================================================================
  const scheduleFlush = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      flushPendingLogs();
    }, 500);
  }, [flushPendingLogs]);

  const updateSet = useCallback(
    (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush],
  );

  const updateSetFeedback = useCallback(
    (exerciseIndex: number, setIndex: number, patch: SetFeedbackPatch) => {
      setExercises((prev) => {
        const exercise = prev[exerciseIndex];
        const set = exercise.sets[setIndex];

        if (
          set.rpe === patch.rpe &&
          set.rir === patch.rir &&
          set.difficulty === patch.difficulty
        ) {
          return prev;
        }

        const updated = [...prev];
        const newExercise = { ...exercise };
        const newSets = [...exercise.sets];
        newSets[setIndex] = { ...set, ...patch };
        newExercise.sets = newSets;
        updated[exerciseIndex] = newExercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, newSets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush],
  );

  const applyProgression = useCallback(
    (exerciseIndex: number, newWeight: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        if (sets.length > 0) {
          sets[0] = { ...sets[0], weight: newWeight.toString() };
        }
        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush],
  );

  const isSetCompleted = useCallback((set: SetData): boolean => {
    return set.weight !== '' || set.reps !== '';
  }, []);

  const updateExerciseSettings = useCallback(
    (exerciseIndex: number, newSetsCount: number, newRestSeconds: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        while (sets.length < newSetsCount) {
          sets.push({ weight: '', reps: '' });
        }
        exercise.sets = sets.slice(0, newSetsCount);
        exercise.target_sets = newSetsCount;
        exercise.rest_seconds = newRestSeconds;
        updated[exerciseIndex] = exercise;
        return updated;
      });
    },
    [],
  );

  // ============================================================================
  // REPLACE / RESET
  // ============================================================================
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
          equipment: alternative.equipment ?? [],
          settings: alternative.settings,
          benefits: alternative.benefits,
          risks: alternative.risks,
          injuries: alternative.injuries,
          media_url: alternative.media_url,
        };
        return updated;
      });

      setReplacements((prev) => ({
        ...prev,
        [exercise.workout_exercise_id]: alternativeId,
      }));

      Alert.alert('Заменено', `${exercise.name} → ${alternative.name}`);
    },
    [loadAlternatives],
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
        ],
      );
    },
    [loadWorkout],
  );

  // ============================================================================
  // SAVE WORKOUT
  // ============================================================================
  const saveWorkout = useCallback(async () => {
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
            isFinishingRef.current = true;

            try {
              await flushPendingLogs();

              const { error } = await supabase
                .from('workouts')
                .update({
                  finished_at: new Date().toISOString(),
                  duration_seconds: durationSeconds,
                })
                .eq('id', workoutId);

              if (error) throw error;

              let totalLogs = 0;
              exercisesRef.current.forEach((ex) => {
                ex.sets.forEach((s) => {
                  if (s.weight !== '' || s.reps !== '') totalLogs++;
                });
              });

              if (programId && userId) {
                try {
                  const progress = await advanceProgramProgress(userId, programId);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                  if (progress.isCompleted) {
                    Alert.alert(
                      'Программа завершена!',
                      'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе «Программы».',
                    );
                    router.replace('/(tabs)/programs');
                  } else {
                    Alert.alert(
                      'Тренировка завершена!',
                      `Время: ${formattedTime}\nСледующий день: Фаза ${progress.phase} · Неделя ${progress.week} · День ${progress.day}\n\nСохранено подходов: ${totalLogs}`,
                    );
                    router.replace('/(tabs)/workouts');
                  }
                } catch (progressError: any) {
                  console.error('Ошибка обновления прогресса:', progressError);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                  const retryAdvance = async () => {
                    try {
                      const progress = await advanceProgramProgress(userId!, programId!);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                      if (progress.isCompleted) {
                        Alert.alert(
                          'Программа завершена!',
                          'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе «Программы».',
                        );
                        router.replace('/(tabs)/programs');
                      } else {
                        router.replace('/(tabs)/workouts');
                      }
                    } catch (e: any) {
                      Alert.alert(
                        'Не удалось продвинуть прогресс',
                        e?.message ||
                          'Прогресс можно продвинуть автоматически при следующей тренировке.',
                      );
                    }
                  };

                  Alert.alert(
                    'Тренировка сохранена',
                    `Время: ${formattedTime}\nСохранено подходов: ${totalLogs}\n\n` +
                      `Не удалось обновить прогресс программы: ${progressError?.message || 'неизвестная ошибка'}.\n\nПовторить обновление прогресса сейчас?`,
                    [
                      {
                        text: 'Позже',
                        style: 'cancel',
                        onPress: () => router.replace('/(tabs)/workouts'),
                      },
                      { text: 'Повторить', onPress: retryAdvance },
                    ],
                  );
                }
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Успех',
                  `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`,
                );
                router.replace('/(tabs)/history');
              }
            } catch (error: any) {
              console.error('[useWorkoutSession] saveWorkout:', error);
              Alert.alert('Ошибка', mapError(error));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [isWorkoutActive, workoutId, programId, userId, router, flushPendingLogs]);

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
    alternativesCache: alternativesCacheRef.current,
    replacements,
    currentTimeRef,
    loadWorkout,
    handleTimerTick,
    handleTimerStart,
    handleTimerStop,
    loadAlternatives,
    updateSet,
    updateSetFeedback,
    applyProgression,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    resetToOriginal,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  };
}