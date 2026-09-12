// src/hooks/useBarbellSettings.ts
// Локальное хранение настроек веса грифа (AsyncStorage)
// Не используем Zustand, т.к. это предпочтение конкретного зала, а не глобальный state приложения.

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_BAR_WEIGHTS_KG,
  DEFAULT_BAR_WEIGHTS_LB,
  BARBELL_EQUIPMENT_NAMES,
} from '../constants/barbellDefaults';

const STORAGE_KEY = 'fittracker_barbell_settings';

export interface BarbellSettings {
  kg: Record<string, number>;
  lb: Record<string, number>;
}

const defaultSettings: BarbellSettings = {
  kg: { ...DEFAULT_BAR_WEIGHTS_KG },
  lb: { ...DEFAULT_BAR_WEIGHTS_LB },
};

export function useBarbellSettings() {
  const [settings, setSettings] = useState<BarbellSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Мержим с дефолтами на случай добавления новых типов оборудования
        setSettings({
          kg: { ...defaultSettings.kg, ...parsed.kg },
          lb: { ...defaultSettings.lb, ...parsed.lb },
        });
      }
    } catch (e) {
      console.error('Failed to load barbell settings', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = useCallback(
    async (equipment: string, unit: 'kg' | 'lb', weight: number) => {
      const newSettings = {
        ...settings,
        [unit]: {
          ...settings[unit],
          [equipment]: weight,
        },
      };
      setSettings(newSettings);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.error('Failed to save barbell settings', e);
      }
    },
    [settings]
  );

  const getBarWeight = useCallback(
    (equipment: string | string[] | undefined, unit: 'kg' | 'lb'): number => {
      if (!equipment) return unit === 'kg' ? 20 : 45;

      const equipArray = Array.isArray(equipment) ? equipment : [equipment];
      // Ищем первое совпадение в списке оборудования
      for (const eq of equipArray) {
        const normalizedEq = eq.trim().toLowerCase();
        // Проверяем точное совпадение или вхождение
        const match = Object.keys(settings[unit]).find(
          (key) => key.toLowerCase() === normalizedEq || normalizedEq.includes(key.toLowerCase())
        );
        if (match) {
          return settings[unit][match];
        }
      }

      // Fallback на дефолт
      return unit === 'kg' ? 20 : 45;
    },
    [settings]
  );

  return {
    settings,
    isLoading,
    updateSetting,
    getBarWeight,
    equipmentList: BARBELL_EQUIPMENT_NAMES.filter((eq) => !eq.includes(' ')), // для UI настроек берём только русские названия или основные
  };
}
