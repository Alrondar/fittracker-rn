// src/components/dashboard/NutritionWeekTable.tsx
// AUDIT-1: страница 2 карточки питания — таблица КБЖУ + вода за 7 дней.
// Монтируется lazy (только после первого свайпа) — performance gate §8.
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING } from '../../constants/theme';
import { MACRO_COLORS } from '../../constants/semanticColors';
import { useWeeklyNutrition } from '../../hooks/useWeeklyNutrition';

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface NutritionWeekTableProps {
  userId: string | null;
}

export function NutritionWeekTable({ userId }: NutritionWeekTableProps) {
  const { colors } = useTheme();
  const { data: days, isPending } = useWeeklyNutrition(userId);

  if (isPending || !days) {
    return (
      <View style={{ height: 280, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const logged = days.filter((d) => d.hasLogs);
  if (logged.length === 0) {
    return (
      <View style={{ height: 280, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg }}>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
          Пока нет данных за неделю — добавь первый приём пищи.
        </Text>
      </View>
    );
  }

  const avgCalories = Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);

  return (
    <View>
      <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
        Неделя питания
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: SPACING.xs }}>
        <Text style={[typography.captionSmall, { color: colors.textTertiary, flex: 1.2 }]}>День</Text>
        <Text style={[typography.captionSmall, { color: MACRO_COLORS.calories, flex: 1, textAlign: 'right' }]}>ккал</Text>
        <Text style={[typography.captionSmall, { color: MACRO_COLORS.proteins, flex: 0.7, textAlign: 'right' }]}>Б</Text>
        <Text style={[typography.captionSmall, { color: MACRO_COLORS.fats, flex: 0.7, textAlign: 'right' }]}>Ж</Text>
        <Text style={[typography.captionSmall, { color: MACRO_COLORS.carbs, flex: 0.7, textAlign: 'right' }]}>У</Text>
        <Text style={[typography.captionSmall, { color: MACRO_COLORS.water, flex: 0.9, textAlign: 'right' }]}>Вода, л</Text>
      </View>
      {days.map((d) => {
        const date = new Date(d.date);
        const valueColor = d.hasLogs ? colors.textPrimary : colors.textTertiary;
        return (
          <View key={d.date} style={{ flexDirection: 'row', paddingVertical: 3 }}>
            <Text style={[typography.captionSmall, { color: d.hasLogs ? colors.textSecondary : colors.textTertiary, flex: 1.2 }]}>
              {DAY_LABELS[date.getDay()]} {date.getDate()}
            </Text>
            <Text style={[typography.captionSmall, { color: valueColor, flex: 1, textAlign: 'right' }]}>
              {d.hasLogs ? d.calories : '—'}
            </Text>
            <Text style={[typography.captionSmall, { color: valueColor, flex: 0.7, textAlign: 'right' }]}>
              {d.hasLogs ? d.proteins : '—'}
            </Text>
            <Text style={[typography.captionSmall, { color: valueColor, flex: 0.7, textAlign: 'right' }]}>
              {d.hasLogs ? d.fats : '—'}
            </Text>
            <Text style={[typography.captionSmall, { color: valueColor, flex: 0.7, textAlign: 'right' }]}>
              {d.hasLogs ? d.carbs : '—'}
            </Text>
            <Text style={[typography.captionSmall, { color: valueColor, flex: 0.9, textAlign: 'right' }]}>
              {d.hasLogs ? (d.water_ml / 1000).toFixed(1) : '—'}
            </Text>
          </View>
        );
      })}
      <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.sm }]}>
        В среднем за {logged.length} дн: {avgCalories} ккал
      </Text>
    </View>
  );
}