import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import { warmupService, WarmupExercise, InjuryExclusion } from '../services/warmupService';
import { UserInjury } from '../constants/injuries';
import { useTimerSettings } from './useTimerSettings';
import { createTickStore } from '../lib/tickStore';
import * as Haptics from 'expo-haptics';

// FZ-6 (аудит 28.09): тик разминки (1 Гц) вынесен из state экрана в микростор —
// раньше каждую секунду перерендеривался весь workout-экран. Подписчик —
// WarmupBlock (useWarmupTick).
const warmupTickStore = createTickStore<number>(0);
function publishWarmupTick(seconds: number) {
  warmupTickStore.set(seconds, (a, b) => a === b);
}
export function useWarmupTick(): number {
  return useSyncExternalStore(warmupTickStore.subscribe, warmupTickStore.get, warmupTickStore.get);
}

export interface WarmupSourceExercise {
  id: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment?: string[];
}

export function useWarmup(
  exercises: WarmupSourceExercise[],
  activeInjuries: UserInjury[] = [],
  userId?: string | null
) {
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [excludedByInjury, setExcludedByInjury] = useState<InjuryExclusion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  // FZ-6: тик разминки больше не state экрана — стор (useWarmupTick);
  // ref-зеркало нужно только для арифметики интервала.
  const timeLeftRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Кэш альтернатив разминки — ref, без ререндеров экрана.
  const warmupAltsCacheRef = useRef<Record<string, WarmupExercise[]>>({});

  const { settings: timerSettings } = useTimerSettings();
  const activationFirst = timerSettings.activationFirst;

  const exerciseKey = exercises.map((e) => e.id).join(',');
  const injuryKey = activeInjuries
    .map((i) => `${i.body_part}|${i.injury_type}|${i.severity}`)
    .join(',');

  useEffect(() => {
    if (exercises.length > 0) {
      generateWarmup();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey, injuryKey, activationFirst]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // FZ-6: авто-дополнение по достижению 0 раньше делалось через
  // useEffect([timeLeft]) — теперь прямо в тике интервала (см. completeByTick).

  const generateWarmup = async () => {
    setIsLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(null);
    timeLeftRef.current = 0;
    publishWarmupTick(0);
    try {
      const result = await warmupService.generateWarmup(
        exercises,
        activeInjuries,
        activationFirst,
        userId
      );
      setWarmupExercises(result.exercises);
      setExcludedByInjury(result.excludedByInjury);
      setCompletedIds(new Set());
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTick = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startExerciseTimer = useCallback(
    (exerciseId: string) => {
      const exercise = warmupExercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActiveTimerId(exerciseId);
      timeLeftRef.current = exercise.duration_seconds;
      publishWarmupTick(exercise.duration_seconds);
      clearTick();
      timerRef.current = setInterval(() => {
        const next = Math.max(0, timeLeftRef.current - 1);
        timeLeftRef.current = next;
        publishWarmupTick(next);
        if (next === 0) {
          // FZ-6: раньше достыкание обрабатывал useEffect([timeLeft]) на
          // экране — теперь завершаем прямо в тике, без state экрана.
          clearTick();
          setActiveTimerId(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCompletedIds((prev) => new Set(prev).add(exerciseId));
        }
      }, 1000);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [warmupExercises]
  );

  const stopTimer = useCallback(() => {
    clearTick();
    setActiveTimerId(null);
    timeLeftRef.current = 0;
    publishWarmupTick(0);
  }, []);

  const markAsCompleted = useCallback((exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds((prev) => new Set(prev).add(exerciseId));
  }, []);

  const isCompleted = (exerciseId: string) => completedIds.has(exerciseId);

  const isAllCompleted = warmupExercises.length > 0 && completedIds.size >= warmupExercises.length;

  const totalDuration = useMemo(
    () => warmupExercises.reduce((sum, ex) => sum + ex.duration_seconds, 0),
    [warmupExercises]
  );

  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach((ex) => ex.primary_muscles.forEach((m) => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  // ✅ Загрузка альтернатив разминки с кэшем (паттерн из useWorkoutSession).
  const loadWarmupAlternatives = useCallback(
    async (exerciseId: string, primaryMuscles: string[]): Promise<WarmupExercise[]> => {
      if (warmupAltsCacheRef.current[exerciseId]) {
        return warmupAltsCacheRef.current[exerciseId];
      }
      const alts = await warmupService.getWarmupAlternatives(exerciseId, primaryMuscles);
      warmupAltsCacheRef.current = { ...warmupAltsCacheRef.current, [exerciseId]: alts };
      return alts;
    },
    []
  );

  // ✅ Локальная замена упражнения разминки (по индексу) + WARMUP-2:
  // запомнить предпочтение в warmup_preferences (originId — упражнение ДО свапа,
  // его передаёт лист, где известен main). upsert идемпотентен
  // (user_id, origin_exercise_id); ошибка сети не откатывает локальную замену —
  // в текущей тренировке она видна в любом случае.
  const replaceWarmupExercise = useCallback(
    (index: number, alternative: WarmupExercise, originId?: string) => {
      setWarmupExercises((prev) => {
        const next = [...prev];
        if (index < 0 || index >= next.length) return prev;
        next[index] = alternative;
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (userId && originId && originId !== alternative.id) {
        warmupService
          .setWarmupPreference(userId, originId, alternative.id)
          .catch((e) => console.error('warmup preference не сохранён:', e));
      }
    },
    [userId]
  );

  // WARMUP-2: забыть все запомненные замены (генерацию перезапускает caller).
  const clearWarmupPreferences = useCallback(async () => {
    if (!userId) return;
    await warmupService.clearWarmupPreferences(userId);
  }, [userId]);

  return {
    warmupExercises,
    excludedByInjury,
    isLoading,
    completedIds,
    activeTimerId,
    isAllCompleted,
    totalDuration,
    targetMuscles,
    generateWarmup,
    startExerciseTimer,
    stopTimer,
    markAsCompleted,
    isCompleted,
    loadWarmupAlternatives,
    replaceWarmupExercise,
    clearWarmupPreferences,
  };
}
