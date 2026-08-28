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
import {
  ExerciseData,
  AlternativeExercise,
  SetData,
  SetFeedbackPatch,
  ExercisePainState,
} from '../types/workout';
import {
  advanceProgramProgress,
  replaceExerciseInProgram,
} from '../services/programsService';
import { getActiveInjuries } from '../services/profileService';
import { painService, PainType } from '../services/painService';
import { mapError } from '../utils/errorMapper';
import { perfMark, perfSince } from '../utils/perf';
import { UserInjury } from '../constants/injuries';
import { AlternativeSourceInput } from '../engine/alternatives';
import { useWorkoutSessionRest } from './workout/useWorkoutSession.rest';
import {
  fetchWorkoutSession,
  fetchAlternatives,
  FetchAlternativesResult,
  updateWorkout,
  upsertWorkoutLogs,
} from '../services/workoutService';
import {
  buildExercisesData,
  buildPrevLogsByExerciseId,
  injectPreviousData,
  buildPainStateMap,
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
  const alternativesCacheRef = useRef<Record<string, FetchAlternativesResult>>({});
  // ENG-5: активные травмы для ранжирования альтернатив (один запрос на сессию)
  const activeInjuriesRef = useRef<UserInjury[] | null>(null);
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
          // ENG-13: warmup + estimated reps
          is_warmup: set.isWarmup ?? false,
          is_estimated_reps: set.reps === '' && set.estimatedReps != null,
        }));

      if (formattedLogs.length === 0) return;

      try {
        await upsertWorkoutLogs(workoutExerciseId, formattedLogs);
      } catch (error) {
        console.error('[flushPendingLogs] error:', error);
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

      const {
        workoutRow,
        exerciseRows,
        logsByWorkoutExercise,
        recentLogs,
        referenceData,
        painEvents,
      } = data;

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
      // PR6: pain state по exercise_id — для prefill PainSheet и visual affordance
      const painStateMap = buildPainStateMap(painEvents);
      const exercisesData = buildExercisesData(
        workoutExercises,
        exercisesById,
        logsByWorkoutExercise,
        referenceData,
        painStateMap,
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
        updateWorkout(workoutId, { duration_seconds: currentTimeRef.current }).catch(
          (error) => {
            console.error('Ошибка сохранения прогресса:', error);
          },
        );
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
      updateWorkout(workoutId, {
        started_at: new Date().toISOString(),
        duration_seconds: 0,
      }).catch((error) => {
        console.error('Ошибка сохранения started_at:', error);
      });
    }
  }, [workoutId]);

  const handleTimerStop = useCallback(() => {}, []);

  // ============================================================================
  // LOAD ALTERNATIVES — использует loader + ENG-5 ranking
  // ============================================================================
  const loadAlternatives = useCallback(
    async (exerciseId: string, source: AlternativeSourceInput) => {
      // hasPain влияет на ранжирование (PAIN_ON_SOURCE_GROUP) → учитываем в ключе кэша
      const cacheKey = `${exerciseId}:${source.hasPain ? 'pain' : 'nopain'}`;
      if (alternativesCacheRef.current[cacheKey]) {
        return alternativesCacheRef.current[cacheKey];
      }
      try {
        // ENG-5: активные травмы — лениво, один запрос на сессию
        if (activeInjuriesRef.current === null) {
          activeInjuriesRef.current = userId ? await getActiveInjuries(userId) : [];
        }
        const result = await fetchAlternatives(exerciseId, source, activeInjuriesRef.current);
        alternativesCacheRef.current = {
          ...alternativesCacheRef.current,
          [cacheKey]: result,
        };
        return result;
      } catch (error) {
        console.error('[useWorkoutSession] loadAlternatives:', error);
        return { alternatives: [], excludedCount: 0 };
      }
    },
    [userId],
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

  // ENG-13: добавить новый сет (для warmup toggle auto-add)
  const addSet = useCallback(
    (exerciseIndex: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        exercise.sets = [...exercise.sets, { weight: '', reps: '' }];
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

      const loaded = await loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      });
      const alternative = loaded.alternatives.find((item) => item.id === alternativeId);
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

      // Alert убран: при наличии программы Alert показывает handleReplaceChoice
      // (UX-5 Feature 1) в [id].tsx; при отсутствии программы — действие настолько
      // лёгкое, что подтверждение не требуется (haptic + мгновенная замена).
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
  // UX-5 Feature 1: PROGRAM REPLACEMENT (permanent)
  // ============================================================================
  /**
   * Заменить упражнение в программе — обновляет program_exercises + sync будущих тренировок.
   * Локальное обновление (текущая тренировка) выполняется тем же update'ом exercises,
   * что и temporary replacement. При ошибке сервиса — ROLLBACK локального состояния
   * (программа не изменилась, UI должен показывать оригинал).
   */
  const replaceExerciseInProgramCb = useCallback(
    async (exerciseIndex: number, alternativeId: string) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !programId) return;

      const loaded = await loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      });
      const alternative = loaded.alternatives.find((item) => item.id === alternativeId);
      if (!alternative) return;

      // Snapshot для rollback при ошибке сервиса
      const previousExercise = { ...exercise };

      // 1. Локальное (оптимистичное) обновление — как temporary
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

      // 2. Программная замена (persistent + sync будущих тренировок)
      try {
        await replaceExerciseInProgram(
          workoutId,
          exercise.workout_exercise_id,
          alternative.id,
          alternative.name,
        );
        Alert.alert(
          'Заменено в программе',
          `${previousExercise.name} → ${alternative.name}\n\nИзменение применено к будущим тренировкам программы.`,
        );
      } catch (error) {
        console.error('[useWorkoutSession] replaceExerciseInProgram:', error);
        // Rollback локального состояния — программа не изменилась
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = previousExercise;
          return updated;
        });
        Alert.alert(
          'Не удалось изменить программу',
          'Программа не была изменена. Возможно, это готовая программа — только личные программы доступны для редактирования.',
        );
      }
    },
    [programId, workoutId, loadAlternatives],
  );

  // ============================================================================
  // PR6: PAIN STATE (upsert / delete + оптимистичное локальное обновление)
  // ============================================================================
  const savePainState = useCallback(
    async (exerciseIndex: number, painState: ExercisePainState) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !userId) return;
      const previousPainState = exercise.painState ?? null;

      // Оптимистичное обновление — bubble сразу показывает «Боль отмечена»
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], painState };
        return updated;
      });

      try {
        await painService.upsertPainEvent({
          userId,
          workoutId,
          exerciseId: exercise.id,
          painLevel: painState.painLevel,
          painType: (painState.painType as PainType | null) ?? null,
          bodyPart: painState.bodyPart,
          stopExercise: painState.stopExercise,
          notes: painState.notes,
        });
      } catch (error) {
        console.error('[useWorkoutSession] savePainState:', error);
        // Откат к предыдущему состоянию
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = { ...updated[exerciseIndex], painState: previousPainState };
          return updated;
        });
        Alert.alert('Ошибка', mapError(error));
      }
    },
    [userId, workoutId],
  );

  const clearPainState = useCallback(
    async (exerciseIndex: number) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !userId) return;
      const previousPainState = exercise.painState ?? null;

      // Оптимистичное обновление — bubble возвращается к «Боль?»
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], painState: null };
        return updated;
      });

      try {
        await painService.deletePainEvent(userId, workoutId, exercise.id);
      } catch (error) {
        console.error('[useWorkoutSession] clearPainState:', error);
        // Откат к предыдущему состоянию
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = { ...updated[exerciseIndex], painState: previousPainState };
          return updated;
        });
        Alert.alert('Ошибка', mapError(error));
      }
    },
    [userId, workoutId],
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

              try {
                await updateWorkout(workoutId, {
                  finished_at: new Date().toISOString(),
                  duration_seconds: durationSeconds,
                });
              } catch (error) {
                throw error;
              }

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
    addSet,
    applyProgression,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    replaceExerciseInProgram: replaceExerciseInProgramCb,
    resetToOriginal,
    savePainState,
    clearPainState,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  };
}