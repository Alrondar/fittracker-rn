// app/progress/[id].tsx
// Workout Report: детальный отчёт по завершённой тренировке (PRODUCT.md §11).
// Показывает: сводку, задействованные мышцы (анатомическая карта), список упражнений.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Dumbbell, Flame } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppButton } from '../../src/components/ui/AppButton';
import { getWorkoutDetail } from '../../src/services/historyService';
import { profileService } from '../../src/services/profileService';
import type {
  WorkoutDetail,
  WorkoutDetailExercise,
  WorkoutDetailLog,
} from '../../src/services/historyService';
import { useQuery } from '@tanstack/react-query';
import { calculateMuscleLoad } from '../../src/utils/muscleLoad';
import { MuscleLoadMap } from '../../src/components/workout/MuscleLoadMap';

export default function WorkoutReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { userId } = useStore();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['workoutDetail', id],
    queryFn: async () => {
      const res = await getWorkoutDetail(id);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      return profileService.getProfileData(userId);
    },
    enabled: !!userId,
  });

  const gender = profileData?.gender === 'female' ? 'female' : 'male';

  const { stats, muscleLoad } = useMemo(() => {
    if (!data) return { stats: null, muscleLoad: [] };
    let totalVolume = 0;
    let totalSets = 0;
    let totalRpe = 0;
    let rpeCount = 0;

    data.exercises.forEach((ex: WorkoutDetailExercise) => {
      ex.logs.forEach((log: WorkoutDetailLog) => {
        if (log.is_warmup) return; // разминочные — не в аналитике
        const w = log.weight_kg ?? 0;
        const r = log.reps ?? 0;
        if (w > 0 && r > 0) {
          totalVolume += w * r;
          totalSets += 1;
        }
        if (log.rpe != null) {
          totalRpe += log.rpe;
          rpeCount += 1;
        }
      });
    });

    // Нагрузка по мышцам: детерминированная агрегация (src/utils/muscleLoad.ts).
    // Модель: primary = 100%, secondary = 50% (внутренняя, не мед. истина).
    // RPE учитывается в loadScore для интенсивности раскраски карты.
    const muscleLoad = calculateMuscleLoad(
      data.exercises.map((ex: WorkoutDetailExercise) => ({
        primaryMuscles: ex.primary_muscles,
        secondaryMuscles: ex.secondary_muscles,
        sets: ex.logs.map((log: WorkoutDetailLog) => ({
          weight: log.weight_kg,
          reps: log.reps,
          rpe: log.rpe,
          isWarmup: log.is_warmup ?? false,
        })),
      }))
    );

    return {
      stats: {
        totalVolume,
        totalSets,
        avgRpe: rpeCount > 0 ? (totalRpe / rpeCount).toFixed(1) : null,
        duration: data.duration_seconds ? Math.round(data.duration_seconds / 60) : null,
      },
      muscleLoad,
    };
  }, [data]);

  if (isPending) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={commonStyles.navHeader}>
          <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
            <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}
        >
          <Text style={[typography.h4, { color: colors.textPrimary }]}>Не удалось загрузить</Text>
          <AppButton
            title="Повторить"
            variant="primary"
            onPress={() => refetch()}
            style={{ marginTop: SPACING.lg }}
          />
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
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
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
          numberOfLines={1}
        >
          {data.name || 'Отчёт'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок тренировки */}
        <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
          {data.name}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.lg }]}>
          {dateStr}
        </Text>

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
                <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.xs }]}>
                  {stats.avgRpe}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>ср. RPE</Text>
              </View>
            </>
          )}
        </View>

        {/* Мышцы — анатомическая карта + нагрузка по группам мышц */}
        <View style={{ marginBottom: SPACING.xl }}>
          <MuscleLoadMap
            muscleLoad={muscleLoad}
            gender={gender}
            scale={0.8}
            title="Задействованные мышцы"
          />
        </View>

        {/* Упражнения */}
        <Text
          style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}
        >
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
            <Text
              style={[
                typography.labelBold,
                { color: colors.textPrimary, marginBottom: SPACING.sm },
              ]}
            >
              {ex.exercise_name}
            </Text>
            {ex.logs.map((log: WorkoutDetailLog) => (
              <View
                key={log.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: SPACING.xs,
                }}
              >
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  Подход {log.set_number}
                </Text>
                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {log.weight_kg ?? 0} × {log.reps ?? 0}
                  </Text>
                  {log.rpe != null && (
                    <Text style={[typography.caption, { color: colors.warning }]}>
                      RPE {log.rpe}
                    </Text>
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
