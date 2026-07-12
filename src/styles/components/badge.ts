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
    muscleTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    } as ViewStyle,
    muscleTag: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.full,
      borderWidth: 1,
    } as ViewStyle,
    muscleTagText: {
      fontSize: 12,
      fontWeight: '600',
    } as TextStyle,
  });

// ===== НОВОЕ: Стили для бейджей оборудования с иконками =====
export const createEquipmentBadgeStyles = (colors: any) => ({
  equipmentBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  equipmentBadgeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
});

// ===== НОВОЕ: Стили для цветных бейджей мышц =====
export const createMuscleBadgeStyles = (colors: any) => ({
  muscleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  muscleBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

export type BadgeStyleKey = keyof ReturnType<typeof createBadgeStyles>;