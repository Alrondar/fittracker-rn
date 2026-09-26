// src/components/workout/WorkoutScreenHeader.tsx
// PR8: nav header workout screen — back button, program context, workout name,
// UnitToggle, единая кнопка сессии + таймер-панель (WorkoutTimer.tsx).
// Должен рендериться внутри WorkoutTimerProvider (Pill/Panel используют контекст).
// FX-1 (26.09): confirm-лист убран отсюда в корень экрана (FinishWorkoutSheet) —
// SheetShell вне Modal позиционируется absolute от носителя.
// UX-T3 (26.09): отдельная кнопка «Завершить» удалена — её роль играет
// морфинг-кнопка (Начать → Завершить/Продолжить) в WorkoutTimerPill.
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/theme';
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
          {/* UX-T3 (26.09, вариант C): единая морфинг-кнопка сессии — «Начать»
              превращается в «Завершить»/«Продолжить» в том же слоте. Отдельная
              кнопка «Завершить» из шапки убрана — слот больше не разрастается
              вторым контроллом. Пауза/таймер — долгий тап (панель). */}
          <UnitToggle unit={unit} onChange={onUnitChange} />
          <WorkoutTimerPill colors={colors} onRequestFinish={onRequestFinish} saving={saving} />
        </View>
      </View>
      <WorkoutTimerPanel colors={colors} onRequestFinish={onRequestFinish} />
    </>
  );
});
