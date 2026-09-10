// src/hooks/useMuscleStats.ts
//
// React Query обёртка над muscleStatsService.getMuscleStats.
// Потребитель: MuscleStatsSection (вкладка «Мышцы» в Progress hub).
//
// Правила (CLAUDE.md §2, §8):
//   - server data только через React Query (не в Zustand);
//   - staleTime 5 min: статистика мышц меняется редко,
//     но при завершении новой тренировки инвалидируется автоматически
//     через workout-мутации (queryKey содержит userId).

import { useQuery } from '@tanstack/react-query';
import { getMuscleStats, type MuscleStatsRow } from '../services/muscleStatsService';

export type UseMuscleStatsResult = {
  rows: MuscleStatsRow[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useMuscleStats(userId: string | null): UseMuscleStatsResult {
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['muscleStats', userId],
    queryFn: () => getMuscleStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    rows: data,
    isPending,
    isFetching,
    isError,
    refetch: () => void refetch(),
  };
}
