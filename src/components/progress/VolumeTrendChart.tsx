// src/components/progress/VolumeTrendChart.tsx
// UX-11: недельный тренд объёма тренировок (последние 8 недель).
// Бары — простой и считываемый паттерн (как NutritionWeekCard);
// без chart-библиотек, только react-native-svg для подписей осей.
// Пустая неделя — приглушённый бар, активная — primary цвет.
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { WeeklyVolume } from '../../services/progressService';

const BAR_HEIGHT = 88;

/**
 * Форматирует дату понедельника в короткий лейбл оси X.
 * Пример: '16 сен' / '23 сен' / '30 сен' (локаль пользователя).
 */
function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Объём в компактном виде: 1234 → '1.2k', 450 → '450'. */
function formatVolume(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}

interface VolumeTrendChartProps {
  weeklyVolume: WeeklyVolume[];
}

export function VolumeTrendChart({ weeklyVolume }: VolumeTrendChartProps) {
  const { colors } = useTheme();

  const maxVolume = useMemo(
    () => Math.max(1, ...weeklyVolume.map((w) => w.volume)),
    [weeklyVolume],
  );

  const totalVolume = useMemo(
    () => weeklyVolume.reduce((acc, w) => acc + w.volume, 0),
    [weeklyVolume],
  );

  const totalWorkouts = useMemo(
    () => weeklyVolume.reduce((acc, w) => acc + w.workoutsCount, 0),
    [weeklyVolume],
  );

  if (weeklyVolume.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: SPACING.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
          <TrendingUp size={18} color={colors.primary} strokeWidth={2} />
          <Text
            style={[
              typography.h5,
              { color: colors.textPrimary, marginLeft: SPACING.sm, flex: 1 },
            ]}
          >
            Объём тренировок
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Нет данных за последние 8 недель
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: SPACING.lg,
      }}
    >
      {/* Заголовок + итог */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TrendingUp size={18} color={colors.primary} strokeWidth={2} />
          <Text
            style={[
              typography.h5,
              { color: colors.textPrimary, marginLeft: SPACING.sm, flex: 1 },
            ]}
          >
            Объём тренировок
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {totalWorkouts} тренировок · {formatVolume(totalVolume)} кг
        </Text>
      </View>

      {/* Бары (8 недель) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: SPACING.xs,
          height: BAR_HEIGHT,
          marginBottom: SPACING.xs,
        }}
      >
        {weeklyVolume.map((week) => {
          const hasData = week.volume > 0;
          const height = hasData
            ? Math.max(8, Math.round((week.volume / maxVolume) * BAR_HEIGHT))
            : 4;
          const barColor = hasData ? colors.primary : colors.surfaceSecondary;
          return (
            <View
              key={week.weekStart}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {hasData && (
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textTertiary, marginBottom: 2, fontSize: 9 },
                  ]}
                  numberOfLines={1}
                >
                  {formatVolume(week.volume)}
                </Text>
              )}
              <View
                style={{
                  width: '100%',
                  height,
                  borderRadius: 3,
                  backgroundColor: barColor,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Лейблы оси X (недели) */}
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {weeklyVolume.map((week, i) => (
          <Text
            key={week.weekStart}
            style={[
              typography.captionSmall,
              {
                color: colors.textTertiary,
                flex: 1,
                textAlign: 'center',
                fontSize: 9,
                opacity: i % 2 === 0 ? 1 : 0.6, // чередуем для читаемости при узких барах
              },
            ]}
            numberOfLines={1}
          >
            {formatWeekLabel(week.weekStart)}
          </Text>
        ))}
      </View>

      {/* Подпись диапазона */}
      <Text
        style={[
          typography.captionSmall,
          { color: colors.textTertiary, marginTop: SPACING.sm, textAlign: 'center' },
        ]}
      >
        Последние {weeklyVolume.length} недель
      </Text>
    </View>
  );
}
