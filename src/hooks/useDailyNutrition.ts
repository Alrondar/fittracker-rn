// src/hooks/useDailyNutrition.ts
// AUDIT-1: L1-summary питания на Dashboard (React Query поверх profileService).
import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';

export function useDailyNutrition(userId: string | null) {
  return useQuery({
    queryKey: ['dailyNutrition', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
    queryFn: async () => {
      if (!userId) throw new Error('No userId');
      const [daily, targets] = await Promise.all([
        profileService.getDailyNutrition(userId),
        profileService.getNutritionTargets(userId),
      ]);
      return { daily, targets };
    },
  });
}
