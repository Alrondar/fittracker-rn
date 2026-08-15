// src/components/workout/sections/ExerciseCardTechnique.tsx
// Accordion: Техника выполнения + настройки (equipment вынесен в отдельную секцию).
// UX-2: Вариант A — полные подзаголовки с иконками для единообразия с «Важно знать».
// Subheadings: Демонстрация / Описание техники / Настройки оборудования.
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import {
  BookOpen,
  Dumbbell,
  PlayCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { TechniqueMediaSlider } from '../TechniqueMediaSlider';
import { ExerciseInfoAccordion } from '../ExerciseInfoAccordion';

interface ExerciseCardTechniqueProps {
  technique: string;
  mediaUrl: string | null;
  settingsText: string;
  defaultExpanded?: boolean;
  colors: any;
}

/** Подзаголовок внутри секции — иконка + label, как в «Важно знать». */
function SectionSubheading({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
      {icon}
      <Text style={[typography.captionSmall, { color, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

export const ExerciseCardTechnique = memo(function ExerciseCardTechnique({
  technique,
  mediaUrl,
  settingsText,
  defaultExpanded = false,
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
      defaultExpanded={defaultExpanded}
    >
      {hasTechniqueContent && (
        <>
          {/* Демонстрация — media slider */}
          {mediaUrl ? (
            <View style={{ marginBottom: SPACING.sm }}>
              <SectionSubheading
                icon={<PlayCircle size={12} color={colors.primary} />}
                label="Демонстрация"
                color={colors.primary}
              />
              <TechniqueMediaSlider mediaUrl={mediaUrl} autoPlay />
            </View>
          ) : null}

          {/* Описание техники — текст */}
          {technique ? (
            <View style={{ marginBottom: SPACING.sm }}>
              <SectionSubheading
                icon={<FileText size={12} color={colors.textPrimary} />}
                label="Описание техники"
                color={colors.textPrimary}
              />
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18 },
                ]}
              >
                {technique}
              </Text>
            </View>
          ) : null}
        </>
      )}

      {/* Настройки оборудования — подзаголовок только если есть техника */}
      {settingsText ? (
        <View>
          {hasTechniqueContent && (
            <SectionSubheading
              icon={<SlidersHorizontal size={12} color={colors.textPrimary} />}
              label="Настройки оборудования"
              color={colors.textPrimary}
            />
          )}
          <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
            {settingsText}
          </Text>
        </View>
      ) : null}
    </ExerciseInfoAccordion>
  );
});
