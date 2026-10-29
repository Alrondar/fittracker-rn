import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkoutsData, skipWorkout } from '../services/workoutsService';
import { invalidateWorkoutAffectedCaches } from '../lib/queryInvalidation';
import { rescheduleRemindersForUser } from './useReminderScheduler';

export function useWorkouts(userId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['workouts', userId],
    queryFn: () => getWorkoutsData(userId as string),
    enabled: !!userId,
  });

  const skip = async (workoutId: string) => {
    if (!userId) throw new Error('User not authenticated');
    await skipWorkout(workoutId, userId);
    // Позиция 8: пропуск тоже закрывает день — сигнал переставляется сразу.
    void rescheduleRemindersForUser(userId);
    // BUG-2 (аудит 28.09): пропуск сдвигает прогресс программы и все сводки —
    // инвалидируем полный список зависимых кэшей, а не только ['workouts'].
    invalidateWorkoutAffectedCaches(queryClient, userId);
  };

  return { ...query, skip };
}
