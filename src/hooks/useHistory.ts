import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../services/historyService';

export function useHistory(userId: string | null) {
  return useQuery({
    queryKey: ['history', userId],
    queryFn: () => getHistory(userId as string),
    enabled: !!userId,
  });
}