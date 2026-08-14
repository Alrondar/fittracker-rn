// src/components/workout/sections/AlternativeExerciseContent.tsx
// Контент альтернативной карточки: benefits/risks/injuries + replace button
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react-native';
import { typography } from '../../../styles/typography';
import { createCardStyles } from '../../../styles/components/card';
import { ExerciseInfoAccordion } from '../ExerciseInfoAccordion';

interface AlternativeExerciseContentProps {
  benefits: string;
  risks: string;
  injuries: string[];
  exerciseId: string;
  exerciseIndex: number;
  replaceExercise: (exIndex: number, altId: string) => void;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export const AlternativeExerciseContent = memo(function AlternativeExerciseContent({
  benefits,
  risks,
  injuries,
  exerciseId,
  exerciseIndex,
  replaceExercise,
  colors,
  cardStyles,
}: AlternativeExerciseContentProps) {
  return (
    <>
      {benefits ? (
        <ExerciseInfoAccordion
          icon={<Sparkles size={14} color={colors.success} />}
          title="Польза"
          titleColor={colors.success}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {benefits}
          </Text>
        </ExerciseInfoAccordion>
      ) : null}
      {risks ? (
        <ExerciseInfoAccordion
          icon={<AlertTriangle size={14} color={colors.warning} />}
          title="Риски"
          titleColor={colors.warning}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {risks}
          </Text>
        </ExerciseInfoAccordion>
      ) : null}
      {injuries.length > 0 ? (
        <ExerciseInfoAccordion
          icon={<ShieldAlert size={14} color={colors.error} />}
          title="Противопоказания"
          titleColor={colors.error}
        >
          {injuries.map((inj, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
              <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, flex: 1 }]}>
                {inj}
              </Text>
            </View>
          ))}
        </ExerciseInfoAccordion>
      ) : null}
      <TouchableOpacity
        style={[
          cardStyles.replaceButton,
          { borderColor: colors.primary, backgroundColor: colors.primaryLight },
        ]}
        onPress={() => replaceExercise(exerciseIndex, exerciseId)}
      >
        <RotateCcw size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[cardStyles.replaceButtonText, { color: colors.primary }]}>Заменить на это</Text>
      </TouchableOpacity>
    </>
  );
});