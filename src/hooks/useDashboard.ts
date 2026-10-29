import { useQuery } from '@tanstack/react-query';

import { Q } from '../lib/queryPolicy';

import {
  getDashboardData,
  type DashboardData,
  type DashboardActiveProgram,
} from '../services/dashboardService';

export type { DashboardData, DashboardActiveProgram };

export function useDashboard(userId: string | null) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboardData(userId as string),
    enabled: !!userId,
    ...Q.SLOW,
    retry: 1,
  });
}
