// src/components/progress/RecentWorkouts.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, ChevronRight, Clock, Dumbbell, Flame, Target } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { HistoryWorkout } from '../../services/historyService';

interface RecentWorkoutsProps {
  workouts: HistoryWorkout[];
  onPress: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}

/**
 * Возвращает пару цветов для градиента.
 * Детерминированно-случайная на основе ID, но приоритет у семантики RPE.
 * Прозрачность ограничена (05–25), чтобы текст оставался читаемым.
 */
function getGradientColors(id: string, avgRpe: number | null, colors: any): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 4;

  // Градиент между двумя цветами (не к прозрачному) — карточка выразительная,
  // но текст остаётся читаемым за счёт умеренной прозрачности.
  if (avgRpe != null) {
    if (avgRpe >= 9) return [colors.error + '35', colors.warning + '20'];
    if (avgRpe >= 7) return [colors.warning + '35', colors.primary + '20'];
    return [colors.success + '35', colors.primary + '20'];
  }

  const palettes: [string, string][] = [
    [colors.primary + '35', colors.success + '20'],
    [colors.success + '35', colors.warning + '20'],
    [colors.warning + '35', colors.error + '20'],
    [colors.primary + '30', colors.textSecondary + '15'],
  ];
  return palettes[index];
}

export function RecentWorkouts({ workouts, onPress }: RecentWorkoutsProps) {
  const { colors } = useTheme();
  const recent = workouts.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <View style={{ marginBottom: SPACING.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Dumbbell size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            Последние тренировки
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Нажми, чтобы посмотреть детали
          </Text>
        </View>
      </View>

      {recent.map((workout) => {
        const duration = formatDuration(workout.duration_seconds);
        const [colorStart, colorEnd] = getGradientColors(workout.id, workout.avg_rpe, colors);
        const rpeColor = workout.avg_rpe != null 
          ? (workout.avg_rpe >= 9 ? colors.error : workout.avg_rpe >= 7 ? colors.warning : colors.success)
          : colors.primary;

        return (
          <TouchableOpacity
            key={workout.id}
            activeOpacity={0.8}
            onPress={() => onPress(workout.id)}
            style={{
              borderRadius: BORDER_RADIUS.lg,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: SPACING.sm,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[colorStart, colorEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: SPACING.md }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 4 }]}
                  >
                    {workout.name}
                  </Text>
                  
                  {workout.program_name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs }}>
                      <Target size={12} color={colors.textSecondary} />
                      <Text
                        numberOfLines={1}
                        style={[typography.caption, { color: colors.textSecondary, fontWeight: '500' }]}
                      >
                        {workout.program_name}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' }}>
                    <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                      {formatDate(workout.date)}
                    </Text>
                    {duration ? (
                      <>
                        <Dot />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} color={colors.textTertiary} />
                          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                            {duration}
                          </Text>
                        </View>
                      </>
                    ) : null}
                    <Dot />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Activity size={11} color={colors.textTertiary} />
                      <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                        {formatVolume(workout.volume)} кг
                      </Text>
                    </View>
                    <Dot />
                    <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                      {workout.sets} подх.
                    </Text>
                    {workout.avg_rpe != null && (
                      <>
                        <Dot />
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            paddingHorizontal: SPACING.xs,
                            paddingVertical: 1,
                            borderRadius: BORDER_RADIUS.sm,
                            backgroundColor: colors.surface + '80',
                          }}
                        >
                          <Flame size={11} color={rpeColor} />
                          <Text style={[typography.captionSmall, { color: rpeColor, fontWeight: '600' }]}>
                            RPE {workout.avg_rpe.toFixed(1)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: SPACING.sm }} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Dot() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.textTertiary,
        opacity: 0.5,
      }}
    />
  );
}