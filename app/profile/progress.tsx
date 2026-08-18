// app/profile/progress.tsx
// UX-11: Progress hub — единый экран ответа «Как я меняюсь?» (PRODUCT.md §11).
// Каждый блок отвечает на под-вопрос:
//   compact row — итоги (тр./тонны/стрик), не доминируют;
//   📈 Сила — e1RM тренд top-3 упражнений (главный ответ «становлюсь ли сильнее?»);
//   📊 Объём — VolumeTrendChart (8 недель);
//   ⚖️ Вес — текущий + delta за 8 недель (как меняется тело);
//   🏆 Рекорды — top-5 PR с датами;
//   регулярность — 1 строка внизу (density ≠ streak), не отдельный блок.
// Entry point: app/(tabs)/profile.tsx → «Мой прогресс». Без bottom-tab (PRODUCT.md §11).
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Dumbbell, Flame } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProgress } from '../../src/hooks/useProgress';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { PersonalRecordsCard } from '../../src/components/PersonalRecordsCard';
import { VolumeTrendChart } from '../../src/components/progress/VolumeTrendChart';
import { StrengthTrendChart } from '../../src/components/progress/StrengthTrendChart';
import { WeightTrendRow } from '../../src/components/progress/WeightTrendRow';

export default function ProgressScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch } = useProgress(userId);

  // Маппинг PersonalRecordWithDate → контракт PersonalRecordsCard
  const records = (data?.personalRecords ?? []).map((r) => ({
    exerciseName: r.name,
    maxWeight: r.maxWeight,
    maxReps: r.reps,
    e1rm: r.e1rm,
    recordDate: r.recordDate,
  }));

  // Регулярность — 1 строка; вычисляется из уже загруженных weeklyVolume
  // (ноль новых запросов). reduce с явным generic: TS не видит мутации в замыканиях.
  const regularityLine = useMemo(() => {
    const weeks = data?.weeklyVolume ?? [];
    if (weeks.length === 0) return '';
    const total = weeks.reduce((s, w) => s + w.workoutsCount, 0);
    const avg = total / weeks.length;

    const best = weeks.reduce<{ count: number; weekStart: string } | null>(
      (acc, w) =>
        !acc || w.workoutsCount > acc.count
          ? { count: w.workoutsCount, weekStart: w.weekStart }
          : acc,
      null,
    );

    if (!best || best.count === 0) return `${avg.toFixed(1)} тр./нед.`;
    const bestLabel = best.weekStart.split('-').reverse().slice(0, 2).join('.');
    return `${avg.toFixed(1)} тр./нед. · лучшая: ${bestLabel} (${best.count} тр.)`;
  }, [data?.weeklyVolume]);

  // ===== Nav header (общий для всех состояний) =====
  const navHeader = (
    <View
      style={[
        commonStyles.navHeader,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
        <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
        Мой прогресс
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ===== Loading state =====
  if (isPending) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка прогресса...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===== Error state =====
  if (isError || !data) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {navHeader}
        <View style={commonStyles.center}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
            Не удалось загрузить
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
            Проверьте соединение и попробуйте снова
          </Text>
          {/* Dev-only: причина ошибки для диагностики (не показывается в production) */}
          {__DEV__ && !!error && (
            <Text
              style={[
                typography.caption,
                {
                  color: colors.textTertiary,
                  marginTop: SPACING.md,
                  textAlign: 'center',
                  paddingHorizontal: SPACING.lg,
                },
              ]}
            >
              {String((error as Error)?.message ?? error)}
            </Text>
          )}
          <AppButton
            title="Повторить"
            variant="primary"
            size="medium"
            onPress={() => refetch()}
            icon={<RefreshCw size={16} color={colors.textInverse} />}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ===== Empty state =====
  const isEmpty =
    data.totalWorkouts === 0 &&
    data.personalRecords.length === 0 &&
    data.weeklyVolume.every((w) => w.volume === 0);

  if (isEmpty) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {navHeader}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md, textAlign: 'center' }]}>
            Пока нет данных
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.xs, textAlign: 'center' }]}>
            Завершите первую тренировку, чтобы увидеть свой прогресс здесь
          </Text>
          <AppButton
            title="Перейти к тренировкам"
            variant="primary"
            size="medium"
            onPress={() => router.push('/(tabs)/workouts')}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ===== Data state =====
  const volumeTons = (data.totalVolume / 1000).toFixed(1);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {navHeader}
      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact stats row: итоги, не доминируют над трендами */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: BORDER_RADIUS.md,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {data.totalWorkouts} тр. · {volumeTons} т
          </Text>
          {data.currentStreak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.sm }}>
              <Flame size={14} color={colors.warning} />
              <Text style={[typography.caption, { color: colors.warning, marginLeft: 2 }]}>
                {data.currentStreak} дн.
              </Text>
            </View>
          )}
        </View>

        {/* 📈 Сила — главный ответ на «Становлюсь ли я сильнее?» */}
        {data.strengthTrend.length > 0 && (
          <View style={{ marginTop: SPACING.xl }}>
            <StrengthTrendChart series={data.strengthTrend} />
          </View>
        )}

        {/* 📊 Объём по неделям */}
        <View style={{ marginTop: SPACING.xl }}>
          <VolumeTrendChart weeklyVolume={data.weeklyVolume} />
        </View>

        {/* ⚖️ Вес тела */}
        {data.weightTrend.length >= 2 && (
          <View style={{ marginTop: SPACING.xl }}>
            <WeightTrendRow weightTrend={data.weightTrend} />
          </View>
        )}

        {/* 🏆 Рекорды */}
        {records.length > 0 && (
          <View style={{ marginTop: SPACING.xl }}>
            <PersonalRecordsCard records={records} colors={colors} />
          </View>
        )}

        {/* Регулярность — 1 строка, не блок */}
        {regularityLine !== '' && (
          <Text
            style={[
              typography.caption,
              { color: colors.textTertiary, marginTop: SPACING.lg, textAlign: 'center' },
            ]}
          >
            Регулярность: {regularityLine}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}