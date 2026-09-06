// src/hooks/useStrengthStandards.ts
// Хук для расчёта силового уровня упражнения.
// Получает профиль пользователя (вес, пол) и вызывает calculateStrengthStandard.
//
// Используется в:
// - StrengthTrendChart (Progress Hub)
// - Workout Report (PR-карточка)
//
// Возвращает StrengthStandardResult | null.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateStrengthStandard, StrengthStandardResult } from '../utils/strengthStandards';
import { profileService } from '../services/profileService';

interface UseStrengthStandardsParams {
  exerciseName: string;
  e1rm: number;
  userId: string | null;
}

/**
 * Хук для расчёта силового уровня.
 * Кэширует профиль на 5 минут (как dashboard/progress).
 *
 * @returns result — StrengthStandardResult или null, если:
 *   - нет userId
 *   - нет веса в профиле
 *   - упражнение не покрывается нормативами
 *   - e1rm <= 0
 */
export function useStrengthStandards({
  exerciseName,
  e1rm,
  userId,
}: UseStrengthStandardsParams): StrengthStandardResult | null {
  // Загружаем профиль (вес + пол)
  const { data: profile } = useQuery({
    queryKey: ['profile-for-standards', userId],
    queryFn: () => profileService.getProfileData(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 минут
  });

  const result = useMemo(() => {
    if (!profile) return null;
    return calculateStrengthStandard(exerciseName, e1rm, profile.weight, profile.gender);
  }, [exerciseName, e1rm, profile]);

  return result;
}
