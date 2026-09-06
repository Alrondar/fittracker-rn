// src/hooks/usePainTrend.ts
// Фича 4: React Query wrapper для тренда боли по зонам тела.
// Загружает pain events за последние 4 недели и вычисляет хронические зоны
// (события в одной зоне ≥2 недель). Используется StatusCard и Progress Hub.
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { painService } from '../services/painService';
import { calculatePainTrend, type PainTrendResult } from '../utils/painTrend';

const WEEKS_BACK = 4;

export function usePainTrend(userId: string | null) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - WEEKS_BACK * 7);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      queryKeyFrom: from.toISOString().split('T')[0],
      queryKeyTo: to.toISOString().split('T')[0],
    };
  }, []);

  const q = useQuery({
    queryKey: ['painTrend', userId, range.queryKeyFrom, range.queryKeyTo],
    queryFn: () => painService.getPainEventsInRange(userId!, range.from, range.to),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 мин
    select: (events) => calculatePainTrend(events, WEEKS_BACK),
  });

  const result: PainTrendResult = q.data ?? { chronicZones: [], weeks: [] };
  return { ...q, result };
}
