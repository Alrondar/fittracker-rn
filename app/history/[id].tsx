import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList } from '../../src/lib/supabase';
import * as Haptics from 'expo-haptics';

interface LoggedExercise {
  id: string;
  order_index: number;
  exercises: any;
  workout_logs: Array<{
    set_number: number;
    weight_kg: number;
    reps: number;
  }>;
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);

  useEffect(() => {
    loadHistoryDetail();
  }, [id]);

  const loadHistoryDetail = async () => {
    try {
      console.log('🔵 Загрузка деталей истории:', id);
      const { data: workoutData, error: wError } = await supabase
        .from('workouts')
        .select('name, created_at')
        .eq('id', id)
        .single();

      if (wError) throw wError;
      setWorkout(workoutData);

      const { data: exData, error: exError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          order_index,
          exercises (id, name, primary_muscles),
          workout_logs (set_number, weight_kg, reps)
        `)
        .eq('workout_id', id)
        .order('order_index');

      if (exError) throw exError;

      // Фильтруем упражнения, у которых есть логи
      const loggedExercises = (exData || []).filter((ex: any) => ex.workout_logs && ex.workout_logs.length > 0);
      setExercises(loggedExercises);

      // Считаем статистику
      let volume = 0;
      let sets = 0;
      loggedExercises.forEach((ex: any) => {
        ex.workout_logs.forEach((log: any) => {
          volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
          sets++;
        });
      });
      setTotalVolume(volume);
      setTotalSets(sets);

    } catch (error: any) {
      console.error('🔴 Ошибка загрузки истории:', error);
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', { 
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Шапка с навигацией */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
      </View>

      {/* Общая статистика */}
      <View style={styles.statsCard}>
        <Text style={styles.workoutName}>{workout?.name}</Text>
        <Text style={styles.workoutDate}>{formatDate(workout?.created_at)}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Подходов</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(totalVolume)}</Text>
            <Text style={styles.statLabel}>Общий объем (кг)</Text>
          </View>
        </View>
      </View>

      {/* Список упражнений */}
      <View style={styles.exercisesContainer}>
        <Text style={styles.sectionTitle}>Выполненные упражнения</Text>
        {exercises.length === 0 ? (
          <Text style={styles.emptyText}>Нет данных по подходам</Text>
        ) : (
          exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exercises?.name}</Text>
                  {ex.exercises?.primary_muscles?.length > 0 && (
                    <Text style={styles.exerciseMuscles}>
                      {getList(ex.exercises, 'primary_muscles').join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.logsList}>
                {ex.workout_logs.map((log, logIndex) => (
                  <View key={logIndex} style={styles.logRow}>
                    <Text style={styles.logSet}>Подход {log.set_number}</Text>
                    <Text style={styles.logResult}>
                      {log.weight_kg} кг × {log.reps} раз
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { padding: 8 },
  backText: { color: '#7c3aed', fontSize: 16, fontWeight: '600' },

  statsCard: {
    backgroundColor: '#7c3aed',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    elevation: 4,
  },
  workoutName: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  workoutDate: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  exercisesContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 20 },

  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exerciseNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#ede9fe',
    color: '#7c3aed', textAlign: 'center', lineHeight: 28, fontWeight: 'bold', marginRight: 12,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  exerciseMuscles: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  logsList: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  logSet: { fontSize: 14, color: '#6b7280' },
  logResult: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
});