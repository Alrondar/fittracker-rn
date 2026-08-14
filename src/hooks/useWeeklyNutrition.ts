// src/hooks/useWeeklyNutrition.ts
// FEAT-2.1: недельное питание (React Query поверх profileService).
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';

export function useWeeklyNutrition(userId: string | null) {
  return useQuery({
    queryKey: ['weeklyNutrition', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: () => profileService.getWeeklyNutrition(userId!),
  });
}