import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase, getList } from '../../src/lib/supabase';

interface WorkoutHistory {
  id: string;
  name: string;
  created_at: string;
  workout_exercises: any[];
}

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔵 HistoryScreen: Загрузка истории');
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      console.log('🔵 Запрос к Supabase: workouts с логами');
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          created_at,
          workout_exercises (
            id,
            order_index,
            exercises (
              id,
              name,
              primary_muscles
            ),
            workout_logs (
              set_number,
              weight_kg,
              reps,
              completed_at
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🔴 Ошибка загрузки истории:', error);
        return;
      }

      console.log('✅ Получено тренировок:', data?.length);
      
      // Фильтруем только завершенные тренировки (с логами)
      const completed = (data || []).filter((workout: any) => {
        const exercises = workout.workout_exercises || [];
        return exercises.some((ex: any) => 
          ex.workout_logs && ex.workout_logs.length > 0
        );
      });

      console.log('✅ Завершенных тренировок:', completed.length);
      setWorkouts(completed);
    } catch (error: any) {
      console.error(' Исключение при загрузке:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Обновление истории');
    setRefreshing(true);
    loadHistory();
  };

  const calculateStats = (workout: WorkoutHistory) => {
    let totalVolume = 0;
    let totalSets = 0;
    let totalExercises = 0;

    workout.workout_exercises?.forEach((ex: any) => {
      const logs = ex.workout_logs || [];
      if (logs.length > 0) totalExercises++;
      
      logs.forEach((log: any) => {
        const weight = parseFloat(log.weight_kg) || 0;
        const reps = parseInt(log.reps) || 0;
        totalVolume += weight * reps;
        totalSets++;
      });
    });

    return { totalVolume, totalSets, totalExercises };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;

    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderEmpty = () => (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>⏱️</Text>
      <Text style={styles.emptyText}>Пока нет завершенных тренировок</Text>
      <Text style={styles.emptySubtext}>Заверши первую тренировку, чтобы увидеть её здесь</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const stats = calculateStats(item);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                </View>
                
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalExercises}</Text>
                    <Text style={styles.statLabel}>упражнений</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalSets}</Text>
                    <Text style={styles.statLabel}>подходов</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(stats.totalVolume)}</Text>
                    <Text style={styles.statLabel}>кг</Text>
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#7c3aed']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  cardDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
});