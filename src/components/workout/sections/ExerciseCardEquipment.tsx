// src/components/workout/sections/ExerciseCardEquipment.tsx
// Equipment bubbles — вынесено из accordion, показывается сразу под header.
// UX-2: equipment — быстрый атрибут, не progressive disclosure.
import React, { memo } from 'react';
import { View } from 'react-native';
import { SPACING } from '../../../constants/theme';
import { EquipmentBubbles } from '../EquipmentBubbles';

interface ExerciseCardEquipmentProps {
  equipment: string[];
  primaryMuscles: string[];
}

export const ExerciseCardEquipment = memo(function ExerciseCardEquipment({
  equipment,
  primaryMuscles,
}: ExerciseCardEquipmentProps) {
  if (equipment.length === 0) return null;

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <EquipmentBubbles equipment={equipment} primaryMuscles={primaryMuscles} />
    </View>
  );
});