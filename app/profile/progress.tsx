// app/profile/progress.tsx
// UX-11: Progress hub — единый экран ответа «Как я меняюсь?» (PRODUCT.md §11).
// L1 — ProgressStatsCards (тренировки/тонны/стрик, всегда виден).
// L2 — VolumeTrendChart (8-недельный тренд объёма) + PersonalRecordsCard (top-5 PR).
// L3 — Регулярность: эта неделя / 8-недельный итог / среднее / лучшая неделя
//      (density ≠ streak; замеры тела — отдельный вход из profile.tsx, 1 тап).
// Entry point: app/(tabs)/profile.tsx → кнопка «Мой прогресс».
// Без отдельной bottom-tab (PRODUCT.md §11).
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  RefreshCw,
  Dumbbell,
  Calendar,
  Target,
  Activity,
  Trophy,
} from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProgress } from '../../src/hooks/useProgress';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppButton } from '../../src/components/ui/AppButton';
import { SectionHeader } from '../../src/components/SectionHeader';
import { PersonalRecordsCard } from '../../src/components/PersonalRecordsCard';
import { ProgressStatsCards } from '../../src/components/progress/ProgressStatsCards';
import { VolumeTrendChart } from '../../src/components/progress/VolumeTrendChart';

// Локальные helper'ы — переиспользуются в блоке «Регулярность».
function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  void y;
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

function RegularityRow({
  icon,
  label,
  value,
  colors,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: 28, alignItems: 'center' }}>{icon}</View>
      <Text style={[typography.body, { color: colors.textSecondary, flex: 1, marginLeft: SPACING.sm }]}>
        {label}
      </Text>
      <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { data, isPending, isError, refetch } = useProgress(userId);

  // Маппинг PersonalRecordWithDate → PersonalRecord (контракт PersonalRecordsCard)
  const records = (data?.personalRecords ?? []).map((r) => ({
    exerciseName: r.name,
    maxWeight: r.maxWeight,
    maxReps: r.reps,
    e1rm: r.e1rm,
    recordDate: r.recordDate,
  }));

const regularity = useMemo(() => {
  const weeks = data?.weeklyVolume ?? [];                   // ✅ optional chaining + fallback
  const eightWeekTotal = weeks.reduce((s, w) => s + w.workoutsCount, 0);
  const weeklyAverage = weeks.length > 0 ? eightWeekTotal / weeks.length : 0;

  const best = weeks.reduce<                                // ✅ reduce: TS видит тип
    { count: number; weekStart: string; weekEnd: string } | null
  >(
    (acc, w) =>
      !acc || w.workoutsCount > acc.count
        ? { count: w.workoutsCount, weekStart: w.weekStart, weekEnd: w.weekEnd }
        : acc,
    null,
  );

  const thisWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const bestLabel = best
    ? `${formatShort(best.weekStart)}–${formatShort(best.weekEnd)}`  // ✅ best уже не never
    : '';

  return {
    thisWeekCount: thisWeek?.workoutsCount ?? 0,
    eightWeekTotal,
    weeklyAverage,
    best,
    bestLabel,
  };
}, [data?.weeklyVolume]);                                   // ✅ optional chaining

  // ===== Loading state =====
  if (isPending) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Загрузка прогресса...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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

  // ===== Error state =====
  if (isError || !data) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {navHeader}
        <View style={commonStyles.center}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
            Не удалось загрузить
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
            Проверьте соединение и попробуйте снова
          </Text>
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
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        {navHeader}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
          <Text
            style={[
              typography.h4,
              { color: colors.textPrimary, marginTop: SPACING.md, textAlign: 'center' },
            ]}
          >
            Пока нет данных
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
            ]}
          >
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
  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {navHeader}
      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* L1: Stats cards */}
        <ProgressStatsCards
          totalWorkouts={data.totalWorkouts}
          totalVolume={data.totalVolume}
          currentStreak={data.currentStreak}
          bestStreak={data.bestStreak}
          colors={colors}
        />

        {/* L2: Volume trend (has own title internally) */}
        <View style={{ marginTop: SPACING.lg }}>
          <VolumeTrendChart weeklyVolume={data.weeklyVolume} />
        </View>

        {/* L2: Personal records */}
        {records.length > 0 && (
          <View style={{ marginTop: SPACING.xl }}>
            <PersonalRecordsCard records={records} colors={colors} />
          </View>
        )}

        {/* L3: Регулярность — density активности за 8 недель.
            Дубль ссылки на metrics удалён (PRODUCT.md §3: сценарий уже решён
            кнопкой «Замеры тела» в profile.tsx, 1 тап против 2). */}
        <View style={{ marginTop: SPACING.xl }}>
          <SectionHeader title="Регулярность" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.md,
              borderColor: colors.border,
              borderWidth: 1,
              paddingHorizontal: SPACING.md,
            }}
          >
            <RegularityRow
              icon={<Calendar size={18} color={colors.primary} strokeWidth={1.8} />}
              label="Эта неделя"
              value={`${regularity.thisWeekCount} тр.`}
              colors={colors}
            />
            <RegularityRow
              icon={<Target size={18} color={colors.primary} strokeWidth={1.8} />}
              label="За 8 недель"
              value={`${regularity.eightWeekTotal} тр.`}
              colors={colors}
            />
            <RegularityRow
              icon={<Activity size={18} color={colors.primary} strokeWidth={1.8} />}
              label="В среднем"
              value={`${regularity.weeklyAverage.toFixed(1)} тр./нед.`}
              colors={colors}
            />
            <RegularityRow
              icon={<Trophy size={18} color={colors.warning} strokeWidth={1.8} />}
              label="Лучшая неделя"
              value={
                regularity.best && regularity.best.count > 0
                  ? `${regularity.bestLabel} · ${regularity.best.count} тр.`
                  : '—'
              }
              colors={colors}
              last
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
