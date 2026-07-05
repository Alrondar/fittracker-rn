import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { AnimatedButton } from '../../src/components/AnimatedButton';
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';

interface DashboardStats {
  totalWorkouts: number;
  weekWorkouts: number;
  monthWorkouts: number;
  totalVolume: number;
  weekVolume: number;
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id, name, created_at,
          workout_exercises (
            id,
            workout_logs (weight_kg, reps)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔴 Ошибка загрузки:', error);
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
      console.error(' Исключение:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>Привет! 👋</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Готов к тренировке?</Text>
        </View>

        {/* Статистика с градиентами */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={GRADIENTS.primary}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: colors.textInverse }]}>{stats.weekWorkouts}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>На неделе</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={GRADIENTS.success}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: colors.textInverse }]}>{stats.monthWorkouts}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>В месяце</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={GRADIENTS.hero}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.statValue, { color: colors.textInverse }]}>{Math.round(stats.weekVolume)}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>кг за неделю</Text>
          </LinearGradient>
        </View>

        {/* Последняя тренировка с градиентом */}
        {lastWorkout ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Последняя тренировка</Text>
            <LinearGradient
              colors={GRADIENTS.hero}
              style={styles.lastWorkoutCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/history/${lastWorkout.id}`);
                }}
                activeOpacity={0.8}
                style={styles.lastWorkoutContent}
              >
                <View style={styles.lastWorkoutInfo}>
                  <Text style={[styles.lastWorkoutName, { color: colors.textInverse }]}>{lastWorkout.name}</Text>
                  <Text style={[styles.lastWorkoutDate, { color: 'rgba(255,255,255,0.8)' }]}>
                    {formatDate(lastWorkout.created_at)}
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: colors.textInverse }]}>→</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Начни первую тренировку</Text>
            <AnimatedButton
              title="Создать тренировку"
              onPress={() => router.push('/(tabs)/workouts')}
              icon="🏋️"
              size="large"
              style={styles.emptyCard}
            />
          </View>
        )}

        {/* Быстрый доступ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Быстрый доступ</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/workouts');
              }}
            >
              <Text style={styles.quickActionIcon}>💪</Text>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Тренировки</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/exercises');
              }}
            >
              <Text style={styles.quickActionIcon}></Text>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Справочник</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAction, { backgroundColor: colors.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/history');
              }}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>История</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Недавние тренировки */}
        {recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Недавние тренировки</Text>
            {recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={[styles.recentCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/history/${workout.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, { color: colors.textPrimary }]}>{workout.name}</Text>
                  <Text style={[styles.recentDate, { color: colors.textSecondary }]}>
                    {formatDate(workout.created_at)}
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
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

  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
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
  arrow: {
    fontSize: 24,
    marginLeft: SPACING.md,
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
  quickActionIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
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