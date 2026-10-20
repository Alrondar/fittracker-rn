// src/components/workout/WarmupActionBar.tsx
// WARMUP-3c: липкая панель внизу вкладки «Разминка». Раньше «Пропустить» и
// прогресс жили в конце ленты внутри ScrollView — на 5 упражнениях они
// уезжали за экран, а при 5/5 вкладка сама переключалась на «Тренировку».
// Теперь управление всегда на виду, и переход делает пользователь.
import React from 'react';
import { View, Text } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { ArrowRight, SkipForward } from 'lucide-react-native';

interface WarmupActionBarProps {
  completedCount: number;
  totalCount: number;
  isAllCompleted: boolean;
  onSkip: () => void;
  onGoToWorkout: () => void;
}

export function WarmupActionBar({
  completedCount,
  totalCount,
  isAllCompleted,
  onSkip,
  onGoToWorkout,
}: WarmupActionBarProps) {
  const { colors } = useTheme();
  const ratio = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: withAlpha(colors.warning, 0.24),
        backgroundColor: colors.background,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        gap: SPACING.sm,
      }}
    >
      <View
        style={{
          height: 4,
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            backgroundColor: isAllCompleted ? colors.success : colors.warning,
            borderRadius: 2,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
        <AppButton
          title="Пропустить"
          variant="secondary"
          size="medium"
          icon={<SkipForward size={16} color={colors.primary} />}
          onPress={onSkip}
          style={{ flex: 1 }}
        />
        <AppButton
          title={
            isAllCompleted ? 'Разминка готова ✓' : `К тренировке ${completedCount}/${totalCount}`
          }
          variant="primary"
          size="medium"
          icon={<ArrowRight size={16} color={colors.textInverse} />}
          onPress={onGoToWorkout}
          style={{ flex: 1.3 }}
        />
      </View>
      <Text
        style={[
          typography.captionSmall,
          { color: colors.textTertiary, textAlign: 'center', paddingBottom: SPACING.xs },
        ]}
      >
        {isAllCompleted
          ? 'Отметь любое упражнение заново, если разминку нужно повторить'
          : 'Пропуск не помечает разминку выполненной — он просто ведёт к тренировке'}
      </Text>
    </View>
  );
}
