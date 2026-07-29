import { useCallback } from 'react';
import { View, Text, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ClipboardList, Dumbbell, Check, Clock } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import type { ActiveProgram, WorkoutSection } from '../../src/services/workoutsService';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { getPhaseMeta, getPhaseColor } from '../../src/constants/phaseTypes';

type WorkoutStatus = 'completed' | 'next' | 'in_progress' | 'upcoming';

function getWorkoutStatus(w: any, activeProgram: ActiveProgram | null): WorkoutStatus {
  if (w.finished_at) return 'completed';
  if (
    activeProgram &&
    w.phase_number === activeProgram.currentPhase &&
    w.week_number === activeProgram.currentWeek &&
    w.day_index === activeProgram.currentDay
  ) {
    return 'next';
  }
  if (w.started_at) return 'in_progress';
  return 'upcoming';
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} мин`;
}

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
  const { data, isPending, isFetching, refetch } = useWorkouts(userId);
  const activeProgram = data?.activeProgram ?? null;
  const sections = data?.sections ?? [];
  const progress = data?.progress ?? { completed: 0, total: 0 };
  const loading = isPending;
  const refreshing = isFetching && !isPending;

  // Обновляем список при КАЖДОМ возврате на вкладку
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const navigateToWorkout = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/workout/${id}`);
    },
    [router],
  );

  // ===== Шапка: прогресс программы =====
  const renderHeader = () => {
    if (!activeProgram) return null;
    const currentPhaseObj = activeProgram.phases.find(
      (p: any) => p.phase_number === activeProgram.currentPhase,
    );
    const phaseColor = currentPhaseObj
      ? getPhaseColor(currentPhaseObj.phase_type, colors)
      : colors.primary;
    const phaseMeta = currentPhaseObj ? getPhaseMeta(currentPhaseObj.phase_type) : null;
    const PhaseIcon = phaseMeta?.icon;
    const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    return (
      <View style={{ padding: SPACING.lg, paddingBottom: 0 }}>
        <AppCard variant="default">
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            {activeProgram.name}
          </Text>
          {currentPhaseObj && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: phaseColor + '18',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 2,
                  borderRadius: BORDER_RADIUS.sm,
                }}
              >
                {PhaseIcon && <PhaseIcon size={12} color={phaseColor} strokeWidth={2} />}
                <Text style={[typography.captionSmall, { color: phaseColor, fontWeight: '700' }]}>
                  {currentPhaseObj.name}
                </Text>
              </View>
              <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                Фаза {activeProgram.currentPhase}/{activeProgram.phases.length} · Неделя{' '}
                {activeProgram.currentWeek}
              </Text>
            </View>
          )}
          <View style={{ marginTop: SPACING.md }}>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.surfaceSecondary,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  backgroundColor: phaseColor,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
              Выполнено {progress.completed} из {progress.total} тренировок
            </Text>
          </View>
        </AppCard>
      </View>
    );
  };

  // ===== Заголовок секции (фаза + неделя) =====
  const renderSectionHeader = ({ section }: { section: WorkoutSection }) => {
    const phaseMeta = getPhaseMeta(section.phaseType);
    const phaseColor = getPhaseColor(section.phaseType, colors);
    const PhaseIcon = phaseMeta.icon;
    return (
      <SectionHeader
        title={section.phaseName}
        subtitle={`Фаза ${section.phaseNumber} · Неделя ${section.weekNumber}`}
        icon={<PhaseIcon size={16} color={phaseColor} strokeWidth={2} />}
        color={phaseColor}
        count={section.data.length}
      />
    );
  };

  // ===== Карточка тренировки (со статусом) =====
  const renderWorkoutItem = ({ item, section }: { item: any; section: WorkoutSection }) => {
    const status = getWorkoutStatus(item, activeProgram);
    const phaseColor = getPhaseColor(section.phaseType, colors);
    const phaseMeta = getPhaseMeta(section.phaseType);
    const PhaseIcon = phaseMeta.icon;
    const borderColor =
      status === 'next'
        ? colors.primary
        : status === 'in_progress'
          ? colors.warning
          : status === 'completed'
            ? colors.success + '60'
            : colors.border;
    return (
      <FadeIn>
        <TouchableOpacity onPress={() => navigateToWorkout(item.id)} activeOpacity={0.85}>
          <AppCard
            variant="compact"
            style={{
              borderColor,
              borderWidth: status === 'next' ? 1.5 : 1,
              opacity: status === 'upcoming' ? 0.7 : 1,
              marginHorizontal: SPACING.lg,
            }}
          >
            <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
              <AppBadge
                variant="default"
                size="small"
                icon={<PhaseIcon size={12} color={phaseColor} strokeWidth={2} />}
                style={{ backgroundColor: phaseColor + '18' }}
                textStyle={{ color: phaseColor }}
              >
                {section.phaseName}
              </AppBadge>
              <AppBadge
                variant="primary"
                size="small"
                icon={<ClipboardList size={12} color={colors.primary} strokeWidth={2} />}
              >
                Нед {item.week_number}, День {item.day_index}
              </AppBadge>
              {status === 'next' && (
                <AppBadge variant="primary" size="small">
                  Следующая
                </AppBadge>
              )}
              {status === 'completed' && (
                <AppBadge
                  variant="success"
                  size="small"
                  icon={<Check size={12} color={colors.success} strokeWidth={2} />}
                >
                  Выполнена
                </AppBadge>
              )}
              {status === 'in_progress' && (
                <AppBadge variant="warning" size="small">
                  В процессе
                </AppBadge>
              )}
            </View>
            <Text
              style={[typography.h5, { color: colors.textPrimary, marginTop: SPACING.xs }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: SPACING.md,
              }}
            >
              {status === 'completed' && item.duration_seconds ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDuration(item.duration_seconds)}
                  </Text>
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {new Date(item.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              )}
              {(status === 'next' || status === 'in_progress') && (
                <Text style={[typography.labelBold, { color: colors.primary }]}>
                  {status === 'in_progress' ? 'Продолжить →' : 'Начать →'}
                </Text>
              )}
            </View>
          </AppCard>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>Нет тренировок</Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        {activeProgram
          ? `Для программы "${activeProgram.name}" ещё нет тренировок.`
          : 'Активируйте программу, чтобы увидеть список тренировок.'}
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>Тренировки</Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          {activeProgram?.name || 'Нет активной программы'}
        </Text>
      </View>
      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: 100 }}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}