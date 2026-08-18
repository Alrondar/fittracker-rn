// src/hooks/useRpeSettings.ts
// UX-7: настройка частоты запроса RPE.
// Паттерн идентичен useTimerSettings — AsyncStorage + useState + updateSettings.
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fittracker_rpe_settings';

export type RpePrompt = 'always' | 'last-set' | 'off';

export interface RpeSettings {
  prompt: RpePrompt;
}

const DEFAULTS: RpeSettings = {
  prompt: 'last-set',
};

export const RPE_PROMPT_LABELS: Record<RpePrompt, string> = {
  'always': 'Всегда',
  'last-set': 'Последний',
  'off': 'Выкл',
};

export const RPE_PROMPT_DESCRIPTIONS: Record<RpePrompt, string> = {
  'always': 'Спрашивать RPE после каждого заполненного подхода',
  'last-set': 'Спрашивать RPE только после последнего подхода упражнения',
  'off': 'Не показывать чипы RPE (уже введённые значения остаются видимыми)',
};

export function useRpeSettings() {
  const [settings, setSettings] = useState<RpeSettings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<RpeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}