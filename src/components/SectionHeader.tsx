import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;      // акцентный цвет (иконка/фон); по умолчанию colors.textPrimary
  count?: number;      // счётчик справа (например, число тренировок)
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  color,
  count,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();
  const accentColor = color || colors.textPrimary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View style={styles.content}>
        {icon && (
          <View style={[styles.iconWrapper, { backgroundColor: accentColor + '18' }]}>
            {icon}
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[typography.h5, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text
              style={[
                typography.captionSmall,
                { color: colors.textSecondary, fontWeight: '600' },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.sm,
  },
});