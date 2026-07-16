import React from 'react';
import { View, Text } from 'react-native';
import { createDashboardStyles } from '../styles/components/dashboard';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../constants/theme';
import { typography } from '../styles/typography';

interface ActivityCalendarProps {
  // Массив дат с тренировками (формат: 'YYYY-MM-DD')
  workoutDates: string[];
}

export function ActivityCalendar({ workoutDates }: ActivityCalendarProps) {
  const { colors } = useTheme();
  const styles = createDashboardStyles(colors);

  // Генерируем последние 14 дней
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2);
      const hasWorkout = workoutDates.includes(dateStr);
      
      days.push({
        date: dateStr,
        dayName,
        hasWorkout,
        isToday: i === 0,
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <View style={styles.calendarCard}>
      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
        Активность за 2 недели
      </Text>
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <View
            key={index}
            style={[
              styles.calendarDay,
              day.hasWorkout ? styles.calendarDayActive : styles.calendarDayEmpty,
              day.isToday && { borderWidth: 2, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.calendarDayLabel, { color: day.hasWorkout || day.isToday ? '#fff' : colors.textSecondary }]}>
              {day.dayName}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}