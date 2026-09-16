import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ClipboardList,
  Dumbbell,
  Check,
  Clock,
  SkipForward,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { useWorkoutForecast } from '../../src/hooks/useWorkoutForecast';
import { WorkoutForecastSheet } from '../../src/components/dashboard/WorkoutForecastSheet';
import type { ForecastDifficulty } from '../../src/utils/workoutForecast';
import type { ActiveProgram, WorkoutSection } from '../../src/services/workoutsService';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { SheetShell } from '../../src/components/ui/SheetShell';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { getPhaseMeta, getPhaseColor } from '../../src/constants/phaseTypes';

type WorkoutStatus = 'completed' | 'skipped' | 'next' | 'in_progress' | 'upcoming';
type FilterMode = 'upcoming' | 'all' | 'this_week';

// Фича 7: цветовые хелперы для L1-прогноз-бейджа в Sticky-карточке.
function forecastDifficultyColor(d: ForecastDifficulty, colors: any): string {
  if (d === 'hard') return colors.warning;
  if (d === 'easy') return colors.success;
  return colors.textSecondary;
}
function forecastDifficultyBorderColor(d: ForecastDifficulty, colors: any): string {
  const base = forecastDifficultyColor(d, colors);
  return withAlpha(base, 0.53);
}
function forecastDifficultyBg(d: ForecastDifficulty, colors: any): string {
  const base = forecastDifficultyColor(d, colors);
  return withAlpha(base, 0.1);
}

function getWorkoutStatus(w: any, activeProgram: ActiveProgram | null): WorkoutStatus {
  // UX-5 Feature 2: пропуск — отдельный статус (skipped_at заполнен)
  if (w.skipped_at) return 'skipped';
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
  const { data, isPending, isFetching, refetch, skip } = useWorkouts(userId);
  const activeProgram = data?.activeProgram ?? null;
  const sections = data?.sections ?? [];
  const progress = data?.progress ?? { completed: 0, total: 0 };
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

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
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
    [router]
  );

  // UX-5 Feature 2: пропуск тренировки (sequential + retry, паттерн saveWorkout)
  const handleSkip = useCallback(async () => {
    if (!skipTarget || !activeProgram) return;
    setSkipping(true);
    try {
      await skip(skipTarget.id, activeProgram.programId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSkipTarget(null);
    } catch (error: any) {
      Alert.alert('Не удалось пропустить', error?.message || 'Попробуйте ещё раз', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Повторить', onPress: () => handleSkip() },
      ]);
    } finally {
      setSkipping(false);
    }
  }, [skipTarget, activeProgram, skip]);

  // ===== Шапка: прогресс программы + «Следующая» =====
  const renderHeader = useCallback(() => {
    if (!activeProgram) return null;
    const currentPhaseObj = activeProgram.phases.find(
      (p: any) => p.phase_number === activeProgram.currentPhase
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
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 4 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: withAlpha(phaseColor, 0.09),
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
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, marginTop: SPACING.xs },
              ]}
            >
              Выполнено {progress.completed} из {progress.total} тренировок
            </Text>
          </View>
        </AppCard>
      </View>
    );
  }, [activeProgram, progress, colors]);

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

  // ===== Карточка тренировки (со статусом) =====
  const renderWorkoutItem = useCallback(
    ({ item, section }: { item: any; section: WorkoutSection }) => {
      const status = getWorkoutStatus(item, activeProgram);
      const isNext = status === 'next';
      const phaseColor = getPhaseColor(section.phaseType, colors);
      const phaseMeta = getPhaseMeta(section.phaseType);
      const PhaseIcon = phaseMeta.icon;

      // FIT-8: effective date (finished_at ?? started_at ?? created_at)
      const effectiveDate = item.finished_at || item.started_at || item.created_at;
      const dateStr = new Date(effectiveDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      });

      const borderColor =
        status === 'next'
          ? colors.primary
          : status === 'in_progress'
            ? colors.warning
            : status === 'completed'
              ? withAlpha(colors.success, 0.38)
              : colors.border;

      // UX-5 Feature 2: long press только для «Следующая» (скоуп подтверждён)
      const handleLongPress = () => {
        if (status !== 'next') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSkipTarget({ id: item.id, name: item.name });
      };

      return (
        <TouchableOpacity
          onPress={() => navigateToWorkout(item.id)}
          onLongPress={handleLongPress}
          delayLongPress={500}
          activeOpacity={0.85}
          disabled={status === 'skipped'}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${status === 'completed' ? 'выполнена' : isNext ? 'следующая' : status === 'in_progress' ? 'в процессе' : status === 'skipped' ? 'пропущена' : 'предстоит'}`}
          style={{ marginHorizontal: SPACING.lg }}
        >
          <AppCard
            variant="compact"
            style={{
              borderColor,
              borderWidth: isNext ? 1.5 : 1,
              backgroundColor: isNext ? withAlpha(colors.primary, 0.06) : undefined,
              opacity: status === 'upcoming' ? 0.7 : status === 'skipped' ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
              <AppBadge
                variant="default"
                size="small"
                icon={<PhaseIcon size={12} color={phaseColor} strokeWidth={2} />}
                style={{ backgroundColor: withAlpha(phaseColor, 0.09) }}
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
              {isNext && (
                <AppBadge variant="primary" size="small">
                  Следующая
                </AppBadge>
              )}
              {isNext && forecast && forecast.difficulty !== 'unknown' && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setForecastSheetOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Прогноз: ${forecast.difficulty}, открой подробности`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 4,
                    borderRadius: BORDER_RADIUS.full,
                    borderWidth: 1,
                    borderColor: forecastDifficultyBorderColor(forecast.difficulty, colors),
                    backgroundColor: forecastDifficultyBg(forecast.difficulty, colors),
                  }}
                >
                  <Text
                    style={[
                      typography.captionSmall,
                      {
                        color: forecastDifficultyColor(forecast.difficulty, colors),
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {forecast.difficulty === 'hard'
                      ? 'Тяжёлая'
                      : forecast.difficulty === 'easy'
                        ? 'Лёгкая'
                        : 'Обычная'}
                  </Text>
                </TouchableOpacity>
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
              {status === 'skipped' && (
                <AppBadge
                  variant="default"
                  size="small"
                  icon={<SkipForward size={12} color={colors.textSecondary} strokeWidth={2} />}
                >
                  Пропущена
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
              {status === 'completed' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {item.duration_seconds ? (
                    <>
                      <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {formatDuration(item.duration_seconds)}
                      </Text>
                    </>
                  ) : null}
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {item.duration_seconds ? `· ${dateStr}` : dateStr}
                  </Text>
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{dateStr}</Text>
              )}
              {(status === 'next' || status === 'in_progress') && (
                <Text style={[typography.labelBold, { color: colors.primary }]}>
                  {status === 'in_progress' ? 'Продолжить →' : 'Начать →'}
                </Text>
              )}
            </View>
          </AppCard>
        </TouchableOpacity>
      );
    },
    [activeProgram, colors, navigateToWorkout]
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
          <TouchableOpacity
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
          </TouchableOpacity>
        )}
        {(isUpcomingEmpty || isThisWeekEmpty) && (
          <TouchableOpacity
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
          </TouchableOpacity>
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
        <View>
          <Text style={[typography.h3, { color: colors.textPrimary, fontWeight: '700' }]}>
            Тренировки
          </Text>
        </View>
        {activeProgram && (
          <TouchableOpacity
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
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <>
          {renderHeader()}

          <View style={{ flex: 1 }}>
            <SectionList
              sections={filteredSections}
              keyExtractor={(item) => item.id}
              renderItem={renderWorkoutItem}
              renderSectionHeader={renderSectionHeader}
              ListEmptyComponent={renderEmpty}
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

          {/* SheetShell для фильтрации */}
          <SheetShell
            visible={filterSheetOpen}
            title="Фильтр тренировок"
            onClose={() => setFilterSheetOpen(false)}
          >
            <View style={{ gap: SPACING.sm }}>
              {(['upcoming', 'this_week', 'all'] as FilterMode[]).map((mode) => {
                const isActive = filterMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => {
                      setFilterMode(mode);
                      setFilterSheetOpen(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Выбрать фильтр: ${mode === 'upcoming' ? 'Предстоящие' : mode === 'this_week' ? 'Эта неделя' : 'Все тренировки'}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: SPACING.md,
                      paddingHorizontal: SPACING.md,
                      borderRadius: BORDER_RADIUS.md,
                      backgroundColor: isActive ? withAlpha(colors.primary, 0.1) : 'transparent',
                    }}
                  >
                    <Text
                      style={[
                        typography.body,
                        {
                          color: isActive ? colors.primary : colors.textPrimary,
                          fontWeight: isActive ? '600' : '400',
                        },
                      ]}
                    >
                      {mode === 'upcoming'
                        ? 'Предстоящие (без завершённых)'
                        : mode === 'this_week'
                          ? 'Эта неделя (с завершёнными)'
                          : 'Все тренировки'}
                    </Text>
                    {isActive && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SheetShell>
        </>
      )}

      {/* UX-5 Feature 2: skip workout — bottom sheet с подтверждением */}
      <SheetShell
        visible={!!skipTarget}
        title="Пропустить тренировку?"
        onClose={() => !skipping && setSkipTarget(null)}
      >
        {skipTarget && (
          <>
            <Text
              style={[
                typography.body,
                { color: colors.textPrimary, fontWeight: '600', marginBottom: SPACING.xs },
              ]}
            >
              {skipTarget.name}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: colors.textSecondary, lineHeight: 18, marginBottom: SPACING.lg },
              ]}
            >
              Программа перейдёт к следующему дню. Подходы не будут записаны. Это действие нельзя
              отменить.
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={skipping}
              accessibilityRole="button"
              accessibilityLabel="Подтвердить пропуск тренировки"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.sm,
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.lg,
                backgroundColor: colors.warning,
                marginBottom: SPACING.sm,
              }}
            >
              {skipping ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <SkipForward size={18} color={colors.textInverse} strokeWidth={2} />
                  <Text style={[typography.button, { color: colors.textInverse }]}>
                    Пропустить тренировку
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSkipTarget(null)}
              disabled={skipping}
              accessibilityRole="button"
              accessibilityLabel="Отменить пропуск"
              style={{
                alignItems: 'center',
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.lg,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Text style={[typography.button, { color: colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
          </>
        )}
      </SheetShell>
    </SafeAreaView>
  );
}
