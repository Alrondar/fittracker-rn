import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { PressableScale } from './PressableScale';

interface AppCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'highlighted';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function AppCard({ children, variant = 'default', style, onPress }: AppCardProps) {
  const { colors } = useTheme();

  const variantStyles = StyleSheet.create({
    compact: {
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    highlighted: {
      padding: SPACING.xl,
      marginBottom: SPACING.md,
      ...SHADOWS.md,
    },
    default: {
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...SHADOWS.sm,
    },
  });

  const currentVariantStyle = variantStyles[variant];

  // Автоматическая обёртка строк/чисел в <Text>
  const renderChildren = () => {
    if (typeof children === 'string' || typeof children === 'number') {
      return <Text style={{ color: colors.textPrimary }}>{children}</Text>;
    }
    return children;
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: variant === 'highlighted' ? colors.primary : colors.border,
      borderWidth: variant === 'highlighted' ? 1.5 : 1,
    },
    currentVariantStyle,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        // Карточки крупнее кнопок — масштаб мягче.
        scaleTo={0.985}
        style={cardStyle}
      >
        {renderChildren()}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{renderChildren()}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
  },
});
