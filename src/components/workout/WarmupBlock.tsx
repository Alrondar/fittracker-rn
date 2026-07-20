import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { AppButton } from '../ui/AppButton';
import {
  Flame,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
} from 'lucide-react-native';
import { WarmupExercise } from '../../services/warmupService';

interface WarmupBlockProps {
  warmupExercises: WarmupExercise[];
  isLoading: boolean;
  activeTimerId: string | null;
  timeLeft: number;
  isAllCompleted: boolean;
  totalDuration: number;
  isCompleted: (id: string) => boolean;
  onGenerateWarmup: () => void;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkCompleted: (id: string) => void;
  onSkip: () => void;
}

export function WarmupBlock({
  warmupExercises,
  isLoading,
  activeTimerId,
  timeLeft,
  isAllCompleted,
  totalDuration,
  isCompleted,
  onGenerateWarmup,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
  onSkip,
}: WarmupBlockProps) {
  const { colors } = useTheme();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <AppCard variant="compact" style={{ margin: SPACING.lg, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.warning} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Генерация разминки...
        </Text>
      </AppCard>
    );
  }

  if (warmupExercises.length === 0) return null;

  const mins = Math.floor(totalDuration / 60);

  return (
    <View style={{ backgroundColor: colors.warning + '08', borderBottomWidth: 1, borderBottomColor: colors.warning + '30' }}>
      {/* Заголовок */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Flame size={22} color={colors.warning} />
          <Text style={[typography.h4, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
            Разминка
          </Text>
          <View style={{ backgroundColor: colors.warning + '20', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm, marginLeft: SPACING.sm }}>
            <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '600' }]}>
              ~{mins} мин
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onGenerateWarmup} style={{ padding: SPACING.sm }}>
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Список упражнений */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
        {warmupExercises.map((exercise, index) => {
          const completed = isCompleted(exercise.id);
          const isActive = activeTimerId === exercise.id;

          return (
            <View
              key={exercise.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive ? colors.warning + '15' : colors.surface,
                borderRadius: BORDER_RADIUS.md,
                padding: SPACING.md,
                marginBottom: SPACING.sm,
                borderWidth: 1,
                borderColor: isActive ? colors.warning : colors.border,
                opacity: completed ? 0.6 : 1,
              }}
            >
              {/* Номер / Статус */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: completed ? colors.success : colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md }}>
                {completed ? (
                  <CheckCircle2 size={18} color={colors.textInverse} />
                ) : (
                  <Text style={[typography.labelBold, { color: colors.warning }]}>{index + 1}</Text>
                )}
              </View>

              {/* Информация об упражнении */}
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelBold, { color: colors.textPrimary, textDecorationLine: completed ? 'line-through' : 'none' }]}>
                  {exercise.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                    {exercise.duration_seconds} сек
                  </Text>
                  {exercise.primary_muscles.length > 0 && (
                    <Text style={[typography.captionSmall, { color: colors.textTertiary, marginLeft: SPACING.sm }]}>
                      • {exercise.primary_muscles.slice(0, 2).join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              {/* Кнопка управления */}
              {isActive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <Text style={[typography.h5, { color: colors.warning, fontVariant: ['tabular-nums'] }]}>
                    {formatTime(timeLeft)}
                  </Text>
                  <TouchableOpacity onPress={onStopTimer} style={{ padding: SPACING.xs }}>
                    <Pause size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : completed ? (
                <CheckCircle2 size={24} color={colors.success} />
              ) : (
                <TouchableOpacity
                  onPress={() => onStartTimer(exercise.id)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warning, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Play size={16} color={colors.textInverse} fill={colors.textInverse} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Кнопки действий */}
      <View style={{ flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg }}>
        <AppButton
          title="Пропустить"
          variant="secondary"
          size="medium"
          icon={<SkipForward size={16} color={colors.primary} />}
          onPress={onSkip}
          style={{ flex: 1 }}
        />
        <AppButton
          title={isAllCompleted ? 'Разминка готова ✓' : 'Начать тренировку'}
          variant="primary"
          size="medium"
          onPress={onSkip}
          disabled={!isAllCompleted}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}