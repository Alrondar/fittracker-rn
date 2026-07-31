import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActiveProgram,
  activateProgram,
  deactivateAllPrograms,
  UserProgram,
} from '../services/programsService';

/**
 * Хук для работы с активной программой пользователя.
 * 
 * @param userId - ID пользователя
 * @returns Активная программа, статус загрузки, мутации активации/деактивации
 */
export function useActiveProgram(userId: string | null) {
  const queryClient = useQueryClient();

  // Загрузка активной программы
  const {
    data: activeProgram,
    isLoading,
    refetch,
  } = useQuery<UserProgram | null>({
    queryKey: ['activeProgram', userId],
    queryFn: () => (userId ? getActiveProgram(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 минут
  });

  // Мутация активации программы
  const activateMutation = useMutation({
    mutationFn: ({ programId, userId }: { programId: string; userId: string }) =>
      activateProgram(programId, userId),
    onSuccess: () => {
      // Инвалидируем кэш активной программы и списка программ
      queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Мутация деактивации всех программ
  const deactivateAllMutation = useMutation({
    mutationFn: (userId: string) => deactivateAllPrograms(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    activeProgram,
    isLoading,
    refetch,
    activate: activateMutation.mutate,
    deactivateAll: deactivateAllMutation.mutate,
    isActivating: activateMutation.isPending,
  };
}