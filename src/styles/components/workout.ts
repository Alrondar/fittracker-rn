import { StyleSheet, ViewStyle, TextStyle, Dimensions } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export const createWorkoutStyles = (colors: any) =>
  StyleSheet.create({
    // ===== ТАЙМЕР ОТДЫХА =====
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

    // ===== КАРТОЧКА УПРАЖНЕНИЯ =====
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


    // ===== СЕКЦИЯ ПОДХОДОВ =====
    setsContainer: {
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
  color: colors.textInverse, // ✅ ИСПРАВЛЕНО (было 'white')
  fontWeight: 'bold',
  fontSize: 15,
} as TextStyle,


    // ===== КНОПКА ЗАМЕНЫ =====
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

    // ===== BOTTOM SHEET НАСТРОЕК =====
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
  color: colors.textInverse, // ✅ ИСПРАВЛЕНО (было 'white')
  fontWeight: 'bold',
  fontSize: 16,
} as TextStyle,

    // ===== КНОПКА "ЗАВЕРШИТЬ ТРЕНИРОВКУ" =====
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
  color: colors.textInverse, // ✅ ИСПРАВЛЕНО (было 'white')
  fontWeight: 'bold',
  fontSize: 16,
} as TextStyle,

    // ===== БЕЙДЖ "ЗАМЕНЕНО" =====
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

    // ===== COLLAPSIBLE SECTION (тренировка) =====
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

    // ===== GROUPED SECTION (тренировка) =====
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
  });

export type WorkoutStyleKey = keyof ReturnType<typeof createWorkoutStyles>;