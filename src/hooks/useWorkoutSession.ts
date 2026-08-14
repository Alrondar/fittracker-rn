// src/hooks/useWorkoutSession.ts
// 05.08.2026 (PERF): Promise.all для loadWorkout + параллельный flushPendingLogs.
// 06.08.2026 (FEAT-1.1 v2): прошлые данные по номеру подхода (prevLogsByExerciseId);
// recentLogs исключает текущую тренировку.
import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTimerSettings } from './useTimerSettings';
import { initSounds, playBeep, playFinishSound } from '../lib/timerSounds';
import { supabase } from '../lib/supabase';
import { ExerciseData, AlternativeExercise, SetData, SetFeedbackPatch } from '../types/workout';
import { advanceProgramProgress } from '../services/programsService';
import { getExerciseReferenceData } from '../services/exerciseReferenceService';
import { mapError } from '../utils/errorMapper';
import { perfMark, perfSince } from '../utils/perf';

// ============================================================================
// ВНУТРЕННИЕ ТИПЫ JOIN-СТРУКТУР (ARCH-6: вместо any в loadWorkout)
// ============================================================================
interface SessionExerciseRow {
  id: string;
  name: string;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  technique: string | null;
  settings: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
}

interface SessionWERow {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  rest_seconds: number | null;
  intensity: string | null;
  target_reps_range: string | null;
}

interface SessionWorkoutRow {
  name: string;
  program_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  workout_exercises: SessionWERow[] | null;
}

// FEAT-1.1: тип для вложенного select последних логов
interface RecentLog {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  set_number: number | null; // FEAT-1.1 v2: маппинг по номеру подхода
  // Supabase типизирует вложенный select как массив, но для many-to-one
  // связи PostgREST может вернуть объект. Нормализуем в месте использования.
  workout_exercises:
    | { exercise_id: string }
    | { exercise_id: string }[]
    | null;
}

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

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alternativesCacheRef = useRef<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const { settings: timerSettings } = useTimerSettings();
  const [isRestFinished, setIsRestFinished] = useState(false);
  const restEndsAtRef = useRef<number>(0);
  const lastBeepRef = useRef<number>(0);
  const exercisesRef = useRef<ExerciseData[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLogsRef = useRef<Map<string, SetData[]>>(new Map());

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
  // P0-B: ПАРАЛЛЕЛЬНЫЙ flush (было: последовательный for-await)
  // ============================================================================
  const flushPendingLogs = useCallback(async (): Promise<void> => {
    const entries = Array.from(pendingLogsRef.current.entries());
    if (entries.length === 0) return;
    pendingLogsRef.current.clear();
    const now = new Date();

    // Готовим все запросы параллельно
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
  // P0-A: ПАРАЛЛЕЛЬНАЯ загрузка (было: последовательные await)
  // ============================================================================
  console.log('[useWorkoutSession] LOAD START', workoutId);
  const loadWorkout = useCallback(async () => {
    perfMark('load:start');
    try {
      // 1. Загружаем workout и workout_exercises
      perfMark('load:q1-start');
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
      exercise_id,
      target_sets,
      rest_seconds,
      intensity,
      target_reps_range
    )
  `)
  .eq('id', workoutId)
  .single();
      perfSince('load:q1-start', 'Q1: workout + workout_exercises');
      if (error) throw error;
console.log('[useWorkoutSession] WORKOUT RESULT', {
  workout,
  error,
});
      const workoutRow = workout as unknown as SessionWorkoutRow;
      setWorkoutName(workoutRow.name ?? 'Тренировка');
      setProgramId(workoutRow.program_id);

      // Восстановление активной тренировки (начата и не завершена)
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
const workoutExerciseIds = workoutExercises.map((we) => we.id);

const exerciseIds = workoutExercises
  .map((we) => we.exercise_id)
  .filter((id): id is string => !!id);

const { data: exerciseRows, error: exerciseError } = await supabase
  .from('exercises')
  .select(`
    id,
    name,
    primary_muscles,
    secondary_muscles,
    technique,
    settings,
    benefits,
    risks,
    media_url
  `)
  .in('id', exerciseIds);

if (exerciseError) throw exerciseError;

const exercisesById = new Map(
  (exerciseRows ?? []).map((exercise) => [exercise.id, exercise]),
);

const referenceDataPromise = getExerciseReferenceData(exerciseIds);

      // 2. ПАРАЛЛЕЛЬНО грузим текущие логи и recentLogs
      perfMark('load:q2-start');
const [logsRes, recentLogsRes, referenceData] = await Promise.all([
  workoutExerciseIds.length > 0
    ? supabase
        .from('workout_logs')
        .select('workout_exercise_id, set_number, weight_kg, reps, rpe, rir, difficulty')
        .in('workout_exercise_id', workoutExerciseIds)
    : Promise.resolve({ data: null, error: null }),

  exerciseIds.length > 0
    ? supabase
        .from('workout_logs')
        .select('weight_kg, reps, rpe, set_number, workout_exercises(exercise_id)')
        .in('workout_exercises.exercise_id', exerciseIds)
        .neq('workout_exercises.workout_id', workoutId)
        .order('created_at', { ascending: false })
        .limit(300)
    : Promise.resolve({ data: null, error: null }),

  referenceDataPromise,
]);
      perfSince('load:q2-start', 'Q2: logs + recentLogs (параллельно)');

      // Обработка logs
      const logsByWorkoutExercise: Record<
        string,
        Array<{
          set_number: number;
          weight_kg: number | null;
          reps: number | null;
          rpe: number | null;
          rir: number | null;
          difficulty: string | null;
        }>
      > = {};
      logsRes.data?.forEach((log) => {
        if (!logsByWorkoutExercise[log.workout_exercise_id]) {
          logsByWorkoutExercise[log.workout_exercise_id] = [];
        }
        logsByWorkoutExercise[log.workout_exercise_id].push(log);
      });

console.log(
  '[useWorkoutSession] workoutExercises:',
  workoutExercises,
);

console.log(
  '[useWorkoutSession] exercisesById:',
  Array.from(exercisesById.entries()),
);
      
const exercisesData: ExerciseData[] = workoutExercises
  .map((we): ExerciseData | null => {
    const exercise = exercisesById.get(we.exercise_id);

    if (!exercise) {
      console.warn(
        '[useWorkoutSession] Exercise not found:',
        we.exercise_id,
      );
      return null;
    }

    const targetSets = we.target_sets ?? 3;
    const sets: SetData[] = [];

    for (let i = 0; i < targetSets; i++) {
      sets.push({
        weight: '',
        reps: '',
      });
    }

    const savedLogs = logsByWorkoutExercise[we.id] || [];

    savedLogs.forEach((log) => {
      const index = log.set_number - 1;

      if (index >= 0 && index < targetSets) {
        sets[index] = {
          ...sets[index],
          weight: log.weight_kg != null ? String(log.weight_kg) : '',
          reps: log.reps != null ? String(log.reps) : '',
          rpe: log.rpe ?? null,
          rir: log.rir ?? null,
          difficulty:
            (log.difficulty as SetData['difficulty']) ?? null,
        };
      }
    });

    const refs = referenceData[exercise.id] ?? {
      equipment: [],
      injuries: [],
      alternativeIds: [],
    };

    return {
      workout_exercise_id: we.id,
      id: exercise.id,
      name: exercise.name,
      primary_muscles: exercise.primary_muscles || [],
      secondary_muscles: exercise.secondary_muscles || [],
      technique: exercise.technique || '',
      equipment: refs.equipment,
      settings: exercise.settings || '',
      benefits: exercise.benefits || '',
      risks: exercise.risks || '',
      injuries: refs.injuries,
      alternatives: refs.alternativeIds,
      media_url: exercise.media_url ?? null,
      target_sets: targetSets,
      rest_seconds: we.rest_seconds ?? 90,
      intensity: we.intensity || 'medium',
      sets,
      reps_range: we.target_reps_range || undefined,
    };
  })
  .filter((exercise): exercise is ExerciseData => exercise !== null);

      // Обработка recentLogs: прошлые данные ПО НОМЕРУ ПОДХОДА (FEAT-1.1 v2)
      const prevLogsByExerciseId = new Map<
        string,
        Map<number, { weight_kg: number | null; reps: number | null; rpe: number | null }>
      >();
      const recentLogs = (recentLogsRes.data ?? []) as RecentLog[];
      recentLogs.forEach((log) => {
        const we = log.workout_exercises;
        const exId = Array.isArray(we) ? we[0]?.exercise_id : we?.exercise_id;
        if (!exId || log.set_number == null) return;
        if (!prevLogsByExerciseId.has(exId)) prevLogsByExerciseId.set(exId, new Map());
        const bySet = prevLogsByExerciseId.get(exId)!;
        // запрос отсортирован по created_at DESC → первый лог для (exercise, set_number)
        // = данные из последней завершённой тренировки
        if (!bySet.has(log.set_number)) {
          bySet.set(log.set_number, {
            weight_kg: log.weight_kg,
            reps: log.reps,
            rpe: log.rpe,
          });
        }
      });

      // Внедряем previous* в каждый сет по его номеру (сет 1 ← сет 1 прошлой тренировки)
      const finalExercisesData = exercisesData.map((ex) => {
        const bySet = prevLogsByExerciseId.get(ex.id);
        return {
          ...ex,
          sets: ex.sets.map((set, i) => {
            const prev = bySet?.get(i + 1);
            return {
              ...set,
              previousWeight: prev?.weight_kg ?? null,
              previousReps: prev?.reps ?? null,
              previousRpe: prev?.rpe ?? null,
            };
          }),
        };
      });
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

  useEffect(() => {
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
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

const loadAlternatives = useCallback(
  async (exerciseId: string, _primaryMuscles: string[]) => {
    if (alternativesCacheRef.current[exerciseId]) {
      return alternativesCacheRef.current[exerciseId];
    }

    try {
      // 1. Получаем связи альтернатив из нормализованной таблицы.
      const { data: relationships, error: relationshipsError } = await supabase
        .from('exercise_relationships')
        .select('related_exercise_id, relation_type, status')
        .eq('exercise_id', exerciseId)
        .in('status', ['approved', 'suggested'])
        .order('status', { ascending: true }) // approved < suggested по алфавиту
        .order('confidence', { ascending: false });

      if (relationshipsError) throw relationshipsError;

      const alternativeIds = [
        ...new Set(
          (relationships ?? [])
            .map((row) => row.related_exercise_id)
            .filter((id): id is string => !!id && id !== exerciseId),
        ),
      ];

      if (alternativeIds.length === 0) {
        alternativesCacheRef.current = {
          ...alternativesCacheRef.current,
          [exerciseId]: [],
        };
        return [];
      }

      // 2. Загружаем собственные данные упражнений.
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select(
          'id, name, primary_muscles, secondary_muscles, technique, settings, benefits, risks, media_url',
        )
        .in('id', alternativeIds);

      if (exercisesError) throw exercisesError;

      // 3. Получаем normalized reference data.
      const referenceData = await getExerciseReferenceData(alternativeIds);

      // 4. Сохраняем порядок из exercise_relationships.
      const exercisesById = new Map(
        (exercisesData ?? []).map((exercise) => [exercise.id, exercise]),
      );

      const alternatives: AlternativeExercise[] = alternativeIds
        .map((id) => {
          const ex = exercisesById.get(id);
          if (!ex) return null;

          const refs = referenceData[id] ?? {
            equipment: [],
            injuries: [],
            alternativeIds: [],
          };

          return {
            id: ex.id,
            name: ex.name,
            primary_muscles: ex.primary_muscles || [],
            secondary_muscles: ex.secondary_muscles || [],
            technique: ex.technique || '',
            equipment: refs.equipment,
            settings: ex.settings || '',
            benefits: ex.benefits || '',
            risks: ex.risks || '',
            injuries: refs.injuries,
            media_url: ex.media_url ?? null,
          };
        })
        .filter((exercise): exercise is AlternativeExercise => exercise !== null);

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
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          flushPendingLogs();
        }, 500);
        return updated;
      });
    },
    [flushPendingLogs],
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
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          flushPendingLogs();
        }, 500);
        return updated;
      });
    },
    [flushPendingLogs],
  );

  // =========================================================================
  // FEAT-1.1: применение прогрессии к первому подходу (legacy — SetsGrid v2
  // использует updateSet пер-сет; оставлено для совместимости сигнатуры)
  // =========================================================================
  const applyProgression = useCallback(
    (exerciseIndex: number, newWeight: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        if (sets.length > 0) {
          sets[0] = {
            ...sets[0],
            weight: newWeight.toString(),
          };
        }
        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
          flushPendingLogs();
        }, 500);
        return updated;
      });
    },
    [flushPendingLogs],
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

  const runRestInterval = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }
    restTimerRef.current = setInterval(() => {
      const msLeft = restEndsAtRef.current - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setRestTimeLeft((prev) => (prev === secLeft ? prev : secLeft)); // коммит только 1 раз/сек
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
    [runRestInterval],
  );

  const adjustRestTimer = useCallback(
    (delta: number) => {
      if (restEndsAtRef.current === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      restEndsAtRef.current += delta * 1000;
      const secLeft = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000));
      setRestTimeLeft(secLeft);
      setRestTimer((prev) => (prev ? Math.max(5, prev + delta) : prev));
      if (secLeft > 0) {
        setIsRestFinished(false);
        if (!restTimerRef.current) {
          runRestInterval();
        }
      }
    },
    [runRestInterval],
  );

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestTimer(null);
    setRestTimeLeft(0);
    setIsRestFinished(false);
  }, []);

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
    applyProgression, // FEAT-1.1
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    resetToOriginal,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  };
}