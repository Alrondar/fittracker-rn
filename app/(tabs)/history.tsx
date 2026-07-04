import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/Skeleton';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, name, created_at,
          workout_exercises (
            workout_logs (weight_kg, reps)
          )
        `)
        .order('created_at', { ascending: false });
      
      // Фильтруем только завершенные
      const completed = (data || []).filter((w: any) => 
        w.workout_exercises?.some((ex: any) => ex.workout_logs?.length > 0)
      );
      setWorkouts(completed);
    } catch (e) {
      console.error('Ошибка истории:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const calculateVolume = (workout: any) => {
    let volume = 0;
    workout.workout_exercises?.forEach((ex: any) => {
      ex.workout_logs?.forEach((log: any) => {
        volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
      });
    });
    return volume;
  };

  const renderEmpty = () => (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyText}>История пуста</Text>
      <Text style={styles.emptySubtext}>Завершите первую тренировку</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/history/${item.id}`);
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statText}>
                  Объем: {Math.round(calculateVolume(item))} кг
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white', padding: 16, borderRadius: 12,
    marginBottom: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardDate: { color: '#9ca3af', fontSize: 12 },
  statsRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statText: { color: '#7c3aed', fontWeight: '600', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#6b7280', marginBottom: 8 },
  emptySubtext: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});