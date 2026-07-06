import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../typography';

export const createBadgeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,

    text: {
      ...typography.buttonTiny,
    } as TextStyle,

    programBadge: {
        flexDirection: 'row',   
        alignItems: 'center',   
        gap: 4,    
      alignSelf: 'flex-start',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    
    programBadgeText: {
      ...typography.buttonTiny,
    } as TextStyle,

    intensityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,
    
    intensityText: {
      ...typography.captionSmall,
      fontWeight: '600',
    } as TextStyle,

    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,
    
    metaBadgeText: {
      color: 'white',
      ...typography.buttonTiny,
    } as TextStyle,

    replacedBadge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      marginHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
    } as ViewStyle,
    
    replacedText: {
      ...typography.labelBold,
    } as TextStyle,
    
    resetText: {
      ...typography.body,
      textDecorationLine: 'underline',
    } as TextStyle,

    dayChip: {
    flexDirection: 'row',  
     alignItems: 'center',        
      backgroundColor: 'white',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    } as ViewStyle,
    
    dayChipText: {
      color: '#333',
      ...typography.buttonTiny,
    } as TextStyle,

badgeContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
} as ViewStyle,

  });

export type BadgeStyleKey = keyof ReturnType<typeof createBadgeStyles>;