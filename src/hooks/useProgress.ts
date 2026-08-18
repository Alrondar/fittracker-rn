// src/hooks/useProgress.ts
// React Query wrapper для Progress hub.
import { useQuery } from '@tanstack/react-query';
import { getProgressData, ProgressData } from '../services/progressService';

export function useProgress(userId: string | null) {
  return useQuery<ProgressData>({
    queryKey: ['progress', userId],
    queryFn: () => getProgressData(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 минут (как dashboard)
  });
}