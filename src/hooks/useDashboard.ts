import { useQuery } from '@tanstack/react-query';

import {
  getDashboardData,
  type DashboardData,
  type DashboardExerciseProgress,
  type DashboardPersonalRecord,
  type DashboardActiveProgram,
  type DashboardLastWorkout,
} from '../services/dashboardService';

export type {
  DashboardData,
  DashboardExerciseProgress,
  DashboardPersonalRecord,
  DashboardActiveProgram,
  DashboardLastWorkout,
};

export function useDashboard(userId: string | null) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboardData(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}