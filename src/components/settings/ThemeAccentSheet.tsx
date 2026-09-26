// src/components/settings/ThemeAccentSheet.tsx
// DA-P2-8: sheet выбора цветовой схемы (вынесен из app/profile/settings.tsx).
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import {
  SPACING,
  BORDER_RADIUS,
  withAlpha,
  ThemeAccent,
  ThemeKey,
  themes,
} from '../../constants/theme';
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
      {/* UX-3c (I-8): live-preview. setThemeAccent перекрашивает контекст
          синхронно — этот блок и всё приложение за шторкой меняются сразу;
          global-переход анимирует ThemeCrossFade. */}
      <View
        style={{
          padding: SPACING.md,
          borderRadius: BORDER_RADIUS.lg,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: SPACING.md,
        }}
      >
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, marginBottom: SPACING.sm, fontWeight: '600' },
          ]}
        >
          ПРЕДПРОСМОТР
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View
            style={{
              paddingHorizontal: SPACING.md,
              paddingVertical: 8,
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: colors.primary,
            }}
          >
            <Text
              style={[typography.captionSmall, { color: colors.textInverse, fontWeight: '700' }]}
            >
              Начать
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: BORDER_RADIUS.md,
              backgroundColor: colors.successLight,
            }}
          >
            <Text
              style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '700' }]}
            >
              92.5 × 8
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: SPACING.md,
              paddingVertical: 8,
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: withAlpha(colors.warning, 0.125),
              borderWidth: 1,
              borderColor: colors.warning,
            }}
          >
            <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
              Боль
            </Text>
          </View>
        </View>
        {/* прогресс-бар «Подходы 3/4» — акцентная заливка */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.borderLight,
            marginTop: SPACING.md,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: '75%',
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
      <FlatList
        data={availableAccents}
        renderItem={renderOption}
        keyExtractor={(item) => item.key}
        scrollEnabled={false}
      />
    </SheetShell>
  );
}
