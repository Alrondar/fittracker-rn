import { useQuery } from '@tanstack/react-query';

import { Q } from '../lib/queryPolicy';

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
    ...Q.SLOW,
    retry: 1,
  });
}
