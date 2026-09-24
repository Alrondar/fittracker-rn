// app/progress/[id].tsx
// Workout Report: детальный отчёт по завершённой тренировке (PRODUCT.md §11).
// Показывает: сводку, задействованные мышцы (анатомическая карта), список упражнений.
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Dumbbell, Flame, X } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useWeightDisplay } from '../../src/hooks/useUnitPreferences';
import { useStore } from '../../src/store/useStore';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { typography } from '../../src/styles/typography';
import { commonStyles } from '../../src/styles/common';
import { AppButton } from '../../src/components/ui/AppButton';
import { getWorkoutDetail } from '../../src/services/historyService';
import { profileService } from '../../src/services/profileService';
import type { WorkoutDetailExercise, WorkoutDetailLog } from '../../src/services/historyService';
import { useQuery } from '@tanstack/react-query';
import {
  calculateMuscleLoad,
  exerciseHasMuscle,
  type MuscleLoadMode,
} from '../../src/utils/muscleLoad';
import { effectiveReps } from '../../src/utils/reps';
import { MuscleLoadMap } from '../../src/components/workout/MuscleLoadMap';
import { getMuscleNamesForSlug } from '../../src/constants/muscleMapSlugs';
import type { Slug } from '../../src/types/muscleMap';
import { MuscleLoadModeToggle } from '../../src/components/ui/MuscleLoadModeToggle';

export default function WorkoutReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { unitLabel, kgToUnit } = useWeightDisplay();
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

  // Состояние фильтрации по мышце (тап по карте или легенде)
  const [selectedMuscle, setSelectedMuscle] = useState<Slug | null>(null);
  const toggleMuscle = useCallback((slug: Slug) => {
    setSelectedMuscle((prev) => (prev === slug ? null : slug));
  }, []);

  // Состояние режима отображения нагрузки
  const [loadMode, setLoadMode] = useState<MuscleLoadMode>('total');

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
        const r = effectiveReps(log);
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
    // Модель: primary = 100%, secondary = 50% (в режиме 'total').
    // В режиме 'direct' secondary мышцы полностью исключаются.
    // RPE показывается отдельно в сводке и не меняет цвет карты.
    const muscleLoad = calculateMuscleLoad(
      data.exercises.map((ex: WorkoutDetailExercise) => ({
        primaryMuscles: ex.primary_muscles,
        secondaryMuscles: ex.secondary_muscles,
        sets: ex.logs.map((log: WorkoutDetailLog) => ({
          weight: log.weight_kg,
          reps: log.reps,
          reps_left: log.reps_left ?? null,
          reps_right: log.reps_right ?? null,
          isWarmup: log.is_warmup ?? false,
        })),
      })),
      loadMode
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
  }, [data, loadMode]);

  // Фильтрация упражнений по выбранной мышце (тап по карте/легенде)
  const visibleExercises = useMemo(() => {
    if (!data) return [];
    if (!selectedMuscle) return data.exercises;
    return data.exercises.filter((ex) =>
      exerciseHasMuscle(ex.primary_muscles, ex.secondary_muscles, selectedMuscle)
    );
  }, [data, selectedMuscle]);

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
              {kgToUnit(stats?.totalVolume ?? 0).toLocaleString('ru-RU')}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {unitLabel} объём
            </Text>
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: SPACING.sm,
            }}
          >
            <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
              Задействованные мышцы
            </Text>
            <MuscleLoadModeToggle mode={loadMode} onChange={setLoadMode} />
          </View>
          <MuscleLoadMap
            muscleLoad={muscleLoad}
            gender={gender}
            scale={0.8}
            showTitle={false}
            selectedSlug={selectedMuscle}
            onEntryTap={toggleMuscle}
          />
          {selectedMuscle && (
            <View
              style={{
                marginTop: SPACING.md,
                padding: SPACING.sm,
                backgroundColor: colors.surfaceSecondary,
                borderRadius: BORDER_RADIUS.md,
              }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textPrimary, flex: 1, fontWeight: '600' },
                  ]}
                >
                  Фильтр по группе мышц
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedMuscle(null)}
                  style={{ padding: SPACING.xs }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
                {getMuscleNamesForSlug(selectedMuscle).map((name) => (
                  <View
                    key={name}
                    style={{
                      paddingHorizontal: SPACING.sm,
                      paddingVertical: SPACING.xs,
                      backgroundColor: colors.primary,
                      borderRadius: BORDER_RADIUS.full,
                    }}
                  >
                    <Text style={[typography.captionSmall, { color: colors.textInverse }]}>
                      {name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Упражнения */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.sm,
          }}
        >
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Упражнения</Text>
          {selectedMuscle && (
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              {visibleExercises.length} из {data.exercises.length}
            </Text>
          )}
        </View>

        {visibleExercises.length === 0 && selectedMuscle ? (
          <View
            style={{
              padding: SPACING.lg,
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Нет упражнений для этой мышцы в данной тренировке.
            </Text>
            <AppButton
              title="Сбросить фильтр"
              variant="secondary"
              onPress={() => setSelectedMuscle(null)}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        ) : (
          visibleExercises.map((ex: WorkoutDetailExercise) => (
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
                    <Text
                      style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}
                    >
                      {log.weight_kg != null ? kgToUnit(log.weight_kg) : 0} × {effectiveReps(log)}
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
