// src/components/profile/NutritionWeekCard.tsx
// FEAT-2.1: «Неделя питания»: 7 мини-баров калорий против цели +
// чипы среднего отклонения Б/Ж/У + score попадания в цель.
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { MACRO_COLORS } from '../../constants/semanticColors';
import { useWeeklyNutrition } from '../../hooks/useWeeklyNutrition';
import { computeWeekAdherence } from '../../utils/nutritionTrend';
import { NutritionTargets } from '../../services/profileService';

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color + '1A',
        borderWidth: 1,
        borderColor: color + '55',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.full,
      }}
    >
      <Text style={[typography.captionSmall, { color, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

interface NutritionWeekCardProps {
  userId: string | null;
  targets: NutritionTargets;
}

export function NutritionWeekCard({ userId, targets }: NutritionWeekCardProps) {
  const { colors } = useTheme();
  const { data: days } = useWeeklyNutrition(userId);

  const week = useMemo(() => (days ? computeWeekAdherence(days, targets) : null), [days, targets]);

  if (!days || !week) return null;

  const maxCal = Math.max(targets.calories, ...days.map((d) => d.calories), 1);

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
        <CalendarDays size={18} color={MACRO_COLORS.calories} strokeWidth={2} />
        <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm, flex: 1 }]}>
          Неделя питания
        </Text>
        {week.daysWithLogs > 0 && (
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            score {week.score}/100
          </Text>
        )}
      </View>

      {week.daysWithLogs === 0 ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Пока нет данных за неделю — добавь первый приём пищи выше.
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.xs, marginBottom: SPACING.xs }}>
            {days.map((d) => {
              const h = Math.max(4, Math.round((d.calories / maxCal) * 60));
              const within =
                targets.calories > 0 &&
                d.calories >= targets.calories * 0.85 &&
                d.calories <= targets.calories * 1.15;
              const barColor = !d.hasLogs
                ? colors.surfaceSecondary
                : within
                  ? colors.success
                  : d.calories > targets.calories
                    ? colors.warning
                    : colors.primary;
              return (
                <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 64 }}>
                  <View style={{ width: '100%', height: h, borderRadius: 3, backgroundColor: barColor }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md }}>
            {days.map((d) => (
              <Text
                key={d.date}
                style={[typography.captionSmall, { color: colors.textTertiary, flex: 1, textAlign: 'center' }]}
              >
                {DAY_LABELS[new Date(d.date).getDay()]}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            <Chip label={`Калории ${week.calories.label}`} color={MACRO_COLORS.calories} />
            <Chip label={`Белки ${week.proteins.label}`} color={MACRO_COLORS.proteins} />
            <Chip label={`Жиры ${week.fats.label}`} color={MACRO_COLORS.fats} />
            <Chip label={`Углеводы ${week.carbs.label}`} color={MACRO_COLORS.carbs} />
          </View>
          <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: SPACING.sm }]}>
            В среднем за {week.daysWithLogs} дн: {week.avgCalories} ккал · цель {targets.calories} ккал
          </Text>
        </>
      )}
    </View>
  );
}