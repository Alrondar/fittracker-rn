import { useState, useEffect, useCallback, useRef } from 'react';

import {
  profileService,
  ProfileData,
  ProfileStats,
  NutritionTargets,
  DailyNutrition,
  PersonalRecord,
} from '../services/profileService';

export function useProfile(userId: string | null) {
  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalWorkouts: 0,
    totalPrograms: 0,
    totalVolume: 0,
  });
  const [targets, setTargets] = useState<NutritionTargets>({
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
  });
  const [todayNutrition, setTodayNutrition] = useState<DailyNutrition>({
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
    water_ml: 0,
  });
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadTokenRef = useRef(0);
  const loadAllData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    // BUG-9 (аудит 28.09): токен отмены — при быстрой смене пользователя
    // (logout→login на shared device) старый Promise.all не должен перетереть
    // данные нового. queryClient.clear() useState-кэш не покрывает.
    const token = ++loadTokenRef.current;
    try {
      const [profile, statsData, targetsData, nutrition, records] = await Promise.all([
        profileService.getProfileData(userId),
        profileService.getStats(userId),
        profileService.getNutritionTargets(userId),
        profileService.getDailyNutrition(userId),
        profileService.getPersonalRecords(userId),
      ]);
      if (token !== loadTokenRef.current) return;

      setUserData(profile);
      setStats(statsData);
      setTargets(targetsData);
      setTodayNutrition(nutrition);
      setPersonalRecords(records);
    } catch (e) {
      if (token !== loadTokenRef.current) return;
      console.error('Ошибка загрузки профиля:', e);
      setError(true);
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadAllData();
  }, [userId, loadAllData]);

  return {
    userData,
    stats,
    targets,
    todayNutrition,
    personalRecords,
    loading,
    error,
    refresh: loadAllData,
  };
}
