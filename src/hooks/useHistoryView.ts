// src/hooks/useHistoryView.ts
// UX-10: persist выбора вида History (Calendar/List).
// Паттерн useRpeSettings / useWorkoutDisplayMode: AsyncStorage + merge с default.
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fittracker_history_view';

export type HistoryView = 'calendar' | 'list';

export function useHistoryView() {
  // Default: Calendar — основной view History по PRODUCT.md §10
  const [view, setView] = useState<HistoryView>('calendar');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === 'calendar' || raw === 'list') setView(raw);
      })
      .catch(() => {});
  }, []);

  const setHistoryView = useCallback((next: HistoryView) => {
    setView(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return { view, setHistoryView };
}