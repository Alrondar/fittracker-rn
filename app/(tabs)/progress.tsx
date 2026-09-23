// app/(tabs)/progress.tsx
//
// Progress hub — отвечает на вопрос «Как я меняюсь?».
// History отвечает «когда и что я делал?» (отдельный таб).
//
// Правила:
// - UI не обращается к Supabase напрямую — данные через useProgress/useHistory;
// - один спокойный экран без режимов; секции скрываются при отсутствии данных;
// - длинная история не рендерится: последние тренировки ограничены slice(0, 5).

import React, { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Award, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useWeightDisplay } from '../../src/hooks/useUnitPreferences';
import { useStore } from '../../src/store/useStore';
import { useHistory } from '../../src/hooks/useHistory';
import { useProgress } from '../../src/hooks/useProgress';
import { usePainTrend } from '../../src/hooks/usePainTrend';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { ProgressHero } from '../../src/components/progress/ProgressHero';
import { ProgressStats } from '../../src/components/progress/ProgressStats';
import { WeeklyReviewSection } from '../../src/components/progress/WeeklyReviewSection';
import { ProgressInsights } from '../../src/components/progress/ProgressInsights';
import { RecentWorkouts } from '../../src/components/progress/RecentWorkouts';
import { ListSkeleton } from '../../src/components/Skeleton';
import { StrengthTrendChart } from '../../src/components/progress/StrengthTrendChart';
import { VolumeTrendChart } from '../../src/components/progress/VolumeTrendChart';
import { WeightTrendRow } from '../../src/components/progress/WeightTrendRow';
import { MuscleStatsSection } from '../../src/components/progress/MuscleStatsSection';
import { profileService } from '../../src/services/profileService';
import type { HistoryWorkout } from '../../src/services/historyService';
import { useState } from 'react';

export default function ProgressScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { unitLabel, kgToUnit } = useWeightDisplay();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const {
    data: historyData,
    isPending: isHistoryPending,
    isFetching: isHistoryFetching,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useHistory(userId);

  const {
    data: progressData,
    isPending: isProgressPending,
    isFetching: isProgressFetching,
    isError: isProgressError,
    refetch: refetchProgress,
  } = useProgress(userId);

  // Пол для анатомической карты мышц (дефолт — male, если профиля нет).
  const { data: profileData } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      return profileService.getProfileData(userId);
    },
    enabled: !!userId,
  });
  const gender: 'male' | 'female' = profileData?.gender === 'female' ? 'female' : 'male';

  // Фича 4: тренд боли по зонам тела.
  const { result: painTrend } = usePainTrend(userId);

  // ------------------------------------------------------------------
  // Derived data (все вычисления — здесь, не в JSX)
  // ------------------------------------------------------------------

  const flatWorkouts = useMemo(
    () =>
      (historyData?.sections ?? []).reduce(
        (acc, section) => acc.concat(section.data),
        [] as HistoryWorkout[]
      ),
    [historyData?.sections]
  );

  const recentWorkouts = useMemo(
    () =>
      [...flatWorkouts]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [flatWorkouts]
  );

  const currentWeek = useMemo(() => {
    const current = progressData?.weeklyVolume?.at(-1);
    return {
      workoutsCount: current?.workoutsCount ?? 0,
      volume: current?.volume ?? 0,
    };
  }, [progressData?.weeklyVolume]);

  const previousWeek = useMemo(() => {
    const weeks = progressData?.weeklyVolume ?? [];
    if (weeks.length < 2) return null;
    return weeks[weeks.length - 2];
  }, [progressData?.weeklyVolume]);

  const weeklyWorkoutDelta = useMemo(() => {
    if (!previousWeek) return null;
    return currentWeek.workoutsCount - previousWeek.workoutsCount;
  }, [currentWeek.workoutsCount, previousWeek]);

  // Текущий максимум e1RM по упражнениям из топ-3 (список под графиком силы).
  const strengthTop = useMemo(() => {
    const series = progressData?.strengthTrend ?? [];
    return series
      .filter((s) => s.points.length > 0)
      .map((s) => {
        const best = s.points.reduce((m, p) => (p.e1rm > m.e1rm ? p : m), s.points[0]);
        return { name: s.exerciseName, e1rm: best.e1rm };
      });
  }, [progressData?.strengthTrend]);

  const strengthTrend = progressData?.strengthTrend ?? [];
  const weightTrend = progressData?.weightTrend ?? [];
  const personalRecords = progressData?.personalRecords ?? [];
  const topRecords = personalRecords.slice(0, 3);

  const hasStrength = strengthTrend.length > 0;
  const hasWeight = weightTrend.length >= 2;
  const hasRecords = topRecords.length > 0;

  // ------------------------------------------------------------------
  // Callbacks
  // ------------------------------------------------------------------

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Promise.all([refetchHistory(), refetchProgress()]);
  }, [refetchHistory, refetchProgress]);

  const openWorkout = useCallback(
    (workoutId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/progress/${workoutId}`);
    },
    [router]
  );

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  const isLoading = isHistoryPending || isProgressPending;
  const isEmpty = flatWorkouts.length === 0 && (progressData?.totalWorkouts ?? 0) === 0;

  if (!userId) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}
        >
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Пользователь не авторизован
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isHistoryError || isProgressError) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}
        >
          <AlertTriangle size={48} color={colors.warning} strokeWidth={1.5} />
          <Text
            style={[
              typography.h4,
              { color: colors.textPrimary, marginTop: SPACING.md, textAlign: 'center' },
            ]}
          >
            Не удалось загрузить прогресс
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
            ]}
          >
            Проверьте соединение и попробуйте снова
          </Text>
          <AppButton
            title="Повторить"
            variant="primary"
            onPress={() => {
              refetchHistory();
              refetchProgress();
            }}
            style={{ marginTop: SPACING.lg, paddingHorizontal: SPACING.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg }}>
          <ListSkeleton count={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (isEmpty) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: SPACING.xl,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: withAlpha(colors.primary, 0.08),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={28} color={colors.primary} />
          </View>
          <Text
            style={[
              typography.h4,
              { color: colors.textPrimary, textAlign: 'center', marginTop: SPACING.lg },
            ]}
          >
            Твой прогресс начнётся здесь
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.textSecondary,
                textAlign: 'center',
                marginTop: SPACING.sm,
                maxWidth: 320,
              },
            ]}
          >
            Заверши первую тренировку — и здесь появятся объём, сила и динамика результатов.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------
  // Data
  // ------------------------------------------------------------------

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={{
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
        }}
      >
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>Прогресс</Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          Как меняются твои тренировки и результаты
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xl * 2,
        }}
        refreshControl={
          <RefreshControl
            refreshing={(isHistoryFetching || isProgressFetching) && !isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Зона 1: Обзор (L1) */}
        <View style={{ marginBottom: SPACING.lg, gap: SPACING.md }}>
          <ProgressHero
            totalWorkouts={progressData?.totalWorkouts ?? 0}
            currentStreak={progressData?.currentStreak ?? 0}
            weeklyWorkoutDelta={weeklyWorkoutDelta}
            currentWeekVolume={currentWeek.volume}
            previousWeekVolume={previousWeek?.volume ?? null}
          />
          <ProgressStats
            totalWorkouts={progressData?.totalWorkouts ?? 0}
            totalVolume={progressData?.totalVolume ?? 0}
            currentStreak={progressData?.currentStreak ?? 0}
            bestStreak={progressData?.bestStreak ?? 0}
          />
        </View>

        {/* Зона 2: Инсайты (L1/L2) */}
        <View style={{ marginBottom: SPACING.lg, gap: SPACING.md }}>
          <WeeklyReviewSection userId={userId} />
          <ProgressInsights
            weeklyVolume={progressData?.weeklyVolume ?? []}
            strengthTrend={strengthTrend}
            weightTrend={weightTrend}
            personalRecords={personalRecords}
            chronicPainZones={painTrend.chronicZones}
          />
        </View>

        {/* Зона 2.5: Мышцы (CI-4 Muscle Volume Analysis — новая вкладка)
            3 вкладки: Нагрузка (по периоду) / Усталость / Сила. */}
        <MuscleStatsSection userId={userId} gender={gender} />

        {/* Зона 3: Динамика и рекорды (L2) */}
        <View style={{ marginBottom: SPACING.lg }}>
          <SectionTitle
            accent={colors.primary}
            icon={<TrendingUp size={18} color={colors.primary} />}
            title="Динамика и рекорды"
            subtitle="Как меняются твои показатели"
          />

          <View style={{ gap: SPACING.lg }}>
            {/* Активность */}
            <View>
              <Text
                style={[
                  typography.labelBold,
                  { color: colors.textPrimary, marginBottom: SPACING.sm },
                ]}
              >
                Активность
              </Text>
              <VolumeTrendChart weeklyVolume={progressData?.weeklyVolume ?? []} />
            </View>

            {/* Сила */}
            {hasStrength ? (
              <View>
                <Text
                  style={[
                    typography.labelBold,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Сила (e1RM)
                </Text>
                {strengthTop.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ marginBottom: SPACING.md, gap: SPACING.sm }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => setSelectedExercise(null)}
                      style={{
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.sm,
                        minHeight: 44,
                        borderRadius: BORDER_RADIUS.full,
                        backgroundColor:
                          selectedExercise === null ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: selectedExercise === null ? colors.primary : colors.border,
                        justifyContent: 'center',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Показать все упражнения"
                      accessibilityState={{ selected: selectedExercise === null }}
                    >
                      <Text
                        style={[
                          typography.captionSmall,
                          {
                            color:
                              selectedExercise === null ? colors.textInverse : colors.textSecondary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        Все
                      </Text>
                    </TouchableOpacity>
                    {strengthTop.map((item) => {
                      const isSelected = selectedExercise === item.name;
                      return (
                        <TouchableOpacity
                          key={item.name}
                          activeOpacity={0.75}
                          onPress={() => setSelectedExercise(item.name)}
                          style={{
                            paddingHorizontal: SPACING.md,
                            paddingVertical: SPACING.sm,
                            minHeight: 44,
                            borderRadius: BORDER_RADIUS.full,
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                            justifyContent: 'center',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Фильтр по упражнению: ${item.name}`}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              typography.captionSmall,
                              {
                                color: isSelected ? colors.textInverse : colors.textSecondary,
                                fontWeight: '600',
                              },
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <AppCard>
                  <StrengthTrendChart
                    series={strengthTrend}
                    selectedExerciseName={selectedExercise ?? undefined}
                  />
                </AppCard>
              </View>
            ) : (
              <View>
                <Text
                  style={[
                    typography.labelBold,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Сила (e1RM)
                </Text>
                <View
                  style={{
                    padding: SPACING.md,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textPrimary, marginBottom: SPACING.xs },
                    ]}
                  >
                    Продолжай фиксировать веса и повторения
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Здесь появится график силы (e1RM) по твоим основным упражнениям.
                  </Text>
                  <Text
                    style={[
                      typography.captionSmall,
                      { color: colors.textTertiary, marginTop: SPACING.sm, fontStyle: 'italic' },
                    ]}
                  >
                    e1RM — расчётный одноповторный максимум по формуле Эпли: вес × (1 + повторы /
                    30).
                  </Text>
                </View>
              </View>
            )}

            {/* Вес */}
            {hasWeight && <WeightTrendRow weightTrend={weightTrend} />}

            {/* Личные рекорды */}
            {hasRecords && (
              <View>
                <Text
                  style={[
                    typography.labelBold,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Личные рекорды
                </Text>
                {topRecords.map((record) => (
                  <View
                    key={record.name}
                    style={{
                      backgroundColor: withAlpha(colors.warning, 0.08),
                      borderRadius: BORDER_RADIUS.lg,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.warning, 0.25),
                      padding: SPACING.md,
                      marginBottom: SPACING.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: withAlpha(colors.warning, 0.15),
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: SPACING.md,
                      }}
                    >
                      <Award size={20} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[typography.labelBold, { color: colors.textPrimary }]}
                      >
                        {record.name}
                      </Text>
                      {!!record.recordDate && (
                        <Text
                          style={[
                            typography.captionSmall,
                            { color: colors.textTertiary, marginTop: 2 },
                          ]}
                        >
                          {new Date(record.recordDate).toLocaleDateString('ru-RU')}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: SPACING.xs }}>
                      <Text style={[typography.h3, { color: colors.warning, fontWeight: '700' }]}>
                        {kgToUnit(record.maxWeight)}
                      </Text>
                      <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                        {unitLabel} × {record.reps}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Зона 4: История (L2) */}
        <RecentWorkouts workouts={recentWorkouts} onPress={openWorkout} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Прозрачный заголовок секции с иконкой — без фоновой подложки. */
function SectionTitle({
  accent,
  icon,
  title,
  subtitle,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: withAlpha(accent, 0.1),
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: SPACING.sm,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}
