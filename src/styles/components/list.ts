import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

export const createListStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: SPACING.lg,
      paddingTop: 0,
      paddingBottom: 100,
    } as ViewStyle,

    item: {
      flexDirection: 'row',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: colors.surface,
    } as ViewStyle,

    selected: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    } as ViewStyle,

    info: {
      flex: 1,
    } as ViewStyle,

    name: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,

    muscles: {
      ...typography.captionSmall,
      marginTop: 2,
      color: colors.textSecondary,
    } as TextStyle,

    recentCard: {
      backgroundColor: colors.surface,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      elevation: 2,
    } as ViewStyle,
    
    recentInfo: {
      flex: 1,
    } as ViewStyle,
    
    recentName: {
      ...typography.h5,
      marginBottom: SPACING.xs,
      color: colors.textPrimary,
    } as TextStyle,
    
    recentDate: {
      ...typography.body,
      color: colors.textSecondary,
    } as TextStyle,

    quickAction: {
      flex: 1,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      backgroundColor: colors.surface,
      elevation: 2,
    } as ViewStyle,
    
    quickActionText: {
      ...typography.buttonTiny,
      marginTop: SPACING.sm,
      color: colors.textPrimary,
    } as TextStyle,

    exerciseRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: SPACING.md,
    } as ViewStyle,
    
    exerciseMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.xs,
    } as ViewStyle,
    
    exerciseSets: {
      ...typography.bodySmall,
      fontWeight: '500',
      color: colors.textSecondary,
    } as TextStyle,
    
    exerciseRest: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    
    exerciseRestText: {
      ...typography.captionSmall,
      color: colors.textSecondary,
    } as TextStyle,

// Контейнер списка тренировок
workoutList: {
  padding: SPACING.lg,
  paddingTop: 0,
  paddingBottom: 100,
} as ViewStyle,

  });

  

export type ListStyleKey = keyof ReturnType<typeof createListStyles>;