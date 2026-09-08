import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

export type PillToggleOption<T extends string> = {
  key: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

type PillToggleProps<T extends string> = {
  options: PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  description?: string;
};

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  description,
}: PillToggleProps<T>) {
  const { colors } = useTheme();

  const handlePress = (key: T) => {
    if (value !== key) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(key);
    }
  };

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceSecondary,
          borderRadius: BORDER_RADIUS.md,
          padding: 2,
        }}
      >
        {options.map(({ key, label, icon: Icon }) => {
          const isSelected = value === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handlePress(key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={label}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  borderRadius: BORDER_RADIUS.sm,
                  // Лёгкая тень для активного элемента для усиления "pill" эффекта
                  ...(isSelected
                    ? {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                      }
                    : {}),
                },
              ]}
            >
              {Icon && (
                <Icon
                  size={18}
                  color={isSelected ? colors.textInverse : colors.textSecondary}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              )}
              <Text
                style={[
                  typography.label,
                  {
                    color: isSelected ? colors.textInverse : colors.textSecondary,
                    fontWeight: isSelected ? '600' : '400',
                    marginTop: Icon ? SPACING.xs : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {description && (
        <Text
          style={[
            typography.caption,
            { color: colors.textTertiary, marginTop: SPACING.sm, lineHeight: 16 },
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flex: 1,
    paddingVertical: SPACING.md, // Обеспечивает tap target >= 44pt
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
