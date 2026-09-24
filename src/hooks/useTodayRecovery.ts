// src/hooks/useTodayRecovery.ts
// FD-1: today recovery details (sleep hours / stress 1-5) для движка прогрессии.
// Отдельно от useTodayReadiness (тот отдаёт только сводный score 1-5).
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '../services/readinessService';

export function useTodayRecovery(userId: string | null) {
  return useQuery<{ sleepHours: number | null; stressLevel: number | null }>({
    queryKey: ['todayRecovery', userId],
    queryFn: () => readinessService.getTodayRecoveryDetails(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 час — check-in раз в день
  });
}
