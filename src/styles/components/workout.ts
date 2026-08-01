import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING } from '../../constants/theme';

// Параметр colors сохранён для единообразия сигнатур фабрик
// (вызывающий код передаёт его во все create*Styles)
export const createWorkoutStyles = (colors: any) =>
  StyleSheet.create({
    // ===== ТАЙМЕР ОТДЫХА (RestTimer) =====
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
  });

export type WorkoutStyleKey = keyof ReturnType<typeof createWorkoutStyles>;