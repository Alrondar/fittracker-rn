// src/hooks/useWeeklySummary.ts
// ENG-6: React Query wrapper для weekly summary.
// 5-min staleTime (как useProgress) — данные пересчитываются не чаще раза в 5 мин.
// P1-A: единица (кг/lb) входит в queryKey — инсайты пересобираются при смене.
import { useQuery } from '@tanstack/react-query';
import { getWeeklySummary } from '../services/weeklySummaryService';
import type { WeeklySummaryResult } from '../engine/weeklySummary';
import { useUnitPreferences } from './useUnitPreferences';

export function useWeeklySummary(userId: string | null, weekOffset: number = 0) {
  const { unit } = useUnitPreferences();
  return useQuery<WeeklySummaryResult>({
    queryKey: ['weeklySummary', userId, weekOffset, unit],
    queryFn: () => getWeeklySummary(userId as string, weekOffset, unit),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
