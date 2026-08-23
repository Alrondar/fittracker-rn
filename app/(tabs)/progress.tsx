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
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Activity, Award, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useHistory } from '../../src/hooks/useHistory';
import { useProgress } from '../../src/hooks/useProgress';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppCard } from '../../src/components/ui/AppCard';
import { ProgressHero } from '../../src/components/progress/ProgressHero';
import { ProgressStats } from '../../src/components/progress/ProgressStats';
import { ProgressInsights } from '../../src/components/progress/ProgressInsights';
import { RecentWorkouts } from '../../src/components/progress/RecentWorkouts';
import { StrengthTrendChart } from '../../src/components/progress/StrengthTrendChart';
import { VolumeTrendChart } from '../../src/components/progress/VolumeTrendChart';
import { WeightTrendRow } from '../../src/components/progress/WeightTrendRow';
import type { HistoryWorkout } from '../../src/services/historyService';
import { useState } from 'react';

export default function ProgressScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const {
    data: historyData,
    isPending: isHistoryPending,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useHistory(userId);

  const {
    data: progressData,
    isPending: isProgressPending,
    isFetching: isProgressFetching,
    refetch: refetchProgress,
  } = useProgress(userId);

  // ------------------------------------------------------------------
  // Derived data (все вычисления — здесь, не в JSX)
  // ------------------------------------------------------------------

  const flatWorkouts = useMemo(
    () =>
      (historyData?.sections ?? []).reduce(
        (acc, section) => acc.concat(section.data),
        [] as HistoryWorkout[],
      ),
    [historyData?.sections],
  );

  const recentWorkouts = useMemo(
    () =>
      [...flatWorkouts]
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        .slice(0, 5),
    [flatWorkouts],
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
        const best = s.points.reduce(
          (m, p) => (p.e1rm > m.e1rm ? p : m),
          s.points[0],
        );
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
    [router],
  );

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------

  const isLoading = isHistoryPending || isProgressPending;
  const isEmpty =
    flatWorkouts.length === 0 && (progressData?.totalWorkouts ?? 0) === 0;

  if (!userId) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Пользователь не авторизован
          </Text>
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: SPACING.md },
            ]}
          >
            Загружаем твой прогресс…
          </Text>
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
              backgroundColor: colors.primary + '15',
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
            Заверши первую тренировку — и здесь появятся объём, сила и динамика
            результатов.
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
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          Прогресс
        </Text>
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

        <ProgressInsights
          weeklyVolume={progressData?.weeklyVolume ?? []}
          strengthTrend={strengthTrend}
          weightTrend={weightTrend}
          personalRecords={personalRecords}
        />

        {/* Активность: прозрачный заголовок + собственная карточка графика
            (без AppCard — убираем «карточку в карточке») */}
        <View style={{ marginBottom: SPACING.lg }}>
          <SectionTitle
            accent={colors.success}
            icon={<Activity size={18} color={colors.success} />}
            title="Активность"
            subtitle="Объём за последние недели"
          />
          <VolumeTrendChart weeklyVolume={progressData?.weeklyVolume ?? []} />
        </View>

        {/* Сила: заголовок один — внутри StrengthTrendChart */}
{hasStrength ? (
  <View style={{ marginBottom: SPACING.lg }}>
    <SectionTitle
      accent={colors.primary}
      icon={<TrendingUp size={18} color={colors.primary} />}
      title="Сила"
      subtitle="Расчётный 1ПМ (e1RM)"
    />
    {/* Селектор упражнений */}
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
            paddingVertical: SPACING.xs,
            borderRadius: BORDER_RADIUS.full,
            backgroundColor: selectedExercise === null ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: selectedExercise === null ? colors.primary : colors.border,
          }}
        >
          <Text
            style={[
              typography.captionSmall,
              {
                color: selectedExercise === null ? colors.textInverse : colors.textSecondary,
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
                paddingVertical: SPACING.xs,
                borderRadius: BORDER_RADIUS.full,
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
              }}
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
          <View style={{ marginBottom: SPACING.lg }}>
            <SectionTitle
              accent={colors.primary}
              icon={<TrendingUp size={18} color={colors.primary} />}
              title="Сила"
              subtitle="Расчётный 1ПМ (e1RM)"
            />
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
                e1RM — расчётный одноповторный максимум по формуле Эпли: вес × (1 +
                повторы / 30).
              </Text>
            </View>
          </View>
        )}

        {/* Вес: заголовок живёт внутри WeightTrendRow */}
        {hasWeight && (
          <View style={{ marginBottom: SPACING.lg }}>
            <WeightTrendRow weightTrend={weightTrend} />
          </View>
        )}

        {/* Личные рекорды */}
{hasRecords && (
  <View style={{ marginBottom: SPACING.lg }}>
    <SectionTitle
      accent={colors.warning}
      icon={<Award size={18} color={colors.warning} />}
      title="Личные рекорды"
      subtitle="Твои лучшие результаты"
    />
    {topRecords.map((record) => (
      <View
        key={record.name}
        style={{
          backgroundColor: colors.warning + '15',
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: colors.warning + '40',
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
            backgroundColor: colors.warning + '25',
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
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              typography.h3,
              { color: colors.warning, fontWeight: '700' },
            ]}
          >
            {record.maxWeight}
          </Text>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary },
            ]}
          >
            кг × {record.reps}
          </Text>
        </View>
      </View>
    ))}
  </View>
)}

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
          backgroundColor: accent + '1A',
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
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}