import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMINDER_DEFAULTS, type ReminderSettings } from '../utils/reminders';

const STORAGE_KEY = '@fittracker_reminder_settings';

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(REMINDER_DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Partial<ReminderSettings>;
        setSettings((prev) => ({ ...prev, ...stored }));
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
