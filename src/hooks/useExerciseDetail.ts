import { useQuery } from '@tanstack/react-query';
import {
  getExerciseById,
  getExercisesByIds,
  getExerciseRecords,
  ExerciseDetail,
  ExerciseListItem,
  ExerciseRecords,
} from '../services/exercisesService';

/**
 * Детальный экран упражнения: основные данные + альтернативы + личные рекорды.
 * Справочник статичен → staleTime: Infinity.
 * Рекорды меняются после тренировок → staleTime 2 минуты.
 */
export function useExerciseDetail(id: string, userId: string | null) {
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

  const recordsQuery = useQuery<ExerciseRecords, Error>({
    queryKey: ['exerciseRecords', id, userId],
    queryFn: () => getExerciseRecords(id, userId as string),
    enabled: !!id && !!userId,
    staleTime: 1000 * 60 * 2,
  });

return {
  exercise: exerciseQuery.data ?? null,
  alternatives: alternativesQuery.data ?? [],
  loading: exerciseQuery.isLoading,
  isError: exerciseQuery.isError,
  errorMessage: exerciseQuery.error?.message ?? null,
  refetch: exerciseQuery.refetch,
  records: recordsQuery.data ?? null,
  recordsLoading: recordsQuery.isLoading,
  recordsError: recordsQuery.error?.message ?? null, // ✅ НОВОЕ
};
}