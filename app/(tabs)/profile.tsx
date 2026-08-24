import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { useStore } from '../../src/store/useStore';
import { useProfile } from '../../src/hooks/useProfile';
import { signOut } from '../../src/services/authService';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { MacroPieChart } from '../../src/components/profile/MacroPieChart';
// FEAT-2.1: недельная карточка (создать файл, если ещё нет)
import { NutritionWeekCard } from '../../src/components/profile/NutritionWeekCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SheetShell } from '../../src/components/ui/SheetShell';
import { MACRO_COLORS } from '../../src/constants/semanticColors';
import * as Haptics from 'expo-haptics';
import {
  User,
  Settings,
  Target,
  Activity,
  LogOut,
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
  Award,
  Ruler,
  TrendingUp,
} from 'lucide-react-native';

// Фиксированная палитра рангов (золото/серебро/бронза) — семантика медалей,
// не темовой цвет; вынесена в именованную константу вместо inline-hex.
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
const {
  userData,
  stats,
  targets,
  todayNutrition,
  personalRecords,
  loading,
  saveNutrition,
} = useProfile(userId);

  const [showNutritionSheet, setShowNutritionSheet] = useState(false);
  const [inputCalories, setInputCalories] = useState('');
  const [inputProteins, setInputProteins] = useState('');
  const [inputFats, setInputFats] = useState('');
  const [inputCarbs, setInputCarbs] = useState('');
  const [inputWater, setInputWater] = useState('');

  const handleLogout = () => {
    Alert.alert('Выход из аккаунта', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          try {
            // ✅ Через единый слой authService (правило доки), не supabase.auth напрямую
            await signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error('Ошибка выхода:', error);
          }
        },
      },
    ]);
  };

  const handleSaveNutrition = async () => {
    await saveNutrition({
      calories: inputCalories,
      proteins: inputProteins,
      fats: inputFats,
      carbs: inputCarbs,
      water_ml: inputWater,
    });
    setShowNutritionSheet(false);
    setInputCalories('');
    setInputProteins('');
    setInputFats('');
    setInputCarbs('');
    setInputWater('');
  };

  const renderProgressBar = (
    icon: React.ReactNode,
    label: string,
    current: number,
    target: number,
    unit: string,
    color: string,
  ) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const isOver = current > target;
    return (
      <View style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
          {icon}
          <Text
            style={[
              typography.labelBold,
              { color: colors.textPrimary, marginLeft: SPACING.sm, flex: 1 },
            ]}
          >
            {label}
          </Text>
          <Text style={[typography.caption, { color: isOver ? colors.error : colors.textSecondary }]}>
            {current}/{target} {unit}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: isOver ? colors.error : color,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    );
  };

  if (loading || !userData) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = userData.fullName || userData.username || 'Пользователь';
  const displayEmail = userData.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
        {/* Шапка профиля */}
        <View style={{ position: 'relative' }}>
          <AppCard variant="compact" style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: SPACING.md,
              }}
            >
              <Text style={[typography.h2, { color: colors.primary }]}>{initials}</Text>
            </View>
            <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}>
              {displayName}
            </Text>
            {displayEmail && (
              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
                ]}
              >
                {displayEmail}
              </Text>
            )}
          </AppCard>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/profile/settings');
            }}
            style={{
              position: 'absolute',
              top: SPACING.lg,
              right: SPACING.lg,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 4,
            }}
          >
            <Settings size={22} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Статистика */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: SPACING.xl,
            paddingHorizontal: SPACING.lg,
          }}
        >
          <TouchableOpacity
            style={{ flex: 1, marginHorizontal: 4 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/workouts');
            }}
            activeOpacity={0.7}
          >
            <AppCard variant="compact" style={{ alignItems: 'center' }}>
              <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />
              <Text style={[typography.h3, { color: colors.primary, marginTop: SPACING.xs }]}>
                {stats.totalWorkouts}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Тренировки</Text>
            </AppCard>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, marginHorizontal: 4 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/programs');
            }}
            activeOpacity={0.7}
          >
            <AppCard variant="compact" style={{ alignItems: 'center' }}>
              <Calendar size={20} color={colors.success} strokeWidth={1.5} />
              <Text style={[typography.h3, { color: colors.success, marginTop: SPACING.xs }]}>
                {stats.totalPrograms}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Программы</Text>
            </AppCard>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, marginHorizontal: 4 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/progress');
            }}
            activeOpacity={0.7}
          >
            <AppCard variant="compact" style={{ alignItems: 'center' }}>
              <Trophy size={20} color={colors.warning} strokeWidth={1.5} />
              <Text style={[typography.h3, { color: colors.warning, marginTop: SPACING.xs }]}>
                {(stats.totalVolume / 1000).toFixed(1)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Объем (т)</Text>
            </AppCard>
          </TouchableOpacity>
        </View>

        {/* Личные рекорды */}
        {personalRecords.length > 0 && (
          <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl }}>
            <SectionHeader
              title="Личные рекорды"
              icon={<Award size={16} color={colors.warning} strokeWidth={2} />}
              color={colors.warning}
              style={{ paddingHorizontal: 0, paddingTop: 0 }}
            />
            <AppCard variant="compact">
              {personalRecords.map((record, index) => {
                const recordId = (record as any).exercise_id || (record as any).id;
                return (
                  <TouchableOpacity
                    key={index}
                    disabled={!recordId}
                    onPress={() => {
                      if (recordId) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/exercise/${recordId}`);
                      }
                    }}
                    activeOpacity={recordId ? 0.7 : 1}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: SPACING.sm,
                      borderBottomWidth: index < personalRecords.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor:
                          index < 3 ? RANK_COLORS[index] : colors.surfaceSecondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: SPACING.md,
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: index < 3 ? colors.textInverse : colors.textSecondary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[typography.labelBold, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {record.name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.h5, { color: colors.primary }]}>{record.maxWeight} кг</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        × {record.reps}
                      </Text>
                    </View>
                    {recordId && <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: SPACING.xs }} />}
                  </TouchableOpacity>
                );
              })}
            </AppCard>
          </View>
        )}

        {/* Быстрые действия */}
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl }}>
          <SectionHeader title="Быстрые действия" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          {/* UX-11: Progress hub — единый экран «Как я меняюсь?» (сила, объём, PR, тренды) */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              marginBottom: SPACING.sm,
              borderColor: colors.border,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/profile/metrics');
            }}
          >

            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ruler size={20} color={colors.primary} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h5, { color: colors.textPrimary }]}>Замеры тела</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Вес, объёмы, прогресс
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              marginBottom: SPACING.sm,
              borderColor: colors.border,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/profile/goals');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Target size={20} color={colors.success} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>Мои цели</Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              padding: SPACING.md,
              borderColor: colors.border,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/profile/injuries');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Activity size={20} color={colors.error} strokeWidth={1.5} style={{ marginRight: SPACING.md }} />
              <Text style={[typography.h5, { color: colors.textPrimary }]}>Травмы и ограничения</Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Кнопка выхода */}
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <AppButton
            title="Выйти из аккаунта"
            variant="danger"
            size="large"
            icon={<LogOut size={20} color={colors.textInverse} />}
            onPress={handleLogout}
          />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sheet питания (INVENTORY §6: SheetShell паттерн) */}
      <SheetShell
        visible={showNutritionSheet}
        title="Добавить приём пищи"
        onClose={() => setShowNutritionSheet(false)}
      >
        <AppInput
          label="Калории (ккал)"
          placeholder="0"
          value={inputCalories}
          onChangeText={setInputCalories}
          keyboardType="numeric"
        />
        <AppInput
          label="Белки (г)"
          placeholder="0"
          value={inputProteins}
          onChangeText={setInputProteins}
          keyboardType="numeric"
        />
        <AppInput
          label="Жиры (г)"
          placeholder="0"
          value={inputFats}
          onChangeText={setInputFats}
          keyboardType="numeric"
        />
        <AppInput
          label="Углеводы (г)"
          placeholder="0"
          value={inputCarbs}
          onChangeText={setInputCarbs}
          keyboardType="numeric"
        />
        <AppInput
          label="Вода (мл)"
          placeholder="0"
          value={inputWater}
          onChangeText={setInputWater}
          keyboardType="numeric"
        />
        <AppButton
          title="Сохранить"
          variant="primary"
          size="large"
          onPress={handleSaveNutrition}
          style={{ marginTop: SPACING.md }}
        />
      </SheetShell>
    </SafeAreaView>
  );
}