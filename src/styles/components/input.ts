import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

export const createInputStyles = (colors: any) =>
  StyleSheet.create({
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      ...typography.body,
      color: colors.textPrimary,
    } as ViewStyle,

    textArea: {
      height: 80,
      textAlignVertical: 'top',
    } as ViewStyle,

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: SPACING.sm,
    } as ViewStyle,

    searchInput: {
      flex: 1,
      ...typography.body,
      padding: 0,
      color: colors.textPrimary,
    } as TextStyle,

    setInput: {
      ...typography.body,
      textAlign: 'center',
      width: '100%',
      color: colors.textPrimary,
    } as TextStyle,

    dataCell: {
      flex: 1,
      marginHorizontal: 2,
      padding: 4,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    
    dataText: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,

    label: {
      ...typography.labelBold,
      color: colors.textPrimary,
      marginBottom: 8,
    } as TextStyle,

    placeholder: {
      color: colors.textTertiary,
    } as TextStyle,
  });

export type InputStyleKey = keyof ReturnType<typeof createInputStyles>;