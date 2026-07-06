import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { AnimatedButton } from '../../src/components/AnimatedButton';
import { SPACING } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { getActiveProgram } from '../../src/servises/programsService';
import {
  Dumbbell,
  BookOpen,
  Clock,
  TrendingUp,
  Trophy,
  Calendar,
  Play,
  ChevronRight,
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';

interface DashboardStats {
  totalWorkouts: number;
  weekWorkouts: number;
  monthWorkouts: number;
  totalVolume: number;
  weekVolume: number;
}

interface ActiveProgram {
  id: string;
  program_id: string;
  current_week: number;
  current_day: number;
  is_active: boolean;
  programs: {
    id: string;
    name: string;
    duration: number;
    days: Array<{
      id: string;
      day_number: number;
      name: string;
    }>;
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors, gradients } = useTheme(); // ← Добавили gradients
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    weekWorkouts: 0,
    monthWorkouts: 0,
    totalVolume: 0,
    weekVolume: 0,
  });
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);

  // Создаём стили на основе темы
  const cardStyles = createCardStyles(colors);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      if (userId) {
        const program = await getActiveProgram(userId);
        setActiveProgram(program);
      }

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id, 
          name, 
          created_at,
          workout_exercises (
            id,
            workout_logs (weight_kg, reps)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки:', error);
        return;
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let weekWorkouts = 0;
      let monthWorkouts = 0;
      let totalVolume = 0;
      let weekVolume = 0;

      workouts?.forEach((workout: any) => {
        const createdAt = new Date(workout.created_at);
        if (createdAt >= weekAgo) weekWorkouts++;
        if (createdAt >= monthAgo) monthWorkouts++;
        let workoutVolume = 0;
        workout.workout_exercises?.forEach((we: any) => {
          we.workout_logs?.forEach((log: any) => {
            workoutVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
          });
        });
        totalVolume += workoutVolume;
        if (createdAt >= weekAgo) weekVolume += workoutVolume;
      });

      setStats({
        totalWorkouts: workouts?.length || 0,
        weekWorkouts,
        monthWorkouts,
        totalVolume,
        weekVolume,
      });

      if (workouts && workouts.length > 0) {
        setLastWorkout(workouts[0]);
      }
      setRecentWorkouts(workouts?.slice(0, 3) || []);
    } catch (error: any) {
      console.error('Исключение:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync();
    setRefreshing(true);
    loadDashboard();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getCurrentDayName = () => {
    if (!activeProgram?.programs?.days) return '';
    const day = activeProgram.programs.days.find(
      d => d.day_number === activeProgram.current_day
    );
    return day?.name || `День ${activeProgram.current_day}`;
  };

  const getProgressPercent = () => {
    if (!activeProgram) return 0;
    const totalDays = activeProgram.programs.duration * 7;
    const currentDay = (activeProgram.current_week - 1) * 7 + activeProgram.current_day;
    return Math.min((currentDay / totalDays) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={commonStyles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Приветствие */}
        <View style={commonStyles.header}>
          <Text style={[commonStyles.greeting, { color: colors.textPrimary }]}>Привет!</Text>
          <Text style={[commonStyles.subtitle, { color: colors.textSecondary }]}>
            Готов к тренировке?
          </Text>
        </View>

        {/* Виджет активной программы */}
        {activeProgram && (
          <View style={commonStyles.section}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/workouts');
              }}
            >
              <LinearGradient
                colors={gradients.hero} // ← Используем gradients из темы
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={cardStyles.activeProgramCard}
              >
                <View style={cardStyles.activeProgramHeader}>
                  <View style={cardStyles.activeProgramTitleRow}>
                    <Trophy size={20} color="white" strokeWidth={1.5} />
                    <Text style={[cardStyles.activeProgramLabel, { color: 'rgba(255,255,255,0.9)' }]}>
                      Активная программа
                    </Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                </View>
                <Text style={[cardStyles.activeProgramName, { color: 'white' }]}>
                  {activeProgram.programs.name}
                </Text>
                <View style={cardStyles.activeProgramInfo}>
                  <View style={cardStyles.activeProgramInfoItem}>
                    <Calendar size={14} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
                    <Text style={[cardStyles.activeProgramInfoText, { color: 'rgba(255,255,255,0.9)' }]}>
                      Неделя {activeProgram.current_week}/{activeProgram.programs.duration}
                    </Text>
                  </View>
                  <View style={cardStyles.activeProgramInfoItem}>
                    <Dumbbell size={14} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
                    <Text style={[cardStyles.activeProgramInfoText, { color: 'rgba(255,255,255,0.9)' }]}>
                      {getCurrentDayName()}
                    </Text>
                  </View>
                </View>
                {/* Прогресс-бар */}
                <View style={commonStyles.progressBarContainer}>
                  <View style={commonStyles.progressBarBackground}>
                    <View 
                      style={[
                        commonStyles.progressBarFill, 
                        { width: `${getProgressPercent()}%` }
                      ]} 
                    />
                  </View>
                  <Text style={[commonStyles.progressText, { color: 'rgba(255,255,255,0.8)' }]}>
                    {Math.round(getProgressPercent())}% завершено
                  </Text>
                </View>
                <View style={cardStyles.activeProgramButton}>
                  <Play size={16} color="white" strokeWidth={2} fill="white" />
                  <Text style={[cardStyles.activeProgramButtonText, { color: 'white' }]}>
                    Перейти к тренировкам
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Статистика */}
        <View style={commonStyles.statsContainer}>
          <LinearGradient
            colors={gradients.primary} // ← Используем gradients из темы
            style={commonStyles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[commonStyles.statValue, { color: 'white' }]}>
              {stats.weekWorkouts}
            </Text>
            <Text style={[commonStyles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              На неделе
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={gradients.success} // ← Используем gradients из темы
            style={commonStyles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[commonStyles.statValue, { color: 'white' }]}>
              {stats.monthWorkouts}
            </Text>
            <Text style={[commonStyles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              В месяце
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={gradients.hero} // ← Используем gradients из темы
            style={commonStyles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[commonStyles.statValue, { color: 'white' }]}>
              {Math.round(stats.weekVolume)}
            </Text>
            <Text style={[commonStyles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              кг за неделю
            </Text>
          </LinearGradient>
        </View>

        {/* Последняя тренировка */}
        {lastWorkout ? (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
              Последняя тренировка
            </Text>
            <LinearGradient
              colors={gradients.primary} // ← Используем gradients из темы
              style={cardStyles.lastWorkoutCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync();
                  router.push(`/history/${lastWorkout.id}`);
                }}
                activeOpacity={0.8}
                style={cardStyles.lastWorkoutContent}
              >
                <View style={cardStyles.lastWorkoutInfo}>
                  <Text style={[cardStyles.lastWorkoutName, { color: 'white' }]}>
                    {lastWorkout.name}
                  </Text>
                  <Text style={[cardStyles.lastWorkoutDate, { color: 'rgba(255,255,255,0.8)' }]}>
                    {formatDate(lastWorkout.created_at)}
                  </Text>
                </View>
                <TrendingUp size={24} color="white" strokeWidth={1.5} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
              Начни первую тренировку
            </Text>
            <AnimatedButton
              title="Создать тренировку"
              onPress={() => router.push('/(tabs)/workouts')}
              icon={<Dumbbell size={24} color="white" strokeWidth={1.5} />}
              size="large"
              style={cardStyles.emptyCard}
            />
          </View>
        )}

        {/* Быстрый доступ */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
            Быстрый доступ
          </Text>
          <View style={commonStyles.quickActions}>
            <TouchableOpacity
              style={[commonStyles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/workouts');
              }}
            >
              <Dumbbell size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[commonStyles.quickActionText, { color: colors.textPrimary }]}>
                Тренировки
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[commonStyles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/exercises');
              }}
            >
              <BookOpen size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[commonStyles.quickActionText, { color: colors.textPrimary }]}>
                Справочник
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[commonStyles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/history');
              }}
            >
              <Clock size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[commonStyles.quickActionText, { color: colors.textPrimary }]}>
                История
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Недавние тренировки */}
        {recentWorkouts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
              Недавние тренировки
            </Text>
            {recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={[commonStyles.recentCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/history/${workout.id}`)}
                activeOpacity={0.7}
              >
                <View style={commonStyles.recentInfo}>
                  <Text style={[commonStyles.recentName, { color: colors.textPrimary }]}>
                    {workout.name}
                  </Text>
                  <Text style={[commonStyles.recentDate, { color: colors.textSecondary }]}>
                    {formatDate(workout.created_at)}
                  </Text>
                </View>
                <TrendingUp size={20} color={colors.primary} strokeWidth={1.5} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}