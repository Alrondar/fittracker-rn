import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
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
  ChevronRight
} from 'lucide-react-native';

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
  const { colors } = useTheme();
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Загружаем активную программу
      if (userId) {
        const program = await getActiveProgram(userId);
        setActiveProgram(program);
      }

      // Загружаем статистику
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Приветствие */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>Привет!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Готов к тренировке?
          </Text>
        </View>

        {/* Виджет активной программы */}
        {activeProgram && (
          <View style={styles.section}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/workouts');
              }}
            >
              <LinearGradient
                colors={GRADIENTS.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeProgramCard}
              >
                <View style={styles.activeProgramHeader}>
                  <View style={styles.activeProgramTitleRow}>
                    <Trophy size={20} color="white" strokeWidth={1.5} />
                    <Text style={[styles.activeProgramLabel, { color: 'rgba(255,255,255,0.9)' }]}>
                      Активная программа
                    </Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                </View>

                <Text style={[styles.activeProgramName, { color: 'white' }]}>
                  {activeProgram.programs.name}
                </Text>

                <View style={styles.activeProgramInfo}>
                  <View style={styles.activeProgramInfoItem}>
                    <Calendar size={14} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
                    <Text style={[styles.activeProgramInfoText, { color: 'rgba(255,255,255,0.9)' }]}>
                      Неделя {activeProgram.current_week}/{activeProgram.programs.duration}
                    </Text>
                  </View>
                  <View style={styles.activeProgramInfoItem}>
                    <Dumbbell size={14} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
                    <Text style={[styles.activeProgramInfoText, { color: 'rgba(255,255,255,0.9)' }]}>
                      {getCurrentDayName()}
                    </Text>
                  </View>
                </View>

                {/* Прогресс-бар */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${getProgressPercent()}%` }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.progressText, { color: 'rgba(255,255,255,0.8)' }]}>
                    {Math.round(getProgressPercent())}% завершено
                  </Text>
                </View>

                <View style={styles.activeProgramButton}>
                  <Play size={16} color="white" strokeWidth={2} fill="white" />
                  <Text style={[styles.activeProgramButtonText, { color: 'white' }]}>
                    Перейти к тренировкам
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Статистика */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={GRADIENTS.primary}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: 'white' }]}>
              {stats.weekWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              На неделе
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={GRADIENTS.success}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: 'white' }]}>
              {stats.monthWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              В месяце
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={GRADIENTS.hero}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: 'white' }]}>
              {Math.round(stats.weekVolume)}
            </Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>
              кг за неделю
            </Text>
          </LinearGradient>
        </View>

        {/* Последняя тренировка */}
        {lastWorkout ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Последняя тренировка
            </Text>
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.lastWorkoutCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync();
                  router.push(`/history/${lastWorkout.id}`);
                }}
                activeOpacity={0.8}
                style={styles.lastWorkoutContent}
              >
                <View style={styles.lastWorkoutInfo}>
                  <Text style={[styles.lastWorkoutName, { color: 'white' }]}>
                    {lastWorkout.name}
                  </Text>
                  <Text style={[styles.lastWorkoutDate, { color: 'rgba(255,255,255,0.8)' }]}>
                    {formatDate(lastWorkout.created_at)}
                  </Text>
                </View>
                <TrendingUp size={24} color="white" strokeWidth={1.5} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Начни первую тренировку
            </Text>
            <AnimatedButton
              title="Создать тренировку"
              onPress={() => router.push('/(tabs)/workouts')}
              icon={<Dumbbell size={24} color="white" strokeWidth={1.5} />}
              size="large"
              style={styles.emptyCard}
            />
          </View>
        )}

        {/* Быстрый доступ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Быстрый доступ
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/workouts');
              }}
            >
              <Dumbbell size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                Тренировки
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/exercises');
              }}
            >
              <BookOpen size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                Справочник
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync();
                router.push('/(tabs)/history');
              }}
            >
              <Clock size={32} color={colors.primary} strokeWidth={1.5} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>
                История
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Недавние тренировки */}
        {recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Недавние тренировки
            </Text>
            {recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={[styles.recentCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/history/${workout.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, { color: colors.textPrimary }]}>
                    {workout.name}
                  </Text>
                  <Text style={[styles.recentDate, { color: colors.textSecondary }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  activeProgramCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    elevation: 4,
  },
  activeProgramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activeProgramTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activeProgramLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeProgramName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  activeProgramInfo: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  activeProgramInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activeProgramInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: SPACING.lg,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'right',
  },
  activeProgramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  activeProgramButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
  },
  lastWorkoutCard: {
    borderRadius: BORDER_RADIUS.xl,
    elevation: 4,
  },
  lastWorkoutContent: {
    padding: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastWorkoutInfo: { flex: 1 },
  lastWorkoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  lastWorkoutDate: {
    fontSize: 14,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quickAction: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  recentCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  recentInfo: { flex: 1 },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  recentDate: {
    fontSize: 14,
  },
});