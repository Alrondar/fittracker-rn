// src/components/history/DaySummaryCard.tsx
// UX-9 L2: детали выбранного дня — bottom sheet через канонический SheetShell.
// Несколько тренировок в один день показываются списком (repeat/ad-hoc).
import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SheetShell } from '../ui/SheetShell';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { HistoryWorkout } from '../../services/historyService';

interface DaySummaryCardProps {
  /** Выбранный день (YYYY-MM-DD) или null — sheet закрыт */
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

  const dayWorkouts = useMemo(() => {
    if (!selectedDay) return [];
    return workouts.filter((w) => {
      const dt = new Date(w.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate(),
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
    [onClose, router],
  );

  return (
    <Modal
      transparent
      visible={!!selectedDay}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SheetShell title={selectedDay ? formatDayLabel(selectedDay) : ''} onClose={onClose}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
          Тренировок: {dayWorkouts.length}
        </Text>
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
                {w.sets} подходов · {w.volume.toLocaleString('ru-RU')} кг объём
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </SheetShell>
    </Modal>
  );
}