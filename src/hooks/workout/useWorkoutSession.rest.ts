// src/hooks/workout/useWorkoutSession.rest.ts
// Rest timer logic для useWorkoutSession
import { useState, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useTimerSettings } from '../useTimerSettings';
import { initSounds, playBeep, playFinishSound } from '../../lib/timerSounds';

export function useWorkoutSessionRest() {
  const { settings: timerSettings } = useTimerSettings();
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isRestFinished, setIsRestFinished] = useState(false);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restEndsAtRef = useRef<number>(0);
  const lastBeepRef = useRef<number>(0);

  const runRestInterval = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }

    restTimerRef.current = setInterval(() => {
      const msLeft = restEndsAtRef.current - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));

      setRestTimeLeft((prev) => (prev === secLeft ? prev : secLeft));

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

  // Cleanup при unmount
  const cleanupRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }
  }, []);

  return {
    restTimer,
    restTimeLeft,
    isRestFinished,
    startRestTimer,
    adjustRestTimer,
    stopRestTimer,
    cleanupRestTimer,
    // Для совместимости с текущим API
    setRestTimeLeft,
  };
}