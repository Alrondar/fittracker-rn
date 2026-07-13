import { StyleSheet, ViewStyle, TextStyle, Dimensions, ImageStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export const createCardStyles = (colors: any) =>
  StyleSheet.create({
    // ===== БАЗОВЫЕ СТИЛИ КАРТОЧЕК =====
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

    // ===== КАРТОЧКА АКТИВНОЙ ПРОГРАММЫ =====
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

    // ===== КАРТОЧКА ПОСЛЕДНЕЙ ТРЕНИРОВКИ =====
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

    // ===== ПУСТАЯ КАРТОЧКА =====
    emptyCard: {
      padding: SPACING.xl,
      borderRadius: BORDER_RADIUS.xl,
      elevation: 2,
    } as ViewStyle,

    // ===== КАРТОЧКА ТРЕНИРОВКИ =====
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

    // ===== КАРТОЧКА ДНЯ ПРОГРАММЫ =====
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

    // ===== КАРТОЧКА ПРОГРАММЫ =====
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
      backgroundColor: colors.primary + '15',
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
      backgroundColor: colors.primary + '20',
    } as ViewStyle,
    myProgramBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    } as TextStyle,

    // ===== ТАБЫ =====
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

    // ===== ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА =====
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

    // ===== ЧИПЫ ФИЛЬТРОВ =====
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

    // ===== ПУСТОЕ СОСТОЯНИЕ =====
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

    // ===== FAB =====
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

    // ===== МЕНЮ ДЕЙСТВИЙ =====
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

    // ===== BOTTOM SHEET =====
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

    // ===== БЛОК РАСПИСАНИЯ =====
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

    // ===== КАРТОЧКА ДНЯ =====
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

    // ===== СПИСОК УПРАЖНЕНИЙ =====
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

    // ===== ДЕТАЛЬНАЯ СТРАНИЦА УПРАЖНЕНИЯ =====
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

    // ===== НОВЫЕ СТИЛИ ДЛЯ БЛОКА ОБОРУДОВАНИЯ =====
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

    // ===== НОВЫЕ СТИЛИ ДЛЯ ДЕМОНСТРАЦИИ (MEDIA) =====
exerciseDetailMediaImage: {
  width: '100%',
  height: 200,
  borderRadius: BORDER_RADIUS.md,
  marginTop: SPACING.sm,
  backgroundColor: colors.surfaceSecondary,
} as ImageStyle,

    // ===== НОВЫЕ СТИЛИ ДЛЯ ЦВЕТНЫХ РЕКОРДОВ =====
    recordValuePrimary: {
      color: colors.primary,
    } as TextStyle,
    recordValueSuccess: {
      color: colors.success,
    } as TextStyle,
    recordValueWarning: {
      color: colors.warning,
    } as TextStyle,

    // ===== СВЯЗАННЫЕ ПРОГРАММЫ / ПОХОЖИЕ УПРАЖНЕНИЯ =====
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

    // ===== ЛИЧНЫЕ РЕКОРДЫ =====
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

    // ===== ТРЕНИРОВКА (WORKOUT) =====
    workoutTimerContainer: {
      padding: SPACING.lg,
      borderBottomWidth: 1,
    } as ViewStyle,
    workoutTimerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    } as ViewStyle,
    workoutTimerTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    } as TextStyle,
    workoutTimerCloseButton: {
      padding: 4,
    } as ViewStyle,
    workoutTimerTime: {
      fontSize: 56,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 64,
      fontVariant: ['tabular-nums'],
    } as TextStyle,
    workoutTimerProgressBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginVertical: SPACING.lg,
    } as ViewStyle,
    workoutTimerProgressFill: {
      height: '100%',
      borderRadius: 4,
    } as ViewStyle,
    workoutTimerControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.xl,
    } as ViewStyle,
    workoutTimerControlButton: {
      padding: SPACING.sm,
    } as ViewStyle,
    workoutTimerControlText: {
      fontSize: 16,
      fontWeight: '600',
    } as TextStyle,
    workoutExerciseCard: {
      width: CARD_WIDTH,
      marginHorizontal: 0,
    } as ViewStyle,
    workoutExerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    } as ViewStyle,
    workoutExerciseName: {
      fontSize: 18,
      fontWeight: 'bold',
      flex: 1,
      marginRight: SPACING.sm,
      lineHeight: 24,
    } as TextStyle,
    workoutSwipeIcon: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,
    workoutSettingsButton: {
      padding: 6,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,
    workoutIntensityBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as ViewStyle,
    workoutIntensityText: {
      fontSize: 11,
      fontWeight: '600',
    } as TextStyle,
    muscleTagPrimary: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1.5,
    } as ViewStyle,
    muscleTagPrimaryText: {
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,
    muscleTagSecondary: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1.5,
    } as ViewStyle,
    muscleTagSecondaryText: {
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,
    setsContainer: {
      marginTop: SPACING.lg,
      borderWidth: 1.5,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    } as ViewStyle,
    setsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.md,
    } as ViewStyle,
    setsHeaderText: {
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    setsContent: {
      padding: SPACING.md,
    } as ViewStyle,
    setRow: {
      marginBottom: SPACING.md,
    } as ViewStyle,
    setNumbersRow: {
      flexDirection: 'row',
      gap: 8,
    } as ViewStyle,
    setNumber: {
      flex: 1,
      alignItems: 'center',
    } as ViewStyle,
    setNumberText: {
      fontSize: 14,
      fontWeight: 'bold',
    } as TextStyle,
    setInputsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    } as ViewStyle,
    setInputContainer: {
      flex: 1,
      padding: 8,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
    } as ViewStyle,
    setInput: {
      fontSize: 12,
      textAlign: 'center',
      width: '100%',
    } as TextStyle,
    restButton: {
      marginTop: SPACING.md,
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
    settingsSheetContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: SPACING.lg,
      maxHeight: '70%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
    } as ViewStyle,
    settingsSheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    } as ViewStyle,
    settingsSheetTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    } as TextStyle,
    settingsSheetField: {
      marginBottom: SPACING.lg,
    } as ViewStyle,
    settingsSheetLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: SPACING.md,
    } as TextStyle,
    settingsSheetCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.lg,
    } as ViewStyle,
    settingsSheetCounterButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    settingsSheetCounterText: {
      fontSize: 24,
      fontWeight: 'bold',
      minWidth: 40,
      textAlign: 'center',
    } as TextStyle,
    settingsSheetSaveButton: {
      paddingVertical: 14,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
    } as ViewStyle,
    settingsSheetSaveButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    } as TextStyle,
    finishButtonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: SPACING.lg,
      borderTopWidth: 1,
    } as ViewStyle,
    finishButton: {
      borderRadius: BORDER_RADIUS.xl,
      overflow: 'hidden',
    } as ViewStyle,
    finishButtonLoading: {
      paddingVertical: 16,
      alignItems: 'center',
    } as ViewStyle,
    finishButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
    } as ViewStyle,
    finishButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    } as TextStyle,
    replacedBadgeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    replacedBadgeText: {
      fontWeight: 'bold',
      fontSize: 14,
    } as TextStyle,
    replacedResetText: {
      fontSize: 14,
      textDecorationLine: 'underline',
    } as TextStyle,
    collapsibleWorkoutSection: {
      marginBottom: SPACING.sm,
      borderWidth: 1.5,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    } as ViewStyle,
    collapsibleWorkoutHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
    } as ViewStyle,
    collapsibleWorkoutHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    } as ViewStyle,
    collapsibleWorkoutTitle: {
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    collapsibleWorkoutContent: {
      padding: SPACING.md,
    } as ViewStyle,
    groupedWorkoutSection: {
      marginBottom: SPACING.sm,
      borderWidth: 1.5,
      borderRadius: BORDER_RADIUS.md,
      overflow: 'hidden',
    } as ViewStyle,
    groupedWorkoutContent: {
      padding: SPACING.md,
    } as ViewStyle,
    groupedWorkoutDivider: {
      height: 1,
      marginVertical: SPACING.md,
    } as ViewStyle,
    groupedWorkoutSubHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.xs,
    } as ViewStyle,
    groupedWorkoutSubTitle: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    } as TextStyle,
    groupedWorkoutSubText: {
      fontSize: 14,
    } as TextStyle,

    // ===== ФИЛЬТР МЫШЦ =====
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
      color: 'white',
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
      backgroundColor: 'white',
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
      color: 'white',
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

    // ===== СОРТИРОВКА =====
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

    // ===== НОВЫЕ СТИЛИ ДЛЯ СПРАВОЧНИКА УПРАЖНЕНИЙ =====
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

// ===== Стили для цветной обводки карточек упражнений =====
export const createExerciseCardBorderStyles = (colors: any, borderColor: string) => ({
  exerciseCardWithBorder: {
    borderLeftWidth: 4,
    borderLeftColor: borderColor,
  },
  exerciseListItemIconColored: {
    backgroundColor: borderColor + '15',
  },
});

// ===== ДИНАМИЧЕСКИЕ ГЕНЕРАТОРЫ СТИЛЕЙ =====
export const getMuscleGroupChipStyle = (groupColor: string, isActive: boolean) => ({
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.xs,
  borderRadius: BORDER_RADIUS.full,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: isActive ? `${groupColor}40` : `${groupColor}15`,
  borderColor: isActive ? groupColor : `${groupColor}50`,
  borderWidth: isActive ? 2 : 1,
  marginHorizontal: 4,
} as ViewStyle);

export const getMuscleGroupChipTextStyle = (groupColor: string, isActive: boolean) => ({
  fontSize: 13,
  fontWeight: isActive ? '700' : '600',
  color: groupColor,
} as TextStyle);

export const getMuscleGroupBadgeStyle = (groupColor: string, isActive: boolean) => ({
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
  backgroundColor: isActive ? groupColor : `${groupColor}50`,
} as ViewStyle);

export const getMuscleGroupBadgeTextStyle = (groupColor: string, isActive: boolean) => ({
  fontSize: 10,
  fontWeight: '700',
  color: isActive ? '#fff' : groupColor,
} as TextStyle);

export const getMuscleSubgroupItemStyle = (muscleColor: string, isSelected: boolean, surfaceColor: string, borderColor: string) => ({
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: BORDER_RADIUS.full,
  borderWidth: 1.5,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: isSelected ? `${muscleColor}25` : surfaceColor,
  borderColor: isSelected ? muscleColor : borderColor,
} as ViewStyle);

export const getMuscleSubgroupItemTextStyle = (muscleColor: string, isSelected: boolean, textSecondaryColor: string) => ({
  fontSize: 12,
  fontWeight: isSelected ? '600' : '400',
  color: isSelected ? muscleColor : textSecondaryColor,
} as TextStyle);

export const getExerciseIconMainStyle = (borderColor: string, surfaceColor: string) => ({
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: borderColor,
  backgroundColor: surfaceColor,
} as ViewStyle);

export const getExerciseIconExtraStyle = (right: number, top: number, backgroundColor: string, borderColor: string) => ({
  position: 'absolute',
  right: right,
  top: top,
  width: 20,
  height: 20,
  backgroundColor: backgroundColor,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: borderColor,
} as ViewStyle);

export const getMuscleBubbleStyle = (muscleColor: string) => ({
  backgroundColor: `${muscleColor}20`,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: `${muscleColor}40`,
} as ViewStyle);

export const getMuscleBubbleTextStyle = (muscleColor: string) => ({
  fontSize: 11,
  fontWeight: '600',
  color: muscleColor,
} as TextStyle);

export type CardStyleKey = keyof ReturnType<typeof createCardStyles>;