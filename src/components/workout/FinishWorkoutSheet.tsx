// src/components/workout/FinishWorkoutSheet.tsx
// UX-16 D1: confirm sheet для завершения тренировки.
// FX-1 (26.09): вынесен из WorkoutScreenHeader в корень экрана. SheetShell вне
// нативного Modal позиционируется absolute ОТ НОСИТЕЛЯ (top:0/bottom:0), а
// после UX-1h header обёрнут в HeroIn (Animated.View размером с header) —
// лист «приземлялся» к верхней части экрана и перекрывался FlatList'ом.
// Инвариант: листы, рендеренные через SheetShell без isModal, живут в корне
// экрана (паттерн PainSheet / WarmupExerciseSheet), а не внутри header.
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';

interface FinishWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
  /** Сколько сетов залогировано / всего — для сводки и предупреждения */
  completedSetsCount: number;
  totalSetsCount: number;
  colors: any;
}

export function FinishWorkoutSheet({
  visible,
  onClose,
  onFinish,
  completedSetsCount,
  totalSetsCount,
  colors,
}: FinishWorkoutSheetProps) {
  const handleConfirmFinish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    onFinish();
  }, [onClose, onFinish]);

  const hasUnloggedSets = totalSetsCount > 0 && completedSetsCount < totalSetsCount;

  return (
    <SheetShell visible={visible} title="Завершить тренировку?" onClose={onClose}>
      {/* Сводка сессии */}
      <View style={{ marginBottom: SPACING.lg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: SPACING.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={[typography.body, { color: colors.textSecondary }]}>Подходы</Text>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
            {completedSetsCount} из {totalSetsCount}
          </Text>
        </View>
      </View>

      {/* Предупреждение о незалогированных сетах */}
      {hasUnloggedSets && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: SPACING.sm,
            padding: SPACING.md,
            backgroundColor: withAlpha(colors.warning, 0.082),
            borderRadius: BORDER_RADIUS.md,
            borderWidth: 1,
            borderColor: withAlpha(colors.warning, 0.251),
            marginBottom: SPACING.lg,
          }}
        >
          <AlertCircle size={20} color={colors.warning} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.captionSmall,
                { color: colors.warning, fontWeight: '700', marginBottom: 2 },
              ]}
            >
              Незалогированные подходы
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              {totalSetsCount - completedSetsCount} подходов не сохранено. Они не попадут в историю.
            </Text>
          </View>
        </View>
      )}

      {/* Кнопки */}
      <View style={{ gap: SPACING.sm }}>
        <TouchableOpacity
          onPress={handleConfirmFinish}
          activeOpacity={0.8}
          style={{
            backgroundColor: hasUnloggedSets ? colors.warning : colors.success,
            paddingVertical: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            alignItems: 'center',
          }}
        >
          <Text style={[typography.button, { color: colors.textInverse, fontWeight: '700' }]}>
            {hasUnloggedSets ? 'Завершить без сохранения' : 'Завершить тренировку'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.surfaceSecondary,
            paddingVertical: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={[typography.button, { color: colors.textPrimary, fontWeight: '600' }]}>
            Продолжить тренировку
          </Text>
        </TouchableOpacity>
      </View>
    </SheetShell>
  );
}
