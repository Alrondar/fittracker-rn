import { useState, useEffect, useRef } from 'react';
import { warmupService, WarmupExercise } from '../services/warmupService';
import * as Haptics from 'expo-haptics';

export function useWarmup(mainExerciseIds: string[]) {
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Генерация разминки при загрузке
  useEffect(() => {
    if (mainExerciseIds.length > 0) {
      generateWarmup();
    }
  }, [mainExerciseIds.join(',')]);

  // Cleanup таймера
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const generateWarmup = async () => {
    setIsLoading(true);
    try {
      const warmup = await warmupService.generateWarmup(mainExerciseIds);
      setWarmupExercises(warmup);
      setCompletedIds(new Set());
      setActiveTimerId(null);
      setTimeLeft(0);
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
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          completeExercise(exerciseId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(null);
    setTimeLeft(0);
  };

  const completeExercise = (exerciseId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedIds(prev => new Set(prev).add(exerciseId));
    setActiveTimerId(null);
    setTimeLeft(0);
  };

  const markAsCompleted = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds(prev => new Set(prev).add(exerciseId));
  };

  const isCompleted = (exerciseId: string) => completedIds.has(exerciseId);
  const isAllCompleted = warmupExercises.length > 0 && completedIds.size === warmupExercises.length;
  const totalDuration = warmupExercises.reduce((sum, ex) => sum + ex.duration_seconds, 0);

  return {
    warmupExercises,
    isLoading,
    completedIds,
    activeTimerId,
    timeLeft,
    isAllCompleted,
    totalDuration,
    generateWarmup,
    startExerciseTimer,
    stopTimer,
    markAsCompleted,
    isCompleted,
  };
}