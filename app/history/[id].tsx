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
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

interface LoggedSet {
  set_number: number;
  weight_kg: number;
  reps: number;
}

interface LoggedExercise {
  id: string;
  order_index: number;
  exercises: any;
  workout_logs: LoggedSet[];
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
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

      const loggedExercises = (exData || []).filter((ex: any) => ex.workout_logs && ex.workout_logs.length > 0);
      setExercises(loggedExercises);

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <Text style={[styles.workoutName, { color: colors.textInverse }]}>{workout?.name}</Text>
        <Text style={[styles.workoutDate, { color: 'rgba(255,255,255,0.8)' }]}>{formatDate(workout?.created_at)}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textInverse }]}>{totalSets}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Подходов</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textInverse }]}>{Math.round(totalVolume)}</Text>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>Общий объем (кг)</Text>
          </View>
        </View>
      </View>

      <View style={styles.exercisesContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Выполненные упражнения</Text>
        {exercises.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Нет данных по подходам</Text>
        ) : (
          exercises.map((ex, index) => (
            <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
              <View style={styles.exerciseHeader}>
                <View style={[styles.exerciseNumber, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.exerciseNumberText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{ex.exercises?.name}</Text>
                  {ex.exercises?.primary_muscles?.length > 0 && (
                    <Text style={[styles.exerciseMuscles, { color: colors.textSecondary }]}>
                      {getList(ex.exercises, 'primary_muscles').join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.logsList, { borderTopColor: colors.borderLight }]}>
                {ex.workout_logs.map((log, logIndex) => (
                  <View key={logIndex} style={styles.logRow}>
                    <Text style={[styles.logSet, { color: colors.textSecondary }]}>Подход {log.set_number}</Text>
                    <Text style={[styles.logResult, { color: colors.textPrimary }]}>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  backButton: { padding: SPACING.sm },
  backText: { fontSize: 16, fontWeight: '600' },

  statsCard: {
    padding: SPACING.xl,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 4,
  },
  workoutName: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  workoutDate: { fontSize: 14, marginBottom: SPACING.xl },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 50, marginHorizontal: SPACING.sm },

  exercisesContainer: { padding: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.lg },
  emptyText: { textAlign: 'center', marginTop: SPACING.xl },

  exerciseCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    elevation: 2,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  exerciseNumber: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  exerciseNumberText: { fontWeight: 'bold', fontSize: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: 'bold' },
  exerciseMuscles: { fontSize: 12, marginTop: 2 },

  logsList: { borderTopWidth: 1, paddingTop: SPACING.md },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  logSet: { fontSize: 14 },
  logResult: { fontSize: 14, fontWeight: '600' },
});