// app/progress/[id].tsx
// Workout Report: детальный отчёт по завершённой тренировке (PRODUCT.md §11).
// Показывает: сводку, задействованные мышцы (инфографика), список упражнений.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Dumbbell, Flame } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppButton } from '../../src/components/ui/AppButton';
import { getWorkoutDetail } from '../../src/services/historyService';
import type { WorkoutDetail, WorkoutDetailExercise, WorkoutDetailLog } from '../../src/services/historyService';
import { useQuery } from '@tanstack/react-query';

interface MuscleLoad {
  name: string;
  volume: number;
  avgRpe: number | null;
}

export default function WorkoutReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['workoutDetail', id],
    queryFn: async () => {
      const res = await getWorkoutDetail(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    let totalVolume = 0;
    let totalSets = 0;
    let totalRpe = 0;
    let rpeCount = 0;

    data.exercises.forEach((ex: WorkoutDetailExercise) => {
      ex.logs.forEach((log: WorkoutDetailLog) => {
        const weight = log.weight_kg || 0;
        const reps = log.reps || 0;
        totalVolume += weight * reps;
        totalSets += 1;
        if (log.rpe != null) {
          totalRpe += log.rpe;
          rpeCount += 1;
        }
      });
    });

    return {
      totalVolume,
      totalSets,
      avgRpe: rpeCount > 0 ? (totalRpe / rpeCount).toFixed(1) : null,
      duration: data.duration_seconds ? Math.round(data.duration_seconds / 60) : null,
    };
  }, [data]);

  const muscleLoads = useMemo((): MuscleLoad[] => {
    if (!data) return [];
    const muscleMap = new Map<string, { volume: number; rpeSum: number; rpeCount: number }>();

    data.exercises.forEach((ex: WorkoutDetailExercise) => {
      const exerciseVolume = ex.logs.reduce((sum, log) => sum + (log.weight_kg || 0) * (log.reps || 0), 0);
      const exerciseRpe = ex.logs.reduce((sum, log) => sum + (log.rpe || 0), 0);
      const exerciseRpeCount = ex.logs.filter((log) => log.rpe != null).length;

      const primaryMuscles = ex.primary_muscles || [];
      const secondaryMuscles = ex.secondary_muscles || [];

      // Primary muscles get 100% of volume credit
      primaryMuscles.forEach((muscle) => {
        if (!muscleMap.has(muscle)) muscleMap.set(muscle, { volume: 0, rpeSum: 0, rpeCount: 0 });
        const entry = muscleMap.get(muscle)!;
        entry.volume += exerciseVolume;
        entry.rpeSum += exerciseRpe;
        entry.rpeCount += exerciseRpeCount;
      });

      // Secondary muscles get 50% of volume credit
      secondaryMuscles.forEach((muscle) => {
        if (!muscleMap.has(muscle)) muscleMap.set(muscle, { volume: 0, rpeSum: 0, rpeCount: 0 });
        const entry = muscleMap.get(muscle)!;
        entry.volume += exerciseVolume * 0.5;
        entry.rpeSum += exerciseRpe * 0.5;
        entry.rpeCount += exerciseRpeCount * 0.5;
      });
    });

    return Array.from(muscleMap.entries())
      .map(([name, data]) => ({
        name,
        volume: data.volume,
        avgRpe: data.rpeCount > 0 ? data.rpeSum / data.rpeCount : null,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 6);
  }, [data]);

  const maxMuscleVolume = useMemo(() => {
    return muscleLoads.length > 0 ? Math.max(...muscleLoads.map((m) => m.volume)) : 0;
  }, [muscleLoads]);

  const getMuscleColor = (avgRpe: number | null): string => {
    if (avgRpe == null) return colors.textSecondary;
    if (avgRpe >= 9) return colors.error;
    if (avgRpe >= 7) return colors.warning;
    return colors.success;
  };

  if (isPending) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={commonStyles.navHeader}>
          <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>Не удалось загрузить</Text>
          <AppButton title="Повторить" variant="primary" onPress={() => refetch()} style={{ marginTop: SPACING.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  // Фактическая дата тренировки: finished_at ?? started_at ?? created_at.
  // created_at при upfront-создании тренировок программы отражает момент
  // создания записи в БД, а не фактическую дату тренировки.
  const workoutDate = data.finished_at ?? data.started_at ?? data.created_at;
  const dateStr = new Date(workoutDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          Отчёт
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Заголовок тренировки */}
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>{data.name}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.lg }]}>{dateStr}</Text>

        {/* Сводка */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: SPACING.lg,
            marginBottom: SPACING.lg,
          }}
        >
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Dumbbell size={20} color={colors.primary} />
            <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {stats?.totalVolume.toLocaleString('ru-RU') ?? 0}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>кг объём</Text>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {stats?.totalSets ?? 0}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>подходов</Text>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Clock size={20} color={colors.warning} />
            <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
              {stats?.duration ?? '?'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>мин</Text>
          </View>
          {stats?.avgRpe && (
            <>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Flame size={20} color={colors.error} />
                <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.xs }]}>{stats.avgRpe}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>ср. RPE</Text>
              </View>
            </>
          )}
        </View>

        {/* Мышцы — инфографика */}
        {muscleLoads.length > 0 && (
          <View style={{ marginBottom: SPACING.xl }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
              Задействованные мышцы
            </Text>
            {muscleLoads.map((muscle) => {
              const barWidth = maxMuscleVolume > 0 ? (muscle.volume / maxMuscleVolume) * 100 : 0;
              const barColor = getMuscleColor(muscle.avgRpe);
              return (
                <View key={muscle.name} style={{ marginBottom: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[typography.body, { color: colors.textPrimary }]}>{muscle.name}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {Math.round(muscle.volume)} кг
                      {muscle.avgRpe != null && ` · RPE ${muscle.avgRpe.toFixed(1)}`}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: BORDER_RADIUS.sm,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        borderRadius: BORDER_RADIUS.sm,
                      }}
                    />
                  </View>
                </View>
              );
            })}
            <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.xs }]}>
              Длина = объём работы · Цвет = интенсивность (RPE)
            </Text>
          </View>
        )}

        {/* Упражнения */}
        <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
          Упражнения
        </Text>
        {data.exercises.map((ex: WorkoutDetailExercise) => (
          <View
            key={ex.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: SPACING.md,
              marginBottom: SPACING.md,
            }}
          >
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
              {ex.exercise_name}
            </Text>
            {ex.logs.map((log: WorkoutDetailLog) => (
              <View key={log.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs }}>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  Подход {log.set_number}
                </Text>
                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {log.weight_kg ?? 0} × {log.reps ?? 0}
                  </Text>
                  {log.rpe != null && (
                    <Text style={[typography.caption, { color: colors.warning }]}>RPE {log.rpe}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}