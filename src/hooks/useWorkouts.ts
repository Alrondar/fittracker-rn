import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkoutsData, skipWorkout } from '../services/workoutsService';

export function useWorkouts(userId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workouts', userId],
    queryFn: () => getWorkoutsData(userId as string),
    enabled: !!userId,
  });

  const skip = async (workoutId: string, programId: string) => {
    if (!userId) throw new Error('User not authenticated');
    await skipWorkout(workoutId, userId, programId);
    // Invalidate после успешного skip — список обновится
    await queryClient.invalidateQueries({ queryKey: ['workouts', userId] });
  };

  return { ...query, skip };
}