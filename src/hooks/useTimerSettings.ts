import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fittracker_timer_settings';

export interface TimerSettings {
  sound: boolean;     // финальный звук
  vibration: boolean; // вибрация по окончании
  preBeep: boolean;   // бипы 3-2-1 перед концом
}

const DEFAULTS: TimerSettings = { sound: true, vibration: true, preBeep: true };

/**
 * Настройки таймера отдыха (персистятся в AsyncStorage).
 */
export function useTimerSettings() {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) setSettings(prev => ({ ...prev, ...JSON.parse(raw) }));
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<TimerSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}