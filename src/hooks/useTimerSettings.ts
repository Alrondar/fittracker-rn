import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WarmupOrder } from '../engine/warmupPlan';

const STORAGE_KEY = '@fittracker_timer_settings';

const WARMUP_ORDERS: WarmupOrder[] = ['graded', 'activation_first', 'stretch_first'];

// СТАЛО:
export interface TimerSettings {
  sound: boolean;
  vibration: boolean;
  preBeep: boolean;
  /**
   * WARMUP-3b: пресет порядка разминки. Пришёл на смену флагу activationFirst
   * (тумблер «Активация перед растяжкой»): три понятных варианта вместо булева,
   * включая рекомендованный «по порядку» с разогревом первым.
   */
  warmupOrder: WarmupOrder;
  autoStartRest: boolean; // FEAT-1.2: автостарт отдыха после последнего подхода
  autoStartAfterEverySet: boolean; // v2: автостарт после каждого подхода
  vibrateUntilDismissed: boolean; // v2: вибрация каждые 3 сек до сброса
}

const DEFAULTS: TimerSettings = {
  sound: true,
  vibration: true,
  preBeep: true,
  // graded — рекомендуемый порядок; существующим пользователям он не навязывается
  // (см. migrateWarmupOrder: их сохранённый activationFirst даёт прежний вариант).
  warmupOrder: 'graded',
  autoStartRest: false, // FEAT-1.2: по умолчанию выключено
  autoStartAfterEverySet: false, // v2: по умолчанию выключено (opt-in)
  vibrateUntilDismissed: true, // v2: по умолчанию включено (важно для зала)
};

/**
 * Поведение существующего пользователя не меняется молча:
 * activationFirst=false (исторический дефолт) → «Сначала растяжка»,
 * true → «Сначала активация». Режим «По порядку» появляется только как
 * осознанный выбор пользователя или при первой установке.
 */
function migrateWarmupOrder(stored: Record<string, unknown>): WarmupOrder {
  const value = stored.warmupOrder;
  if (typeof value === 'string' && (WARMUP_ORDERS as string[]).includes(value)) {
    return value as WarmupOrder;
  }
  return stored.activationFirst === true ? 'activation_first' : 'stretch_first';
}

export function useTimerSettings() {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Record<string, unknown>;
        setSettings((prev) => ({
          ...prev,
          ...(stored as Partial<TimerSettings>),
          warmupOrder: migrateWarmupOrder(stored),
        }));
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<TimerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
