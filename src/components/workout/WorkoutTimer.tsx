import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, AppState, type AppStateStatus } from 'react-native';
import { Play, Pause, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING } from '../../constants/theme';
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

/**
 * Таймер тренировки. Архитектура — timestamp-based (аналогично RestTimer):
 * elapsed = accumulatedRef + (startedAtRef ? now - startedAtRef : 0).
 * Это делает таймер ТОЧНЫМ при блокировке экрана: интервал в фоне не тикает,
 * но при возврате в форграунд (AppState 'active') elapsed пересчитывается по
 * timestamp и циферблат прыгает на правильное значение. Пауза замораживает
 * накопление (время на паузе не идёт), старт — возобновляет.
 *
 * onTick передаёт АБСОЛЮТНОЕ число секунд (не инкремент) — контракт не менялся.
 * Проп isActive теперь реально работает: при isActive=true таймер авто-стартует
 * (возврат на идущую тренировку), при isActive=false — авто-пауза.
 */
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

  // ref-зеркала (правило CLAUDE.md): чтобы колбэки/эффекты не ловили stale-замыкания
  const runningRef = useRef(false);
  const startedAtRef = useRef<number | null>(null); // момент последнего возобновления
  const accumulatedRef = useRef(initialSeconds);    // секунды, накопленные до паузы
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);

  useEffect(() => { onTickRef.current = onTick; }, [onTick]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);

  // Пересчёт elapsed по timestamp — единственный источник цифры на экране.
  const recompute = useCallback(() => {
    const live = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;
    const elapsed = accumulatedRef.current + live;
    setSeconds(elapsed);
    onTickRef.current(elapsed);
  }, []);

  const startInternal = useCallback(() => {
    if (runningRef.current) return;
    startedAtRef.current = Date.now();
    runningRef.current = true;
    setRunning(true);
    onStartRef.current?.();
    recompute();
  }, [recompute]);

  const pauseInternal = useCallback(() => {
    if (!runningRef.current) return;
    if (startedAtRef.current) {
      accumulatedRef.current += Math.floor((Date.now() - startedAtRef.current) / 1000);
      startedAtRef.current = null;
    }
    runningRef.current = false;
    setRunning(false);
    setSeconds(accumulatedRef.current);
    onTickRef.current(accumulatedRef.current);
    onStopRef.current?.();
  }, []);

  // Тик в форграунде — только пока running. В фоне интервал не тикает (это ОК:
  // точность восстанавливается пересчётом по timestamp в AppState-эффекте ниже).
  useEffect(() => {
    if (!running) return;
    recompute();
    intervalRef.current = setInterval(recompute, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, recompute]);

  // ✅ ЯДРО ФИКСА БАГА 3: при возврате в форграунд (разблокировка) — пересчёт.
  // Циферблат догоняет реальное время, onTick обновляет currentTimeRef в сессии.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') recompute();
    });
    return () => sub.remove();
  }, [recompute]);

  // Внешняя синхронизация базы времени (загрузка сессии / восстановление).
  // Трогаем accumulated только когда таймер НЕ идёт, чтобы не затереть идущий отсчёт.
  useEffect(() => {
    if (!runningRef.current) {
      accumulatedRef.current = initialSeconds;
      setSeconds(initialSeconds);
      onTickRef.current(initialSeconds);
    }
  }, [initialSeconds]);

  // Уважение пропа isActive: автостарт при возврате на идущую тренировку,
  // автопауза при внешней остановке. Срабатывает ТОЛЬКО на смену isActive
  // (пауза по кнопке isActive снаружи не меняет → конфликта нет).
  useEffect(() => {
    if (isActive && !runningRef.current) {
      startInternal();
    } else if (!isActive && runningRef.current) {
      pauseInternal();
    }
  }, [isActive, startInternal, pauseInternal]);

  // Финальный пересчёт при размонтировании, чтобы сессия сохранила актуальное
  // duration_seconds даже между тиками (cleanup сессии читает currentTimeRef).
  useEffect(() => {
    return () => {
      if (runningRef.current && startedAtRef.current) {
        const live = Math.floor((Date.now() - startedAtRef.current) / 1000);
        onTickRef.current(accumulatedRef.current + live);
      }
    };
  }, []);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (runningRef.current) pauseInternal();
    else startInternal();
  }, [startInternal, pauseInternal]);

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