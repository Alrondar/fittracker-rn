// UX-TIMER: провайдер таймера сессии — состояние, авто-пауза при уходе из приложения.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWebPageHidden } from '../../../hooks/useWebPageHidden';
import {
  WorkoutTimerContext,
  formatTime,
  type TimerPhase,
  type WorkoutTimerContextValue,
} from './timerContext';

interface WorkoutTimerProviderProps {
  initialSeconds: number;
  isActive: boolean;
  onTick: (seconds: number) => void;
  onStart: () => void;
  onStop: () => void;
  /** RESET-T: меняется владельцем сессии, когда счётчик нужно обнулить. */
  resetToken?: number;
  children: React.ReactNode;
}

/**
 * Headless-провайдер таймера тренировки. Владеет ВСЕЙ логикой (timestamp-based:
 * точен при блокировке экрана — интервал в фоне не тикает, но при возврате в
 * форграунд elapsed пересчитывается по Date.now()). Рендерится раз в секунду при
 * running, но value контекста мемоизировано → потребители (Pill/Panel) обновляются
 * изолированно, а экран тренировки и список упражнений о тике НЕ знают. При вводе
 * веса value не пересоздаётся (deps не меняются) → пилюля/панель не дёргаются.
 */
export function WorkoutTimerProvider({
  initialSeconds,
  isActive,
  onTick,
  onStart,
  onStop,
  resetToken,
  children,
}: WorkoutTimerProviderProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ref-зеркала: колбэки/эффекты не ловят stale-замыкания
  const runningRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const recompute = useCallback(() => {
    const live = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
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

  // Тик в форграунде — только пока running. WEB-FZ-2 (в): на вебе скрытая
  // страница снимает интервал (elapsed-схема recompute ничего не теряет —
  // при возврате эффект перезапускается и пересчитывает от стартовой метки).
  const pageHidden = useWebPageHidden();
  useEffect(() => {
    if (!running || pageHidden) return;
    recompute();
    intervalRef.current = setInterval(recompute, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, recompute, pageHidden]);

  // Возврат в форграунд (разблокировка) — пересчёт по timestamp.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') recompute();
    });
    return () => sub.remove();
  }, [recompute]);

  // Внешняя синхронизация базы времени (загрузка/восстановление сессии).
  useEffect(() => {
    if (!runningRef.current) {
      accumulatedRef.current = initialSeconds;
      setSeconds(initialSeconds);
      onTickRef.current(initialSeconds);
    }
  }, [initialSeconds]);

  // Уважение пропа isActive: автостарт при возврате на идущую тренировку,
  // автопауза при внешней остановке. Срабатывает ТОЛЬКО на смену isActive.
  useEffect(() => {
    if (isActive && !runningRef.current) {
      startInternal();
    } else if (!isActive && runningRef.current) {
      pauseInternal();
    }
  }, [isActive, startInternal, pauseInternal]);

  // Финальный пересчёт при размонтировании (cleanup сессии читает актуальное время).
  useEffect(() => {
    return () => {
      if (runningRef.current && startedAtRef.current) {
        const live = Math.floor((Date.now() - startedAtRef.current) / 1000);
        onTickRef.current(accumulatedRef.current + live);
      }
    };
  }, []);

  const toggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (runningRef.current) pauseInternal();
    else startInternal();
  }, [startInternal, pauseInternal]);

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  }, []);

  // RESET-T: обнуление счётчика без onStop и без записи в БД — запись делает хук.
  // pauseInternal после него отработает no-op (runningRef уже false), поэтому
  // порядок эффектов внутри провайдера (sync по initialSeconds → реак на
  // isActive) не может вернуть сброшенное время.
  const resetInternal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startedAtRef.current = null;
    accumulatedRef.current = 0;
    runningRef.current = false;
    setRunning(false);
    setSeconds(0);
    onTickRef.current(0);
  }, []);

  // Сброс приходит токеном от владельца сессии (хука): панель не лезет в БД,
  // хук не лезет в отображение таймера. Первый рендер токена — не сброс.
  const lastResetTokenRef = useRef(resetToken);
  useEffect(() => {
    if (resetToken === undefined || resetToken === lastResetTokenRef.current) return;
    lastResetTokenRef.current = resetToken;
    resetInternal();
  }, [resetToken, resetInternal]);

  const phase: TimerPhase = running ? 'running' : seconds > 0 ? 'paused' : 'idle';

  // Мемоизированное value: пересоздаётся ТОЛЬКО при смене таймера/раскрытия,
  // НЕ при ререндере провайдера от смены children (ввод веса) → потребители
  // не дёргаются от ввода. Это и есть изоляция перерендеров.
  const value = useMemo<WorkoutTimerContextValue>(
    () => ({
      seconds,
      formatted: formatTime(seconds),
      running,
      phase,
      expanded,
      toggle,
      toggleExpand,
    }),
    [seconds, running, phase, expanded, toggle, toggleExpand]
  );

  return <WorkoutTimerContext.Provider value={value}>{children}</WorkoutTimerContext.Provider>;
}

// ===== Свёрнутое состояние: пилюля в правый слот шапки =====

/**
 * Пульсирующая точка-индикатор. Живой элемент: при running точка «дышит»
 * (reanimated withRepeat), на паузе/до старта — статична. Цвет кодирует фазу.
 */
