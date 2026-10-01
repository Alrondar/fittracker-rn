// src/hooks/useWeeklyNutrition.ts
// FEAT-2.1: недельное питание (React Query поверх profileService).
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { Q } from '../lib/queryPolicy';

export function useWeeklyNutrition(userId: string | null) {
  return useQuery({
    queryKey: ['weeklyNutrition', userId],
    enabled: !!userId,
    // PERF-10: было 30 с (единственный «частый» тир в приложении) — каждая
    // смена фокуса/монтирование давали сетевой запрос. Запись питания
    // инвалидирует ['weeklyNutrition'] (queryInvalidation.invalidateNutritionCaches),
    // поэтому 30 с — избыточная страховка, убрана.
    ...Q.SLOW,
    queryFn: () => profileService.getWeeklyNutrition(userId!),
  });
}
