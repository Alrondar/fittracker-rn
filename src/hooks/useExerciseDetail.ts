import { useQuery } from '@tanstack/react-query';
import {
  getExerciseById,
  getExercisesByIds,
  ExerciseDetail,
  ExerciseListItem,
} from '../services/exercisesService';

/**
 * Детальный экран упражнения: основные данные + альтернативы.
 * Справочник статичен → staleTime: Infinity (кэш навсегда).
 */
export function useExerciseDetail(id: string) {
  const exerciseQuery = useQuery<ExerciseDetail | null, Error>({
    queryKey: ['exercise', id],
    queryFn: () => getExerciseById(id),
    enabled: !!id,
    staleTime: Infinity,
  });

  const alternativeIds = exerciseQuery.data?.alternatives ?? [];

  const alternativesQuery = useQuery<ExerciseListItem[], Error>({
    queryKey: ['exercisesByIds', alternativeIds],
    queryFn: () => getExercisesByIds(alternativeIds),
    enabled: alternativeIds.length > 0,
    staleTime: Infinity,
  });

  return {
    exercise: exerciseQuery.data ?? null,
    alternatives: alternativesQuery.data ?? [],
    loading: exerciseQuery.isLoading,
    isError: exerciseQuery.isError,
    errorMessage: exerciseQuery.error?.message ?? null,
    refetch: exerciseQuery.refetch,
  };
}