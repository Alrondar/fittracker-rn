import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList } from '../../src/lib/supabase';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { typography } from '../../src/styles/typography';

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

  const cardStyles = createCardStyles(colors);

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

      const loggedExercises = (exData || []).filter(
        (ex: any) => ex.workout_logs && ex.workout_logs.length > 0
      );
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка с кнопкой назад */}
      <View style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <Text style={[commonStyles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
      </View>

      {/* Карточка статистики */}
      <View
        style={[
          cardStyles.large,
          {
            backgroundColor: colors.primary,
            marginHorizontal: SPACING.lg,
            marginTop: SPACING.md,
          },
        ]}
      >
        <Text style={[typography.h3, { color: colors.textInverse, marginBottom: 4 }]}>
          {workout?.name}
        </Text>
        <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)', marginBottom: SPACING.xl }]}>
          {formatDate(workout?.created_at)}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[typography.h2, { color: colors.textInverse }]}>{totalSets}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>
              Подходов
            </Text>
          </View>
          <View
            style={{
              width: 1,
              height: 50,
              marginHorizontal: SPACING.sm,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
          />
          <View style={{ alignItems: 'center' }}>
            <Text style={[typography.h2, { color: colors.textInverse }]}>
              {Math.round(totalVolume)}
            </Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>
              Общий объем (кг)
            </Text>
          </View>
        </View>
      </View>

      {/* Список упражнений */}
      <View style={{ padding: SPACING.lg }}>
        <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
          Выполненные упражнения
        </Text>

        {exercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xl }]}>
            Нет данных по подходам
          </Text>
        ) : (
          exercises.map((ex, index) => (
            <View key={ex.id} style={cardStyles.exerciseCard}>
              <View style={cardStyles.exerciseHeader}>
                <View style={[cardStyles.exerciseNumber, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[cardStyles.exerciseNumberText, { color: colors.primary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={cardStyles.exerciseInfo}>
                  <Text style={cardStyles.exerciseName}>
                    {ex.exercises?.name}
                  </Text>
                  {ex.exercises?.primary_muscles?.length > 0 && (
                    <Text style={cardStyles.exerciseMuscles}>
                      {getList(ex.exercises, 'primary_muscles').join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[cardStyles.logsList, { borderTopColor: colors.borderLight }]}>
                {ex.workout_logs.map((log, logIndex) => (
                  <View key={logIndex} style={cardStyles.logRow}>
                    <Text style={cardStyles.logSet}>Подход {log.set_number}</Text>
                    <Text style={cardStyles.logResult}>
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