// src/components/workout/WorkoutScreenHeader.tsx
// PR8: nav header workout screen — back button, program context, workout name,
// UnitToggle, WorkoutTimerPill, WorkoutTimerPanel.
// UX-16: pill старт/финиш в шапке + confirm sheet (D1).
// Должен рендериться внутри WorkoutTimerProvider (Pill/Panel используют контекст).
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play, Square, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { typography } from '../../styles/typography';
import { UnitToggle } from './UnitToggle';
import { WorkoutTimerPill, WorkoutTimerPanel } from './WorkoutTimer';
import { WeightUnit } from '../../hooks/useUnitPreferences';
import { SheetShell } from '../ui/SheetShell';

interface WorkoutScreenHeaderProps {
  workoutName: string;
  programName?: string;
  phaseName?: string;
  unit: WeightUnit;
  onUnitChange: (unit: WeightUnit) => void;
  colors: any;
  /** UX-16 D1: pill старт/финиш */
  isWorkoutActive: boolean;
  saving: boolean;
  onStart: () => void;
  onFinish: () => void;
  /** Для confirm sheet: сколько сетов залогировано */
  completedSetsCount?: number;
  totalSetsCount?: number;
}

export const WorkoutScreenHeader = memo(function WorkoutScreenHeader({
  workoutName,
  programName,
  phaseName,
  unit,
  onUnitChange,
  colors,
  isWorkoutActive,
  saving,
  onStart,
  onFinish,
  completedSetsCount = 0,
  totalSetsCount = 0,
}: WorkoutScreenHeaderProps) {
  const router = useRouter();
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);

  const handleStart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStart();
  }, [onStart]);

  const handleFinishPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmSheet(true);
  }, []);

  const handleConfirmFinish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfirmSheet(false);
    onFinish();
  }, [onFinish]);

  const handleCloseConfirm = useCallback(() => {
    setShowConfirmSheet(false);
  }, []);

  const hasUnloggedSets = totalSetsCount > 0 && completedSetsCount < totalSetsCount;

  return (
    <>
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={commonStyles.backButton}
        >
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {programName ? (
            <>
              <Text
                style={[typography.captionSmall, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {programName}
                {phaseName ? ` · ${phaseName}` : ''}
              </Text>
              <Text style={[typography.h5, { color: colors.textPrimary }]} numberOfLines={1}>
                {workoutName}
              </Text>
            </>
          ) : (
            <Text style={[typography.h4, { color: colors.textPrimary }]} numberOfLines={1}>
              {workoutName}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          {/* UX-16 D1: pill старт/финиш в шапке */}
          {!isWorkoutActive ? (
            <TouchableOpacity
              onPress={handleStart}
              disabled={saving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Начать тренировку"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.xs,
                backgroundColor: colors.success,
                paddingHorizontal: SPACING.md,
                paddingVertical: 8,
                borderRadius: BORDER_RADIUS.md,
                minHeight: 36,
              }}
            >
              <Play
                size={14}
                color={colors.textInverse}
                fill={colors.textInverse}
                strokeWidth={2}
              />
              <Text
                style={[typography.captionSmall, { color: colors.textInverse, fontWeight: '700' }]}
              >
                Начать
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinishPress}
              disabled={saving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Завершить тренировку"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACING.xs,
                backgroundColor: saving ? colors.surfaceSecondary : colors.error,
                paddingHorizontal: SPACING.md,
                paddingVertical: 8,
                borderRadius: BORDER_RADIUS.md,
                minHeight: 36,
                borderWidth: saving ? 1 : 0,
                borderColor: colors.border,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Square
                  size={14}
                  color={colors.textInverse}
                  fill={colors.textInverse}
                  strokeWidth={2}
                />
              )}
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: saving ? colors.textSecondary : colors.textInverse,
                    fontWeight: '700',
                  },
                ]}
              >
                {saving ? 'Сохранение...' : 'Завершить'}
              </Text>
            </TouchableOpacity>
          )}
          <UnitToggle unit={unit} onChange={onUnitChange} />
          <WorkoutTimerPill colors={colors} />
        </View>
      </View>
      <WorkoutTimerPanel colors={colors} />

      {/* UX-16 D1: confirm sheet для завершения тренировки */}
      <SheetShell
        visible={showConfirmSheet}
        title="Завершить тренировку?"
        onClose={handleCloseConfirm}
      >
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
              backgroundColor: colors.warning + '15',
              borderRadius: BORDER_RADIUS.md,
              borderWidth: 1,
              borderColor: colors.warning + '40',
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
                {totalSetsCount - completedSetsCount} подходов не сохранено. Они не попадут в
                историю.
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
            onPress={handleCloseConfirm}
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
    </>
  );
});
