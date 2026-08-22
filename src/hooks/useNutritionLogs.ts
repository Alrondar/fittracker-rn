// src/hooks/useNutritionLogs.ts
// NUTRI-2: CRUD записей питания за день (React Query)

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  profileService,
  NutritionLog,
} from '../services/profileService';

export function useNutritionLogs(
  userId: string | null,
  date?: string,
) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: [
      'nutritionLogs',
      userId,
      date,
    ],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    queryFn: () =>
      profileService.getNutritionLogs(
        userId!,
        date,
      ),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<
        Omit<
          NutritionLog,
          'id' | 'user_id' | 'created_at'
        >
      >;
    }) =>
      profileService.updateNutritionLog(
        id,
        data,
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['nutritionLogs', userId],
      });

      await queryClient.invalidateQueries({
        queryKey: ['dailyNutrition', userId],
      });

      await queryClient.invalidateQueries({
        queryKey: ['weeklyNutrition', userId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      profileService.deleteNutritionLog(id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['nutritionLogs', userId],
      });

      await queryClient.invalidateQueries({
        queryKey: ['dailyNutrition', userId],
      });

      await queryClient.invalidateQueries({
        queryKey: ['weeklyNutrition', userId],
      });
    },
  });

  return {
    logs: logsQuery.data || [],

    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    error: logsQuery.error,

    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,

    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}