// app/(tabs)/index.tsx
// Dashboard: сводка + виджеты. PRODUCT.md §12: «Что мне делать сегодня?»
// FEAT-1.3 (стрик), FEAT-1.8 (readiness check-in — внутри StatusCard, не гейт старта),
// COACH-4 (contextual insight), AUDIT-1 (питание), AUDIT-6 (блок «Состояние сегодня»),
// NUTRI-2 (CRUD записей питания). DA-P2-8: календарь и «Коротко о неделе» — в src/components/dashboard/.
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Hand, ListChecks } from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useHistory } from '../../src/hooks/useHistory';
import { typography } from '../../src/styles/typography';
import { SPACING, scale, withAlpha } from '../../src/constants/theme';
import { createDashboardStyles } from '../../src/styles/components/dashboard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { ProgramProgressCard } from '../../src/components/ProgramProgressCard';
import { StreakCard } from '../../src/components/dashboard/StreakCard';
import { ContextInsightCard } from '../../src/components/dashboard/ContextInsightCard';
import { StatusCard } from '../../src/components/dashboard/StatusCard';
import { TrainingCalendarCard } from '../../src/components/dashboard/TrainingCalendarCard';
import { WeeklyInsightsSection } from '../../src/components/dashboard/WeeklyInsightsSection';
import { DaySummaryCard } from '../../src/components/history/DaySummaryCard';
import { ListSkeleton } from '../../src/components/Skeleton';
import { NutritionAddModal } from '../../src/components/dashboard/NutritionAddModal';
import { NutritionLogListModal } from '../../src/components/dashboard/NutritionLogListModal';
import { useWeeklySummary } from '../../src/hooks/useWeeklySummary';
import { useTodayReadiness } from '../../src/hooks/useTodayReadiness';
import { useDailyNutrition } from '../../src/hooks/useDailyNutrition';
import { DashboardNutritionCard } from '../../src/components/dashboard/DashboardNutritionCard';

import type { HistoryWorkout } from '../../src/services/historyService';
import type { NutritionLog } from '../../src/services/profileService';

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();

  const styles = useMemo(() => createDashboardStyles(colors), [colors]);

  const { data, isPending, isError, refetch } = useDashboard(userId);

  // Календарь на Dashboard: те же данные, что и в «Мой прогресс».
  const { data: historyData } = useHistory(userId);

  const flatWorkouts = useMemo(
    () =>
      (historyData?.sections ?? []).reduce((acc, s) => acc.concat(s.data), [] as HistoryWorkout[]),
    [historyData?.sections]
  );

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const handleDayPress = useCallback((dateKey: string) => {
    setSelectedDay(dateKey);
  }, []);

  const closeDaySheet = useCallback(() => setSelectedDay(null), []);

  // AUDIT-1: модалка добавления питания.
  const [nutritionModalVisible, setNutritionModalVisible] = useState(false);

  // NUTRI-2: модалка списка записей + редактирование.
  const [nutritionLogListVisible, setNutritionLogListVisible] = useState(false);

  const [editingNutritionLog, setEditingNutritionLog] = useState<NutritionLog | null>(null);

  // COACH-4: Contextual tips
  const { data: weeklyData } = useWeeklySummary(userId, 0);

  // ENG-3 / COACH-4: readiness для readinessWarning.
  const { data: readiness } = useTodayReadiness(userId);

  // AUDIT-1: L1-summary питания
  const { data: nutritionData, isPending: isNutritionPending } = useDailyNutrition(userId);

  const topInsight = useMemo(() => {
    if (!weeklyData?.insights) {
      return null;
    }

    return (
      weeklyData.insights.find((i) => i.severity === 'warning') ??
      weeklyData.insights.find((i) => i.severity === 'positive') ??
      null
    );
  }, [weeklyData?.insights]);

  const readinessWarning = readiness != null && readiness < 3;

  // Старт ближайшей тренировки программы — без readiness-гейта.
  const handleStartWorkout = useCallback(() => {
    if (data?.activeProgram) {
      router.push(`/workout/create?programId=${data.activeProgram.programId}`);
    }
  }, [data?.activeProgram, router]);

  if (!userId) {
    return (
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Пользователь не авторизован
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isPending) {
    return (
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <View style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg }}>
          <ListSkeleton count={3} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.xl,
          }}
        >
          <Text
            style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.lg }]}
          >
            Не удалось загрузить данные
          </Text>

          <AppButton title="Повторить" variant="primary" onPress={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = data.userName || 'Пользователь';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text
              style={[styles.headerTitle, { flexShrink: 1, marginBottom: 0 }]}
              numberOfLines={1}
            >
              Привет, {displayName}!
            </Text>

            <View
              style={{
                width: scale(32),
                height: scale(32),
                borderRadius: scale(16),
                backgroundColor: withAlpha(colors.primary, 0.08),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Hand size={scale(18)} color={colors.primary} strokeWidth={1.8} />
            </View>
          </View>

          <Text style={styles.headerSubtitle}>Всего тренировок: {data.totalWorkouts}</Text>
        </View>

        {/* FEAT-1.3: недельный стрик */}
        {data.totalWorkouts > 0 && (
          <View style={styles.section}>
            <StreakCard streak={data.streak} colors={colors} />
          </View>
        )}

        {/* COACH-4 */}
        <View style={styles.section}>
          <ContextInsightCard insight={topInsight} readinessWarning={readinessWarning} />
        </View>

        {/* Активная программа */}
        <View style={styles.section}>
          {data.activeProgram ? (
            <ProgramProgressCard
              programName={data.activeProgram.programName}
              dayName={data.activeProgram.dayName}
              currentPhase={data.activeProgram.currentPhase}
              phaseName={data.activeProgram.phaseName}
              phaseType={data.activeProgram.phaseType}
              totalPhases={data.activeProgram.totalPhases}
              currentWeek={data.activeProgram.currentWeek}
              currentDay={data.activeProgram.currentDay}
              totalDays={data.activeProgram.totalDays}
              onStartPress={handleStartWorkout}
            />
          ) : (
            <AppCard variant="default">
              <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
                <View
                  style={{
                    width: scale(48),
                    height: scale(48),
                    borderRadius: scale(24),
                    backgroundColor: withAlpha(colors.primary, 0.08),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: SPACING.md,
                  }}
                >
                  <ListChecks size={scale(24)} color={colors.primary} strokeWidth={1.8} />
                </View>

                <Text
                  style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.xs }]}
                >
                  Нет активной программы
                </Text>

                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
                  ]}
                >
                  Выберите программу, чтобы начать тренировки
                </Text>

                <AppButton
                  title="Выбрать программу"
                  variant="primary"
                  onPress={() => router.push('/(tabs)/programs')}
                />
              </View>
            </AppCard>
          )}
        </View>

        {/* AUDIT-6 */}
        <View style={styles.section}>
          <StatusCard />
        </View>

        {/* AUDIT-1: ПИТАНИЕ */}
        <View style={styles.section}>
          {isNutritionPending ? (
            <AppCard variant="default">
              <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </AppCard>
          ) : nutritionData ? (
            <DashboardNutritionCard
              daily={nutritionData.daily}
              targets={nutritionData.targets}
              onOpenModal={() => setNutritionModalVisible(true)}
              onOpenLogList={() => setNutritionLogListVisible(true)}
            />
          ) : null}
        </View>

        {/* AUDIT-1: КОРОТКО О НЕДЕЛЕ */}
        {weeklyData?.insights && weeklyData.insights.length > 0 && (
          <View style={styles.section}>
            <WeeklyInsightsSection
              insights={weeklyData.insights}
              onOpenProgress={() => router.push('/(tabs)/progress')}
            />
          </View>
        )}

        {/* Календарь тренировок */}
        <View style={styles.section}>
          <SectionHeader title="Календарь тренировок" />
          <TrainingCalendarCard
            workouts={flatWorkouts}
            monthlyStats={
              historyData?.monthlyStats ?? { totalWorkouts: 0, totalVolume: 0, bestWorkout: 0 }
            }
            onDayPress={handleDayPress}
          />
        </View>
      </ScrollView>

      {/* Тап по дню календаря → тренировки дня */}
      <DaySummaryCard
        selectedDay={selectedDay}
        workouts={flatWorkouts}
        onClose={closeDaySheet}
        colors={colors}
      />

      {/* AUDIT-1 / NUTRI-2: модалка добавления/редактирования питания. Рендер вне ScrollView. */}
      <NutritionAddModal
        visible={nutritionModalVisible}
        onClose={() => {
          setNutritionModalVisible(false);
          setEditingNutritionLog(null);
        }}
        editingLog={editingNutritionLog}
      />

      {/* NUTRI-2: список записей за сегодня. Рендер вне ScrollView. */}
      <NutritionLogListModal
        visible={nutritionLogListVisible}
        onClose={() => setNutritionLogListVisible(false)}
        onEdit={(log) => {
          setEditingNutritionLog(log);
          setNutritionLogListVisible(false);
          setNutritionModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
}
