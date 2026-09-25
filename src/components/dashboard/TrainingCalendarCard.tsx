// app/(tabs)/index.tsx split (DA-P2-8): карточка «Календарь тренировок» —
// статистика за месяц + компактный календарь на последние 2 недели.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useWeightDisplay } from '../../hooks/useUnitPreferences';
import { SPACING, scale, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import type { HistoryWorkout, MonthlyStats } from '../../services/historyService';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;

interface Props {
  workouts: HistoryWorkout[];
  monthlyStats: MonthlyStats;
  onDayPress: (dateKey: string) => void;
}

export function TrainingCalendarCard({ workouts, monthlyStats, onDayPress }: Props) {
  const { colors } = useTheme();
  // VF-8: объёмы за месяц — в выбранных единицах (хранение — кг; «т» оставлена
  // только для kg, для lb — k-нотация)
  const { unit, unitLabel, kgToUnit } = useWeightDisplay();

  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach((w) => set.add(dayKey(new Date(w.date))));
    return set;
  }, [workouts]);

  // Компактный календарь Dashboard: последние 2 недели.
  const lastTwoWeeks = useMemo(() => {
    const mondayThisWeek = new Date();
    const dow = mondayThisWeek.getDay();
    mondayThisWeek.setDate(mondayThisWeek.getDate() + (dow === 0 ? -6 : 1 - dow));
    const start = new Date(mondayThisWeek);
    start.setDate(start.getDate() - 7);
    const days: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  return (
    <AppCard variant="default">
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.md }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {monthlyStats.totalWorkouts}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>за месяц</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {(kgToUnit(monthlyStats.totalVolume) / 1000).toFixed(1)}
            {unit === 'kg' ? 'т' : 'k'}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            объём, {unitLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {Math.round(kgToUnit(monthlyStats.bestWorkout))}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            лучшая, {unitLabel}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: SPACING.xs }}>
        {WEEKDAY_LABELS.map((label) => (
          <Text
            key={label}
            style={[
              typography.captionSmall,
              { color: colors.textTertiary, flex: 1, textAlign: 'center' },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {lastTwoWeeks.map((date) => {
          const key = dayKey(date);
          const hasWorkout = workoutDates.has(key);
          const isToday = key === dayKey(new Date());
          return (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}${hasWorkout ? ', тренировка выполнена' : ''}`}
              accessibilityState={{ disabled: !hasWorkout, selected: isToday }}
              disabled={!hasWorkout}
              onPress={() => onDayPress(key)}
              style={{
                width: `${100 / 7}%`,
                alignItems: 'center',
                paddingVertical: SPACING.xs,
              }}
            >
              <View
                style={{
                  width: scale(30),
                  height: scale(30),
                  borderRadius: scale(15),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: hasWorkout ? withAlpha(colors.primary, 0.13) : 'transparent',
                  borderWidth: isToday ? 1 : 0,
                  borderColor: isToday ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: hasWorkout ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 2,
                  backgroundColor: hasWorkout ? colors.success : 'transparent',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </AppCard>
  );
}
