import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fittracker_timer_settings';

export interface TimerSettings {
  sound: boolean;
  vibration: boolean;
  preBeep: boolean;
  activationFirst: boolean; // порядок разминки: активация перед растяжкой
}

const DEFAULTS: TimerSettings = {
  sound: true,
  vibration: true,
  preBeep: true,
  activationFirst: false, // по умолчанию сначала растяжка
};

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