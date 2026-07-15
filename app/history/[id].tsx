import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import { Trophy, TrendingUp, TrendingDown, Minus, Share2, Clock, Target } from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { typography } from '../../src/styles/typography';
import { FadeIn } from '../../src/components/FadeIn';
import { getMuscleColor } from '../../src/constants/muscleColors';

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

interface WorkoutComparison {
  volumeDiff: number;
  setsDiff: number;
  date: string;
}

interface MuscleVolume {
  muscle: string;
  volume: number;
  percentage: number;
  color: string;
}

interface PlanComparison {
  exerciseName: string;
  targetSets: number;
  actualSets: number;
  targetWeight?: number;
  actualWeight?: number;
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [prs, setPrs] = useState<Record<string, { maxWeight: number; maxReps: number }>>({});
  const [comparison, setComparison] = useState<WorkoutComparison | null>(null);
  const [muscleVolumes, setMuscleVolumes] = useState<MuscleVolume[]>([]);
  const [planComparison, setPlanComparison] = useState<PlanComparison[]>([]);
  const [workoutDuration, setWorkoutDuration] = useState<number | null>(null);

  const cardStyles = createCardStyles(colors);

  useEffect(() => {
    loadHistoryDetail();
  }, [id]);

  const loadHistoryDetail = async () => {
    if (!id || id === 'undefined' || id === 'null') {
      Alert.alert('Ошибка', `Не удалось загрузить тренировку. ID: ${id || 'отсутствует'}`);
      router.back();
      return;
    }

    try {
      // 1. Загрузка основной тренировки
      const { data: workoutData, error: wError } = await supabase
        .from('workouts')
        .select('name, created_at, program_id')
        .eq('id', id)
        .single();

      if (wError) throw wError;
      setWorkout(workoutData);

      // 2. Загрузка упражнений и логов
      const { data: exData, error: exError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          order_index,
          target_sets,
          exercises (id, name, primary_muscles),
          workout_logs (set_number, weight_kg, reps, completed_at)
        `)
        .eq('workout_id', id)
        .order('order_index');

      if (exError) throw exError;

      const loggedExercises = (exData || []).filter(
        (ex: any) => ex.workout_logs && ex.workout_logs.length > 0
      );

      setExercises(loggedExercises);

      // 3. Расчет объема, подходов и времени
      let volume = 0;
      let sets = 0;
let lastLogTime: Date | null = null;
const exerciseIds = loggedExercises.map((ex: any) => ex.exercises.id);

for (const ex of loggedExercises) {
  for (const log of ex.workout_logs) {
    volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
    sets++;
    if (log.completed_at) {
      const logTime = new Date(log.completed_at);
      if (lastLogTime === null || logTime.getTime() > lastLogTime.getTime()) {
        lastLogTime = logTime;
      }
    }
  }
}

      setTotalVolume(volume);
      setTotalSets(sets);

      // Расчет времени тренировки
      if (workoutData.created_at && lastLogTime) {
        const startTime = new Date(workoutData.created_at);
        const durationMs = lastLogTime.getTime() - startTime.getTime();
        const durationMin = Math.round(durationMs / 60000);
        setWorkoutDuration(durationMin > 0 ? durationMin : null);
      }

      // 4. Загрузка личных рекордов
      if (userId && exerciseIds.length > 0) {
        const { data: prData } = await supabase
          .from('workout_logs')
          .select(`
            weight_kg,
            reps,
            workout_exercises!inner (
              exercise_id,
              workouts!inner (
                user_id
              )
            )
          `)
          .eq('workout_exercises.workouts.user_id', userId)
          .in('workout_exercises.exercise_id', exerciseIds);

        const prMap: Record<string, { maxWeight: number; maxReps: number }> = {};
        if (prData) {
          prData.forEach((log: any) => {
            const exId = log.workout_exercises.exercise_id;
            if (!prMap[exId]) prMap[exId] = { maxWeight: 0, maxReps: 0 };
            if (log.weight_kg > prMap[exId].maxWeight) prMap[exId].maxWeight = log.weight_kg;
            if (log.reps > prMap[exId].maxReps) prMap[exId].maxReps = log.reps;
          });
        }
        setPrs(prMap);
      }

      // 5. Сравнение с предыдущей тренировкой
      if (userId && workoutData.name) {
        const { data: prevWorkouts } = await supabase
          .from('workouts')
          .select(`
            id,
            created_at,
            workout_exercises (
              id,
              workout_logs (weight_kg, reps)
            )
          `)
          .eq('user_id', userId)
          .eq('name', workoutData.name)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (prevWorkouts && prevWorkouts.length > 0) {
          const prev = prevWorkouts[0];
          let prevVolume = 0;
          let prevSets = 0;
          prev.workout_exercises?.forEach((ex: any) => {
            ex.workout_logs?.forEach((log: any) => {
              prevVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
              prevSets++;
            });
          });

          const volumeDiff = prevVolume > 0 ? ((volume - prevVolume) / prevVolume) * 100 : 0;
          const setsDiff = prevSets > 0 ? ((sets - prevSets) / prevSets) * 100 : 0;

          setComparison({
            volumeDiff: Math.round(volumeDiff),
            setsDiff: Math.round(setsDiff),
            date: new Date(prev.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
          });
        }
      }

      // 6. Распределение объема по мышцам
      const muscleMap: Record<string, number> = {};
      loggedExercises.forEach((ex: any) => {
        const muscles = getList(ex.exercises, 'primary_muscles');
        const exVolume = ex.workout_logs.reduce(
          (sum: number, log: any) => sum + (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0),
          0
        );
        muscles.forEach((muscle: string) => {
          muscleMap[muscle] = (muscleMap[muscle] || 0) + exVolume;
        });
      });

      if (volume > 0 && Object.keys(muscleMap).length > 0) {
        const muscleVolumesList: MuscleVolume[] = Object.entries(muscleMap)
          .map(([muscle, vol]) => ({
            muscle,
            volume: Math.round(vol),
            percentage: Math.round((vol / volume) * 100),
            color: getMuscleColor(muscle),
          }))
          .sort((a, b) => b.volume - a.volume);
        setMuscleVolumes(muscleVolumesList);
      }

      // 7. Сравнение с планом программы
      if (workoutData.program_id) {
        const { data: planData } = await supabase
          .from('program_exercises')
          .select(`
            exercise_id,
            target_sets,
            target_weight,
            exercises (name)
          `)
          .eq('program_id', workoutData.program_id);

        if (planData) {
          const planComp: PlanComparison[] = planData.map((plan: any) => {
            const actual = loggedExercises.find(
              (ex: any) => ex.exercises.id === plan.exercise_id
            );
            const actualSets = actual?.workout_logs?.length || 0; // ✅ Проверка на undefined
            const actualWeight = actual && actual.workout_logs?.length > 0 // ✅ Проверка на undefined
              ? Math.max(...actual.workout_logs.map((l: any) => parseFloat(l.weight_kg) || 0))
              : 0;

            return {
              exerciseName: plan.exercises?.name || 'Неизвестно',
              targetSets: plan.target_sets || 0,
              actualSets,
              targetWeight: plan.target_weight || undefined,
              actualWeight: actualWeight || undefined,
            };
          });
          setPlanComparison(planComp);
        }
      }
    } catch (error: any) {
      console.error('Ошибка загрузки истории:', error.message);
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}ч ${mins}мин`;
    return `${mins}мин`;
  };

  const getIntensityColor = (weight: number, maxWeight: number) => {
    if (maxWeight === 0) return colors.textPrimary;
    const percentage = (weight / maxWeight) * 100;
    if (percentage >= 85) return '#F44336';
    if (percentage >= 60) return '#FFC107';
    return '#4CAF50';
  };

  const getIntensityLabel = (weight: number, maxWeight: number) => {
    if (maxWeight === 0) return '';
    const percentage = (weight / maxWeight) * 100;
    if (percentage >= 85) return 'Тяжелый';
    if (percentage >= 60) return 'Средний';
    return 'Легкий';
  };

  const handleShare = async () => {
    try {
      const muscleText = muscleVolumes
        .slice(0, 3)
        .map((m) => `${m.muscle}: ${m.percentage}%`)
        .join(', ');

      const message = `🏋️ Моя тренировка: ${workout?.name}\n\n` +
        ` Общий объем: ${Math.round(totalVolume)} кг\n` +
        `🔢 Подходов: ${totalSets}\n` +
        (workoutDuration ? `⏱️ Время: ${formatDuration(workoutDuration)}\n` : '') +
        (comparison ? `📈 Изменение объема: ${comparison.volumeDiff > 0 ? '+' : ''}${comparison.volumeDiff}%\n` : '') +
        (muscleText ? `💪 Нагрузка: ${muscleText}\n` : '') +
        `\n#FitTracker #Тренировка`;

      await Share.share({ message });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Ошибка шаринга:', error);
    }
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
      {/* Шапка с кнопкой назад и кнопкой "Поделиться" */}
      <View style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <Text style={[commonStyles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={{ padding: SPACING.sm }}>
          <Share2 size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Карточка статистики */}
      <FadeIn delay={0}>
        <View style={[cardStyles.large, { backgroundColor: colors.primary, marginHorizontal: SPACING.lg, marginTop: SPACING.md }]}>
          <Text style={[typography.h3, { color: colors.textInverse, marginBottom: 4 }]}>{workout?.name}</Text>
          <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)', marginBottom: SPACING.xl }]}>
            {formatDate(workout?.created_at)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.textInverse }]}>{totalSets}</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>Подходов</Text>
            </View>
            <View style={{ width: 1, height: 50, marginHorizontal: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.textInverse }]}>{Math.round(totalVolume)}</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>Общий объем (кг)</Text>
            </View>
            {workoutDuration && (
              <>
                <View style={{ width: 1, height: 50, marginHorizontal: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={[typography.h2, { color: colors.textInverse }]}>{formatDuration(workoutDuration)}</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>Время</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </FadeIn>

      {/* Сравнение с предыдущей тренировкой */}
      {comparison && (
        <FadeIn delay={100}>
          <View style={[cardStyles.container, { marginHorizontal: SPACING.lg, marginTop: SPACING.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <TrendingUp size={20} color={comparison.volumeDiff >= 0 ? '#4CAF50' : '#F44336'} strokeWidth={2} />
              <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Сравнение с {comparison.date}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {comparison.volumeDiff > 0 ? (
                    <TrendingUp size={16} color="#4CAF50" />
                  ) : comparison.volumeDiff < 0 ? (
                    <TrendingDown size={16} color="#F44336" />
                  ) : (
                    <Minus size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[typography.h3, { color: comparison.volumeDiff >= 0 ? '#4CAF50' : '#F44336' }]}>
                    {comparison.volumeDiff > 0 ? '+' : ''}{comparison.volumeDiff}%
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>объем</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {comparison.setsDiff > 0 ? (
                    <TrendingUp size={16} color="#4CAF50" />
                  ) : comparison.setsDiff < 0 ? (
                    <TrendingDown size={16} color="#F44336" />
                  ) : (
                    <Minus size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[typography.h3, { color: comparison.setsDiff >= 0 ? '#4CAF50' : '#F44336' }]}>
                    {comparison.setsDiff > 0 ? '+' : ''}{comparison.setsDiff}%
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>подходы</Text>
              </View>
            </View>
          </View>
        </FadeIn>
      )}

      {/* Распределение объема по мышцам */}
      {muscleVolumes.length > 0 && (
        <FadeIn delay={200}>
          <View style={[cardStyles.container, { marginHorizontal: SPACING.lg, marginTop: SPACING.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Target size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Нагрузка по мышцам
              </Text>
            </View>
            {muscleVolumes.map((item, idx) => (
              <View key={idx} style={{ marginBottom: SPACING.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{item.muscle}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.percentage}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </FadeIn>
      )}

      {/* Сравнение с планом программы */}
      {planComparison.length > 0 && (
        <FadeIn delay={300}>
          <View style={[cardStyles.container, { marginHorizontal: SPACING.lg, marginTop: SPACING.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Target size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
                Выполнение плана
              </Text>
            </View>
            {planComparison.map((item, idx) => {
              const isComplete = item.actualSets >= item.targetSets;
              return (
                <View key={idx} style={{ marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: idx < planComparison.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                  <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs }]} numberOfLines={1}>
                    {item.exerciseName}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Подходы:</Text>
                      <Text style={[typography.caption, { color: isComplete ? '#4CAF50' : '#F44336', fontWeight: '600' }]}>
                        {item.actualSets}/{item.targetSets}
                      </Text>
                    </View>
                    {item.targetWeight && item.actualWeight && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>Вес:</Text>
                        <Text style={[typography.caption, { color: item.actualWeight >= item.targetWeight ? '#4CAF50' : '#FFC107', fontWeight: '600' }]}>
                          {item.actualWeight}/{item.targetWeight}кг
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </FadeIn>
      )}

      {/* Список упражнений */}
      <View style={{ padding: SPACING.lg }}>
        <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>Выполненные упражнения</Text>
        {exercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xl }]}>
            Нет данных по подходам
          </Text>
        ) : (
          exercises.map((ex, index) => {
            const exId = ex.exercises?.id;
            const exPR = prs[exId] || { maxWeight: 0, maxReps: 0 };
            const maxWeightInWorkout = ex.workout_logs.length > 0
              ? Math.max(...ex.workout_logs.map((l: any) => parseFloat(l.weight_kg) || 0))
              : 0;

            return (
              <FadeIn key={ex.id} delay={400 + index * 100}>
                <View style={cardStyles.exerciseCard}>
                  <View style={cardStyles.exerciseHeader}>
                    <View style={[cardStyles.exerciseNumber, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[cardStyles.exerciseNumberText, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <View style={cardStyles.exerciseInfo}>
                      <Text style={cardStyles.exerciseName}>{ex.exercises?.name}</Text>
                      {ex.exercises?.primary_muscles?.length > 0 && (
                        <Text style={cardStyles.exerciseMuscles}>
                          {getList(ex.exercises, 'primary_muscles').join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[cardStyles.logsList, { borderTopColor: colors.borderLight }]}>
                    {ex.workout_logs.map((log, logIndex) => {
                      const isWeightPR = log.weight_kg >= exPR.maxWeight;
                      const isRepsPR = log.reps >= exPR.maxReps;
                      const isPR = isWeightPR || isRepsPR;
                      const intensityColor = getIntensityColor(log.weight_kg, maxWeightInWorkout);
                      const intensityLabel = getIntensityLabel(log.weight_kg, maxWeightInWorkout);

                      return (
                        <View
                          key={logIndex}
                          style={[
                            cardStyles.logRow,
                            isPR && { backgroundColor: colors.warning + '10', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[cardStyles.logSet, isPR && { color: colors.warning, fontWeight: 'bold' }]}>
                              Подход {logIndex + 1}
                            </Text>
                            {isPR && <Trophy size={16} color={colors.warning} />}
                            {intensityLabel && (
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: intensityColor }} />
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[cardStyles.logResult, isPR && { color: colors.warning, fontWeight: 'bold' }]}>
                              {log.weight_kg} кг × {log.reps} раз
                            </Text>
                            {intensityLabel && (
                              <Text style={[typography.captionSmall, { color: intensityColor, fontSize: 10 }]}>
                                {intensityLabel}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </FadeIn>
            );
          })
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}