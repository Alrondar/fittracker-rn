import { useState, useEffect, useRef, useMemo } from 'react';
import { warmupService, WarmupExercise } from '../services/warmupService';
import * as Haptics from 'expo-haptics';

export interface WarmupSourceExercise {
  id: string;
  primary_muscles: string[];
  secondary_muscles: string[];
}

export function useWarmup(exercises: WarmupSourceExercise[]) {
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exerciseKey = exercises.map(e => e.id).join(',');

  // Генерация разминки при изменении состава тренировки
  useEffect(() => {
    if (exercises.length > 0) {
      generateWarmup();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey]);

  // Cleanup таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Автозавершение упражнения при нулевом таймере
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
      // ✅ Передаём объекты с мышцами, а не ID
      const warmup = await warmupService.generateWarmup(exercises);
      setWarmupExercises(warmup);
      setCompletedIds(new Set());
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const startExerciseTimer = (exerciseId: string) => {
    const exercise = warmupExercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTimerId(exerciseId);
    setTimeLeft(exercise.duration_seconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setActiveTimerId(null);
    setTimeLeft(0);
  };

  const completeExercise = (exerciseId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setActiveTimerId(null);
    setTimeLeft(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedIds(prev => new Set(prev).add(exerciseId));
  };

  const markAsCompleted = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds(prev => new Set(prev).add(exerciseId));
  };

  const isCompleted = (exerciseId: string) => completedIds.has(exerciseId);

  const isAllCompleted =
    warmupExercises.length > 0 && completedIds.size >= warmupExercises.length;

  const totalDuration = useMemo(
    () => warmupExercises.reduce((sum, ex) => sum + ex.duration_seconds, 0),
    [warmupExercises]
  );

  // Целевые мышцы разминки (для заголовка)
  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach(ex => ex.primary_muscles.forEach(m => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  return {
    warmupExercises,
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
  };
}