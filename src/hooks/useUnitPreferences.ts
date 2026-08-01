import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fittracker_weight_unit';

export type WeightUnit = 'kg' | 'lb';

export const KG_TO_LB = 2.20462;

export const kgToLb = (kg: number): number => kg * KG_TO_LB;
export const lbToKg = (lb: number): number => lb / KG_TO_LB;

/** Округление до 0.5 — читаемые значения на ползунке. */
export const roundToHalf = (n: number): number => Math.round(n * 2) / 2;

const toNum = (s: string): number => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Предпочтение единиц веса + чистые конвертеры.
 * Хранится в AsyncStorage, переживает перезапуск.
 * ВАЖНО: источник правды в стейте тренировки — всегда КГ.
 * Эти хелперы используются ТОЛЬКО на границе отображения/ввода.
 */
export function useUnitPreferences() {
  const [unit, setUnitState] = useState<WeightUnit>('kg');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === 'kg' || raw === 'lb') setUnitState(raw);
      })
      .catch(() => {});
  }, []);

  const setUnit = useCallback((next: WeightUnit) => {
    setUnitState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return { unit, setUnit };
}

/** кг‑строка из стейта → строка для показа в выбранной единице. */
export const weightToDisplay = (kgStr: string, unit: WeightUnit): string => {
  if (kgStr.trim() === '') return '';
  if (unit === 'kg') return kgStr;
  return String(roundToHalf(kgToLb(toNum(kgStr))));
};

/** строка из инпута (в выбранной единице) → кг‑строка для стейта/БД. */
export const weightFromDisplay = (displayStr: string, unit: WeightUnit): string => {
  if (displayStr.trim() === '') return '';
  if (unit === 'kg') return displayStr;
  return String(roundToHalf(lbToKg(toNum(displayStr))));
};

export const weightPlaceholder = (unit: WeightUnit): string =>
  unit === 'kg' ? 'вес (кг)' : 'вес (lbs)';