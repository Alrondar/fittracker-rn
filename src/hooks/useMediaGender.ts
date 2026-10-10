// src/hooks/useMediaGender.ts
// Пол для гендерной схемы кадров техники (см. src/utils/mediaScheme.ts).
//
// Общий кэш ['profile', userId] (CTR-7) с `select` по одному полю: запрос уже
// используется картой мышц и стандартами силы, так что на экран это не добавляет
// сетевых вызовов.
//
// Дефолт — «женщина», а не «мужчина», как в BodyMap: у новой схемы женская пара
// точка входа и есть у всех переведённых позиций, мужская появляется только после
// приёмки второй партии. Пока профиль не догрузился или пол в нём не задан,
// показываем то, что гарантированно отдаётся.

import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useStore } from '../store/useStore';
import { Q } from '../lib/queryPolicy';
import type { MediaGender } from '../utils/mediaScheme';

export function useMediaGender(): MediaGender {
  const userId = useStore((s) => s.userId);
  const { data } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileService.getProfileData(userId!),
    enabled: !!userId,
    ...Q.SLOW,
    select: (profile): MediaGender | null => {
      if (profile?.gender === 'male') return 'male';
      if (profile?.gender === 'female') return 'female';
      return null;
    },
  });
  return data ?? 'female';
}
