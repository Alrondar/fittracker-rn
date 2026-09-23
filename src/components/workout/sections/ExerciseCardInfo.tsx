// src/components/workout/sections/ExerciseCardInfo.tsx
// UX-16 D3: Info tabs вместо двух отдельных аккордеонов Technique/Knowledge.
// PillToggle для переключения табов "Техника" / "Важно знать".
// Lazy mount: контент не монтируется до первого открытия.
import React, { memo, useState } from 'react';
import { View, Text } from 'react-native';
import {
  BookOpen,
  PlayCircle,
  FileText,
  SlidersHorizontal,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';
import { SPACING } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { PillToggle } from '../../ui/PillToggle';
import { TechniqueMediaSlider } from '../TechniqueMediaSlider';
import { SectionSubheading } from './ExerciseCardTechnique';

type InfoTab = 'technique' | 'knowledge';

interface ExerciseCardInfoProps {
  technique: string;
  mediaUrl: string | null;
  settingsText: string;
  benefits: string;
  risks: string;
  injuries: string[];
  colors: any;
}

export const ExerciseCardInfo = memo(function ExerciseCardInfo({
  technique,
  mediaUrl,
  settingsText,
  benefits,
  risks,
  injuries,
  colors,
}: ExerciseCardInfoProps) {
  const hasTechnique = !!(technique || mediaUrl || settingsText);
  const hasKnowledge = !!(benefits || risks || injuries.length > 0);

  // Если только один таб — не показываем переключатель
  const hasBoth = hasTechnique && hasKnowledge;
  const [activeTab, setActiveTab] = useState<InfoTab>(hasTechnique ? 'technique' : 'knowledge');

  if (!hasTechnique && !hasKnowledge) return null;

  return (
    <View style={{ marginTop: SPACING.md }}>
      {/* PillToggle для табов */}
      {hasBoth && (
        <View style={{ marginBottom: SPACING.md }}>
          <PillToggle
            options={[
              { key: 'technique' as const, label: 'Техника', icon: BookOpen },
              { key: 'knowledge' as const, label: 'Важно знать', icon: ShieldAlert },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>
      )}

      {/* Контент табов */}
      <View>
        {/* Техника */}
        {activeTab === 'technique' && hasTechnique && (
          <View>
            {/* Демонстрация — media slider */}
            {mediaUrl && (
              <View style={{ marginBottom: SPACING.sm }}>
                <SectionSubheading
                  icon={<PlayCircle size={12} color={colors.primary} />}
                  label="Демонстрация"
                  color={colors.primary}
                />
                <TechniqueMediaSlider mediaUrl={mediaUrl} autoPlay />
              </View>
            )}

            {/* Описание техники */}
            {technique && (
              <View style={{ marginBottom: SPACING.sm }}>
                <SectionSubheading
                  icon={<FileText size={12} color={colors.textPrimary} />}
                  label="Описание техники"
                  color={colors.textPrimary}
                />
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}
                >
                  {technique}
                </Text>
              </View>
            )}

            {/* Настройки оборудования */}
            {settingsText && (
              <View>
                {hasTechnique && (
                  <SectionSubheading
                    icon={<SlidersHorizontal size={12} color={colors.textPrimary} />}
                    label="Настройки оборудования"
                    color={colors.textPrimary}
                  />
                )}
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}
                >
                  {settingsText}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Важно знать */}
        {activeTab === 'knowledge' && hasKnowledge && (
          <View>
            {benefits && (
              <View style={{ marginBottom: SPACING.sm }}>
                <SectionSubheading
                  icon={<Sparkles size={12} color={colors.success} />}
                  label="Польза"
                  color={colors.success}
                />
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}
                >
                  {benefits}
                </Text>
              </View>
            )}

            {risks && (
              <View style={{ marginBottom: SPACING.sm }}>
                <SectionSubheading
                  icon={<AlertTriangle size={12} color={colors.warning} />}
                  label="Риски"
                  color={colors.warning}
                />
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}
                >
                  {risks}
                </Text>
              </View>
            )}

            {injuries.length > 0 && (
              <View>
                <SectionSubheading
                  icon={<ShieldAlert size={12} color={colors.error} />}
                  label="Противопоказания"
                  color={colors.error}
                />
                {injuries.map((inj, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>
                      •
                    </Text>
                    <Text
                      style={[
                        typography.bodySmall,
                        {
                          color: colors.textSecondary,
                          lineHeight: 18,
                          flex: 1,
                        },
                      ]}
                    >
                      {inj}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Empty state для отсутствующего таба */}
        {activeTab === 'technique' && !hasTechnique && (
          <View style={{ padding: SPACING.md, alignItems: 'center' }}>
            <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>
              Нет данных по технике
            </Text>
          </View>
        )}
        {activeTab === 'knowledge' && !hasKnowledge && (
          <View style={{ padding: SPACING.md, alignItems: 'center' }}>
            <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>Нет данных</Text>
          </View>
        )}
      </View>
    </View>
  );
});
