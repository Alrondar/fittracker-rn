import { useCallback, useState, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl } from 'react-native';
import { feedback } from '../../src/lib/feedback';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Dumbbell, ArrowRight, SlidersHorizontal } from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { useWorkoutForecast } from '../../src/hooks/useWorkoutForecast';
import { WorkoutForecastSheet } from '../../src/components/dashboard/WorkoutForecastSheet';
import type { WorkoutSection } from '../../src/services/workoutsService';
import { ListSkeleton } from '../../src/components/Skeleton';
import { LoadingChip } from '../../src/components/ui/LoadingChip';
import { mapError } from '../../src/utils/errorMapper';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { getPhaseMeta, getPhaseColor } from '../../src/constants/phaseTypes';
import { getWorkoutStatus } from '../../src/utils/workoutsList';
import type { FilterMode } from '../../src/utils/workoutsList';
import { WorkoutListItemCard } from '../../src/components/workout/WorkoutListItemCard';
import { ActiveProgramHeaderCard } from '../../src/components/workout/ActiveProgramHeaderCard';
import { WorkoutsFilterSheet } from '../../src/components/workout/WorkoutsFilterSheet';
import { SkipWorkoutSheet } from '../../src/components/workout/SkipWorkoutSheet';
import { WebRefreshButton } from '../../src/components/ui/WebRefreshButton';

// DA-P2-8: карточка элемента, шапка программы, sheet-ы и хелперы вынесены
// в src/components/workout/* и src/utils/workoutsList.ts (было 726 строк).

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
  const { data, isPending, isFetching, refetch, skip } = useWorkouts(userId);
  const activeProgram = data?.activeProgram ?? null;
  const sections = useMemo(() => data?.sections ?? [], [data]);
  const progress = useMemo(() => data?.progress ?? { completed: 0, total: 0 }, [data]);
  const loading = isPending;
  const refreshing = isFetching && !isPending;

  // UX-5 Feature 2: skip workout
  const [skipTarget, setSkipTarget] = useState<{ id: string; name: string } | null>(null);
  const [skipping, setSkipping] = useState(false);

  // Фича 7: Next Workout Forecast (L1 badge в Sticky-карточке, L2 sheet).
  const { result: forecast } = useWorkoutForecast(userId);
  const [forecastSheetOpen, setForecastSheetOpen] = useState(false);

  // Фильтрация: Предстоящие / Эта неделя / Все
  const [filterMode, setFilterMode] = useState<FilterMode>('upcoming');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Границы текущей календарной недели (пн–вс)
  const getCurrentWeekBounds = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, []);

  // Фильтрация секций
  const filteredSections = useMemo(() => {
    if (filterMode === 'all') return sections;

    if (filterMode === 'this_week') {
      const { monday, sunday } = getCurrentWeekBounds;
      return sections
        .map((section) => ({
          ...section,
          data: section.data.filter((item) => {
            const effectiveDate = new Date(item.finished_at || item.started_at || item.created_at);
            return effectiveDate >= monday && effectiveDate <= sunday;
          }),
        }))
        .filter((section) => section.data.length > 0);
    }

    // 'upcoming' (дефолт): предстоящие не пропадают, пока не skipped/finished
    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter((item) => {
          const status = getWorkoutStatus(item, activeProgram);
          return status === 'next' || status === 'in_progress' || status === 'upcoming';
        }),
      }))
      .filter((section) => section.data.length > 0);
  }, [sections, activeProgram, filterMode, getCurrentWeekBounds]);

  // FZ-9 (аудит 28.09): refetch-на-каждый-фокус убран — он насылал волну
  // ре-рендеров сразу после таб-анимации. Свежесть теперь обеспечивают:
  // инвалидации финиша/скипа (queryInvalidation, BUG-1/2), мутаций программ
  // (usePrograms) и pull-to-refresh ниже; staleTime 5 мин до сих пор действует.

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  // FZ-9: стабильный обработчик — inline-стрелка ломала React.memo карточек.
  const handleForecastPress = useCallback(() => setForecastSheetOpen(true), []);

  const navigateToWorkout = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/workout/${id}`);
    },
    [router]
  );

  const handleSkipRequest = useCallback((target: { id: string; name: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSkipTarget(target);
  }, []);

  // UX-5 Feature 2: пропуск тренировки (sequential + retry, паттерн saveWorkout)
  const handleSkip = useCallback(async () => {
    if (!skipTarget || !activeProgram) return;
    setSkipping(true);
    try {
      await skip(skipTarget.id, activeProgram.programId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSkipTarget(null);
    } catch (error: any) {
      // CTR-2 (аудит 28.09): mapError вместо сырого Postgres/RLS message.
      feedback.alert('Не удалось пропустить', mapError(error), [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Повторить', onPress: () => handleSkip() },
      ]);
    } finally {
      setSkipping(false);
    }
  }, [skipTarget, activeProgram, skip]);

  // ===== Заголовок секции (фаза + неделя) =====
  const renderSectionHeader = useCallback(
    ({ section }: { section: WorkoutSection }) => {
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
    },
    [colors]
  );

  const renderWorkoutItem = useCallback(
    ({ item, section }: { item: any; section: WorkoutSection }) => (
      <WorkoutListItemCard
        item={item}
        section={section}
        activeProgram={activeProgram}
        forecast={forecast}
        onOpen={navigateToWorkout}
        onSkipRequest={handleSkipRequest}
        onForecastPress={handleForecastPress}
      />
    ),
    [activeProgram, forecast, navigateToWorkout, handleSkipRequest, handleForecastPress]
  );

  const renderEmpty = () => {
    const isUpcomingEmpty =
      filterMode === 'upcoming' && sections.length > 0 && filteredSections.length === 0;
    const isThisWeekEmpty =
      filterMode === 'this_week' && sections.length > 0 && filteredSections.length === 0;

    return (
      <FadeIn delay={200} style={commonStyles.emptyContainer}>
        <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
          {isUpcomingEmpty
            ? 'Нет предстоящих тренировок'
            : isThisWeekEmpty
              ? 'На этой неделе нет тренировок'
              : 'Нет тренировок'}
        </Text>
        <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
          {isUpcomingEmpty
            ? 'Все тренировки уже завершены или пропущены. Переключитесь на «Все» или «Эта неделя», чтобы увидеть историю.'
            : isThisWeekEmpty
              ? 'В текущей календарной неделе (пн–вс) нет запланированных или завершённых тренировок.'
              : activeProgram
                ? `Для программы "${activeProgram.name}" ещё нет тренировок.`
                : 'Активируйте программу, чтобы увидеть список тренировок.'}
        </Text>
        {!activeProgram && (
          <PressableScale
            onPress={() => router.push('/(tabs)/programs')}
            accessibilityRole="button"
            accessibilityLabel="Перейти к каталогу программ"
            style={{
              marginTop: SPACING.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              backgroundColor: colors.primary,
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.md,
              borderRadius: BORDER_RADIUS.lg,
            }}
          >
            <Text style={[typography.labelBold, { color: colors.textInverse }]}>
              Перейти к программам
            </Text>
            <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />
          </PressableScale>
        )}
        {(isUpcomingEmpty || isThisWeekEmpty) && (
          <PressableScale
            onPress={() => setFilterMode('all')}
            accessibilityRole="button"
            accessibilityLabel="Показать все тренировки"
            style={{
              marginTop: SPACING.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
            }}
          >
            <Text style={[typography.labelBold, { color: colors.primary }]}>
              Показать все тренировки
            </Text>
          </PressableScale>
        )}
      </FadeIn>
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: '700' }]}>
            Тренировки
          </Text>
          {/* WEB-BUG-4: веб-замена pull-to-refresh. */}
          <WebRefreshButton onPress={onRefresh} refreshing={refreshing} />
        </View>
        {activeProgram && (
          <PressableScale
            onPress={() => setFilterSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть фильтр тренировок"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACING.xs,
              paddingHorizontal: SPACING.sm,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.md,
              backgroundColor: colors.surfaceSecondary,
            }}
          >
            <SlidersHorizontal size={18} color={colors.textSecondary} />
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
              {filterMode === 'upcoming'
                ? 'Предстоящие'
                : filterMode === 'this_week'
                  ? 'Эта неделя'
                  : 'Все'}
            </Text>
          </PressableScale>
        )}
      </View>
      {loading ? (
        <>
          <ListSkeleton count={4} />
          {/* PERF-11: явный признак идущей загрузки поверх макета. */}
          <LoadingChip />
        </>
      ) : (
        <>
          {activeProgram && (
            <ActiveProgramHeaderCard activeProgram={activeProgram} progress={progress} />
          )}

          <View style={{ flex: 1 }}>
            <SectionList
              sections={filteredSections}
              keyExtractor={(item) => item.id}
              renderItem={renderWorkoutItem}
              renderSectionHeader={renderSectionHeader}
              ListEmptyComponent={renderEmpty()}
              contentContainerStyle={{ paddingBottom: 100 }}
              stickySectionHeadersEnabled={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            />
          </View>

          {/* Фича 7: L2 sheet с разбивкой прогноза по упражнениям */}
          <WorkoutForecastSheet
            visible={forecastSheetOpen}
            onClose={() => setForecastSheetOpen(false)}
            result={forecast}
          />

          <WorkoutsFilterSheet
            visible={filterSheetOpen}
            filterMode={filterMode}
            onSelect={setFilterMode}
            onClose={() => setFilterSheetOpen(false)}
          />
        </>
      )}

      {/* UX-5 Feature 2: skip workout — bottom sheet с подтверждением */}
      <SkipWorkoutSheet
        target={skipTarget}
        skipping={skipping}
        onConfirm={handleSkip}
        onCancel={() => !skipping && setSkipTarget(null)}
      />
    </SafeAreaView>
  );
}
