import { useState, useEffect, useCallback, useRef } from 'react';
import { feedback } from '../lib/feedback';
import { useQueryClient } from '@tanstack/react-query';

import {
  profileService,
  ProfileData,
  ProfileStats,
  NutritionTargets,
  DailyNutrition,
  PersonalRecord,
} from '../services/profileService';
import * as Haptics from 'expo-haptics';
import { invalidateNutritionCaches } from '../lib/queryInvalidation';

export function useProfile(userId: string | null) {
  const queryClient = useQueryClient();
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

  const saveNutrition = async (data: {
    calories: string;
    proteins: string;
    fats: string;
    carbs: string;
    water_ml: string;
  }) => {
    if (!userId) return;
    try {
      await profileService.saveNutritionLog(userId, {
        calories: parseInt(data.calories) || 0,
        proteins: parseInt(data.proteins) || 0,
        fats: parseInt(data.fats) || 0,
        carbs: parseInt(data.carbs) || 0,
        water_ml: parseInt(data.water_ml) || 0,
        meal_type: 'meal', // общий ввод из профиля без выбора приёма пищи
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = await profileService.getDailyNutrition(userId);
      setTodayNutrition(updated);
      // BUG-10 (аудит 28.09): карточки питания на Главной читают RQ-кэши —
      // без инвалидации они врали после добавления приёма из профиля.
      invalidateNutritionCaches(queryClient, userId);
    } catch (e: any) {
      feedback.alert('Ошибка', e.message);
    }
  };

  return {
    userData,
    stats,
    targets,
    todayNutrition,
    personalRecords,
    loading,
    error,
    refresh: loadAllData,
    saveNutrition,
  };
}
