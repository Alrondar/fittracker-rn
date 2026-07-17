import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AppCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'compact' | 'highlighted';
  style?: ViewStyle;
  onPress?: () => void; // Если передан, карточка становится кликабельной
}

export function AppCard({ children, variant = 'default', style, onPress }: AppCardProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return { padding: SPACING.md, marginBottom: SPACING.sm };
      case 'highlighted':
        return { padding: SPACING.xl, marginBottom: SPACING.md, elevation: 4, shadowOpacity: 0.15 };
      default:
        return { padding: SPACING.lg, marginBottom: SPACING.md, elevation: 2, shadowOpacity: 0.08 };
    }
  };

  const Container = onPress ? require('react-native').TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.card,
        { 
          backgroundColor: colors.surface, 
          borderColor: variant === 'highlighted' ? colors.primary : colors.border,
          borderWidth: variant === 'highlighted' ? 1.5 : 1,
        },
        getVariantStyles(),
        style,
      ]}
    >
      {children}
    </Container>
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