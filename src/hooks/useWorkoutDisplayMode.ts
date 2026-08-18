// src/hooks/useWorkoutDisplayMode.ts
// Display mode для карточек упражнений в тренировке.
// Persist: AsyncStorage (локально, не server data).
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutCardDisplayMode } from '../types/workout';

const STORAGE_KEY = '@workout_card_display_mode';
const DEFAULT_MODE: WorkoutCardDisplayMode = 'balanced';

/**
 * Hook для чтения/записи preference режима карточки упражнения.
 * Default: 'balanced'
 */
export function useWorkoutDisplayMode() {
  const [mode, setMode] = useState<WorkoutCardDisplayMode>(DEFAULT_MODE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'training' || stored === 'balanced' || stored === 'learn') {
          setMode(stored);
        }
      })
      .catch((error) => {
        console.error('[useWorkoutDisplayMode] read error:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateMode = useCallback(async (newMode: WorkoutCardDisplayMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.error('[useWorkoutDisplayMode] write error:', error);
    }
  }, []);

  return { mode, updateMode, loading };
}