// src/components/workout/WorkoutScreenHeader.tsx
// PR8: nav header workout screen — back button, program context, workout name,
// UnitToggle, WorkoutTimerPill, WorkoutTimerPanel.
// UX-16: confirm sheet финиша (D1). UX-TIMER: кнопка «Начать» убрана — старт/
// пауза/возобновление объединены в pill-таймере (WorkoutTimer.tsx).
// Должен рендериться внутри WorkoutTimerProvider (Pill/Panel используют контекст).
// FX-1 (26.09): confirm-лист УБРАН отсюда в корень экрана (FinishWorkoutSheet).
// SheetShell вне Modal позиционируется absolute от носителя; внутри header
// (обёрнутого HeroIn в UX-1h) лист прижимался к верху экрана и перекрывался
// FlatList. Header теперь только триггер: onRequestFinish.
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { typography } from '../../styles/typography';
import { UnitToggle } from './UnitToggle';
import { WorkoutTimerPill, WorkoutTimerPanel } from './WorkoutTimer';
import { WeightUnit } from '../../hooks/useUnitPreferences';

interface WorkoutScreenHeaderProps {
  workoutName: string;
  programName?: string;
  phaseName?: string;
  unit: WeightUnit;
  onUnitChange: (unit: WeightUnit) => void;
  colors: any;
  /** UX-TIMER: «Завершить» показываем только для активной/сохраняемой сессии. */
  isWorkoutActive: boolean;
  saving: boolean;
  /** FX-1: тап по «Завершить» — экран открывает confirm-лист в своём корне. */
  onRequestFinish: () => void;
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
  onRequestFinish,
}: WorkoutScreenHeaderProps) {
  const router = useRouter();

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
          {/* UX-TIMER: кнопка «Начать» убрана — старт в pill-таймере; «Завершить»
              видно только для активной или сохраняемой сессии */}
          {(isWorkoutActive || saving) && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRequestFinish();
              }}
              disabled={saving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Завершить тренировку"
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
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
    </>
  );
});
