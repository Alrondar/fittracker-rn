// src/hooks/useTodayPain.ts
// AUDIT-6: количество pain events за сегодня — для информационного чипа
// «⚠ Боль сегодня» в StatusCard. React Query wrapper.
import { useQuery } from '@tanstack/react-query';
import { painService } from '../services/painService';

export function useTodayPain(userId: string | null) {
  return useQuery<number>({
    queryKey: ['todayPain', userId],
    queryFn: () => painService.getPainEventsToday(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}