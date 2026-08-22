import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Share2, Pencil } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';

interface ProgramFabsProps {
  canEdit?: boolean;
  onOpenShare: () => void;
  onToggleEditMode: () => void;
  colors: any;
}

export function ProgramFabs({ canEdit = false, onOpenShare, onToggleEditMode, colors }: ProgramFabsProps) {
  return (
    <>
      {/* FAB «Поделиться» — доступен всегда */}
      <TouchableOpacity
        onPress={onOpenShare}
        style={{
          position: 'absolute',
          top: SPACING.xl + 35 + 52,
          right: SPACING.lg,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <Share2 size={20} color={colors.primary} strokeWidth={2} />
      </TouchableOpacity>

      {/* FAB редактирования — только для владельца программы */}
      {canEdit && (
        <TouchableOpacity
          onPress={onToggleEditMode}
          style={{
            position: 'absolute',
            top: SPACING.xl + 35,
            right: SPACING.lg,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <Pencil size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </>
  );
}