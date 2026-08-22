// app/(tabs)/index.tsx
// Dashboard: сводка + виджеты. PRODUCT.md §12: «Что мне делать сегодня?»
// FEAT-1.3 (стрик), FEAT-1.8 (readiness check-in — внутри StatusCard, не гейт старта),
// COACH-4 (contextual insight), AUDIT-1 (питание), AUDIT-6 (блок «Состояние сегодня»).
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Hand, ListChecks } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useHistory } from '../../src/hooks/useHistory';
import { typography } from '../../src/styles/typography';
import { SPACING, scale } from '../../src/constants/theme';
import { createDashboardStyles } from '../../src/styles/components/dashboard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { ProgramProgressCard } from '../../src/components/ProgramProgressCard';
import { StreakCard } from '../../src/components/dashboard/StreakCard';
import { ContextInsightCard } from '../../src/components/dashboard/ContextInsightCard';
import { StatusCard } from '../../src/components/dashboard/StatusCard';
import { DaySummaryCard } from '../../src/components/history/DaySummaryCard';
import { NutritionAddModal } from '../../src/components/dashboard/NutritionAddModal';
import { useWeeklySummary } from '../../src/hooks/useWeeklySummary';
import { useTodayReadiness } from '../../src/hooks/useTodayReadiness';
import { useDailyNutrition } from '../../src/hooks/useDailyNutrition';
import { DashboardNutritionCard } from '../../src/components/dashboard/DashboardNutritionCard';
import type { HistoryWorkout } from '../../src/services/historyService';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createDashboardStyles(colors), [colors]);

  const { data, isPending, isError, refetch } = useDashboard(userId);

  // Календарь на Dashboard: те же данные, что и в «Мой прогресс» (useHistory),
  // ноль новых запросов в core flow.
  const { data: historyData } = useHistory(userId);
  const flatWorkouts = useMemo(
    () =>
      (historyData?.sections ?? []).reduce(
        (acc, s) => acc.concat(s.data),
        [] as HistoryWorkout[],
      ),
    [historyData?.sections],
  );
  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    flatWorkouts.forEach((w) => set.add(dayKey(new Date(w.created_at))));
    return set;
  }, [flatWorkouts]);

  // Компактный календарь Dashboard: последние 2 недели (пн–вс × 2), ноль новых запросов.
  const lastTwoWeeks = useMemo(() => {
    const mondayThisWeek = new Date();
    const dow = mondayThisWeek.getDay(); // 0=вс, 1=пн, ...
    mondayThisWeek.setDate(mondayThisWeek.getDate() + (dow === 0 ? -6 : 1 - dow));
    const start = new Date(mondayThisWeek);
    start.setDate(start.getDate() - 7); // начало предыдущей недели
    const days: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const handleDayPress = useCallback((dateKey: string) => {
    setSelectedDay(dateKey);
  }, []);
  const closeDaySheet = useCallback(() => setSelectedDay(null), []);

  // AUDIT-1: модалка добавления питания (L2) — state на уровне экрана,
  // рендер вне ScrollView (overlay).
  const [nutritionModalVisible, setNutritionModalVisible] = useState(false);

  // COACH-4: Contextual tips
  const { data: weeklyData } = useWeeklySummary(userId, 0);
  // ENG-3 / COACH-4: readiness для readinessWarning в ContextInsightCard.
  // Сам check-in теперь живёт в StatusCard (AUDIT-6).
  const { data: readiness } = useTodayReadiness(userId);

  // AUDIT-1: L1-summary питания
  const { data: nutritionData, isPending: isNutritionPending } = useDailyNutrition(userId);

  const topInsight = useMemo(() => {
    if (!weeklyData?.insights) return null;
    return (
      weeklyData.insights.find((i) => i.severity === 'warning') ??
      weeklyData.insights.find((i) => i.severity === 'positive') ??
      null
    );
  }, [weeklyData?.insights]);

  const readinessWarning = readiness != null && readiness < 3;

  // Старт ближайшей тренировки программы — без readiness-гейта
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
                backgroundColor: colors.primary + '15',
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

        {/* COACH-4: Contextual insight (L1) */}
        <View style={styles.section}>
          <ContextInsightCard insight={topInsight} readinessWarning={readinessWarning} />
        </View>

        {/* ✅ Активная программа: кнопка «Начать тренировку» — внутри карточки */}
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
                    backgroundColor: colors.primary + '15',
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

        {/* AUDIT-6: Состояние сегодня — readiness (мини-кольцо + tappable pips),
            чипы активных травм, «⚠ Боль сегодня», строка-следствие.
            ReadinessSheet встроен в StatusCard. */}
        <View style={styles.section}>
          <StatusCard />
        </View>

        {/* AUDIT-1: ПИТАНИЕ (L1 summary) */}
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
            />
          ) : null}
        </View>

        {/* AUDIT-1: КОРОТКО О НЕДЕЛЕ (L1 summary из useWeeklySummary) */}
        {weeklyData?.insights && weeklyData.insights.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Коротко о неделе" />
            <AppCard variant="default">
              {weeklyData.insights.slice(0, 3).map((insight, idx) => {
                const isLast = idx === Math.min(2, weeklyData.insights.length - 1);
                return (
                  <View
                    key={insight.code || idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: SPACING.sm,
                      marginBottom: isLast ? 0 : SPACING.md,
                    }}
                  >
                    <View
                      style={{
                        width: scale(6),
                        height: scale(6),
                        borderRadius: scale(3),
                        backgroundColor:
                          insight.severity === 'warning' ? colors.warning : colors.success,
                        marginTop: scale(6),
                      }}
                    />
                    <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                      {insight.title}
                    </Text>
                  </View>
                );
              })}
              <TouchableOpacity
                style={{ marginTop: SPACING.md, alignItems: 'flex-end' }}
                onPress={() => router.push('/profile/progress')}
              >
                <Text style={[typography.caption, { color: colors.primary }]}>
                  Посмотреть прогресс
                </Text>
              </TouchableOpacity>
            </AppCard>
          </View>
        )}

        {/* Календарь тренировок: статистика месяца + последние 2 недели */}
        <View style={styles.section}>
          <SectionHeader title="Календарь тренировок" />
          <AppCard variant="default">
            {/* Компактная статистика месяца */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: SPACING.md,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.h4, { color: colors.primary }]}>
                  {historyData?.monthlyStats.totalWorkouts ?? 0}
                </Text>
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  за месяц
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.h4, { color: colors.success }]}>
                  {((historyData?.monthlyStats.totalVolume ?? 0) / 1000).toFixed(1)}т
                </Text>
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  объём
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.h4, { color: colors.warning }]}>
                  {Math.round(historyData?.monthlyStats.bestWorkout ?? 0)}
                </Text>
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  лучшая, кг
                </Text>
              </View>
            </View>

            {/* Последние 2 недели: пн–вс × 2 */}
            <View style={{ flexDirection: 'row', marginBottom: SPACING.xs }}>
              {WEEKDAY_LABELS.map((label) => (
                <Text
                  key={label}
                  style={[
                    typography.captionSmall,
                    { color: colors.textTertiary, flex: 1, textAlign: 'center' },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {lastTwoWeeks.map((date) => {
                const key = dayKey(date);
                const hasWorkout = workoutDates.has(key);
                const isToday = key === dayKey(new Date());
                return (
                  <TouchableOpacity
                    key={key}
                    disabled={!hasWorkout}
                    onPress={() => handleDayPress(key)}
                    style={{
                      width: `${100 / 7}%`,
                      alignItems: 'center',
                      paddingVertical: SPACING.xs,
                    }}
                  >
                    <View
                      style={{
                        width: scale(30),
                        height: scale(30),
                        borderRadius: scale(15),
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: hasWorkout ? colors.primary + '20' : 'transparent',
                        borderWidth: isToday ? 1 : 0,
                        borderColor: isToday ? colors.primary : 'transparent',
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: hasWorkout ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        marginTop: 2,
                        backgroundColor: hasWorkout ? colors.success : 'transparent',
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </AppCard>
        </View>
      </ScrollView>

      {/* Тап по дню календаря → тренировки дня (L2) */}
      <DaySummaryCard
        selectedDay={selectedDay}
        workouts={flatWorkouts}
        onClose={closeDaySheet}
        colors={colors}
      />

      {/* AUDIT-1: модалка добавления питания (L2) — overlay поверх ScrollView */}
      <NutritionAddModal
        visible={nutritionModalVisible}
        onClose={() => setNutritionModalVisible(false)}
      />
    </SafeAreaView>
  );
}