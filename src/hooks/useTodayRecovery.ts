// src/hooks/useTodayRecovery.ts
// P0 Вариант B: React Query wrapper для today recovery details (сон/стресс).
// staleTime: 1 час (обновляется раз в день, ReadinessSheet обновит кэш).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface TodayRecoveryData {
  sleepHours: number | null;
  stressLevel: number | null;
}

export function useTodayRecovery(userId: string | null) {
  return useQuery<TodayRecoveryData | null>({
    queryKey: ['todayRecovery', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_readiness')
        .select('sleep_hours, stress')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data ? { sleepHours: data.sleep_hours, stressLevel: data.stress } : null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 час
  });
}