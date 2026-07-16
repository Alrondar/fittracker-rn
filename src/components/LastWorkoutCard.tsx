import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Dumbbell, TrendingUp } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import * as Haptics from 'expo-haptics';

interface LastWorkoutCardProps {
  workoutName: string;
  date: string;
  durationSeconds: number;
  exercisesCount: number;
  totalVolume: number;
  onRepeatPress: () => void;
  colors: any;
}

export function LastWorkoutCard({
  workoutName,
  date,
  durationSeconds,
  exercisesCount,
  totalVolume,
  onRepeatPress,
  colors,
}: LastWorkoutCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}ч ${remainingMins}мин`;
    }
    return `${mins}мин`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <Dumbbell size={20} color={colors.primary} strokeWidth={2} />
        <Text style={[typography.h5, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
          Последняя тренировка
        </Text>
      </View>

      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs }]}>
        {workoutName}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
        {formatDate(date)}
      </Text>

      <View style={{ flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {formatDuration(durationSeconds)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Dumbbell size={14} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {exercisesCount} упр.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={14} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {Math.round(totalVolume)} кг
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRepeatPress();
        }}
        style={{
          backgroundColor: colors.primary,
          padding: SPACING.sm,
          borderRadius: BORDER_RADIUS.sm,
          alignItems: 'center',
        }}
      >
        <Text style={[typography.labelBold, { color: colors.textInverse }]}>
          Повторить
        </Text>
      </TouchableOpacity>
    </View>
  );
}