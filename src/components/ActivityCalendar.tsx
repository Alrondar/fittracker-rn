import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';

interface ActivityCalendarProps {
  // Массив дат с тренировками (формат: 'YYYY-MM-DD')
  workoutDates: string[];
}

interface CalendarDay {
  date: string;
  dayName: string;
  hasWorkout: boolean;
  isToday: boolean;
}

const COLUMNS = 7;

export function ActivityCalendar({ workoutDates }: ActivityCalendarProps) {
  const { colors } = useTheme();
  const dates = workoutDates ?? [];

  // Последние 14 дней (2 ряда по 7)
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2);
      days.push({
        date: dateStr,
        dayName,
        hasWorkout: dates.includes(dateStr),
        isToday: i === 0,
      });
    }
    return days;
  }, [dates]);

  // Разбиваем на ряды по 7 — детерминированная геометрия без процентов и без схлопывания
  const rows = useMemo<CalendarDay[][]>(() => {
    const result: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += COLUMNS) {
      result.push(calendarDays.slice(i, i + COLUMNS));
    }
    return result;
  }, [calendarDays]);

  // Локальные стили через useMemo (дух правила «фабрики стилей не инлайн в цикле»);
  // цвета ТОЛЬКО из useTheme, отступы из SPACING, радиусы из BORDER_RADIUS.
  const cardStyle = useMemo(
    () => ({
      width: '100%' as const,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    }),
    [colors],
  );

  const rowStyle = useMemo(
    () => ({ flexDirection: 'row' as const, gap: SPACING.xs }),
    [],
  );

  const columnStyle = useMemo(() => ({ gap: SPACING.xs }), []);

  return (
    <View style={cardStyle}>
      <View style={columnStyle}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={rowStyle}>
            {row.map((day) => (
              <DayCell key={day.date} day={day} colors={colors} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

interface DayCellProps {
  day: CalendarDay;
  colors: any;
}

function DayCell({ day, colors }: DayCellProps) {
  const cellStyle = useMemo(
    () => ({
      flex: 1,                 // 7 ячеек делят ряд ровно — без процентов и переполнения
      aspectRatio: 1,          // стабильная высота → блок НЕ схлопывается в линию
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: day.hasWorkout ? colors.primary : colors.surfaceSecondary,
      borderWidth: day.isToday ? 2 : 0,
      borderColor: day.isToday ? colors.primary : 'transparent',
    }),
    [day.hasWorkout, day.isToday, colors],
  );

  return (
    <View style={cellStyle}>
      <Text
        style={[
          typography.label,
          {
            color: day.hasWorkout || day.isToday ? colors.textInverse : colors.textSecondary,
            textAlign: 'center',
          },
        ]}
        numberOfLines={1}
      >
        {day.dayName}
      </Text>
    </View>
  );
}