import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { warmupService, WarmupExercise, InjuryExclusion } from '../services/warmupService';
import { UserInjury } from '../constants/injuries';
import { useTimerSettings } from './useTimerSettings';
import * as Haptics from 'expo-haptics';

export interface WarmupSourceExercise {
  id: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment?: string[];
}

export function useWarmup(
  exercises: WarmupSourceExercise[],
  activeInjuries: UserInjury[] = [],
) {
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [excludedByInjury, setExcludedByInjury] = useState<InjuryExclusion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
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

  useEffect(() => {
    if (activeTimerId && timeLeft === 0) {
      completeExercise(activeTimerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, activeTimerId]);

  const generateWarmup = async () => {
    setIsLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(null);
    setTimeLeft(0);
    try {
      const result = await warmupService.generateWarmup(exercises, activeInjuries, activationFirst);
      setWarmupExercises(result.exercises);
      setExcludedByInjury(result.excludedByInjury);
      setCompletedIds(new Set());
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const startExerciseTimer = useCallback((exerciseId: string) => {
    const exercise = warmupExercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTimerId(exerciseId);
    setTimeLeft(exercise.duration_seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warmupExercises]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setActiveTimerId(null);
    setTimeLeft(0);
  }, []);

  const completeExercise = (exerciseId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setActiveTimerId(null);
    setTimeLeft(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedIds((prev) => new Set(prev).add(exerciseId));
  };

  const markAsCompleted = useCallback((exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds((prev) => new Set(prev).add(exerciseId));
  }, []);

  const isCompleted = (exerciseId: string) => completedIds.has(exerciseId);

  const isAllCompleted =
    warmupExercises.length > 0 && completedIds.size >= warmupExercises.length;

  const totalDuration = useMemo(
    () => warmupExercises.reduce((sum, ex) => sum + ex.duration_seconds, 0),
    [warmupExercises],
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
    [],
  );

  // ✅ Локальная замена упражнения разминки на альтернативу (по индексу в списке).
  const replaceWarmupExercise = useCallback((index: number, alternative: WarmupExercise) => {
    setWarmupExercises((prev) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = alternative;
      return next;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return {
    warmupExercises,
    excludedByInjury,
    isLoading,
    completedIds,
    activeTimerId,
    timeLeft,
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
  };
}