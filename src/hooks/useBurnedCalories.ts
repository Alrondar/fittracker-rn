// src/hooks/useBurnedCalories.ts
// AUDIT-1: сожжённые калории за сегодня (🔥-бейдж в центре диаграммы).
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';

export function useBurnedCalories(userId: string | null) {
  return useQuery({
    queryKey: ['burnedCalories', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => profileService.getBurnedCalories(userId!),
  });
}