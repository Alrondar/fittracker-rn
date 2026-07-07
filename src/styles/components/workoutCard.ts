import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

export const createWorkoutCardStyles = (colors: any) =>
  StyleSheet.create({
    // Карточка упражнения
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    } as ViewStyle,

    // Шапка карточки
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    } as ViewStyle,
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      flex: 1,
      marginRight: SPACING.sm,
      lineHeight: 24,
      color: colors.textPrimary,
    } as TextStyle,

    // Бейдж интенсивности
    intensityBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    intensityText: {
      fontSize: 11,
      fontWeight: '600',
    } as TextStyle,

    // Теги мышц
    muscleTagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
    } as ViewStyle,
    muscleTagPrimary: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1.5,
    } as ViewStyle,
    muscleTagSecondary: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1.5,
    } as ViewStyle,
    muscleTagText: {
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,

    // Коллапсируемая секция
    collapsible: {
      marginBottom: SPACING.sm,
      borderWidth: 1.5,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    } as ViewStyle,
    collapsibleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
    } as ViewStyle,
    collapsibleHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    } as ViewStyle,
    collapsibleTitle: {
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    collapsibleContent: {
      padding: SPACING.md,
    } as ViewStyle,

    // Сгруппированная секция (Оборудование + Настройки)
    groupedSection: {
      marginBottom: SPACING.sm,
      borderWidth: 1.5,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    } as ViewStyle,
    groupedHeader: {
      padding: SPACING.md,
    } as ViewStyle,
    groupedContent: {
      padding: SPACING.md,
    } as ViewStyle,
    groupedItem: {
      marginBottom: SPACING.md,
    } as ViewStyle,
    groupedItemTitle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    } as TextStyle,
    groupedItemText: {
      fontSize: 14,
    } as TextStyle,
    groupedDivider: {
      height: 1,
      marginVertical: SPACING.md,
    } as ViewStyle,

    // Сетка подходов
    setsContainer: {
      marginTop: SPACING.lg,
    } as ViewStyle,
    setsRow: {
      flexDirection: 'row',
      marginBottom: SPACING.sm,
      alignItems: 'center',
    } as ViewStyle,
    setLabel: {
      width: 70,
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,
    setCell: {
      flex: 1,
      marginHorizontal: 4,
      padding: 10,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    } as ViewStyle,
    setCellCompleted: {
      backgroundColor: colors.successLight,
    } as ViewStyle,
    setCellEmpty: {
      backgroundColor: colors.surfaceSecondary,
    } as ViewStyle,
    setCellNumber: {
      fontSize: 14,
      fontWeight: 'bold',
    } as TextStyle,
    setInput: {
      fontSize: 16,
      textAlign: 'center',
      color: colors.textPrimary,
      width: '100%',
    } as TextStyle,

    // Кнопка отдыха
    restButton: {
      marginTop: SPACING.lg,
      paddingVertical: 14,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.sm,
    } as ViewStyle,
    restButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 15,
    } as TextStyle,

    // Кнопка замены
    replaceButton: {
      marginTop: SPACING.lg,
      paddingVertical: 12,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.sm,
      borderWidth: 1.5,
    } as ViewStyle,
    replaceButtonText: {
      fontWeight: '600',
      fontSize: 14,
    } as TextStyle,
  });

export type WorkoutCardStyleKey = keyof ReturnType<typeof createWorkoutCardStyles>;