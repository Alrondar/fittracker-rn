// src/hooks/useTodayReadiness.ts
// ENG-3: React Query wrapper для today readiness (1-5).
// staleTime: 1 час (readiness обновляется раз в день, ReadinessSheet обновит кэш).
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '../services/readinessService';

export function useTodayReadiness(userId: string | null) {
  return useQuery<number | null>({
    queryKey: ['todayReadiness', userId],
    queryFn: () => readinessService.getTodayReadiness(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 час — readiness раз в день
  });
}