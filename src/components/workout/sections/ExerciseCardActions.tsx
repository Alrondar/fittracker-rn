// src/components/workout/sections/ExerciseCardActions.tsx
// UX-16 D6: ActionsRow — compact pill отдыха + Info button.
// Pill показывает пресет "⏱ Таймер 90с" или countdown во время отдыха.
// Info button трансформируется в inline-блок с табами.
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';

interface ExerciseCardActionsProps {
  restSeconds: number;
  onStartRest: () => void;
  onOpenInfo: () => void;
  infoVisible: boolean;
  hasInfoContent: boolean;
  colors: any;
}

export const ExerciseCardActions = memo(function ExerciseCardActions({
  restSeconds,
  onStartRest,
  onOpenInfo,
  infoVisible,
  hasInfoContent,
  colors,
}: ExerciseCardActionsProps) {
  const handleStartRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStartRest();
  };

  const handleOpenInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenInfo();
  };

  // Не рендерим, если нет ни отдыха, ни инфо
  if (restSeconds <= 0 && !hasInfoContent) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
      }}
    >
      {/* UX-16 F4: pill переименован в «Таймер» (без пресета в лейбле —
          будущая переработка таймера не затрагивается). Running-state
          countdown показывается в sticky RestTimer (единый source of truth). */}
      {restSeconds > 0 && (
        <TouchableOpacity
          onPress={handleStartRest}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Запустить таймер отдыха (${restSeconds} секунд)`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.xs,
            backgroundColor: colors.primary + '15',
            paddingHorizontal: SPACING.md,
            paddingVertical: 10,
            borderRadius: BORDER_RADIUS.md,
            borderWidth: 1,
            borderColor: colors.primary + '40',
            flex: 1,
            minHeight: 44,
          }}
        >
          <Clock size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
            Таймер
          </Text>
        </TouchableOpacity>
      )}

      {/* Info button */}
      {hasInfoContent && (
        <TouchableOpacity
          onPress={handleOpenInfo}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={infoVisible ? 'Скрыть информацию' : 'Показать информацию'}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.xs,
            backgroundColor: infoVisible ? colors.primary : colors.surfaceSecondary,
            paddingHorizontal: SPACING.md,
            paddingVertical: 10,
            borderRadius: BORDER_RADIUS.md,
            borderWidth: 1,
            borderColor: infoVisible ? colors.primary : colors.border,
          }}
        >
          <Info
            size={16}
            color={infoVisible ? colors.textInverse : colors.textSecondary}
            strokeWidth={2}
          />
          <Text
            style={[
              typography.captionSmall,
              {
                color: infoVisible ? colors.textInverse : colors.textSecondary,
                fontWeight: '700',
              },
            ]}
          >
            {infoVisible ? 'Скрыть' : 'Info'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
