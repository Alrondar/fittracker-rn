// src/hooks/useWeeklySummary.ts
// ENG-6: React Query wrapper для weekly summary.
// 5-min staleTime (как useProgress) — данные пересчитываются не чаще раза в 5 мин.
import { useQuery } from '@tanstack/react-query';
import { getWeeklySummary } from '../services/weeklySummaryService';
import type { WeeklySummaryResult } from '../engine/weeklySummary';

export function useWeeklySummary(userId: string | null, weekOffset: number = 0) {
  return useQuery<WeeklySummaryResult>({
    queryKey: ['weeklySummary', userId, weekOffset],
    queryFn: () => getWeeklySummary(userId as string, weekOffset),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}