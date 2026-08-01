import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createFilterCardStyles = (colors: any) =>
  StyleSheet.create({
    // Табы
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    } as ViewStyle,
    tab: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
    } as ViewStyle,
    tabActive: {
      backgroundColor: colors.primary,
    } as ViewStyle,
    tabText: {
      ...typography.labelBold,
      color: colors.textSecondary,
    } as TextStyle,
    tabTextActive: {
      color: colors.textInverse,
    } as TextStyle,

    // Панель фильтров и поиска
    filterBar: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    } as ViewStyle,
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    searchButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      height: 40,
    } as ViewStyle,
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      padding: 0,
    } as TextStyle,
    sortButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,

    // Чипы фильтров
    filterChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    } as ViewStyle,
    filterChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    } as ViewStyle,
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    filterChipText: {
      ...typography.buttonTiny,
      color: colors.textSecondary,
    } as TextStyle,
    filterChipTextActive: {
      color: colors.textInverse,
    } as TextStyle,

    // Фильтр мышц
    muscleGroupSelectorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
    } as ViewStyle,
    muscleGroupSelectorHeaderText: {
      ...typography.caption,
      color: colors.textSecondary,
    } as TextStyle,
    muscleGroupSelectorResetText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    } as TextStyle,
    muscleGroupChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full,
      marginHorizontal: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
    } as ViewStyle,
    muscleGroupChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    muscleGroupChipSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    } as ViewStyle,
    muscleGroupChipDefault: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.border,
    } as ViewStyle,
    muscleGroupChipText: {
      ...typography.labelBold,
      fontSize: 13,
    } as TextStyle,
    muscleGroupChipTextActive: {
      color: colors.textInverse,
    } as TextStyle,
    muscleGroupChipTextSelected: {
      color: colors.primary,
    } as TextStyle,
    muscleGroupChipTextDefault: {
      color: colors.textPrimary,
    } as TextStyle,
    muscleGroupBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    muscleGroupBadgeActive: {
      backgroundColor: colors.textInverse,
    } as ViewStyle,
    muscleGroupBadgeSelected: {
      backgroundColor: colors.primary,
    } as ViewStyle,
    muscleGroupBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    } as TextStyle,
    muscleGroupBadgeTextActive: {
      color: colors.primary,
    } as TextStyle,
    muscleGroupBadgeTextSelected: {
      color: colors.textInverse,
    } as TextStyle,
    muscleSubgroupContainer: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    } as ViewStyle,
    muscleSubgroupList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    } as ViewStyle,

    // Сортировка
    sortSheetContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: SPACING.lg,
    } as ViewStyle,
    sortSheetTitle: {
      ...typography.h5,
      color: colors.textPrimary,
      marginBottom: SPACING.lg,
    } as TextStyle,
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,
    sortOptionText: {
      ...typography.body,
      color: colors.textPrimary,
    } as TextStyle,
    sortOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    } as TextStyle,
    sortOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    } as ViewStyle,

    // Справочник упражнений
    screenHeader: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    } as ViewStyle,
    headerTitleWrapper: {
      flex: 1,
    } as ViewStyle,
    searchWrapper: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    } as ViewStyle,
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      height: 44,
      width: '100%',
    } as ViewStyle,
    searchInputStyle: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      marginLeft: SPACING.sm,
      paddingVertical: 0,
      height: '100%',
    } as TextStyle,
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SPACING.sm,
    } as ViewStyle,
    iconButtonPrimary: {
      backgroundColor: colors.primaryLight,
    } as ViewStyle,
    iconButtonDefault: {
      backgroundColor: colors.surfaceSecondary,
    } as ViewStyle,
    muscleSubgroupItem: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    muscleSubgroupItemText: {
      fontSize: 12,
    } as TextStyle,
  });

export type FilterCardStyleKey = keyof ReturnType<typeof createFilterCardStyles>;