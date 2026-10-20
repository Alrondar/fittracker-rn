// src/components/workout/WarmupQueueRow.tsx
// WARMUP-3c: строка очереди разминки (≈44 px). «Текущее» упражнение показывает
// WarmupExerciseCard крупно, всё остальное — здесь: номер/галочка, название,
// длительность и ▶. Тап по строке поднимает упражнение в «текущие», тап по ▶
// сразу запускает его таймер.
import React, { memo } from 'react';
import { Text } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check, Play } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { WarmupExercise } from '../../services/warmupService';

interface WarmupQueueRowProps {
  exercise: WarmupExercise;
  index: number;
  completed: boolean;
  onStartTimer: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  /** Поднять строку в «текущие» (крупная карточка). */
  onFocus: (id: string) => void;
}

export const WarmupQueueRow = memo(function WarmupQueueRow({
  exercise,
  index,
  completed,
  onStartTimer,
  onToggleCompleted,
  onFocus,
}: WarmupQueueRowProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => onFocus(exercise.id)}
      accessibilityRole="button"
      accessibilityLabel={`Сделать текущим: ${exercise.name}`}
      // WEB-3a: внутри строки — чекбокс и ▶; на вебе обёртка не должна
      // становиться <button>, иначе вложенные кнопки не получают тап.
      wrapActions
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: withAlpha(colors.border, 0.55),
      }}
    >
      {/* Номер / галочка: тап = отметить или снять отметку (stopPropagation не нужен —
          вложенный Pressable сам перехватывает жест) */}
      <PressableScale
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={
          completed ? `Снять отметку: ${exercise.name}` : `Отметить выполненным: ${exercise.name}`
        }
        onPress={() => onToggleCompleted(exercise.id)}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: completed ? colors.success : withAlpha(colors.warning, 0.125),
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {completed ? (
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)}>
            <Check size={13} color={colors.textInverse} strokeWidth={3} />
          </Animated.View>
        ) : (
          <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
            {index + 1}
          </Text>
        )}
      </PressableScale>

      <Text
        numberOfLines={1}
        style={[
          typography.bodySmall,
          {
            flex: 1,
            color: completed ? colors.textTertiary : colors.textPrimary,
            textDecorationLine: completed ? 'line-through' : 'none',
          },
        ]}
      >
        {exercise.name}
      </Text>

      <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
        {exercise.duration_seconds}с
      </Text>

      <PressableScale
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        onPress={() => onStartTimer(exercise.id)}
        accessibilityRole="button"
        accessibilityLabel={`Запустить таймер: ${exercise.name}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: completed ? colors.successLight : withAlpha(colors.warning, 0.16),
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {completed ? (
          <Check size={14} color={colors.success} />
        ) : (
          <Play size={13} color={colors.warning} fill={colors.warning} style={{ marginLeft: 1 }} />
        )}
      </PressableScale>
    </PressableScale>
  );
});
