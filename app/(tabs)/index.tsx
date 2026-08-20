// app/(tabs)/index.tsx
// Dashboard: сводка + виджеты. FEAT-1.3 (стрик), FEAT-1.4 (e1RM в PR),
// FEAT-1.8 (readiness check-in перед стартом тренировки).
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Hand, ListChecks } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useDashboard } from '../../src/hooks/useDashboard';
import { typography } from '../../src/styles/typography';
import { SPACING, scale } from '../../src/constants/theme';
import { createDashboardStyles } from '../../src/styles/components/dashboard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppCard } from '../../src/components/ui/AppCard';
import { ActivityCalendar } from '../../src/components/ActivityCalendar';
import { ProgramProgressCard } from '../../src/components/ProgramProgressCard';
import { WeeklyStatsCard } from '../../src/components/WeeklyStatsCard';
import { ExerciseProgressCard } from '../../src/components/ExerciseProgressCard';
import { PersonalRecordsCard } from '../../src/components/PersonalRecordsCard';
import { LastWorkoutCard } from '../../src/components/LastWorkoutCard';
import { StreakCard } from '../../src/components/dashboard/StreakCard';
import { ReadinessSheet } from '../../src/components/dashboard/ReadinessSheet';
import { ContextInsightCard } from '../../src/components/dashboard/ContextInsightCard';
import { readinessService } from '../../src/services/readinessService';
import { useWeeklySummary } from '../../src/hooks/useWeeklySummary';
import { useTodayReadiness } from '../../src/hooks/useTodayReadiness';

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createDashboardStyles(colors), [colors]);
  const { data, isPending, isError, refetch } = useDashboard(userId);
  
  // COACH-4: Contextual tips
  const { data: weeklyData } = useWeeklySummary(userId, 0);
  const { data: readiness } = useTodayReadiness(userId);

  const topInsight = useMemo(() => {
    if (!weeklyData?.insights) return null;
    // Приоритет: warning > positive
    return weeklyData.insights.find(i => i.severity === 'warning') ?? 
           weeklyData.insights.find(i => i.severity === 'positive') ?? null;
  }, [weeklyData?.insights]);

  const readinessWarning = readiness != null && readiness < 3;

  // FEAT-1.8: readiness check-in раз в день перед стартом тренировки
  const [readinessOpen, setReadinessOpen] = useState(false);
  const pendingStartRef = useRef<(() => void) | null>(null);

  const requireReadiness = useCallback(
    (action: () => void) => {
      if (!userId) {
        action();
        return;
      }
      readinessService
        .getToday(userId)
        .then((logged) => {
          if (logged) {
            action();
            return;
          }
          pendingStartRef.current = action;
          setReadinessOpen(true);
        })
        .catch(() => action());
    },
    [userId],
  );

  const handleReadinessDone = useCallback((proceed: boolean) => {
    setReadinessOpen(false);
    if (proceed && pendingStartRef.current) {
      const action = pendingStartRef.current;
      pendingStartRef.current = null;
      action();
    }
  }, []);

  const handleStartWorkout = () => {
    requireReadiness(() => {
      if (data?.activeProgram) {
        router.push(`/workout/create?programId=${data.activeProgram.programId}`);
      }
    });
  };

  const handleRepeatWorkout = () => {
    requireReadiness(() => {
      if (data?.lastWorkout) {
        router.push(`/workout/create?repeatId=${data.lastWorkout.id}`);
      }
    });
  };

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
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}
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

        {/* ✅ Активная программа ИЛИ плейсхолдер «Выберите программу» */}
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

        {/* Последняя тренировка */}
        {data.lastWorkout && (
          <View style={styles.section}>
            <LastWorkoutCard
              workoutName={data.lastWorkout.name}
              date={data.lastWorkout.date}
              durationSeconds={data.lastWorkout.durationSeconds}
              exercisesCount={data.lastWorkout.exercisesCount}
              totalVolume={data.lastWorkout.totalVolume}
              onRepeatPress={handleRepeatWorkout}
              colors={colors}
            />
          </View>
        )}

        {data.personalRecords.length > 0 && (
          <View style={styles.section}>
            <PersonalRecordsCard records={data.personalRecords} colors={colors} />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Активность" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <ActivityCalendar workoutDates={data.workoutDates} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Эта неделя" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <WeeklyStatsCard
            workoutsCount={data.weeklyStats.workoutsCount}
            totalVolume={data.weeklyStats.totalVolume}
            burnedCalories={data.weeklyStats.burnedCalories}
          />
        </View>

        {data.exerciseProgress.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Прогресс по упражнениям"
              style={{ paddingHorizontal: 0, paddingTop: 0 }}
            />
                        {data.exerciseProgress.map((exercise) => (
              <ExerciseProgressCard
                key={exercise.exerciseId}
                exerciseName={exercise.exerciseName}
                history={exercise.history}
                currentMaxWeight={exercise.currentMaxWeight}
                currentVolume={exercise.currentVolume}
                trend={exercise.trend}
                selectedMetric="weight"
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FEAT-1.8: readiness check-in */}
      <ReadinessSheet visible={readinessOpen} userId={userId} onDone={handleReadinessDone} />
    </SafeAreaView>
  );
}