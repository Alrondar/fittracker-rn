// src/components/workout/sections/ExerciseCardKnowledge.tsx
// Accordion "Важно знать": benefits / risks / injuries (только для основной карточки).
// PR7: подзаголовки через SectionSubheading — единообразие с «Техника выполнения» (CLAUDE.md §9).
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { ExerciseInfoAccordion } from '../ExerciseInfoAccordion';
import { SectionSubheading } from './ExerciseCardTechnique';

interface ExerciseCardKnowledgeProps {
  benefits: string;
  risks: string;
  injuries: string[];
  defaultExpanded?: boolean;
  colors: any;
}

export const ExerciseCardKnowledge = memo(function ExerciseCardKnowledge({
  benefits,
  risks,
  injuries,
  defaultExpanded = false,
  colors,
}: ExerciseCardKnowledgeProps) {
  if (!benefits && !risks && injuries.length === 0) return null;

  return (
    <ExerciseInfoAccordion
      icon={<ShieldAlert size={14} color={colors.warning} />}
      title="Важно знать"
      titleColor={colors.warning}
      maxHeight={600}
      defaultExpanded={defaultExpanded}
    >
      {benefits ? (
        <View style={{ marginBottom: SPACING.sm }}>
          <SectionSubheading
            icon={<Sparkles size={12} color={colors.success} />}
            label="Польза"
            color={colors.success}
          />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {benefits}
          </Text>
        </View>
      ) : null}

      {risks ? (
        <View style={{ marginBottom: SPACING.sm }}>
          <SectionSubheading
            icon={<AlertTriangle size={12} color={colors.warning} />}
            label="Риски"
            color={colors.warning}
          />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {risks}
          </Text>
        </View>
      ) : null}

      {injuries.length > 0 ? (
        <View>
          <SectionSubheading
            icon={<ShieldAlert size={12} color={colors.error} />}
            label="Противопоказания"
            color={colors.error}
          />
          {injuries.map((inj, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
              <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, flex: 1 }]}>
                {inj}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ExerciseInfoAccordion>
  );
});