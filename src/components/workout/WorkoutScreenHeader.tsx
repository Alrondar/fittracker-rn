// src/components/workout/WorkoutScreenHeader.tsx
// PR8: nav header workout screen — back button, program context, workout name,
// UnitToggle, WorkoutTimerPill, WorkoutTimerPanel.
// Должен рендериться внутри WorkoutTimerProvider (Pill/Panel используют контекст).
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
}

export const WorkoutScreenHeader = memo(function WorkoutScreenHeader({
  workoutName,
  programName,
  phaseName,
  unit,
  onUnitChange,
  colors,
}: WorkoutScreenHeaderProps) {
  return (
    <>
      <View
        style={[
          commonStyles.navHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
          <UnitToggle unit={unit} onChange={onUnitChange} />
          <WorkoutTimerPill colors={colors} />
        </View>
      </View>
      <WorkoutTimerPanel colors={colors} />
    </>
  );
});