// src/components/settings/ThemeAccentSheet.tsx
// DA-P2-8: sheet выбора цветовой схемы (вынесен из app/profile/settings.tsx).
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, ThemeAccent, ThemeKey, themes } from '../../constants/theme';
import { createCardStyles } from '../../styles/components/card';
import { typography } from '../../styles/typography';
import { SheetShell } from '../ui/SheetShell';

type AccentOption = { key: ThemeAccent; label: string; keys: ThemeKey[] };

export function ThemeAccentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, themeAccent, setThemeAccent, availableAccents } = useTheme();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);

  const renderOption = ({ item }: { item: AccentOption }) => {
    const isSelected = themeAccent === item.key;
    const currentTheme = themes[item.keys[0]];
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`Цветовая схема: ${item.label}`}
        style={[
          cardStyles.container,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACING.sm,
          },
        ]}
        onPress={() => {
          setThemeAccent(item.key);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.primary,
              }}
            />
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.success,
              }}
            />
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: currentTheme.colors.warning,
              }}
            />
          </View>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>{item.label}</Text>
        </View>
        {isSelected && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SheetShell visible={visible} title="Выберите цветовую схему" onClose={onClose}>
      <FlatList
        data={availableAccents}
        renderItem={renderOption}
        keyExtractor={(item) => item.key}
        scrollEnabled={false}
      />
    </SheetShell>
  );
}
