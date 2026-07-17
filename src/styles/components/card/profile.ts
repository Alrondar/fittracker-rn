import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../typography';

export const createProfileCardStyles = (colors: any) =>
  StyleSheet.create({
    profileHeader: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
    } as ViewStyle,
    profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    } as ViewStyle,
    profileName: {
      ...typography.h3,
      textAlign: 'center',
    } as TextStyle,
    profileEmail: {
      ...typography.body,
      textAlign: 'center',
      marginTop: 4,
    } as TextStyle,
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.xl,
    } as ViewStyle,
    statCardSmall: {
      flex: 1,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      marginHorizontal: 4,
    } as ViewStyle,
    themeToggleRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      maxWidth: '60%',
    } as ViewStyle,
    themeToggleButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
    } as ViewStyle,
    themeToggleText: {
      ...typography.buttonSmall,
    } as TextStyle,
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as ViewStyle,
    settingsRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    } as ViewStyle,
    settingsIcon: {
      marginRight: SPACING.md,
    } as ViewStyle,
    logoutButton: {
      marginTop: SPACING.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
    } as ViewStyle,
  });

export type ProfileCardStyleKey = keyof ReturnType<typeof createProfileCardStyles>;