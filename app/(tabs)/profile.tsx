import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemeAccent, ThemeKey, themes } from '../../src/constants/theme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import {
  User,
  Settings,
  Target,
  Activity,
  LogOut,
  Palette,
  ChevronRight,
  Trophy,
  Dumbbell,
  Calendar,
  Flame,
  Beef,
  Droplet,
  Wheat,
  Plus,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const {
    colors,
    themeMode,
    themeAccent,
    setThemeMode,
    setThemeAccent,
    availableAccents,
  } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNutritionSheet, setShowNutritionSheet] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalPrograms: 0,
    totalVolume: 0,
  });
  const [targets, setTargets] = useState({
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
  });
  const [todayNutrition, setTodayNutrition] = useState({
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
    water_ml: 0,
  });
  const [loading, setLoading] = useState(true);

  // Поля ввода для bottom sheet
  const [inputCalories, setInputCalories] = useState('');
  const [inputProteins, setInputProteins] = useState('');
  const [inputFats, setInputFats] = useState('');
  const [inputCarbs, setInputCarbs] = useState('');
  const [inputWater, setInputWater] = useState('');

  const cardStyles = createCardStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  useEffect(() => {
    loadUserData();
    loadStats();
    loadTargets();
    loadTodayNutrition();
  }, [userId]);

  const loadUserData = async () => {
    if (!userId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      setUserData({
        email: user?.email || '',
        username: profileData?.username || user?.email?.split('@')[0] || 'Пользователь',
        fullName: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null,
      });
    } catch (e) {
      console.error('Ошибка загрузки профиля:', e);
    }
  };

  const loadStats = async () => {
    if (!userId) return;
    try {
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, workout_exercises (workout_logs (weight_kg, reps))')
        .eq('user_id', userId);

      const { data: programs } = await supabase
        .from('user_programs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      let totalVolume = 0;
      let totalWorkouts = 0;

      workouts?.forEach((workout: any) => {
        const hasLogs = workout.workout_exercises?.some((ex: any) =>
          ex.workout_logs?.length > 0
        );
        if (hasLogs) {
          totalWorkouts++;
          workout.workout_exercises?.forEach((ex: any) => {
            ex.workout_logs?.forEach((log: any) => {
              totalVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
            });
          });
        }
      });

      setStats({
        totalWorkouts,
        totalPrograms: programs?.length || 0,
        totalVolume: Math.round(totalVolume),
      });
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    }
  };

  const loadTargets = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('target_calories, target_proteins, target_fats, target_carbs')
        .eq('id', userId)
        .single();

      if (data) {
        setTargets({
          calories: data.target_calories || 0,
          proteins: data.target_proteins || 0,
          fats: data.target_fats || 0,
          carbs: data.target_carbs || 0,
        });
      }
    } catch (e) {
      console.error('Ошибка загрузки целей:', e);
    }
  };

  const loadTodayNutrition = async () => {
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('nutrition_logs')
        .select('calories, proteins, fats, carbs, water_ml')
        .eq('user_id', userId)
        .eq('date', today);

      if (data && data.length > 0) {
        const totals = data.reduce(
          (acc, log) => ({
            calories: acc.calories + (log.calories || 0),
            proteins: acc.proteins + (log.proteins || 0),
            fats: acc.fats + (log.fats || 0),
            carbs: acc.carbs + (log.carbs || 0),
            water_ml: acc.water_ml + (log.water_ml || 0),
          }),
          { calories: 0, proteins: 0, fats: 0, carbs: 0, water_ml: 0 }
        );
        setTodayNutrition(totals);
      }
    } catch (e) {
      console.error('Ошибка загрузки питания:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNutrition = async () => {
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: userId,
        date: today,
        meal_type: 'manual',
        calories: parseInt(inputCalories) || 0,
        proteins: parseInt(inputProteins) || 0,
        fats: parseInt(inputFats) || 0,
        carbs: parseInt(inputCarbs) || 0,
        water_ml: parseInt(inputWater) || 0,
      });

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNutritionSheet(false);
      setInputCalories('');
      setInputProteins('');
      setInputFats('');
      setInputCarbs('');
      setInputWater('');
      loadTodayNutrition();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Ошибка выхода:', error);
            }
          },
        },
      ]
    );
  };

  const renderProgressBar = (
    icon: any,
    label: string,
    current: number,
    target: number,
    unit: string,
    color: string
  ) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const isOver = current > target;

    return (
      <View style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
          {icon}
          <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm, flex: 1 }]}>
            {label}
          </Text>
          <Text style={[typography.caption, { color: isOver ? '#F44336' : colors.textSecondary }]}>
            {current}/{target} {unit}
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: isOver ? '#F44336' : color,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    );
  };

  const renderStatCard = (icon: any, label: string, value: string, color: string) => (
    <View style={[cardStyles.statCardSmall, { backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
        {icon}
        <Text style={[cardStyles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[cardStyles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderThemeOption = ({ item }: { item: { key: ThemeAccent; label: string; keys: ThemeKey[] } }) => {
    const isSelected = themeAccent === item.key;
    const currentTheme = themes[item.keys[0]];

    return (
      <TouchableOpacity
        style={[
          cardStyles.container,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
        onPress={() => {
          setThemeAccent(item.key);
          setShowThemeModal(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.primary }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.success }} />
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.warning }} />
          </View>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>{item.label}</Text>
        </View>
        {isSelected && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = userData?.fullName || userData?.username || 'Пользователь';
  const displayEmail = userData?.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        {/* Шапка профиля */}
        <View style={cardStyles.profileHeader}>
          <View style={[cardStyles.profileAvatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[typography.h2, { color: colors.primary }]}>{initials}</Text>
          </View>
          <Text style={[cardStyles.profileName, { color: colors.textPrimary }]}>
            {displayName}
          </Text>
          {displayEmail && (
            <Text style={[cardStyles.profileEmail, { color: colors.textSecondary }]}>
              {displayEmail}
            </Text>
          )}
        </View>

        {/* Статистика */}
        <View style={cardStyles.statsRow}>
          {renderStatCard(
            <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />,
            'Тренировки',
            stats.totalWorkouts.toString(),
            colors.primary
          )}
          {renderStatCard(
            <Calendar size={20} color={colors.success} strokeWidth={1.5} />,
            'Программы',
            stats.totalPrograms.toString(),
            colors.success
          )}
          {renderStatCard(
            <Trophy size={20} color={colors.warning} strokeWidth={1.5} />,
            'Объем (т)',
            (stats.totalVolume / 1000).toFixed(1),
            colors.warning
          )}
        </View>

        {/* Трекер КБЖУ */}
        {targets.calories > 0 && (
          <View style={commonStyles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
              <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                Питание сегодня
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNutritionSheet(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ padding: SPACING.sm }}
              >
                <Plus size={20} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={[cardStyles.compact, { borderColor: colors.border, borderWidth: 1 }]}>
              {renderProgressBar(
                <Flame size={18} color="#F44336" />,
                'Калории',
                todayNutrition.calories,
                targets.calories,
                'ккал',
                '#F44336'
              )}
              {renderProgressBar(
                <Beef size={18} color="#4CAF50" />,
                'Белки',
                todayNutrition.proteins,
                targets.proteins,
                'г',
                '#4CAF50'
              )}
              {renderProgressBar(
                <Droplet size={18} color="#FFC107" />,
                'Жиры',
                todayNutrition.fats,
                targets.fats,
                'г',
                '#FFC107'
              )}
              {renderProgressBar(
                <Wheat size={18} color="#2196F3" />,
                'Углеводы',
                todayNutrition.carbs,
                targets.carbs,
                'г',
                '#2196F3'
              )}
              {renderProgressBar(
                <Droplet size={18} color="#00BCD4" />,
                'Вода',
                todayNutrition.water_ml,
                2500,
                'мл',
                '#00BCD4'
              )}
            </View>
          </View>
        )}

{/* Настройки темы */}
<View style={commonStyles.section}>
  <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
    Оформление
  </Text>
  <View
    style={[
      cardStyles.compact,
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderColor: colors.border,
        borderWidth: 1,
      },
    ]}
  >
    <View style={{ flex: 1 }}>
      <Text style={[typography.h5, { color: colors.textPrimary }]}>
        Тёмная тема
      </Text>
      <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
        {themeMode === 'dark' ? 'Включена' :
          themeMode === 'light' ? 'Выключена' : 'Как в системе'}
      </Text>
    </View>
    
    {/* Кнопки в одну строку */}
    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
      {(['light', 'dark', 'system'] as const).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            {
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: themeMode === mode ? colors.primary : colors.border,
              backgroundColor: themeMode === mode ? colors.primaryLight : colors.surface,
            },
          ]}
          onPress={() => {
            setThemeMode(mode);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              typography.buttonSmall,
              {
                color: themeMode === mode ? colors.primary : colors.textSecondary,
                fontWeight: themeMode === mode ? '600' : '400',
              },
            ]}
          >
            {mode === 'light' ? 'Светлая' : mode === 'dark' ? 'Тёмная' : 'Авто'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => {
              setShowThemeModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={cardStyles.settingsRowLeft}>
              <Palette size={20} color={colors.primary} strokeWidth={1.5} style={cardStyles.settingsIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h5, { color: colors.textPrimary }]}>
                  Цветовая схема
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {availableAccents.find(a => a.key === themeAccent)?.label || 'Синяя'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Другие настройки */}
        <View style={commonStyles.section}>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => Alert.alert('В разработке', 'Раздел настроек скоро будет доступен')}
          >
            <View style={cardStyles.settingsRowLeft}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} style={cardStyles.settingsIcon} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Настройки
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/profile/goals');
            }}
          >
            <View style={cardStyles.settingsRowLeft}>
              <Target size={20} color={colors.success} strokeWidth={1.5} style={cardStyles.settingsIcon} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Мои цели
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              cardStyles.compact,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => Alert.alert('В разработке', 'Раздел травм скоро будет доступен')}
          >
            <View style={cardStyles.settingsRowLeft}>
              <Activity size={20} color={colors.error} strokeWidth={1.5} style={cardStyles.settingsIcon} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>
                Травмы и ограничения
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={[buttonStyles.danger, cardStyles.logoutButton]}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ffffff" strokeWidth={2} />
          <Text style={buttonStyles.textDanger}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Sheet для ввода питания */}
      <Modal
        visible={showNutritionSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNutritionSheet(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                Добавить приём пищи
              </Text>
              <TouchableOpacity onPress={() => setShowNutritionSheet(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Калории (ккал)
              </Text>
              <TextInput
                style={[cardStyles.sheetInput, { marginBottom: SPACING.md }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={inputCalories}
                onChangeText={setInputCalories}
                keyboardType="numeric"
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Белки (г)
              </Text>
              <TextInput
                style={[cardStyles.sheetInput, { marginBottom: SPACING.md }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={inputProteins}
                onChangeText={setInputProteins}
                keyboardType="numeric"
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Жиры (г)
              </Text>
              <TextInput
                style={[cardStyles.sheetInput, { marginBottom: SPACING.md }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={inputFats}
                onChangeText={setInputFats}
                keyboardType="numeric"
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Углеводы (г)
              </Text>
              <TextInput
                style={[cardStyles.sheetInput, { marginBottom: SPACING.md }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={inputCarbs}
                onChangeText={setInputCarbs}
                keyboardType="numeric"
              />
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
                Вода (мл)
              </Text>
              <TextInput
                style={[cardStyles.sheetInput, { marginBottom: SPACING.xl }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={inputWater}
                onChangeText={setInputWater}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[buttonStyles.primary]}
                onPress={handleSaveNutrition}
              >
                <Text style={buttonStyles.textPrimary}>Сохранить</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора темы */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                Выберите цветовую схему
              </Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[typography.buttonSmall, { color: colors.primary }]}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableAccents}
              renderItem={renderThemeOption}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}