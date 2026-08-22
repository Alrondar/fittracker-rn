import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

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
      elevation: 4,
      shadowOpacity: 0.15,
    },
    default: {
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      elevation: 2,
      shadowOpacity: 0.08,
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
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyle}
      >
        {renderChildren()}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {renderChildren()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});