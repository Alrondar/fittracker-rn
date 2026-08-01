import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createSheetCardStyles = (colors: any) =>
  StyleSheet.create({
    // Bottom Sheet
    sheetContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: SPACING.lg,
    } as ViewStyle,
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    } as ViewStyle,
    sheetTitle: {
      ...typography.h5,
      color: colors.textPrimary,
    } as TextStyle,
    sheetField: {
      marginBottom: SPACING.lg,
    } as ViewStyle,
    sheetLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    } as TextStyle,
    sheetInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    } as TextStyle,
    sheetTextarea: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      minHeight: 100,
      textAlignVertical: 'top',
    } as TextStyle,
    sheetRow: {
      flexDirection: 'row',
      gap: SPACING.md,
    } as ViewStyle,
    sheetSelect: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,
    sheetSelectText: {
      fontSize: 16,
      color: colors.textPrimary,
    } as TextStyle,

    // Блок расписания
    scheduleBlock: {
      backgroundColor: colors.textInverse + '30',
      borderWidth: 1,
      padding: SPACING.md,
      borderColor: colors.textInverse + '40',
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

    // Карточка дня
    dayCardContainer: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: SPACING.md,
    } as ViewStyle,
    dayCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
    } as ViewStyle,
    dayCardLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    } as ViewStyle,
    dayCardGripButton: {
      marginRight: SPACING.sm,
      padding: SPACING.xs,
      zIndex: 10,
    } as ViewStyle,
    dayCardNumberCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
      backgroundColor: colors.primary + '20',
    } as ViewStyle,
    dayCardNumberText: {
      ...typography.h5,
      color: colors.primary,
    } as TextStyle,
    dayCardInfo: {
      flex: 1,
    } as ViewStyle,
    dayCardName: {
      ...typography.labelBold,
      color: colors.textPrimary,
      marginBottom: 2,
    } as TextStyle,
    dayCardExerciseCount: {
      ...typography.captionSmall,
      color: colors.textSecondary,
    } as TextStyle,
    dayCardSettingsButton: {
      padding: SPACING.sm,
      marginRight: SPACING.xs,
    } as ViewStyle,
    dayCardChevronButton: {
      padding: SPACING.xs,
    } as ViewStyle,
    dayCardExercisesContainer: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
    } as ViewStyle,
    dayCardExerciseRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: SPACING.sm,
    } as ViewStyle,
    dayCardExerciseContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
    } as ViewStyle,
    dayCardExerciseGrip: {
      paddingTop: SPACING.xs,
    } as ViewStyle,
    dayCardExerciseTouchable: {
      flex: 1,
    } as ViewStyle,
    dayCardExerciseName: {
      ...typography.labelBold,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
      lineHeight: 18,
    } as TextStyle,
    dayCardExerciseMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.xs,
    } as ViewStyle,
    dayCardExerciseMetaText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '500',
    } as TextStyle,
    dayCardExerciseRest: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    dayCardExerciseRestText: {
      ...typography.captionSmall,
      color: colors.textSecondary,
    } as TextStyle,
    dayCardExerciseDelete: {
      padding: SPACING.sm,
    } as ViewStyle,
    dayCardAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      marginTop: SPACING.sm,
    } as ViewStyle,
    dayCardAddButtonText: {
      ...typography.labelBold,
      color: colors.primary,
      marginLeft: SPACING.sm,
    } as TextStyle,
  });

export type SheetCardStyleKey = keyof ReturnType<typeof createSheetCardStyles>;