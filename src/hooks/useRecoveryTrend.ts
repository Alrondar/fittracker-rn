// src/hooks/useRecoveryTrend.ts
// P0 Вариант B: React Query хук для тренда восстановления (сон/стресс) за N дней.
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '../services/readinessService';
import { useStore } from '../store/useStore';

export function useRecoveryTrend(days = 7) {
  const { userId } = useStore();

  return useQuery({
    queryKey: ['recoveryTrend', userId, days],
    queryFn: () => readinessService.getRecoveryTrend(userId!, days),
    staleTime: 5 * 60 * 1000, // 5 минут
    enabled: !!userId,
  });
}
