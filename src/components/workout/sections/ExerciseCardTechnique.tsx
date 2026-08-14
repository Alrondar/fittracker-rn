// src/components/workout/sections/ExerciseCardTechnique.tsx
// Accordion: Техника выполнения + Оборудование и настройки
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { BookOpen, Dumbbell } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { EquipmentIcon } from '../../EquipmentIcon';
import { TechniqueMediaSlider } from '../TechniqueMediaSlider';
import { ExerciseInfoAccordion } from '../ExerciseInfoAccordion';

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface ExerciseCardTechniqueProps {
  technique: string;
  mediaUrl: string | null;
  equipment: string[];
  settingsText: string;
  primaryMuscles: string[];
  colors: any;
}

export const ExerciseCardTechnique = memo(function ExerciseCardTechnique({
  technique,
  mediaUrl,
  equipment,
  settingsText,
  primaryMuscles,
  colors,
}: ExerciseCardTechniqueProps) {
  const hasTechniqueContent = !!(technique || mediaUrl);
  const hasEquipmentContent = equipment.length > 0 || !!settingsText;

  if (!hasTechniqueContent && !hasEquipmentContent) return null;

  return (
    <ExerciseInfoAccordion
      icon={
        hasTechniqueContent ? (
          <BookOpen size={14} color={colors.primary} />
        ) : (
          <Dumbbell size={14} color={colors.primary} />
        )
      }
      title={hasTechniqueContent ? 'Техника выполнения' : 'Оборудование и настройки'}
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
      {equipment.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: hasTechniqueContent ? SPACING.md : 0,
          }}
        >
          {equipment.map((eq, i) => (
            <View
              key={`eq-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: SPACING.md,
                paddingVertical: 6,
                borderRadius: BORDER_RADIUS.full,
              }}
            >
              <EquipmentIcon name={eq} size={32} primaryMuscles={primaryMuscles} />
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textSecondary, fontWeight: '600' },
                ]}
              >
                {formatEquipmentName(eq)}
              </Text>
            </View>
          ))}
        </View>
      )}
      {settingsText ? (
        <>
          {(hasTechniqueContent || equipment.length > 0) && (
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginVertical: SPACING.sm,
              }}
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