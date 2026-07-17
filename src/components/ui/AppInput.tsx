import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function AppInput({
  label,
  error,
  icon,
  containerStyle,
  style,
  ...props
}: AppInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            icon ? styles.inputWithIcon : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...typography.labelBold,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: SPACING.md,
  },
  inputWithIcon: {
    marginLeft: 0,
  },
  error: {
    ...typography.captionSmall,
    marginTop: SPACING.xs,
  },
});