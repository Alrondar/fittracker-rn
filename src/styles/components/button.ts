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
      color: '#ffffff',
    } as TextStyle,

    textFinish: {
      ...typography.buttonSmall,
      color: 'white',
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
      ...typography.buttonSmall,
      color: 'white',
    } as TextStyle,

    replace: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
    } as ViewStyle,
    
    replaceText: {
      ...typography.buttonSmall,
      color: 'white',
    } as TextStyle,
  });

export type ButtonStyleKey = keyof ReturnType<typeof createButtonStyles>;