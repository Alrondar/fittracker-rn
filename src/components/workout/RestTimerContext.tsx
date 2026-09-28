// src/components/workout/RestTimerContext.tsx
// MORF-REST (26.09): отдых больше не шторка на весь низ экрана.
// FZ-1 (аудит 28.09): ВЕСЬ таймер отдыха живёт внутри RestTimerProvider —
// интервал, тики и статика (total/ownerIndex). Раньше restTimeLeft был state
// экрана (через useWorkoutSession): каждый тик перерендеривал всё дерево
// тренировки, а не-мемоизированный value контекста пробивал React.memo каждой
// ExerciseCard — дёргался весь список секунду за секундой весь отдых.
// Тик (timeLeft/isFinished) раздаётся через микростор (src/lib/tickStore):
// подписываются только RestChip и RestDial карточки-владельца. Статика —
// через мемоизированный контекст: карточки ре-рендерят только старт/стоп.
// Управление из экрана (SetsGrid автоотдых, чип «Таймер») идёт через
// singleton getRestActions() — useWorkoutSession лишь тонкий прокси к нему.
import React, {
  createContext,
  useContext,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS, withAlpha, SHADOWS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createTickStore } from '../../lib/tickStore';
import { useTimerSettings } from '../../hooks/useTimerSettings';
import { initSounds, playBeep, playFinishSound } from '../../lib/timerSounds';

/** Статика отдыха: меняется только на start/stop/adjust, НЕ на тик. */
export interface RestState {
  /** Полный интервал отдыха (сек) или null — отдыха нет. */
  total: number | null;
  /** exerciseIndex карточки-инициатора (inline-строка рендерится только в ней). */
  ownerIndex: number | null;
  stop: () => void;
  adjust: (delta: number) => void;
}

export interface RestTick {
  timeLeft: number;
  isFinished: boolean;
}

const restTickStore = createTickStore<RestTick>({ timeLeft: 0, isFinished: false });

export function useRestTick(): RestTick {
  return useSyncExternalStore(restTickStore.subscribe, restTickStore.get, restTickStore.get);
}

// ============================================================================
// Экшны через модульный синглтон: один RestTimerProvider на экран (монтируется
// в корне workout/[id].tsx), остальной tree не пробрасывает таймер пропсами.
// ============================================================================
export interface RestActions {
  start: (restSeconds: number, ownerIndex: number | null) => void;
  adjust: (delta: number) => void;
  stop: () => void;
}

let restActions: RestActions | null = null;

function bindRestActions(actions: RestActions): () => void {
  restActions = actions;
  return () => {
    if (restActions === actions) restActions = null;
  };
}

/** Прокси для вызова из хуков/компонентов вне провайдера. Нет провайдера — no-op. */
export function getRestActions(): RestActions | null {
  return restActions;
}

const RestCtx = createContext<RestState | null>(null);

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const { settings: timerSettings } = useTimerSettings();
  const [total, setTotal] = useState<number | null>(null);
  const [ownerIndex, setOwnerIndex] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef(0);
  const lastBeepRef = useRef(0);
  const timeLeftRef = useRef(0);
  const isFinishedRef = useRef(false);

  const publish = useCallback((timeLeft: number, isFinished: boolean) => {
    timeLeftRef.current = timeLeft;
    isFinishedRef.current = isFinished;
    restTickStore.set(
      { timeLeft, isFinished },
      (a, b) => a.timeLeft === b.timeLeft && a.isFinished === b.isFinished
    );
  }, []);

  const runInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const msLeft = endsAtRef.current - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));

      if (timeLeftRef.current !== secLeft) {
        publish(secLeft, isFinishedRef.current);
      }

      if (timerSettings.preBeep && secLeft <= 3 && secLeft > 0 && lastBeepRef.current !== secLeft) {
        lastBeepRef.current = secLeft;
        playBeep();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (msLeft <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        publish(0, true);

        if (timerSettings.sound) playFinishSound();
        if (timerSettings.vibration) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }, 250);
  }, [timerSettings, publish]);

  const start = useCallback(
    (restSeconds: number, owner: number | null = null) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastBeepRef.current = 0;
      endsAtRef.current = Date.now() + restSeconds * 1000;
      setTotal(restSeconds);
      setOwnerIndex(owner);
      publish(restSeconds, false);
      initSounds();
      runInterval();
    },
    [publish, runInterval]
  );

  const adjust = useCallback(
    (delta: number) => {
      if (endsAtRef.current === 0) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      endsAtRef.current += delta * 1000;

      const secLeft = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      // Семантика как в useState-версии: при >0 отдых снова «идёт».
      publish(secLeft, secLeft > 0 ? false : isFinishedRef.current);
      setTotal((prev) => (prev ? Math.max(5, prev + delta) : prev));

      if (secLeft > 0 && !intervalRef.current) {
        runInterval();
      }
    },
    [publish, runInterval]
  );

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    endsAtRef.current = 0;
    setTotal(null);
    setOwnerIndex(null);
    publish(0, false);
  }, [publish]);

  const actions = useMemo<RestActions>(() => ({ start, adjust, stop }), [start, adjust, stop]);

  useEffect(() => {
    // Стор модульный (переживает экран) — новый монтаж обязан увидеть чистый
    // тик, иначе RestChip/RestDial отрисуют остаток прошлой сессии.
    publish(0, false);
    const unbind = bindRestActions(actions);
    return () => {
      unbind();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [actions, publish]);

  const value = useMemo<RestState>(
    () => ({ total, ownerIndex, stop, adjust }),
    [total, ownerIndex, stop, adjust]
  );

  return <RestCtx.Provider value={value}>{children}</RestCtx.Provider>;
}

export function useRestState(): RestState | null {
  return useContext(RestCtx);
}

export const formatRestTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

/**
 * Мини-кольцо прогресса отдыха. Дискретное (тик 250 мс), без Reanimated —
 * дёргается раз в секунду на число, сравнимое с часами шапки.
 */
export const MiniRing = memo(function MiniRing({
  progress,
  size,
  strokeWidth,
  color,
  trackColor,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
});

/**
 * Глобальный чип-индикатор: маленькое кольцо + время в правом нижнем углу,
 * когда карточка-владелец уехала за экран. НЕ интерактивный (pointerEvents
 * none) — управление отдыхом живёт в строке карточки. Исчезает по завершении
 * (isFinished). Подписан на тик напрямую (useRestTick) — экран от тика не
 * дёргается.
 */
export const RestChip = memo(function RestChip({ colors }: { colors: any }) {
  const rest = useRestState();
  const tick = useRestTick();
  if (!rest || rest.total == null || tick.isFinished) return null;
  const progress = rest.total > 0 ? tick.timeLeft / rest.total : 0;
  const color =
    tick.timeLeft <= 10 ? colors.error : tick.timeLeft <= 30 ? colors.warning : colors.primary;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: SPACING.lg,
        right: SPACING.lg,
        zIndex: 900,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.376),
        ...SHADOWS.md,
      }}
    >
      <MiniRing
        progress={progress}
        size={22}
        strokeWidth={3}
        color={color}
        trackColor={colors.surfaceSecondary}
      />
      <Text
        style={[
          typography.captionSmall,
          { color, fontWeight: '700', fontVariant: ['tabular-nums'] },
        ]}
      >
        {formatRestTime(tick.timeLeft)}
      </Text>
    </View>
  );
});
