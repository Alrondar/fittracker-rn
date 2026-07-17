import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createExerciseCardStyles = (colors: any) =>
  StyleSheet.create({
    // Список упражнений
    exerciseListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: SPACING.md,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } as ViewStyle,
    exerciseListItemIcon: {
      width: 50,
      height: 50,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 50,
      backgroundColor: colors.primaryLight,
    } as ViewStyle,
    exerciseListItemContent: {
      flex: 1,
    } as ViewStyle,
    exerciseListItemName: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,
    exerciseListItemMuscles: {
      ...typography.captionSmall,
      color: colors.textSecondary,
      marginTop: SPACING.xs,
    } as TextStyle,

    // Детальная страница упражнения
    exerciseDetailHeader: {
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,
    exerciseDetailIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.lg,
      backgroundColor: colors.primaryLight,
    } as ViewStyle,
    exerciseDetailName: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: SPACING.xl,
    } as TextStyle,
    exerciseDetailSection: {
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: SPACING.md,
      marginHorizontal: SPACING.lg,
    } as ViewStyle,
    exerciseDetailSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    exerciseDetailSectionTitle: {
      ...typography.h5,
      color: colors.textPrimary,
    } as TextStyle,
    exerciseDetailSectionText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    } as TextStyle,
    exerciseDetailMuscleSection: {
      marginBottom: SPACING.lg,
    } as ViewStyle,
    exerciseDetailMuscleTitle: {
      ...typography.h5,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
    } as TextStyle,
    exerciseDetailMuscleList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    } as ViewStyle,
    exerciseDetailInjuryText: {
      ...typography.body,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
      lineHeight: 22,
    } as TextStyle,

    // Медиа
    exerciseDetailMediaContainer: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSecondary,
      position: 'relative',
      marginTop: SPACING.md,
    } as ViewStyle,
    exerciseDetailMediaImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    } as ViewStyle,
    exerciseDetailMediaIndicators: {
      position: 'absolute',
      bottom: 12,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      zIndex: 2,
    } as ViewStyle,
    exerciseDetailMediaDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textTertiary + '60',
    } as ViewStyle,

    // Оборудование
    exerciseDetailEquipmentContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.md,
      marginTop: SPACING.md,
    } as ViewStyle,
    exerciseDetailEquipmentCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      minWidth: 140,
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,
    exerciseDetailEquipmentIconContainer: {
      width: 48,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,
    exerciseDetailEquipmentText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    } as TextStyle,

    // Цветные рекорды
    recordValuePrimary: {
      color: colors.primary,
    } as TextStyle,
    recordValueSuccess: {
      color: colors.success,
    } as TextStyle,
    recordValueWarning: {
      color: colors.warning,
    } as TextStyle,

    // Связанные программы / похожие упражнения
    relatedItem: {
      padding: SPACING.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,
    relatedItemName: {
      ...typography.labelBold,
      color: colors.textPrimary,
      flex: 1,
    } as TextStyle,
    relatedItemMeta: {
      flexDirection: 'row',
      gap: SPACING.sm,
      alignItems: 'center',
    } as ViewStyle,
    relatedItemMetaText: {
      ...typography.caption,
      color: colors.textSecondary,
    } as TextStyle,
    similarItem: {
      padding: SPACING.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    similarItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    } as ViewStyle,
    similarItemContent: {
      flex: 1,
    } as ViewStyle,
    similarItemName: {
      ...typography.labelBold,
      color: colors.textPrimary,
    } as TextStyle,
    similarItemMuscles: {
      ...typography.captionSmall,
      color: colors.textSecondary,
    } as TextStyle,

    // Личные рекорды
    recordsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: SPACING.md,
    } as ViewStyle,
    recordItem: {
      alignItems: 'center',
    } as ViewStyle,
    recordValue: {
      ...typography.h3,
      marginBottom: SPACING.xs,
    } as TextStyle,
    recordLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    } as TextStyle,

    // Иконки упражнений
    exerciseIconContainer: {
      width: 70,
      height: 70,
      marginRight: 20,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    exerciseIconMain: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    } as ViewStyle,
    exerciseIconExtra: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    } as ViewStyle,
    exerciseNameLarge: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 22,
    } as TextStyle,
    muscleBubblesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    } as ViewStyle,
    muscleBubble: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    } as ViewStyle,
    muscleBubbleText: {
      fontSize: 11,
      fontWeight: '600',
    } as TextStyle,
  });

export type ExerciseCardStyleKey = keyof ReturnType<typeof createExerciseCardStyles>;