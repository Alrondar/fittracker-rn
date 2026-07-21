import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExerciseData } from '../types/workout';
import { getActiveInjuries, getInjuryWarningRules } from '../services/profileService';
import {
  computeExerciseWarnings,
  UserInjury,
  InjuryWarning,
  WarningRule,
} from '../constants/injuries';

/**
 * Предупреждения о травмах для упражнений тренировки.
 * Серверные данные — через React Query; расчёт — мемоизированная чистая функция.
 */
export function useInjuryWarnings(userId: string | null, exercises: ExerciseData[]) {
  const injuriesQuery = useQuery<UserInjury[], Error>({
    queryKey: ['userInjuries', userId],
    queryFn: () => getActiveInjuries(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const rulesQuery = useQuery<WarningRule[], Error>({
    queryKey: ['injuryExerciseWarnings'],
    queryFn: getInjuryWarningRules,
    staleTime: Infinity,
  });

  const activeInjuries = injuriesQuery.data ?? [];
  const warningsRules = rulesQuery.data ?? [];

  const exerciseWarnings = useMemo<Record<string, InjuryWarning>>(() => {
    if (!exercises.length || !activeInjuries.length) return {};
    return computeExerciseWarnings(exercises, activeInjuries, warningsRules);
  }, [exercises, activeInjuries, warningsRules]);

  return {
    activeInjuries,
    exerciseWarnings,
    warningsRules,
    loading: injuriesQuery.isLoading || rulesQuery.isLoading,
    refetch: injuriesQuery.refetch,
  };
}