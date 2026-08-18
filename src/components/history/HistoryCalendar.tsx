// src/components/history/HistoryCalendar.tsx
// UX-9: календарь тренировок — месяц с отметками, навигация, выбор дня.
// История = «когда я тренировался» (PRODUCT.md §10): точки показывают
// регулярность, тап по дню открывает детали (L2 — DaySummaryCard).
// Неделя начинается с понедельника (ru-RU).
import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CELL_MIN_HEIGHT = 44; // PRODUCT.md §3.1: tap targets минимум 44pt

export interface CalendarDayCell {
  dateKey: string; // YYYY-MM-DD (локальная дата)
  day: number;
}

interface HistoryCalendarProps {
  /** Даты завершённых тренировок (YYYY-MM-DD, локальные) */
  workoutDates: Set<string>;
  /** Выбранный день (YYYY-MM-DD) — null, если sheet закрыт */
  selectedDay: string | null;
  onDayPress: (dateKey: string) => void;
  colors: any;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** Дата → 'YYYY-MM-DD' в локальной таймзоне (для совпадения с created_at). */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7); // YYYY-MM
}

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** Пн=0 … Вс=6 */
function mondayOffset(year: number, monthIndex: number): number {
  return (new Date(year, monthIndex, 1).getDay() + 6) % 7;
}

/** Заполнение месяца: ведущие пустые ячейки + дни. */
function buildGridCells(year: number, monthIndex: number): (CalendarDayCell | null)[] {
  const leading = mondayOffset(year, monthIndex);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (CalendarDayCell | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
    });
  }
  return cells;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const HistoryCalendar = memo(function HistoryCalendar({
  workoutDates,
  selectedDay,
  onDayPress,
  colors,
  loading = false,
  error = false,
  onRetry,
}: HistoryCalendarProps) {
  const todayKey = toLocalDateKey(new Date());
  const currentMonthKey = monthKeyOf(todayKey);

  // Границы навигации: от самого раннего месяца с тренировками до текущего.
  const minMonthKey = useMemo(() => {
    let min: string | null = null;
    workoutDates.forEach((k) => {
      const mk = monthKeyOf(k);
      if (!min || mk < min) min = mk;
    });
    return min ?? currentMonthKey;
  }, [workoutDates, currentMonthKey]);

  const [viewMonthKey, setViewMonthKey] = useState(currentMonthKey);

  // При загрузке данных — вернуться к самому раннему месяцу с тренировками
  // (первое открытие: пользователь сразу видит свою историю).
  useEffect(() => {
    if (workoutDates.size > 0) setViewMonthKey(minMonthKey);
  }, [minMonthKey, workoutDates.size]);

  const [viewYear, viewMonth] = useMemo(
    () => viewMonthKey.split('-').map(Number),
    [viewMonthKey],
  );

  const cells = useMemo(() => buildGridCells(viewYear, viewMonth - 1), [viewYear, viewMonth]);

  const monthLabel = useMemo(() => {
    const label = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
    return capitalize(label);
  }, [viewYear, viewMonth]);

  const canGoPrev = viewMonthKey > minMonthKey;
  const canGoNext = viewMonthKey < currentMonthKey;

  const goPrev = useCallback(
    () => canGoPrev && setViewMonthKey((k) => addMonths(k, -1)),
    [canGoPrev],
  );
  const goNext = useCallback(
    () => canGoNext && setViewMonthKey((k) => addMonths(k, 1)),
    [canGoNext],
  );

  // ===== States (PRODUCT.md §3.1) =====
  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Загрузка календаря...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Не удалось загрузить историю
        </Text>
        {!!onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.md,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={[typography.button, { color: colors.textInverse }]}>Повторить</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (workoutDates.size === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: SPACING.xl * 2 }}>
        <Text style={[typography.body, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
          Пока нет завершённых тренировок
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
          Заверши первую тренировку — она появится в календаре
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Навигация по месяцам */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.sm,
        }}
      >
        <TouchableOpacity
          onPress={goPrev}
          disabled={!canGoPrev}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            padding: SPACING.xs,
            borderRadius: BORDER_RADIUS.sm,
            opacity: canGoPrev ? 1 : 0.35,
          }}
        >
          <ChevronLeft size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={goNext}
          disabled={!canGoNext}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            padding: SPACING.xs,
            borderRadius: BORDER_RADIUS.sm,
            opacity: canGoNext ? 1 : 0.35,
          }}
        >
          <ChevronRight size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Дни недели */}
      <View style={{ flexDirection: 'row', marginBottom: SPACING.xs }}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.captionSmall, { color: colors.textTertiary, fontWeight: '600' }]}>
              {wd}
            </Text>
          </View>
        ))}
      </View>

      {/* Сетка дней */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, i) => {
          if (!cell) {
            // Пустая ячейка сохраняет структуру сетки (ключ стабильный)
            return <View key={`blank-${i}`} style={{ width: `${100 / 7}%` }} />;
          }
          const hasWorkout = workoutDates.has(cell.dateKey);
          const isSelected = selectedDay === cell.dateKey;
          const isToday = cell.dateKey === todayKey;
          return (
            <TouchableOpacity
              key={cell.dateKey}
              onPress={() => hasWorkout && onDayPress(cell.dateKey)}
              disabled={!hasWorkout}
              activeOpacity={0.7}
              style={{
                width: `${100 / 7}%`,
                minHeight: CELL_MIN_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? colors.primary
                    : hasWorkout
                      ? colors.primary + '15'
                      : 'transparent',
                  borderWidth: 1,
                  borderColor: isToday && !isSelected ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isSelected
                        ? colors.textInverse
                        : hasWorkout
                          ? colors.textPrimary
                          : colors.textTertiary,
                      fontWeight: hasWorkout ? '700' : '400',
                    },
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
              {/* Точка-отметка тренировки */}
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 2,
                  backgroundColor: hasWorkout ? colors.primary : 'transparent',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});