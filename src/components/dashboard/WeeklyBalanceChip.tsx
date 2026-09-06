// src/components/dashboard/WeeklyBalanceChip.tsx
// FEAT-3: L1 чип недельного баланса калорий на Dashboard.
// L2 SheetShell: bar chart за 7 дней + goal-aware инсайт.
// Ноль новых запросов — переиспользует useWeeklyNutrition и getNutritionTargets
// (оба уже кэшируются React Query).

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

import { useStore } from '../../store/useStore';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS, scale } from '../../constants/theme';
import { profileService } from '../../services/profileService';
import { useWeeklyNutrition } from '../../hooks/useWeeklyNutrition';
import { calculateWeeklyCaloricBalance } from '../../utils/weeklyCaloricBalance';
import { SheetShell } from '../ui/SheetShell';

const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * L1 чип: "Неделя: −2100" / "+1500" / "—" / скрыт.
 * Тап → L2 sheet с bar chart и goal-aware инсайтом.
 */
export function WeeklyBalanceChip() {
  const { userId } = useStore();
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: days } = useWeeklyNutrition(userId);
  const { data: targets } = useQuery({
    queryKey: ['nutritionTargets', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => profileService.getNutritionTargets(userId!),
  });

  const balance = useMemo(
    () => calculateWeeklyCaloricBalance(days ?? [], targets?.calories ?? 0),
    [days, targets?.calories]
  );

  // Скрываем чип если: нет данных ИЛИ цель не задана (иначе баланс meaningless).
  if (!balance.hasSufficientData || (targets?.calories ?? 0) <= 0) {
    return null;
  }

  const isDeficit = balance.total < 0;
  const isSurplus = balance.total > 0;

  const chipColor = isDeficit ? colors.success : isSurplus ? colors.warning : colors.textSecondary;

  const Icon = isDeficit ? TrendingDown : isSurplus ? TrendingUp : Minus;

  // Формат: "−2100" / "+1500" / "±0"
  const label =
    balance.total === 0 ? '±0' : `${balance.total > 0 ? '+' : '−'}${Math.abs(balance.total)}`;

  return (
    <>
      <TouchableOpacity
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 3,
          borderRadius: BORDER_RADIUS.full,
          backgroundColor: chipColor + '1A',
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Недельный баланс: ${label} ккал. Нажми для деталей.`}
        accessibilityRole="button"
      >
        <Icon size={12} color={chipColor} strokeWidth={2} />
        <Text style={[typography.captionSmall, { color: chipColor, fontWeight: '700' }]}>
          Неделя: {label}
        </Text>
      </TouchableOpacity>

      <SheetShell
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Недельный баланс калорий"
      >
        <View style={{ paddingBottom: SPACING.lg }}>
          {/* Итог недели */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.sm,
              marginBottom: SPACING.lg,
            }}
          >
            <Icon size={scale(24)} color={chipColor} strokeWidth={2} />
            <Text style={[typography.h3, { color: chipColor, fontWeight: '700' }]}>
              {label} ккал
            </Text>
          </View>

          {/* Bar chart */}
          <WeeklyBalanceChart balance={balance} />

          {/* Goal-aware insight */}
          <GoalAwareInsight balance={balance} targetGoal={targets?.goal} />

          {/* Детализация */}
          <View
            style={{
              marginTop: SPACING.lg,
              padding: SPACING.md,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.md,
            }}
          >
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, marginBottom: SPACING.xs },
              ]}
            >
              За {balance.loggedDays} из {balance.totalDays} дней
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
              Среднесуточно:{' '}
              {balance.loggedDays > 0
                ? Math.round(
                    balance.days.filter((d) => d.hasLogs).reduce((sum, d) => sum + d.calories, 0) /
                      balance.loggedDays
                  )
                : '—'}{' '}
              ккал (цель {targets?.calories ?? 0})
            </Text>
          </View>
        </View>
      </SheetShell>
    </>
  );
}

/** L2 Bar chart: 7 столбцов (дефицит зелёный / профицит оранжевый). */
function WeeklyBalanceChart({
  balance,
}: {
  balance: ReturnType<typeof calculateWeeklyCaloricBalance>;
}) {
  const { colors } = useTheme();

  const width = 300;
  const height = 140;
  const padding = { top: 10, bottom: 24, left: 4, right: 4 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Находим максимальное абсолютное отклонение для масштабирования.
  const maxAbs = Math.max(100, ...balance.days.map((d) => Math.abs(d.balance ?? 0)));

  const barWidth = (innerW - 6 * 4) / 7; // 6 gaps of 4px
  const gap = 4;
  const midY = padding.top + innerH / 2;

  return (
    <Svg width={width} height={height}>
      {/* Zero line */}
      <Line
        x1={padding.left}
        y1={midY}
        x2={width - padding.right}
        y2={midY}
        stroke={colors.border}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <SvgText
        x={width - padding.right}
        y={midY - 4}
        textAnchor="end"
        fontSize={10}
        fill={colors.textTertiary}
      >
        0
      </SvgText>

      {balance.days.map((d, i) => {
        const x = padding.left + i * (barWidth + gap);
        const balanceVal = d.balance ?? 0;
        const barHeight = d.hasLogs ? (Math.abs(balanceVal) / maxAbs) * (innerH / 2 - 4) : 0;

        const barColor = balanceVal < 0 ? colors.success : colors.warning;
        const barY = balanceVal < 0 ? midY : midY - barHeight;

        return (
          <React.Fragment key={d.date}>
            <Rect
              x={x}
              y={barY}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill={d.hasLogs ? barColor : colors.border}
              rx={3}
              opacity={d.hasLogs ? 1 : 0.4}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill={colors.textSecondary}
            >
              {DAY_SHORT[new Date(d.date).getDay()]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/**
 * Goal-aware инсайт (PRODUCT.md C5).
 * Адаптирует текст под цель пользователя.
 */
function GoalAwareInsight({
  balance,
  targetGoal,
}: {
  balance: ReturnType<typeof calculateWeeklyCaloricBalance>;
  /** goal из profileService.getNutritionTargets: string | null | undefined */
  targetGoal?: string | null;
}) {
  const { colors } = useTheme();

  const insight = useMemo(() => {
    if (!balance.hasSufficientData) {
      return {
        text: 'Недостаточно данных для вывода. Добавляй питание чаще.',
        color: colors.textSecondary,
      };
    }

    const isDeficit = balance.total < 0;
    const isSurplus = balance.total > 0;

    // Цель: weight_loss, muscle_gain, maintenance, other
    switch (targetGoal) {
      case 'weight_loss':
      case 'fat_loss':
        if (isDeficit) {
          return {
            text: `Недельный дефицит выполнен. Продолжай в том же духе — ${Math.abs(balance.total)} ккал дефицита за неделю.`,
            color: colors.success,
          };
        } else if (isSurplus) {
          return {
            text: `Неделя в профиците (+${balance.total} ккал). Для жиросжигания нужен дефицит.`,
            color: colors.warning,
          };
        }
        return {
          text: 'Баланс около нуля. Для жиросжигания попробуй небольшой дефицит.',
          color: colors.textSecondary,
        };

      case 'muscle_gain':
      case 'strength':
        if (isSurplus) {
          return {
            text: `Положительный баланс +${balance.total} ккал — это хорошо для роста мышц.`,
            color: colors.success,
          };
        } else if (isDeficit) {
          return {
            text: `Дефицит ${Math.abs(balance.total)} ккал. Для набора массы нужен профицит.`,
            color: colors.warning,
          };
        }
        return {
          text: 'Баланс около нуля. Для роста мышц нужен небольшой профицит.',
          color: colors.textSecondary,
        };

      case 'maintenance':
      case 'general_fitness':
        if (Math.abs(balance.total) < 500) {
          return {
            text: 'Баланс около нуля — поддержание формы. Хорошо.',
            color: colors.success,
          };
        }
        return {
          text: `Отклонение ${balance.total > 0 ? '+' : ''}${balance.total} ккал. Для поддержания — держись ближе к цели.`,
          color: colors.textSecondary,
        };

      default:
        // Без цели — нейтральный инсайт.
        if (isDeficit) {
          return {
            text: `Дефицит ${Math.abs(balance.total)} ккал за неделю.`,
            color: colors.textSecondary,
          };
        } else if (isSurplus) {
          return {
            text: `Профицит ${balance.total} ккал за неделю.`,
            color: colors.textSecondary,
          };
        }
        return {
          text: 'Баланс около нуля.',
          color: colors.textSecondary,
        };
    }
  }, [balance, targetGoal, colors]);

  return (
    <View
      style={{
        padding: SPACING.md,
        backgroundColor: insight.color + '12',
        borderRadius: BORDER_RADIUS.md,
        borderLeftWidth: 3,
        borderLeftColor: insight.color,
      }}
    >
      <Text style={[typography.body, { color: insight.color, lineHeight: 20 }]}>
        {insight.text}
      </Text>
    </View>
  );
}
