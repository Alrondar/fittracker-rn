import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createEmptyCardStyles = (colors: any) =>
  StyleSheet.create({
    // Пустое состояние
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xxl,
      marginTop: 40,
    } as ViewStyle,
    emptyStateTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: SPACING.sm,
    } as TextStyle,
    emptyStateText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.lg,
    } as TextStyle,

    // FAB
    fab: {
      position: 'absolute',
      bottom: SPACING.xl,
      right: SPACING.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    } as ViewStyle,

    // Меню действий
    actionMenu: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.sm,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } as ViewStyle,
    actionMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
    } as ViewStyle,
    actionMenuItemDanger: {
      backgroundColor: colors.error + '10',
    } as ViewStyle,
    actionMenuText: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,
    actionMenuTextDanger: {
      color: colors.error,
    } as TextStyle,
  });

export type EmptyCardStyleKey = keyof ReturnType<typeof createEmptyCardStyles>;