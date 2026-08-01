import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { AppButton } from '../../src/components/ui/AppButton';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  ChevronLeft,
  Clock,
  Dumbbell,
  Trophy,
  Calendar,
  Flame,
  CheckCircle,
} from 'lucide-react-native';
import {
  getWorkoutDetail,
  type WorkoutDetail,
  type WorkoutDetailError,
  type WorkoutDetailExercise,
  type WorkoutDetailLog,
} from '../../src/services/historyService';

export default function WorkoutHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WorkoutDetailError | null>(null);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: detailError } = await getWorkoutDetail(id as string);
      if (detailError) {
        setError(detailError);
        return;
      }
      setWorkout(data);
    } catch (e: any) {
      setError({ notFound: false, message: e.message || 'Неизвестная ошибка' });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Подсчёт статистики (типизировано)
  const totalVolume =
    workout?.exercises.reduce(
      (acc: number, ex: WorkoutDetailExercise) =>
        acc +
        ex.logs.reduce(
          (sum: number, log: WorkoutDetailLog) =>
            sum + (log.weight_kg || 0) * (log.reps || 0),
          0,
        ),
      0,
    ) || 0;

  const totalSets =
    workout?.exercises.reduce(
      (acc: number, ex: WorkoutDetailExercise) => acc + ex.logs.length,
      0,
    ) || 0;

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
            {error.notFound ? 'Тренировка не найдена' : 'Ошибка загрузки'}
          </Text>
          {!error.notFound && (
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: SPACING.sm },
              ]}
            >
              {error.message}
            </Text>
          )}
          <AppButton
            title="Назад"
            variant="secondary"
            size="medium"
            onPress={() => router.back()}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.center}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
            Тренировка не найдена
          </Text>
          <AppButton
            title="Назад"
            variant="secondary"
            size="medium"
            onPress={() => router.back()}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Шапка */}
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text
          style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}
        >
          История тренировки
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {/* Название и дата */}
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
          {workout.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginLeft: SPACING.sm }]}>
            {formatDate(workout.created_at)}
          </Text>
        </View>

        {/* Статистика */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
          <AppCard variant="compact" style={{ flex: 1, alignItems: 'center' }}>
            <Clock size={20} color={colors.primary} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {workout.duration_seconds ? formatDuration(workout.duration_seconds) : '--:--'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Время</Text>
          </AppCard>
          <AppCard variant="compact" style={{ flex: 1, alignItems: 'center' }}>
            <Dumbbell size={20} color={colors.success} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {totalSets}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Подходов</Text>
          </AppCard>
          <AppCard variant="compact" style={{ flex: 1, alignItems: 'center' }}>
            <Trophy size={20} color={colors.warning} />
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {Math.round(totalVolume)}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>кг объём</Text>
          </AppCard>
        </View>

        {/* Программа (если есть) */}
        {workout.program_id && (
          <AppCard variant="compact" style={{ marginBottom: SPACING.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Flame size={20} color={colors.primary} />
              <Text
                style={[
                  typography.labelBold,
                  { color: colors.textPrimary, marginLeft: SPACING.sm },
                ]}
              >
                Программа: Неделя {workout.week_number || 1}, День {workout.day_index || 1}
              </Text>
            </View>
          </AppCard>
        )}

        {/* Список упражнений */}
        <SectionHeader title="Упражнения" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
        {workout.exercises.map((exercise: WorkoutDetailExercise, exIndex: number) => (
          <AppCard key={exercise.id} variant="compact" style={{ marginBottom: SPACING.md }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: SPACING.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.primaryLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: SPACING.sm,
                  }}
                >
                  <Text style={[typography.labelBold, { color: colors.primary, fontSize: 12 }]}>
                    {exIndex + 1}
                  </Text>
                </View>
                <Text style={[typography.labelBold, { color: colors.textPrimary, flex: 1 }]}>
                  {exercise.exercise_name}
                </Text>
              </View>
              <AppBadge variant="default" size="small">
                {exercise.target_reps_range}
              </AppBadge>
            </View>

            {exercise.logs.length > 0 ? (
              <View style={{ marginTop: SPACING.sm }}>
                {exercise.logs.map((log: WorkoutDetailLog, logIndex: number) => (
                  <View
                    key={log.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: SPACING.xs,
                      borderBottomWidth: logIndex < exercise.logs.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckCircle size={14} color={colors.success} />
                      <Text
                        style={[
                          typography.body,
                          { color: colors.textSecondary, marginLeft: SPACING.sm },
                        ]}
                      >
                        Подход {log.set_number}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                      <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                        {log.weight_kg} кг
                      </Text>
                      <Text style={[typography.labelBold, { color: colors.textSecondary }]}>
                        × {log.reps}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}>
                Нет данных
              </Text>
            )}
          </AppCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}