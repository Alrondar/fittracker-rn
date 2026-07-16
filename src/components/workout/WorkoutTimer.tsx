import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Pause, Play } from 'lucide-react-native';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface WorkoutTimerProps {
  /** Начальное время в секундах (для восстановления) */
  initialSeconds?: number;
  /** Активен ли таймер при монтировании */
  isActive?: boolean;
  /** Колбэк при каждом тике (каждую секунду) */
  onTick?: (seconds: number) => void;
  /** Колбэк при старте */
  onStart?: () => void;
  /** Колбэк при остановке */
  onStop?: () => void;
  colors: any;
}

export function WorkoutTimer({
  initialSeconds = 0,
  isActive = false,
  onTick,
  onStart,
  onStop,
  colors,
}: WorkoutTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(isActive);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Форматирование времени MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Запуск интервала
  const startTimer = useCallback(() => {
    if (intervalRef.current) return; // Уже запущен
    
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        onTick?.(newTime);
        return newTime;
      });
    }, 1000);
    
    setIsRunning(true);
    onStart?.();
  }, [onTick, onStart]);

  // Остановка интервала
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    onStop?.();
  }, [onStop]);

  // Сброс таймера
  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsedTime(0);
  }, [stopTimer]);

  // Восстановление состояния при монтировании
  useEffect(() => {
    if (isActive && initialSeconds >= 0) {
      setElapsedTime(initialSeconds);
      startTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Экспортируем текущее время через ref (для родителя)
  useEffect(() => {
    onTick?.(elapsedTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedTime]);

  return (
    <View style={{
      backgroundColor: colors.primary,
      padding: SPACING.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
        <Clock size={20} color="white" />
        <Text style={[typography.h4, { color: 'white' }]}>
          {formatTime(elapsedTime)}
        </Text>
      </View>
      
      <TouchableOpacity
        onPress={isRunning ? stopTimer : startTimer}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.2)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isRunning ? (
          <Pause size={20} color="white" />
        ) : (
          <Play size={20} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
}