// src/hooks/useTodayPain.ts
// AUDIT-6: количество pain events за сегодня — для информационного чипа
// «⚠ Боль сегодня» в StatusCard. React Query wrapper.
import { useQuery } from '@tanstack/react-query';
import { painService } from '../services/painService';
import { Q } from '../lib/queryPolicy';

export function useTodayPain(userId: string | null) {
  return useQuery<number>({
    queryKey: ['todayPain', userId],
    queryFn: () => painService.getPainEventsToday(userId as string),
    enabled: !!userId,
    // PERF-10: было 10 мин — приведи к базовому тиру; запись боли инвалидирует
    // ['todayPain'] напрямую, «свежесть» от этого не страдает.
    ...Q.SLOW,
  });
}
