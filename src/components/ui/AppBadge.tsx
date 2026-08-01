import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface AppBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AppBadge({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  style,
  textStyle,
}: AppBadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primaryLight, textColor: colors.primary, borderColor: colors.primary };
      case 'success':
        return { backgroundColor: colors.successLight, textColor: colors.success, borderColor: colors.success };
      case 'warning':
        return { backgroundColor: colors.warningLight, textColor: colors.warning, borderColor: colors.warning };
      case 'error':
        return { backgroundColor: colors.errorLight, textColor: colors.error, borderColor: colors.error };
      case 'info':
        return { backgroundColor: colors.info + '20', textColor: colors.info, borderColor: colors.info };
      default:
        return { backgroundColor: colors.surfaceSecondary, textColor: colors.textSecondary, borderColor: colors.border };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 2, paddingHorizontal: SPACING.sm, fontSize: 11 };
      case 'large':
        return { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, fontSize: 14 };
      default: // medium
        return { paddingVertical: 4, paddingHorizontal: SPACING.sm, fontSize: 12 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ]}
    >
      {icon && <>{icon}</>}
      <Text
        style={[
          typography.buttonTiny,
          {
            color: variantStyles.textColor,
            fontSize: sizeStyles.fontSize,
            marginLeft: icon ? 4 : 0,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});