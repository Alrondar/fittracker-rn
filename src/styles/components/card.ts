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
      justifyContent: 'flex-end',
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
    // Карточка активной программы
    activeProgramCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } as ViewStyle,
    activeProgramHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    } as ViewStyle,
    activeProgramTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    } as ViewStyle,
    activeProgramLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    } as TextStyle,
    activeProgramName: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: SPACING.md,
      lineHeight: 24,
    } as TextStyle,
    activeProgramInfo: {
      flexDirection: 'row',
      gap: SPACING.lg,
      marginBottom: SPACING.lg,
    } as ViewStyle,
    activeProgramInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    } as ViewStyle,
    activeProgramInfoText: {
      fontSize: 13,
      fontWeight: '500',
    } as TextStyle,
    activeProgramButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
    } as ViewStyle,
    activeProgramButtonText: {
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    // Карточка последней тренировки
    lastWorkoutCard: {
      borderRadius: BORDER_RADIUS.xl,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    } as ViewStyle,
    lastWorkoutContent: {
      padding: SPACING.xl,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,
    lastWorkoutInfo: {
      flex: 1,
    } as ViewStyle,
    lastWorkoutName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
    } as TextStyle,
    lastWorkoutDate: {
      fontSize: 14,
    } as TextStyle,
    // Пустая карточка
    emptyCard: {
      padding: SPACING.xl,
      borderRadius: BORDER_RADIUS.xl,
      elevation: 2,
    } as ViewStyle,
    // Карточка тренировки
    workoutCard: {
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.md,
      padding: SPACING.lg,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } as ViewStyle,
    programBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    badgeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    programBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,
    cardTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
      lineHeight: 22,
    } as TextStyle,
    cardDesc: {
      fontSize: 14,
      marginBottom: SPACING.md,
    } as TextStyle,
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.sm,
    } as ViewStyle,
    cardDate: {
      fontSize: 13,
    } as TextStyle,
    openText: {
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    collapsibleSection: {
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } as ViewStyle,
    collapsibleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
    } as ViewStyle,
    collapsibleContent: {
      padding: SPACING.md,
    } as ViewStyle,
  });

export type CardStyleKey = keyof ReturnType<typeof createCardStyles>;