import { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hand } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { createDashboardStyles } from '../../src/styles/components/dashboard';
import { typography } from '../../src/styles/typography';
import { ActivityCalendar } from '../../src/components/ActivityCalendar';
import { ProgramProgressCard } from '../../src/components/ProgramProgressCard';
import { WeeklyStatsCard } from '../../src/components/WeeklyStatsCard';
import { ExerciseProgressCard } from '../../src/components/ExerciseProgressCard';
import { PersonalRecordsCard } from '../../src/components/PersonalRecordsCard';
import { LastWorkoutCard } from '../../src/components/LastWorkoutCard';
import { SPACING, scale } from '../../src/constants/theme';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppButton } from '../../src/components/ui/AppButton';

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createDashboardStyles(colors), [colors]);

  const {
    data,
    isPending,
    isError,
    refetch,
  } = useDashboard(userId);

  const handleStartWorkout = () => {
    if (data?.activeProgram) {
      router.push(`/workout/create?programId=${data.activeProgram.programId}`);
    }
  };

  const handleRepeatWorkout = () => {
    if (data?.lastWorkout) {
      router.push(`/workout/create?repeatId=${data.lastWorkout.id}`);
    }
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
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.container, { flex: 1 }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.lg }]}>
            Не удалось загрузить данные
          </Text>
          <AppButton
            title="Повторить"
            variant="primary"
            onPress={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = data.userName || 'Пользователь';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {/* ✅ Приветствие: имя + векторная иконка в одной строке.
              Имя сжимается и режется многоточием (flexShrink + numberOfLines),
              бейдж с иконкой никогда не переносится. Растровый эмодзи 👋 убран —
              он не принимал цвет темы и падал на вторую строку на узких экранах. */}
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
          <Text style={styles.headerSubtitle}>
            Всего тренировок: {data.totalWorkouts}
          </Text>
        </View>

        {data.activeProgram && (
          <View style={styles.section}>
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
          </View>
        )}

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
          <SectionHeader
            title="Активность"
            style={{ paddingHorizontal: 0, paddingTop: 0 }}
          />
          <ActivityCalendar workoutDates={data.workoutDates} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Эта неделя"
            style={{ paddingHorizontal: 0, paddingTop: 0 }}
          />
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}