import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, Minus, Plus, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { createWorkoutStyles } from '../../styles/components/workout';

interface RestTimerProps {
  timeLeft: number;
  total: number;
  isFinished: boolean;
  onStop: () => void;
  onAdjust: (delta: number) => void;
  colors: any;
  workoutStyles: ReturnType<typeof createWorkoutStyles>;
}

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

export function RestTimer({
  timeLeft,
  total,
  isFinished,
  onStop,
  onAdjust,
  colors,
  workoutStyles,
}: RestTimerProps) {
  const progress = total > 0 ? timeLeft / total : 0;
  const timeColor = isFinished ? colors.success : timeLeft <= 3 ? colors.warning : colors.textPrimary;

  return (
    <View style={[workoutStyles.workoutTimerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Шапка */}
      <View style={workoutStyles.workoutTimerHeader}>
        <Text style={[workoutStyles.workoutTimerTitle, { color: colors.textSecondary }]}>
          {isFinished ? 'Отдых окончен' : 'Таймер отдыха'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onStop();
          }}
          style={workoutStyles.workoutTimerCloseButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Время */}
      <Text style={[workoutStyles.workoutTimerTime, { color: timeColor }]}>
        {isFinished ? '💪' : formatTime(timeLeft)}
      </Text>

      {/* Прогресс-бар */}
      <View style={[workoutStyles.workoutTimerProgressBg, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={[
            workoutStyles.workoutTimerProgressFill,
            {
              width: `${(isFinished ? 1 : progress) * 100}%`,
              backgroundColor: isFinished ? colors.success : timeLeft <= 3 ? colors.warning : colors.primary,
            },
          ]}
        />
      </View>

      {/* Управление */}
      {isFinished ? (
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onStop();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.success,
            paddingVertical: 14,
            borderRadius: 16,
          }}
        >
          <CheckCircle size={20} color={colors.textInverse} strokeWidth={2} />
          <Text style={[workoutStyles.workoutTimerControlText, { color: colors.textInverse }]}>
            Продолжить тренировку
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={workoutStyles.workoutTimerControls}>
          <TouchableOpacity
            onPress={() => onAdjust(-15)}
            disabled={total <= 15}
            style={[workoutStyles.workoutTimerControlButton, { opacity: total <= 15 ? 0.4 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Minus size={18} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[workoutStyles.workoutTimerControlText, { color: colors.textSecondary }]}>15с</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onAdjust(15)} style={workoutStyles.workoutTimerControlButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[workoutStyles.workoutTimerControlText, { color: colors.primary }]}>15с</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}