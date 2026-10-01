// src/hooks/useBurnedCalories.ts
// AUDIT-1: сожжённые калории за сегодня (🔥-бейдж в центре диаграммы).
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { Q } from '../lib/queryPolicy';

export function useBurnedCalories(userId: string | null) {
  return useQuery({
    queryKey: ['burnedCalories', userId],
    enabled: !!userId,
    ...Q.SLOW,
    queryFn: () => profileService.getBurnedCalories(userId!),
  });
}
