import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { profileService, ProfileData, ProfileStats, NutritionTargets, DailyNutrition, PersonalRecord } from '../services/profileService';
import * as Haptics from 'expo-haptics';

export function useProfile(userId: string | null) {
  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ totalWorkouts: 0, totalPrograms: 0, totalVolume: 0 });
  const [targets, setTargets] = useState<NutritionTargets>({ calories: 0, proteins: 0, fats: 0, carbs: 0 });
  const [todayNutrition, setTodayNutrition] = useState<DailyNutrition>({ calories: 0, proteins: 0, fats: 0, carbs: 0, water_ml: 0 });
  const [burnedCalories, setBurnedCalories] = useState(0);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadAllData();
  }, [userId]);

  const loadAllData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profile, statsData, targetsData, nutrition, records] = await Promise.all([
        profileService.getProfileData(userId),
        profileService.getStats(userId),
        profileService.getNutritionTargets(userId),
        profileService.getDailyNutrition(userId),
        profileService.getPersonalRecords(userId),
      ]);

      setUserData(profile);
      setStats(statsData);
      setTargets(targetsData);
      setTodayNutrition(nutrition);
      setPersonalRecords(records);

      if (profile.weight) {
        const burned = await profileService.getBurnedCalories(userId, profile.weight);
        setBurnedCalories(burned);
      }
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveNutrition = async (data: { calories: string; proteins: string; fats: string; carbs: string; water_ml: string }) => {
    if (!userId) return;
    try {
      await profileService.saveNutritionLog(userId, {
        calories: parseInt(data.calories) || 0,
        proteins: parseInt(data.proteins) || 0,
        fats: parseInt(data.fats) || 0,
        carbs: parseInt(data.carbs) || 0,
        water_ml: parseInt(data.water_ml) || 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = await profileService.getDailyNutrition(userId);
      setTodayNutrition(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return {
    userData,
    stats,
    targets,
    todayNutrition,
    burnedCalories,
    personalRecords,
    loading,
    refresh: loadAllData,
    saveNutrition,
  };
}