// app/(tabs)/progress.tsx
// UX-11: "Мой прогресс" — единый экран ответа «Что произошло с моими тренировками и как я меняюсь?» (PRODUCT.md §10).
// 4 режима: Обзор, Календарь, История, Аналитика.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CalendarDays, List, BarChart2, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useHistory } from '../../src/hooks/useHistory';
import { useProgress } from '../../src/hooks/useProgress';
import { useWeeklySummary } from '../../src/hooks/useWeeklySummary';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppCard } from '../../src/components/ui/AppCard';
import { HistoryCalendar } from '../../src/components/history/HistoryCalendar';
import { DaySummaryCard } from '../../src/components/history/DaySummaryCard';
import { WeeklyReviewBlock } from '../../src/components/progress/WeeklyReviewBlock';
import { StrengthTrendChart } from '../../src/components/progress/StrengthTrendChart';
import { VolumeTrendChart } from '../../src/components/progress/VolumeTrendChart';
import { WeightTrendRow } from '../../src/components/progress/WeightTrendRow';
import { Skeleton } from '../../src/components/Skeleton';
import type { HistoryWorkout } from '../../src/services/historyService';

type ProgressView = 'overview' | 'calendar' | 'list' | 'analytics';

const VIEWS: { id: ProgressView; label: string; Icon: any }[] = [
  { id: 'overview', label: 'Обзор', Icon: TrendingUp },
  { id: 'calendar', label: 'Календарь', Icon: CalendarDays },
  { id: 'list', label: 'История', Icon: List },
  { id: 'analytics', label: 'Аналитика', Icon: BarChart2 },
];

export default function ProgressScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { data: historyData, isPending: isHistoryPending, isFetching: isHistoryFetching, refetch: refetchHistory } = useHistory(userId);
  const { data: progressData, isPending: isProgressPending, refetch: refetchProgress } = useProgress(userId);
  const { data: weeklyData, isPending: isWeeklyPending } = useWeeklySummary(userId, 0);

  const [view, setView] = useState<ProgressView>('overview');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const flatWorkouts = useMemo(
    () => (historyData?.sections ?? []).reduce((acc, s) => acc.concat(s.data), [] as HistoryWorkout[]),
    [historyData?.sections]
  );

  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    flatWorkouts.forEach((w: HistoryWorkout) => {
      const d = new Date(w.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      set.add(key);
    });
    return set;
  }, [flatWorkouts]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetchHistory();
    refetchProgress();
  }, [refetchHistory, refetchProgress]);

  const handleDayPress = useCallback((dateKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(dateKey);
  }, []);

  const closeDaySheet = useCallback(() => setSelectedDay(null), []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isHistoryPending || isProgressPending) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка прогресса...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty =
    (historyData?.sections.length ?? 0) === 0 &&
    (progressData?.totalWorkouts ?? 0) === 0;

  if (isEmpty) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Text style={[typography.h4, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
            Пока нет данных
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Завершите первую тренировку, чтобы увидеть свой прогресс здесь
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>Мой прогресс</Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          Что произошло и как я меняюсь
        </Text>
      </View>

      {/* Segmented Control */}
      <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceSecondary,
            borderRadius: BORDER_RADIUS.md,
            padding: 4,
          }}
        >
          {VIEWS.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <TouchableOpacity
                key={id}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: SPACING.sm,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: active ? colors.primary : 'transparent',
                }}
                onPress={() => {
                  setView(id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Icon size={16} color={active ? colors.textInverse : colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: active ? colors.textInverse : colors.textSecondary,
                      fontWeight: active ? '600' : '400',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isHistoryFetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* РЕЖИМ: ОБЗОР */}
        {view === 'overview' && (
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {/* 4 большие метрики */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl }}>
              <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', paddingVertical: SPACING.md }}>
                <Text style={[typography.h3, { color: colors.primary }]}>
                  {progressData?.totalWorkouts ?? 0}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>тренировок</Text>
              </AppCard>
              <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', paddingVertical: SPACING.md }}>
                <Text style={[typography.h3, { color: colors.success }]}>
                  {((progressData?.totalVolume ?? 0) / 1000).toFixed(1)}т
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>объём</Text>
              </AppCard>
              <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', paddingVertical: SPACING.md }}>
                <Text style={[typography.h3, { color: colors.warning }]}>
                  {progressData?.currentStreak ?? 0}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>дней стрик</Text>
              </AppCard>
              <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', paddingVertical: SPACING.md }}>
                <Text style={[typography.h3, { color: colors.textPrimary }]}>
                  {historyData?.monthlyStats.totalWorkouts ?? 0}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>в этом мес.</Text>
              </AppCard>
            </View>

            {/* Что изменилось */}
            {isWeeklyPending ? (
              <Skeleton width="100%" height={120} borderRadius={BORDER_RADIUS.lg} />
            ) : weeklyData ? (
              <WeeklyReviewBlock insights={weeklyData.insights} workoutsCount={weeklyData.current.workoutsCount} />
            ) : null}
          </View>
        )}

        {/* РЕЖИМ: КАЛЕНДАРЬ */}
        {view === 'calendar' && (
          <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm }}>
            {/* Monthly Stats */}
            <AppCard variant="compact" style={{ marginBottom: SPACING.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[typography.h4, { color: colors.primary }]}>
                    {historyData?.monthlyStats.totalWorkouts ?? 0}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>тренировок</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[typography.h4, { color: colors.success }]}>
                    {((historyData?.monthlyStats.totalVolume ?? 0) / 1000).toFixed(1)}т
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>объём</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[typography.h4, { color: colors.warning }]}>
                    {Math.round(historyData?.monthlyStats.bestWorkout ?? 0)}
                  </Text>
                  <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>лучшая</Text>
                </View>
              </View>
            </AppCard>

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
              Показаны только завершённые тренировки
            </Text>
            <HistoryCalendar
              workoutDates={workoutDates}
              selectedDay={selectedDay}
              onDayPress={handleDayPress}
              colors={colors}
              loading={isHistoryPending}
              error={false}
              onRetry={refetchHistory}
            />
          </View>
        )}

        {/* РЕЖИМ: ИСТОРИЯ */}
        {view === 'list' && (
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {flatWorkouts.map((item: HistoryWorkout, index: number) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/progress/${item.id}`);
                }}
                activeOpacity={0.8}
                style={{ marginBottom: SPACING.md }}
              >
                <View
                  style={{
                    padding: SPACING.lg,
                    borderRadius: BORDER_RADIUS.lg,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm }}>
                    <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, marginRight: SPACING.md }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[typography.h3, { color: colors.textPrimary }]}>{item.sets}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>подходов</Text>
                    </View>
                    <View style={{ width: 1, height: 30, marginHorizontal: SPACING.sm, backgroundColor: colors.border }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[typography.h3, { color: colors.textPrimary }]}>{Math.round(item.volume)}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>кг</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* РЕЖИМ: АНАЛИТИКА */}
        {view === 'analytics' && (
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {progressData?.strengthTrend && progressData.strengthTrend.length > 0 && (
              <AppCard style={{ marginBottom: SPACING.lg }}>
                <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                  Сила (e1RM)
                </Text>
                <View style={{ paddingHorizontal: SPACING.sm }}>
                  <StrengthTrendChart series={progressData.strengthTrend} />
                </View>
              </AppCard>
            )}
            
            <AppCard style={{ marginBottom: SPACING.lg }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                Объём по неделям
              </Text>
              <View style={{ paddingHorizontal: SPACING.sm }}>
                <VolumeTrendChart weeklyVolume={progressData?.weeklyVolume ?? []} />
              </View>
            </AppCard>
            
            {progressData?.weightTrend && progressData.weightTrend.length >= 2 && (
              <AppCard style={{ marginBottom: SPACING.lg }}>
                <WeightTrendRow weightTrend={progressData.weightTrend} />
              </AppCard>
            )}
            
            {progressData?.personalRecords && progressData.personalRecords.length > 0 && (
              <AppCard>
                <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
                  🏆 Личные рекорды
                </Text>
                {progressData.personalRecords.map((pr, idx) => (
                  <View
                    key={pr.name ?? idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: SPACING.sm,
                      borderBottomWidth: idx < progressData.personalRecords.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                        {pr.name}
                      </Text>
                      <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 2 }]}>
                        {pr.recordDate ? new Date(pr.recordDate).toLocaleDateString('ru-RU') : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.h4, { color: colors.primary }]}>
                        {pr.maxWeight} кг
                      </Text>
                      <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                        {pr.reps} повт.
                      </Text>
                    </View>
                  </View>
                ))}
              </AppCard>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sheet выбранного дня */}
      <DaySummaryCard
        selectedDay={selectedDay}
        workouts={flatWorkouts}
        onClose={closeDaySheet}
        colors={colors}
      />
    </SafeAreaView>
  );
}