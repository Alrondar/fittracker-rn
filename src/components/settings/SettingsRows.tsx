// src/components/settings/SettingsRows.tsx
// DA-P2-8: общие строки экрана настроек (экран >500 строк → split).
import React, { useMemo } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';
import { commonStyles } from '../../styles/common';
import { typography } from '../../styles/typography';

type RowProps = {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
};

export function ToggleRow({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  onToggle,
}: RowProps & {
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);

  return (
    <View
      style={[
        cardStyles.compact,
        { borderColor: colors.border, borderWidth: 1, marginBottom: SPACING.sm },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Icon size={20} color={iconColor ?? colors.primary} style={{ marginRight: SPACING.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>{title}</Text>
            {description ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => {
            onToggle(v);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textInverse}
        />
      </View>
    </View>
  );
}

export function LinkRow({
  icon: Icon,
  iconColor,
  title,
  description,
  onPress,
}: RowProps & { onPress: () => void }) {
  const { colors } = useTheme();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        onPress();
      }}
      style={[
        cardStyles.compact,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderColor: colors.border,
          borderWidth: 1,
          marginBottom: SPACING.sm,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Icon size={20} color={iconColor ?? colors.primary} style={{ marginRight: SPACING.sm }} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.label, { color: colors.textPrimary }]}>{title}</Text>
          {description ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[commonStyles.sectionTitle, { color: colors.textPrimary, marginBottom: SPACING.md }]}
    >
      {title}
    </Text>
  );
}
