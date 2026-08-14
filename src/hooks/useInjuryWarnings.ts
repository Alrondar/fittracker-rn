import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExerciseData } from '../types/workout';
import { getActiveInjuries, getInjuryWarningRules } from '../services/profileService';
import { getExerciseContraindications } from '../services/injuriesService';
import {
  computeExerciseWarnings,
  UserInjury,
  InjuryWarning,
  WarningRule,
} from '../constants/injuries';

/**
 * Предупреждения о травмах для упражнений тренировки.
 * Серверные данные — через React Query; расчёт — мемоизированная чистая функция.
 *
 * ARCH-8: уровень 1 (avoid) — lookup по таблице injury_exercise_warnings
 * вместо keyword-эвристики matchesContraindication.
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

  // ARCH-8: lookup противопоказаний по таблице (уровень 1) вместо keyword-эвристики.
  const exerciseIds = useMemo(() => exercises.map((e) => e.id), [exercises]);
  const contraindicationsQuery = useQuery({
    queryKey: ['exerciseContraindications', exerciseIds],
    queryFn: () => getExerciseContraindications(exerciseIds),
    enabled: exerciseIds.length > 0,
    staleTime: Infinity,
  });

  const activeInjuries = injuriesQuery.data ?? [];
  const warningsRules = rulesQuery.data ?? [];
  const contraindications = contraindicationsQuery.data ?? {};

  // Стабильный ключ по id+мышцам. Ввод веса/повторов меняет sets, но НЕ
  // id/мышцы → ключ не меняется → exerciseWarnings (и ссылки warning для карточек)
  // стабильны → React.memo карточек выдерживает при вводе. Пересчёт только при
  // замене упражнения (id меняется) или смене травм/правил.
  const warningKey = useMemo(
    () =>
      exercises
        .map((e) => `${e.id}:${e.primary_muscles.join(',')}:${e.secondary_muscles.join(',')}`)
        .join('|'),
    [exercises],
  );

  const exerciseWarnings = useMemo<Record<string, InjuryWarning>>(() => {
    if (!exercises.length || !activeInjuries.length) return {};
    return computeExerciseWarnings(exercises, activeInjuries, warningsRules, contraindications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warningKey, activeInjuries, warningsRules, contraindications]);

  return {
    activeInjuries,
    exerciseWarnings,
    warningsRules,
    loading: injuriesQuery.isLoading || rulesQuery.isLoading || contraindicationsQuery.isLoading,
    refetch: injuriesQuery.refetch,
  };
}