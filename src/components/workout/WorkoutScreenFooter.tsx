// src/components/workout/WorkoutScreenFooter.tsx
// PR8: footer workout screen — «Начать тренировку» / «Завершить».
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface WorkoutScreenFooterProps {
  isWorkoutActive: boolean;
  saving: boolean;
  onStart: () => void;
  onFinish: () => void;
  colors: any;
  gradients: any;
  insetsBottom: number;
}

export const WorkoutScreenFooter = memo(function WorkoutScreenFooter({
  isWorkoutActive,
  saving,
  onStart,
  onFinish,
  colors,
  gradients,
  insetsBottom,
}: WorkoutScreenFooterProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        padding: SPACING.lg,
        paddingBottom: insetsBottom + SPACING.lg,
      }}
    >
      {!isWorkoutActive ? (
        <TouchableOpacity
          onPress={() => {
            onStart();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradients.success}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: SPACING.md,
              paddingHorizontal: SPACING.xl,
              borderRadius: BORDER_RADIUS.lg,
            }}
          >
            <Play
              size={20}
              color={colors.textInverse}
              strokeWidth={2}
              fill={colors.textInverse}
              style={{ marginRight: SPACING.sm }}
            />
            <Text style={[typography.button, { color: colors.textInverse }]}>
              Начать тренировку
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onFinish} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <View
              style={{
                paddingVertical: SPACING.lg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : (
            <LinearGradient
              colors={gradients.success}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: SPACING.md,
                paddingHorizontal: SPACING.xl,
                borderRadius: BORDER_RADIUS.lg,
              }}
            >
              <Square
                size={20}
                color={colors.textInverse}
                strokeWidth={2}
                fill={colors.textInverse}
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={[typography.button, { color: colors.textInverse }]}>Завершить</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});