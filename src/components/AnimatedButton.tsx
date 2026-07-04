import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const variants = {
    primary: {
      backgroundColor: COLORS.primary,
      textColor: COLORS.textInverse,
    },
    secondary: {
      backgroundColor: COLORS.primaryLight,
      textColor: COLORS.primary,
    },
    danger: {
      backgroundColor: COLORS.error,
      textColor: COLORS.textInverse,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: COLORS.primary,
    },
  };

  const sizes = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    medium: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 16 },
    large: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 18 },
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? COLORS.border : currentVariant.backgroundColor,
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
          },
          variant === 'ghost' && styles.ghostBorder,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={currentVariant.textColor} size="small" />
        ) : (
          <>
            {icon && <Text style={[styles.icon, { color: currentVariant.textColor }]}>{icon}</Text>}
            <Text
              style={[
                styles.text,
                { color: disabled ? COLORS.textTertiary : currentVariant.textColor, fontSize: currentSize.fontSize },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  icon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  text: {
    fontWeight: '600',
  },
});