import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { createDashboardStyles } from '../../src/styles/components/dashboard';
import { typography } from '../../src/styles/typography';
import { ActivityCalendar } from '../../src/components/ActivityCalendar';
import { ProgramProgressCard } from '../../src/components/ProgramProgressCard';
import { WeeklyStatsCard } from '../../src/components/WeeklyStatsCard';
import { ExerciseProgressCard } from '../../src/components/ExerciseProgressCard';
import { PersonalRecordsCard } from '../../src/components/PersonalRecordsCard';
import { LastWorkoutCard } from '../../src/components/LastWorkoutCard';
import { SPACING } from '../../src/constants/theme';
import { SectionHeader } from '../../src/components/SectionHeader';

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const styles = createDashboardStyles(colors);

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    workoutsCount: 0,
    totalVolume: 0,
    burnedCalories: 0,
  });
  const [exerciseProgress, setExerciseProgress] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // 🚀 ВСЕ 8 ЗАПРОСОВ ЗАПУСКАЮТСЯ ПАРАЛЛЕЛЬНО
      const [
        profileResult,
        userProgramResult,
        workoutDatesResult,
        weeklyStatsResult,
        topExercisesResult,
        prDataResult,
        lastWorkoutResult,
        totalWorkoutsResult,
      ] = await Promise.allSettled([
        // 1. Профиль
        supabase.from('profiles').select('full_name, username').eq('id', userId).single(),
        // 2. Активная программа (с фазами)
        supabase
          .from('user_programs')
          .select(`program_id, current_phase, current_week, current_day, is_active, programs!inner (name, duration, program_phases (phase_number, name, phase_type, weeks_count, program_days (name, day_number, week_number)))`)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single(),
        // 3. Даты тренировок за 14 дней
        supabase
          .from('workouts')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
        // 4. Статистика за неделю
        supabase
          .from('workouts')
          .select('workout_exercises (workout_logs (weight_kg, reps))')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        // 5. Прогресс по упражнениям (топ-3)
        supabase
          .from('workout_logs')
          .select(`weight_kg, workout_exercises!inner (exercise_id, exercises (name), workouts!inner (user_id, created_at))`)
          .eq('workout_exercises.workouts.user_id', userId)
          .order('workout_exercises.workouts.created_at', { ascending: false })
          .limit(20),
        // 6. Личные рекорды (топ-5)
        supabase
          .from('workout_logs')
          .select(`weight_kg, reps, workout_exercises!inner (exercise_id, exercises (name), workouts!inner (user_id, created_at))`)
          .eq('workout_exercises.workouts.user_id', userId)
          .order('weight_kg', { ascending: false })
          .limit(5),
        // 7. Последняя тренировка
        supabase
          .from('workouts')
          .select(`id, name, created_at, duration_seconds, workout_exercises (id, workout_logs (weight_kg, reps))`)
          .eq('user_id', userId)
          .not('finished_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        // 8. Общее количество тренировок
        supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('finished_at', 'is', null),
      ]);

      // 1. Профиль
      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        const profileData = profileResult.value.data;
        setUserData({
          name: profileData.full_name || profileData.username || 'Пользователь',
        });
      }
      // 2. Активная программа (с фазами)
      if (userProgramResult.status === 'fulfilled' && userProgramResult.value.data) {
        const userPrograms = userProgramResult.value.data;
        const prog = Array.isArray(userPrograms.programs) ? userPrograms.programs[0] : userPrograms.programs;
        const phases = prog?.program_phases || [];
        const curPhaseNum = userPrograms.current_phase ?? 1;
        const curWeek = userPrograms.current_week ?? 1;
        const curDay = userPrograms.current_day ?? 1;
        const currentPhase = phases.find((p: any) => p.phase_number === curPhaseNum) || phases[0];
        const phaseDays = currentPhase?.program_days || [];
        const currentDayObj =
          phaseDays.find((d: any) => (d.week_number ?? 1) === curWeek && d.day_number === curDay) ||
          phaseDays.find((d: any) => d.day_number === curDay) ||
          phaseDays[0];
        const daysThisWeek = phaseDays.filter((d: any) => (d.week_number ?? 1) === curWeek).length;
        setActiveProgram({
          programId: userPrograms.program_id,
          currentPhase: curPhaseNum,
          phaseName: currentPhase?.name,
          phaseType: currentPhase?.phase_type,
          totalPhases: phases.length,
          currentWeek: curWeek,
          currentDay: curDay,
          programName: prog?.name || 'Программа',
          dayName: currentDayObj?.name || 'День тренировки',
          totalDays: daysThisWeek || phaseDays.length || 1,
        });
      }
      // 3. Даты тренировок
      if (workoutDatesResult.status === 'fulfilled' && workoutDatesResult.value.data) {
        const dates = workoutDatesResult.value.data.map((w: any) => w.created_at.split('T')[0]);
        setWorkoutDates(dates);
      }
      // 4. Статистика за неделю
      if (weeklyStatsResult.status === 'fulfilled' && weeklyStatsResult.value.data) {
        const weeklyWorkouts = weeklyStatsResult.value.data;
        let volume = 0;
        const workoutsCount = weeklyWorkouts?.length || 0;
        weeklyWorkouts?.forEach((workout: any) => {
          workout.workout_exercises?.forEach((ex: any) => {
            ex.workout_logs?.forEach((log: any) => {
              volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
            });
          });
        });
        setWeeklyStats({
          workoutsCount,
          totalVolume: volume,
          burnedCalories: workoutsCount * 300,
        });
      }
      // 5. Прогресс по упражнениям
      if (topExercisesResult.status === 'fulfilled' && topExercisesResult.value.data) {
        const topExercises = topExercisesResult.value.data;
        const exerciseMap: Record<string, any> = {};
        topExercises?.forEach((log: any) => {
          const exId = log.workout_exercises.exercise_id;
          const exName = log.workout_exercises.exercises?.name || 'Упражнение';
          if (!exerciseMap[exId]) {
            exerciseMap[exId] = { exerciseId: exId, exerciseName: exName, history: [], maxWeight: 0, volume: 0 };
          }
          const weight = parseFloat(log.weight_kg) || 0;
          const reps = parseInt(log.reps) || 0;
          const vol = weight * reps;
          exerciseMap[exId].history.push({ date: log.workout_exercises.workouts.created_at, maxWeight: weight, volume: vol });
          if (weight > exerciseMap[exId].maxWeight) exerciseMap[exId].maxWeight = weight;
          exerciseMap[exId].volume += vol;
        });
        const progressArray = Object.values(exerciseMap)
          .map((ex: any) => {
            const history = ex.history.reverse();
            const currentMaxWeight = history[0]?.maxWeight || 0;
            const currentVolume = history[0]?.volume || 0;
            const previousMaxWeight = history[1]?.maxWeight || 0;
            const trend = currentMaxWeight > previousMaxWeight ? 'up' : currentMaxWeight < previousMaxWeight ? 'down' : 'stable';
            return { ...ex, history, currentMaxWeight, currentVolume, trend };
          })
          .slice(0, 3);
        setExerciseProgress(progressArray);
      }
      // 6. Личные рекорды
      if (prDataResult.status === 'fulfilled' && prDataResult.value.data) {
        const prData = prDataResult.value.data;
        const prMap: Record<string, any> = {};
        prData?.forEach((log: any) => {
          const exId = log.workout_exercises.exercise_id;
          const exName = log.workout_exercises.exercises?.name || 'Упражнение';
          const weight = parseFloat(log.weight_kg) || 0;
          const reps = parseInt(log.reps) || 0;
          const date = log.workout_exercises.workouts.created_at;
          if (!prMap[exId] || weight > prMap[exId].maxWeight) {
            prMap[exId] = { exerciseName: exName, maxWeight: weight, maxReps: reps, recordDate: date };
          }
        });
        setPersonalRecords(Object.values(prMap).slice(0, 5));
      }
      // 7. Последняя тренировка
      if (lastWorkoutResult.status === 'fulfilled' && lastWorkoutResult.value.data) {
        const lastWorkoutData = lastWorkoutResult.value.data;
        let totalVol = 0;
        let exCount = 0;
        lastWorkoutData.workout_exercises?.forEach((ex: any) => {
          if (ex.workout_logs && ex.workout_logs.length > 0) {
            exCount++;
            ex.workout_logs.forEach((log: any) => {
              totalVol += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
            });
          }
        });
        setLastWorkout({
          id: lastWorkoutData.id,
          name: lastWorkoutData.name,
          date: lastWorkoutData.created_at,
          durationSeconds: lastWorkoutData.duration_seconds || 0,
          exercisesCount: exCount,
          totalVolume: totalVol,
        });
      }
      // 8. Общее количество тренировок
      if (totalWorkoutsResult.status === 'fulfilled' && totalWorkoutsResult.value.count !== undefined) {
        setTotalWorkouts(totalWorkoutsResult.value.count || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки dashboard:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    if (activeProgram) {
      router.push(`/workout/create?programId=${activeProgram.programId}`);
    }
  };

  const handleRepeatWorkout = () => {
    if (lastWorkout) {
      router.push(`/workout/create?repeatId=${lastWorkout.id}`);
    }
  };

  if (loading) {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Шапка */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Привет, {userData?.name}! 👋</Text>
          <Text style={styles.headerSubtitle}>Всего тренировок: {totalWorkouts}</Text>
        </View>

        {/* ✅ Карточка активной программы — ОБЁРНУТА в styles.section, как и все
            остальные виджеты. Раньше обёртки не было → карточка уезжала за боковые
            поля (full-bleed). Теперь горизонтальные отступы едины со всей сеткой. */}
        {activeProgram && (
          <View style={styles.section}>
            <ProgramProgressCard
              programName={activeProgram.programName}
              dayName={activeProgram.dayName}
              currentPhase={activeProgram.currentPhase}
              phaseName={activeProgram.phaseName}
              phaseType={activeProgram.phaseType}
              totalPhases={activeProgram.totalPhases}
              currentWeek={activeProgram.currentWeek}
              currentDay={activeProgram.currentDay}
              totalDays={activeProgram.totalDays}
              onStartPress={handleStartWorkout}
            />
          </View>
        )}

        {/* Последняя тренировка */}
        {lastWorkout && (
          <View style={styles.section}>
            <LastWorkoutCard
              workoutName={lastWorkout.name}
              date={lastWorkout.date}
              durationSeconds={lastWorkout.durationSeconds}
              exercisesCount={lastWorkout.exercisesCount}
              totalVolume={lastWorkout.totalVolume}
              onRepeatPress={handleRepeatWorkout}
              colors={colors}
            />
          </View>
        )}

        {/* Личные рекорды */}
        {personalRecords.length > 0 && (
          <View style={styles.section}>
            <PersonalRecordsCard records={personalRecords} colors={colors} />
          </View>
        )}

        {/* Календарь активности */}
        <View style={styles.section}>
          <SectionHeader title="Активность" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <ActivityCalendar workoutDates={workoutDates} />
        </View>

        {/* Статистика за неделю */}
        <View style={styles.section}>
          <SectionHeader title="Эта неделя" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <WeeklyStatsCard
            workoutsCount={weeklyStats.workoutsCount}
            totalVolume={weeklyStats.totalVolume}
            burnedCalories={weeklyStats.burnedCalories}
          />
        </View>

        {/* Прогресс по упражнениям */}
        {exerciseProgress.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Прогресс по упражнениям" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
            {exerciseProgress.map((exercise) => (
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