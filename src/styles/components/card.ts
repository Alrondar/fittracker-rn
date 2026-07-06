import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

export const createCardStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } as ViewStyle,
    
    compact: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    } as ViewStyle,

    large: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.xl,
      marginBottom: SPACING.md,
      elevation: 4,
    } as ViewStyle,

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    } as ViewStyle,

    title: {
      ...typography.h5,
      marginBottom: SPACING.xs,
      color: colors.textPrimary,
    } as TextStyle,

    description: {
      ...typography.body,
      marginBottom: SPACING.md,
      color: colors.textSecondary,
    } as TextStyle,

    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.sm,
    } as ViewStyle,

    date: {
      ...typography.caption,
      color: colors.textSecondary,
    } as TextStyle,

    statCard: {
      flex: 1,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      elevation: 2,
    } as ViewStyle,
    
    statValue: {
      ...typography.h3,
      marginBottom: SPACING.xs,
    } as TextStyle,
    
    statLabel: {
      ...typography.caption,
    } as TextStyle,

    exerciseCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      elevation: 2,
    } as ViewStyle,
    
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    } as ViewStyle,
    
    exerciseNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    } as ViewStyle,
    
    exerciseNumberText: {
      ...typography.labelBold,
    } as TextStyle,
    
    exerciseInfo: {
      flex: 1,
    } as ViewStyle,
    
    exerciseName: {
      ...typography.h5,
      color: colors.textPrimary,
    } as TextStyle,
    
    exerciseMuscles: {
      ...typography.captionSmall,
      marginTop: 2,
      color: colors.textSecondary,
    } as TextStyle,

    logsList: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: SPACING.md,
    } as ViewStyle,
    
    logRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: SPACING.sm,
    } as ViewStyle,
    
    logSet: {
      ...typography.body,
      color: colors.textSecondary,
    } as TextStyle,
    
    logResult: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,
  });

export type CardStyleKey = keyof ReturnType<typeof createCardStyles>;