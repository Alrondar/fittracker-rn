import React, { useState, useEffect } from 'react';
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
      
      // 1. Загрузка данных пользователя
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single();
      
      setUserData({
        name: profileData?.full_name || profileData?.username || 'Пользователь',
      });
      
      // 2. Загрузка активной программы
      const { data: userPrograms } = await supabase
        .from('user_programs')
        .select(`
          program_id,
          current_week,
          current_day,
          is_active,
          programs!inner (name, duration),
          program_days!inner (name, day_number)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (userPrograms) {
        setActiveProgram({
          programId: userPrograms.program_id,
          currentWeek: userPrograms.current_week,
          currentDay: userPrograms.current_day,
          programName: userPrograms.programs?.[0]?.name || 'Программа',
          dayName: userPrograms.program_days?.[0]?.name || 'День тренировки',
          totalDays: userPrograms.programs?.[0]?.duration || 8,
        });
      }
      
      // 3. Загрузка дат тренировок за последние 14 дней
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { data: workouts } = await supabase
        .from('workouts')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgo.toISOString());
      
      const dates = workouts?.map(w => w.created_at.split('T')[0]) || [];
      setWorkoutDates(dates);
      
      // 4. Загрузка статистики за неделю
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weeklyWorkouts } = await supabase
        .from('workouts')
        .select('workout_exercises (workout_logs (weight_kg, reps))')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());
      
      let volume = 0;
      const workoutsCount = weeklyWorkouts?.length || 0;
      
      weeklyWorkouts?.forEach((workout: any) => {
        workout.workout_exercises?.forEach((ex: any) => {
          ex.workout_logs?.forEach((log: any) => {
            volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
          });
        });
      });
      
      const burnedCalories = workoutsCount * 300;
      
      setWeeklyStats({
        workoutsCount,
        totalVolume: volume,
        burnedCalories,
      });
      
      // 5. Загрузка прогресса по упражнениям (топ-3)
      const { data: topExercises } = await supabase
        .from('workout_logs')
        .select(`
          weight_kg,
          workout_exercises!inner (
            exercise_id,
            exercises (name),
            workouts!inner (user_id, created_at)
          )
        `)
        .eq('workout_exercises.workouts.user_id', userId)
        .order('workout_exercises.workouts.created_at', { ascending: false })
        .limit(20);
      
      const exerciseMap: Record<string, any> = {};
      topExercises?.forEach((log: any) => {
        const exId = log.workout_exercises.exercise_id;
        const exName = log.workout_exercises.exercises?.name || 'Упражнение';
        
        if (!exerciseMap[exId]) {
          exerciseMap[exId] = {
            exerciseId: exId,
            exerciseName: exName,
            history: [],
            maxWeight: 0,
            volume: 0,
          };
        }
        
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        const vol = weight * reps;
        
        exerciseMap[exId].history.push({
          date: log.workout_exercises.workouts.created_at,
          maxWeight: weight,
          volume: vol,
        });
        
        if (weight > exerciseMap[exId].maxWeight) {
          exerciseMap[exId].maxWeight = weight;
        }
        exerciseMap[exId].volume += vol;
      });
      
      const progressArray = Object.values(exerciseMap)
        .map((ex: any) => {
          const history = ex.history.reverse();
          const currentMaxWeight = history[0]?.maxWeight || 0;
          const currentVolume = history[0]?.volume || 0;
          const previousMaxWeight = history[1]?.maxWeight || 0;
          
          const trend = currentMaxWeight > previousMaxWeight ? 'up' : 
                       currentMaxWeight < previousMaxWeight ? 'down' : 'stable';
          
          return {
            ...ex,
            history,
            currentMaxWeight,
            currentVolume,
            trend,
          };
        })
        .slice(0, 3);
      
      setExerciseProgress(progressArray);
      
      // 6. Загрузка личных рекордов (топ-5)
      const { data: prData } = await supabase
        .from('workout_logs')
        .select(`
          weight_kg,
          reps,
          workout_exercises!inner (
            exercise_id,
            exercises (name),
            workouts!inner (user_id, created_at)
          )
        `)
        .eq('workout_exercises.workouts.user_id', userId)
        .order('weight_kg', { ascending: false })
        .limit(5);
      
      const prMap: Record<string, any> = {};
      prData?.forEach((log: any) => {
        const exId = log.workout_exercises.exercise_id;
        const exName = log.workout_exercises.exercises?.name || 'Упражнение';
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        const date = log.workout_exercises.workouts.created_at;
        
        if (!prMap[exId] || weight > prMap[exId].maxWeight) {
          prMap[exId] = {
            exerciseName: exName,
            maxWeight: weight,
            maxReps: reps,
            recordDate: date,
          };
        }
      });
      
      const prArray = Object.values(prMap).slice(0, 5);
      setPersonalRecords(prArray);
      
      // 7. Загрузка последней тренировки
      const { data: lastWorkoutData } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          created_at,
          duration_seconds,
          workout_exercises (
            id,
            workout_logs (weight_kg, reps)
          )
        `)
        .eq('user_id', userId)
        .not('finished_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (lastWorkoutData) {
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
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('finished_at', 'is', null);
      
      setTotalWorkouts(count || 0);
      
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
          <Text style={styles.headerTitle}>
            Привет, {userData?.name}! 👋
          </Text>
          <Text style={styles.headerSubtitle}>
            Всего тренировок: {totalWorkouts}
          </Text>
        </View>

        {/* Карточка активной программы */}
        {activeProgram && (
          <ProgramProgressCard
            programName={activeProgram.programName}
            dayName={activeProgram.dayName}
            currentWeek={activeProgram.currentWeek}
            currentDay={activeProgram.currentDay}
            totalDays={activeProgram.totalDays}
            onStartPress={handleStartWorkout}
          />
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
            <PersonalRecordsCard
              records={personalRecords}
              colors={colors}
            />
          </View>
        )}

        {/* Календарь активности */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Активность</Text>
          <ActivityCalendar workoutDates={workoutDates} />
        </View>

        {/* Статистика за неделю */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Эта неделя</Text>
          <WeeklyStatsCard
            workoutsCount={weeklyStats.workoutsCount}
            totalVolume={weeklyStats.totalVolume}
            burnedCalories={weeklyStats.burnedCalories}
          />
        </View>

        {/* Прогресс по упражнениям */}
        {exerciseProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Прогресс по упражнениям</Text>
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