// src/components/history/DaySummaryCard.tsx
// UX-9 L2: детали выбранного дня. Несколько тренировок в один день
// показываются списком (repeat/ad-hoc).
// MORF-CAL (26.09): вместо bottom sheet (Modal+SheetShell) — инлайн-разворот
// ВНУТРИ карточки календаря под тапнутой ячейкой (Reveal, origin по колонке
// дня). Рендерится TrainingCalendarCard; повторный тап по дню или ✕ сворачивают.
import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { Reveal } from '../ui/Reveal';
import { useWeightDisplay } from '../../hooks/useUnitPreferences';
import type { HistoryWorkout } from '../../services/historyService';

interface DaySummaryCardProps {
  /** Выбранный день (YYYY-MM-DD) или null — блок скрыт */
  selectedDay: string | null;
  /** Все завершённые тренировки (фильтр по дню — локально) */
  workouts: HistoryWorkout[];
  onClose: () => void;
  colors: any;
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function DaySummaryCard({ selectedDay, workouts, onClose, colors }: DaySummaryCardProps) {
  const router = useRouter();
  const { unitLabel, kgToUnit } = useWeightDisplay();

  const dayWorkouts = useMemo(() => {
    if (!selectedDay) return [];
    return workouts.filter((w) => {
      const dt = new Date(w.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate()
      ).padStart(2, '0')}`;
      return key === selectedDay;
    });
  }, [selectedDay, workouts]);

  const openWorkout = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClose();
      router.push(`/progress/${id}`);
    },
    [onClose, router]
  );

  if (!selectedDay) return null;

  // Origin разворота — колонка тапнутого дня (Пн–Вс → три трети ширины).
  const [y, m, d] = selectedDay.split('-').map(Number);
  const dowMon = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const origin = dowMon <= 2 ? 'top-left' : dowMon <= 4 ? 'top-center' : 'top-right';

  return (
    <Reveal origin={origin}>
      <View
        style={{
          marginTop: SPACING.md,
          paddingTop: SPACING.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: SPACING.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
              {formatDayLabel(selectedDay)}
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              Тренировок: {dayWorkouts.length}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Свернуть детали дня"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: BORDER_RADIUS.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <X size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        {dayWorkouts.map((w) => (
          <TouchableOpacity
            key={w.id}
            onPress={() => openWorkout(w.id)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: SPACING.md,
              marginBottom: SPACING.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 2 }]}
                numberOfLines={1}
              >
                {w.name}
              </Text>
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                {w.sets} подходов · {kgToUnit(w.volume).toLocaleString('ru-RU')} {unitLabel} объём
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
    </Reveal>
  );
}
