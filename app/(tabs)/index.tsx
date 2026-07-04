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
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';

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
    console.log('🔵 Dashboard: Инициализация');
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      console.log('🔵 Загрузка данных Dashboard');
      
      // Загружаем все тренировки
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          created_at,
          workout_exercises (
            id,
            workout_logs (
              weight_kg,
              reps
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔴 Ошибка загрузки тренировок:', error);
        return;
      }

      console.log('✅ Загружено тренировок:', workouts?.length);
      
      // Считаем статистику
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

        // Считаем объём
        let workoutVolume = 0;
        workout.workout_exercises?.forEach((we: any) => {
          we.workout_logs?.forEach((log: any) => {
            const weight = parseFloat(log.weight_kg) || 0;
            const reps = parseInt(log.reps) || 0;
            workoutVolume += weight * reps;
          });
        });

        totalVolume += workoutVolume;
        if (createdAt >= weekAgo) weekVolume += workoutVolume;
      });

      const newStats: DashboardStats = {
        totalWorkouts: workouts?.length || 0,
        weekWorkouts,
        monthWorkouts,
        totalVolume,
        weekVolume,
      };

      console.log('✅ Статистика:', newStats);
      setStats(newStats);

      // Последняя тренировка
      if (workouts && workouts.length > 0) {
        setLastWorkout(workouts[0]);
        console.log('📋 Последняя тренировка:', workouts[0].name);
      }

      // Последние 3 тренировки
      setRecentWorkouts(workouts?.slice(0, 3) || []);
    } catch (error: any) {
      console.error('🔴 Исключение при загрузке Dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Обновление Dashboard');
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#7c3aed']}
        />
      }
    >
      {/* Приветствие */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Привет! 👋</Text>
        <Text style={styles.subtitle}>Готов к тренировке?</Text>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.weekWorkouts}</Text>
          <Text style={styles.statLabel}>На этой неделе</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.monthWorkouts}</Text>
          <Text style={styles.statLabel}>В этом месяце</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.round(stats.weekVolume)}</Text>
          <Text style={styles.statLabel}>кг за неделю</Text>
        </View>
      </View>

      {/* Последняя тренировка */}
      {lastWorkout ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последняя тренировка</Text>
          <TouchableOpacity 
            style={styles.lastWorkoutCard}
            onPress={() => router.push(`/workout/${lastWorkout.id}`)}
          >
            <View style={styles.lastWorkoutInfo}>
              <Text style={styles.lastWorkoutName}>{lastWorkout.name}</Text>
              <Text style={styles.lastWorkoutDate}>
                {formatDate(lastWorkout.created_at)}
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Начни первую тренировку</Text>
          <TouchableOpacity 
            style={styles.emptyCard}
            onPress={() => router.push('/(tabs)/workouts')}
          >
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyText}>Создать тренировку</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Быстрый доступ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Быстрый доступ</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/workouts')}
          >
            <Text style={styles.quickActionIcon}></Text>
            <Text style={styles.quickActionText}>Тренировки</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/exercises')}
          >
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionText}>Справочник</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionText}>История</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Недавние тренировки */}
      {recentWorkouts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Недавние тренировки</Text>
          {recentWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.recentCard}
              onPress={() => router.push(`/workout/${workout.id}`)}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>{workout.name}</Text>
                <Text style={styles.recentDate}>
                  {formatDate(workout.created_at)}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },

  lastWorkoutCard: {
    backgroundColor: '#7c3aed',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  lastWorkoutInfo: { flex: 1 },
  lastWorkoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  lastWorkoutDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  arrow: {
    fontSize: 24,
    color: 'white',
    marginLeft: 12,
  },

  emptyCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7c3aed',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  recentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  recentInfo: { flex: 1 },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recentDate: {
    fontSize: 14,
    color: '#6b7280',
  },
});