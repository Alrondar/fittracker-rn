// src/components/settings/AppearanceSection.tsx
// DA-P2-8: секция «Внешний вид» + sheet выбора цветовой схемы.
import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Palette, Sun, Moon, Monitor } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { commonStyles } from '../../styles/common';
import { createCardStyles } from '../../styles/components/card';
import { typography } from '../../styles/typography';
import { PillToggle } from '../ui/PillToggle';
import { LinkRow, SectionTitle } from './SettingsRows';
import { ThemeAccentSheet } from './ThemeAccentSheet';

export function AppearanceSection() {
  const { colors, themeMode, themeAccent, setThemeMode, availableAccents } = useTheme();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const [showThemeModal, setShowThemeModal] = useState(false);

  return (
    <View style={commonStyles.section}>
      <SectionTitle title="Внешний вид" />
      <View
        style={[
          cardStyles.compact,
          { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.md },
        ]}
      >
        <Text
          style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.md }]}
        >
          Тема оформления
        </Text>
        <PillToggle
          options={[
            { key: 'light', label: 'Светлая', icon: Sun },
            { key: 'dark', label: 'Тёмная', icon: Moon },
            { key: 'system', label: 'Авто', icon: Monitor },
          ]}
          value={themeMode}
          onChange={setThemeMode}
        />
      </View>

      <LinkRow
        icon={Palette}
        title="Цветовая схема"
        description={availableAccents.find((a) => a.key === themeAccent)?.label || 'Синяя'}
        onPress={() => setShowThemeModal(true)}
      />

      <ThemeAccentSheet visible={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </View>
  );
}
