import React from 'react';
import { Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, fontScale } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary, textColor: colors.textInverse };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          textColor: colors.primary,
          borderWidth: 1,
        };
      case 'danger':
        return { backgroundColor: colors.error, textColor: colors.textInverse };
      case 'ghost':
        return { backgroundColor: 'transparent', textColor: colors.primary };
      default:
        return { backgroundColor: colors.primary, textColor: colors.textInverse };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
          fontSize: fontScale(14),
        };
      case 'large':
        return {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING.xl,
          fontSize: fontScale(18),
        };
      default:
        return {
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.lg,
          fontSize: fontScale(16),
        }; // medium
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      // UX-1: spring-масштаб вместо activeOpacity; лёгкая хаптика на месте —
      // кнопка это дискретное действие (light — общий язык press).
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        {
          backgroundColor: isDisabled ? colors.border : variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              typography.button,
              {
                color: isDisabled ? colors.textTertiary : variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
                marginLeft: icon ? SPACING.sm : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
