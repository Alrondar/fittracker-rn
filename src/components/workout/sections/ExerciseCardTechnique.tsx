// src/components/workout/sections/ExerciseCardTechnique.tsx
// Accordion: Техника выполнения + настройки (equipment вынесен в отдельную секцию).
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { BookOpen, Dumbbell } from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { TechniqueMediaSlider } from '../TechniqueMediaSlider';
import { ExerciseInfoAccordion } from '../ExerciseInfoAccordion';

interface ExerciseCardTechniqueProps {
  technique: string;
  mediaUrl: string | null;
  settingsText: string;
  colors: any;
}

export const ExerciseCardTechnique = memo(function ExerciseCardTechnique({
  technique,
  mediaUrl,
  settingsText,
  colors,
}: ExerciseCardTechniqueProps) {
  const hasTechniqueContent = !!(technique || mediaUrl);
  const hasSettingsContent = !!settingsText;

  if (!hasTechniqueContent && !hasSettingsContent) return null;

  return (
    <ExerciseInfoAccordion
      icon={
        hasTechniqueContent ? (
          <BookOpen size={14} color={colors.primary} />
        ) : (
          <Dumbbell size={14} color={colors.primary} />
        )
      }
      title={hasTechniqueContent ? 'Техника выполнения' : 'Настройки'}
      titleColor={colors.primary}
      maxHeight={hasTechniqueContent ? 900 : 400}
    >
      {hasTechniqueContent && (
        <>
          <TechniqueMediaSlider mediaUrl={mediaUrl} autoPlay />
          {technique ? (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
              ]}
            >
              {technique}
            </Text>
          ) : null}
        </>
      )}
      {settingsText ? (
        <>
          {hasTechniqueContent && (
            <View
              style={{ height: 1, backgroundColor: colors.border, marginVertical: SPACING.sm }}
            />
          )}
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {settingsText}
          </Text>
        </>
      ) : null}
    </ExerciseInfoAccordion>
  );
});