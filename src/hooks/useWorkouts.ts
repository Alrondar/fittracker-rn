import { useQuery } from '@tanstack/react-query';
import { getWorkoutsData } from '../services/workoutsService';

export function useWorkouts(userId: string | null) {
  return useQuery({
    queryKey: ['workouts', userId],
    queryFn: () => getWorkoutsData(userId as string),
    enabled: !!userId,
  });
}