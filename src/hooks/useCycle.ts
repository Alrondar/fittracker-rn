// src/hooks/useCycle.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cycleService } from '../services/cycleService';
import { calculateCyclePhases } from '../utils/cycle';
import { useStore } from '../store/useStore';

export function useCycle(gender: string | null | undefined) {
  const { userId } = useStore();

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['cycleEvents', userId],
    queryFn: () => cycleService.getCycleEvents(userId!),
    enabled: !!userId && gender === 'female',
    staleTime: 10 * 60 * 1000, // 10 мин
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['cycleSettings', userId],
    queryFn: () => cycleService.getCycleSettings(userId!),
    enabled: !!userId && gender === 'female',
    staleTime: 60 * 60 * 1000, // 1 час
  });

  const currentPhase = useMemo(() => {
    if (!events || !settings) return null;
    return calculateCyclePhases(events, settings.luteal_length_days, new Date());
  }, [events, settings]);

  return {
    events: events || [],
    settings: settings || { user_id: userId || '', luteal_length_days: 14 },
    currentPhase,
    isLoading: eventsLoading || settingsLoading,
  };
}