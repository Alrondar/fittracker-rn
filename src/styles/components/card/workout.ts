import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';

// PERF-5: «замороженная» ширина карточки УДАЛЕНА из фабрики.
// Раньше здесь было:
//   const { width: SCREEN_WIDTH } = Dimensions.get('window');
//   const CARD_WIDTH = SCREEN_WIDTH - 32;
//   workoutExerciseCard: { width: CARD_WIDTH, ... }
// Это читало ширину один раз при загрузке модуля и не реагировало на
// поворот / iPad Split View / ресайз окна. Теперь ширина карточки задаётся
// РЕАКТИВНО внешним контейнером в ExerciseSlider (useWindowDimensions →
// <View style={{ width: cardWidth }}>), а корневой View карточки в
// ExerciseCard растягивается на него по умолчанию RN (stretch у flex-колонки).
// Безопасно: ExerciseCard рендерится ТОЛЬКО внутри этого контейнера
// (единственный потребитель — ExerciseSlider), поэтому в портрете ширина
// идентична прежней (экран − 32), а в Split View становится живой.

export const createWorkoutCardStyles = (colors: any) =>
  StyleSheet.create({
    // ===== КАРТОЧКА УПРАЖНЕНИЯ =====
    workoutExerciseCard: {
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
    // ===== КНОПКА ОТДЫХА =====
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
      color: colors.textInverse,
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
      color: colors.textInverse,
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
  });

export type WorkoutCardStyleKey = keyof ReturnType<typeof createWorkoutCardStyles>;