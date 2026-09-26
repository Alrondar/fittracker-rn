// src/components/workout/WorkoutListItemCard.tsx
// DA-P2-8: карточка тренировки в списке (вынесена из app/(tabs)/workouts.tsx).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ClipboardList, Check, Clock, SkipForward } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from '../ui/PressableScale';
import type { ForecastDifficulty } from '../../utils/workoutForecast';
import {
  getWorkoutStatus,
  formatDuration,
  forecastDifficultyColor,
  forecastDifficultyBorderColor,
  forecastDifficultyBg,
} from '../../utils/workoutsList';
import type { ActiveProgram, WorkoutSection } from '../../services/workoutsService';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { AppBadge } from '../ui/AppBadge';
import { getPhaseMeta, getPhaseColor } from '../../constants/phaseTypes';

interface WorkoutListItemCardProps {
  item: any;
  section: WorkoutSection;
  activeProgram: ActiveProgram | null;
  forecast: { difficulty: ForecastDifficulty } | null;
  onOpen: (id: string) => void;
  onSkipRequest: (target: { id: string; name: string }) => void;
  onForecastPress: () => void;
}

export const WorkoutListItemCard = React.memo(function WorkoutListItemCard({
  item,
  section,
  activeProgram,
  forecast,
  onOpen,
  onSkipRequest,
  onForecastPress,
}: WorkoutListItemCardProps) {
  const { colors } = useTheme();
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
    onSkipRequest({ id: item.id, name: item.name });
  };

  return (
    <PressableScale
      // UX-1 (audit-6): spring-scale строки списка тренировок.
      onPress={() => onOpen(item.id)}
      onLongPress={handleLongPress}
      delayLongPress={500}
      scaleTo={0.985}
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
                onForecastPress();
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
    </PressableScale>
  );
});
