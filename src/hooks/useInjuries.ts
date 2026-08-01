import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInjuries,
  createInjury,
  updateInjury,
  markInjuryRecovered,
  deleteInjury,
  type InjuryInput,
} from '../services/injuriesService';

export function useInjuries(userId: string | null) {
  const queryClient = useQueryClient();

  const injuriesQuery = useQuery({
    queryKey: ['injuries', userId],
    queryFn: () => getInjuries(userId as string),
    enabled: !!userId,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['injuries', userId] }),
    [queryClient, userId]
  );

  const createMutation = useMutation({
    mutationFn: (input: InjuryInput) => createInjury(userId as string, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InjuryInput }) =>
      updateInjury(id, input),
    onSuccess: invalidate,
  });

  const recoverMutation = useMutation({
    mutationFn: (id: string) => markInjuryRecovered(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInjury(id),
    onSuccess: invalidate,
  });

  return {
    injuries: injuriesQuery.data ?? [],
    loading: injuriesQuery.isPending,
    refetch: injuriesQuery.refetch,
    createInjury: createMutation.mutateAsync,
    updateInjury: updateMutation.mutateAsync,
    markRecovered: recoverMutation.mutateAsync,
    deleteInjury: deleteMutation.mutateAsync,
    saving: createMutation.isPending || updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}