// src/components/cycle/CycleCalendar.tsx
// L2: Календарь цикла с визуальным отображением фаз
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import type { CycleEvent, CycleSettings, CalculatedCyclePhase } from '../../types/cycle';
import { getCyclePhaseColor, getCyclePhaseLabel, getPhaseForDate } from '../../utils/cycle';

interface CycleCalendarProps {
  events: CycleEvent[];
  settings: CycleSettings;
  currentPhase: CalculatedCyclePhase | null;
  onSettingsPress?: () => void;
  isEditMode?: boolean;
  onDayPress?: (date: Date) => void;
}

export function CycleCalendar({
  events,
  settings,
  currentPhase,
  onSettingsPress,
  isEditMode = false,
  onDayPress,
}: CycleCalendarProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() || 7; // 1 = Monday
    
    const days = [];
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push(null); // Empty cells
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const getDayPhase = (date: Date) => {
    return getPhaseForDate(date, events, settings.luteal_length_days);
  };

  const getDayEvents = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter((e) => e.event_date === dateStr);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const now = new Date();
    if (currentMonth.getMonth() < now.getMonth() || currentMonth.getFullYear() < now.getFullYear()) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };

  const canGoNext = currentMonth.getMonth() < new Date().getMonth() || currentMonth.getFullYear() < new Date().getFullYear();

  return (
    <View style={{ marginBottom: SPACING.md }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h5, { color: colors.textPrimary }]}>
          {currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {onSettingsPress && (
            <TouchableOpacity 
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Settings size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={nextMonth} 
            disabled={!canGoNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight size={24} color={canGoNext ? colors.textPrimary : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Days of week */}
      <View style={{ flexDirection: 'row', marginBottom: SPACING.xs }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
          }

          const phase = getDayPhase(date);
          const dayEvents = getDayEvents(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          const phaseColor = phase ? colors[getCyclePhaseColor(phase)] : 'transparent';
          const hasEvent = dayEvents.length > 0;

          const isTappable = isEditMode && !!onDayPress;

          return (
            <TouchableOpacity
              key={date.toISOString()}
              disabled={!isTappable}
              onPress={() => isTappable && onDayPress?.(date)}
              style={{
                width: '14.28%',
                aspectRatio: 1,
                padding: 2,
                opacity: isTappable ? 1 : 0.7,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: phase ? phaseColor + '22' : 'transparent',
                  borderWidth: isToday ? 2 : isTappable ? 1.5 : 1,
                  borderColor: isToday
                    ? colors.primary
                    : isTappable
                    ? colors.textSecondary
                    : colors.border,
                  borderStyle: isTappable ? 'dashed' : 'solid',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: phase ? colors[getCyclePhaseColor(phase)] : colors.textPrimary,
                      fontWeight: isToday ? '700' : '400',
                    },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {hasEvent && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md }}>
        {(['menstrual', 'follicular', 'ovulation', 'luteal'] as const).map((phase) => (
          <View key={phase} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: colors[getCyclePhaseColor(phase)] + '44',
                borderWidth: 1,
                borderColor: colors[getCyclePhaseColor(phase)],
              }}
            />
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              {getCyclePhaseLabel(phase)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}