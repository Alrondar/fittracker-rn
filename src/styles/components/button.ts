import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

export const createButtonStyles = (colors: any) =>
  StyleSheet.create({
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    large: {
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.xl,
    } as ViewStyle,
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    danger: {
      backgroundColor: colors.error,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    finish: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: 20,
    } as ViewStyle,
    textPrimary: {
      ...typography.button,
      color: colors.textInverse,
    } as TextStyle,
    textSecondary: {
      ...typography.buttonSmall,
      color: colors.primary,
    } as TextStyle,
    textDanger: {
      ...typography.button,
      color: colors.textInverse, // ✅ ИСПРАВЛЕНО
    } as TextStyle,
    textFinish: {
      ...typography.buttonSmall,
      color: colors.textInverse, // ✅ ИСПРАВЛЕНО
    } as TextStyle,
    disabled: {
      opacity: 0.5,
    } as ViewStyle,
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    } as ViewStyle,
    rest: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.md,
    } as ViewStyle,
    restText: {
      color: colors.textInverse, // ✅ ИСПРАВЛЕНО
      fontWeight: 'bold',
      fontSize: 14,
    } as TextStyle,
    replace: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
    } as ViewStyle,
    replaceText: {
      color: colors.textInverse, // ✅ ИСПРАВЛЕНО
      fontWeight: 'bold',
      fontSize: 14,
    } as TextStyle,
  });

export type ButtonStyleKey = keyof ReturnType<typeof createButtonStyles>;