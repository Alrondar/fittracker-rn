// src/hooks/useWorkoutForecast.ts
// Фича 7: React Query wrapper для прогноза следующей тренировки.
// staleTime 5 минут (как weekly summary / progress) — прогноз не нужен в реалтайме.

import { useQuery } from '@tanstack/react-query';
import { getWorkoutForecast, WorkoutForecastWithNames } from '../services/forecastService';

export interface UseWorkoutForecastResult {
  result: WorkoutForecastWithNames | null;
  isPending: boolean;
  isError: boolean;
}

export function useWorkoutForecast(userId: string | null): UseWorkoutForecastResult {
  const { data, isPending, isError } = useQuery<WorkoutForecastWithNames | null>({
    queryKey: ['workoutForecast', userId],
    queryFn: () => getWorkoutForecast(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    result: data ?? null,
    isPending,
    isError,
  };
}
