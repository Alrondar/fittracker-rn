import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, withAlpha, SHADOWS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createProgramCardStyles = (colors: any) =>
  StyleSheet.create({
    // Активная программа
    activeProgramCard: {
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      ...SHADOWS.md,
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
      backgroundColor: withAlpha(colors.textInverse, 0.188),
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
    } as ViewStyle,
    activeProgramButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textInverse,
    } as TextStyle,
    // Последняя тренировка
    lastWorkoutCard: {
      borderRadius: BORDER_RADIUS.xl,
      ...SHADOWS.md,
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
    // Карточка программы
    programCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 2,
      borderColor: colors.primary,
      overflow: 'hidden',
      marginBottom: SPACING.md,
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    } as ViewStyle,
    programCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md + 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    } as ViewStyle,
    programCardFooterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full,
      backgroundColor: withAlpha(colors.primary, 0.082),
    } as ViewStyle,
    programCardFooterPillText: {
      ...typography.buttonTiny,
      color: colors.primary,
      fontWeight: '600',
    } as TextStyle,
    programCardLevelStripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderBottomLeftRadius: BORDER_RADIUS.lg,
    } as ViewStyle,
    programCardEditButton: {
      padding: SPACING.sm,
      marginRight: SPACING.sm,
    } as ViewStyle,
    myProgramBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: withAlpha(colors.primary, 0.125),
    } as ViewStyle,
    myProgramBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    } as TextStyle,
    // Карточка дня программы
    programDayCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 2,
      borderColor: colors.primary,
      overflow: 'hidden',
      marginBottom: SPACING.md,
      elevation: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    } as ViewStyle,
    // Бейджи программы
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
    // Блок расписания
    scheduleBlock: {
      backgroundColor: withAlpha(colors.textInverse, 0.188),
      borderWidth: 1,
      padding: SPACING.md,
      borderColor: withAlpha(colors.textInverse, 0.251),
      borderRadius: BORDER_RADIUS.md,
    } as ViewStyle,
    scheduleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    } as ViewStyle,
    scheduleEditButton: {
      padding: SPACING.xs,
    } as ViewStyle,
    // Карточка тренировки
    workoutCard: {
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.md,
      padding: SPACING.lg,
      ...SHADOWS.sm,
    } as ViewStyle,
    cardTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
      lineHeight: 22,
      color: colors.textPrimary,
    } as TextStyle,
    cardDesc: {
      fontSize: 14,
      marginBottom: SPACING.md,
      color: colors.textSecondary,
    } as TextStyle,
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.sm,
    } as ViewStyle,
    cardDate: {
      fontSize: 13,
      color: colors.textSecondary,
    } as TextStyle,
    openText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    } as TextStyle,
    collapsibleSection: {
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
      ...SHADOWS.sm,
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

export type ProgramCardStyleKey = keyof ReturnType<typeof createProgramCardStyles>;
