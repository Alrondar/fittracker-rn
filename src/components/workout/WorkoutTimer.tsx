import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play, Pause, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface WorkoutTimerProps {
  initialSeconds: number;
  isActive: boolean;
  onTick: (seconds: number) => void;
  onStart: () => void;
  onStop: () => void;
  colors: any;
}

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function WorkoutTimer({
  initialSeconds,
  isActive,
  onTick,
  onStart,
  onStop,
  colors,
}: WorkoutTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);

  // Свежий onTick — не пересоздаём интервал при каждом рендере
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Восстановление времени сессии (например, после перезапуска приложения)
  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  // Тикаем, пока running === true
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1;
        onTickRef.current(next);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (running) {
      setRunning(false);
      onStop();
    } else {
      setRunning(true);
      onStart();
    }
  }, [running, onStart, onStop]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Clock size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text
        style={[
          typography.labelBold,
          { color: colors.textPrimary, fontVariant: ['tabular-nums'] },
        ]}
      >
        {formatTime(seconds)}
      </Text>
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        {running ? (
          <Pause size={14} color={colors.primary} strokeWidth={2} />
        ) : (
          <Play size={14} color={colors.primary} strokeWidth={2} />
        )}
      </TouchableOpacity>
    </View>
  );
}