import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Dimensions } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window'); const CARD_WIDTH = SCREEN_WIDTH - 32;

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

    // ===== КАРТОЧКА ДНЯ ПРОГРАММЫ (для [id].tsx) =====
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

    // ===== КАРТОЧКА ПРОГРАММЫ (для programs.tsx) =====
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

    // Увеличенный отступ для футера карточки программы
    programCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md + 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    } as ViewStyle,

    // Бейдж "Моя программа"
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

    // ===== FAB (кнопка создания) =====
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

    // ===== МЕНЮ ДЕЙСТВИЙ (долгое нажатие) =====
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

    // ===== BOTTOM SHEET (создание/редактирование) =====
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
    // ===== БЛОК РАСПИСАНИЯ В ШАПКЕ =====
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

// ===== КАРТОЧКА ДНЯ ПРОГРАММЫ =====
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
// Pill-кнопка "Подробнее" со стрелочкой
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

// Цветная полоска слева по уровню сложности
programCardLevelStripe: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 4,
  borderTopLeftRadius: BORDER_RADIUS.lg,
  borderBottomLeftRadius: BORDER_RADIUS.lg,
} as ViewStyle,
// Кнопка редактирования в футере карточки программы
programCardEditButton: {
  padding: SPACING.sm,
  marginRight: SPACING.sm,
} as ViewStyle,
  // ===== ТРЕНИРОВКА (WORKOUT) =====
  
  // Таймер отдыха
  workoutTimerContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
  } as ViewStyle,
  workoutTimerText: {
    fontSize: 14,
    marginBottom: 4,
  } as TextStyle,
  workoutTimerTime: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  } as TextStyle,
  workoutTimerButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
  } as ViewStyle,
  workoutTimerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  } as TextStyle,

  // Карточка упражнения
  workoutExerciseCard: {
    width: CARD_WIDTH, // Потребуется импорт Dimensions, см. ниже
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

  // Теги мышц
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

  // Сетка подходов
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

  // Bottom Sheet настроек
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

  // Завершение тренировки
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

  // Бейдж "Заменено"
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
  });

export type CardStyleKey = keyof ReturnType<typeof createCardStyles>;