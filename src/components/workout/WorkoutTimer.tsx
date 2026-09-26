import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  AppState,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Play, Pause, Clock, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

// ===== Форматирование =====
const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

type TimerPhase = 'running' | 'paused' | 'idle';

interface WorkoutTimerContextValue {
  seconds: number;
  formatted: string;
  running: boolean;
  phase: TimerPhase;
  expanded: boolean;
  toggle: () => void;
  toggleExpand: () => void;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextValue | null>(null);

function useWorkoutTimerCtx(): WorkoutTimerContextValue {
  const ctx = useContext(WorkoutTimerContext);
  if (!ctx) {
    throw new Error('WorkoutTimer* components must be used within WorkoutTimerProvider');
  }
  return ctx;
}

interface WorkoutTimerProviderProps {
  initialSeconds: number;
  isActive: boolean;
  onTick: (seconds: number) => void;
  onStart: () => void;
  onStop: () => void;
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

  // Тик в форграунде — только пока running.
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
const PulseDot = memo(function PulseDot({ phase, color }: { phase: TimerPhase; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (phase === 'running') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [phase, scale, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, dotStyle]}
    />
  );
});

// ===== ЕДИНАЯ КНОПКА СЕССИИ (бывш. пилюля) =====

/**
 * UX-T3 (26.09, выбор пользователя — вариант C): вместо пары «пилюля-таймер +
 * отдельная кнопка «Завершить»» — ОДИН контролл в правом слоте шапки, который
 * морфит состояние:
 *   idle    — «▶ Начать» (зелёная), тап стартует сессию;
 *   running — «⏹ 42:13» (красная): иконка стопа = тап открывает confirm-лист
 *             (защита от случайного финиша — как раньше), долгий тап — панель;
 *   paused  — «▶ 42:13» (янтарная), тап возобновляет таймер;
 *   saving  — disabled-спиннер «Сохранение...».
 * Время видно ПОСТОЯННО (уточнение пользователя 26.09: «часы хочу видеть
 * всегда»): running/paused показывают счётчик в кнопке вместо текстовой
 * метки; смысл действия передаёт иконка (⏹/▶), a11y-метка и confirm-лист.
 * Инвариант: в шапке тренировки ровно один action-контролл сессии — слот
 * никогда не «разрастается» второй кнопкой.
 */
export const WorkoutTimerPill = memo(function WorkoutTimerPill({
  colors,
  onRequestFinish,
  saving,
}: {
  colors: any;
  /** FX-1-паттерн: экран держит confirm-лист в своём корне — сюда только триггер. */
  onRequestFinish: () => void;
  saving: boolean;
}) {
  const { formatted, phase, toggle, toggleExpand } = useWorkoutTimerCtx();

  const onPress = saving
    ? undefined
    : phase === 'running'
      ? () => {
          // хаптика как у прежней кнопки «Завершить» (toggle/toggleExpand
          // дают свою внутри провайдера)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRequestFinish();
        }
      : toggle;
  const onLongPress =
    !saving && (phase === 'running' || phase === 'paused') ? toggleExpand : undefined;

  // running/paused — живой счётчик вместо слова: часы видимы всегда.
  const showTime = !saving && (phase === 'running' || phase === 'paused');
  const label = saving ? 'Сохранение...' : phase === 'idle' ? 'Начать' : formatted;

  const a11yLabel = saving
    ? 'Сохранение тренировки'
    : phase === 'running'
      ? 'Завершить тренировку'
      : phase === 'paused'
        ? 'Пауза — возобновить тренировку'
        : 'Начать тренировку';

  const backgroundColor = saving
    ? colors.surfaceSecondary
    : phase === 'running'
      ? colors.error
      : phase === 'paused'
        ? withAlpha(colors.warning, 0.102)
        : colors.success;

  const textColor = saving
    ? colors.textSecondary
    : phase === 'running'
      ? colors.textInverse
      : phase === 'paused'
        ? colors.warning
        : colors.textInverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={saving}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        phase === 'running' || phase === 'paused'
          ? 'Удерживайте, чтобы открыть таймер и паузу'
          : undefined
      }
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: 7,
        borderRadius: BORDER_RADIUS.full,
        minHeight: 36,
        backgroundColor,
        borderWidth: 1,
        borderColor: saving
          ? colors.border
          : phase === 'paused'
            ? withAlpha(colors.warning, 0.376)
            : 'transparent',
      }}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : phase === 'running' ? (
        <Square size={12} color={textColor} fill={textColor} strokeWidth={2.4} />
      ) : (
        <Play size={12} color={textColor} fill={textColor} strokeWidth={2.4} />
      )}
      <Text
        style={[
          typography.captionSmall,
          {
            color: textColor,
            fontWeight: '700',
            // табличные цифры — счётчик не «прыгает» по ширине каждый тик
            ...(showTime && { fontVariant: ['tabular-nums'] }),
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ===== Раскрытое состояние: аккордеон-панель под шапкой =====

/**
 * UX-T3: панель раскрывается долгим тапом по единой кнопке (running/paused).
 * Здесь большой таймер, пауза/возобновление и дублирующий «Завершить
 * тренировку» — чтобы финиш был доступен и из панели (там же, где пауза).
 */
export const WorkoutTimerPanel = memo(function WorkoutTimerPanel({
  colors,
  onRequestFinish,
}: {
  colors: any;
  onRequestFinish: () => void;
}) {
  const { formatted, running, phase, expanded, toggle } = useWorkoutTimerCtx();

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    // 176 = строка таймера (~100) + кнопка «Завершить тренировку» (~76)
    maxHeight: progress.value * 176,
    opacity: 0.15 + progress.value * 0.85,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  const accent =
    phase === 'running'
      ? colors.success
      : phase === 'paused'
        ? colors.warning
        : colors.textTertiary;

  const statusLabel =
    phase === 'running' ? 'Тренировка идёт' : phase === 'paused' ? 'Пауза' : 'Не начата';

  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[{ overflow: 'hidden', backgroundColor: colors.surface }, panelStyle]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <Clock size={16} color={colors.textTertiary} strokeWidth={2} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulseDot phase={phase} color={accent} />
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: accent,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
            <Text
              style={[
                typography.h3,
                {
                  color: colors.textPrimary,
                  fontVariant: ['tabular-nums'],
                  lineHeight: 40,
                  marginTop: 2,
                },
              ]}
            >
              {formatted}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.75}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: running ? colors.surfaceSecondary : colors.primary,
            borderWidth: running ? 1 : 0,
            borderColor: colors.border,
          }}
        >
          {running ? (
            <Pause size={22} color={colors.textPrimary} strokeWidth={2.4} />
          ) : (
            <Play
              size={22}
              color={colors.textInverse}
              strokeWidth={2.4}
              fill={colors.textInverse}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* UX-T3: дублирующий финиш — в панели рядом с паузой (основной вход —
          тап по красной кнопке в шапке). Ведёт на тот же confirm-лист. */}
      <TouchableOpacity
        onPress={onRequestFinish}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Завершить тренировку"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.sm,
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.md,
          paddingVertical: 10,
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: withAlpha(colors.error, 0.376),
          backgroundColor: withAlpha(colors.error, 0.102),
        }}
      >
        <Square size={13} color={colors.error} fill={colors.error} strokeWidth={2.4} />
        <Text style={[typography.captionSmall, { color: colors.error, fontWeight: '700' }]}>
          Завершить тренировку
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});
