import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import {
  warmupService,
  WarmupExercise,
  InjuryExclusion,
  WarmupAlternativesResult,
} from '../services/warmupService';
import { UserInjury } from '../constants/injuries';
import { useTimerSettings } from './useTimerSettings';
import { useWebPageHidden } from './useWebPageHidden';
import { createTickStore } from '../lib/tickStore';
import * as Haptics from 'expo-haptics';

// FZ-6 (аудит 28.09): тик разминки (1 Гц) вынесен из state экрана в микростор —
// раньше каждую секунду перерендеривался весь workout-экран. Подписчик —
// WarmupBlock (useWarmupTick).
const warmupTickStore = createTickStore<number>(0);
function publishWarmupTick(seconds: number) {
  warmupTickStore.set(seconds, (a, b) => a === b);
}
export function useWarmupTick(): number {
  return useSyncExternalStore(warmupTickStore.subscribe, warmupTickStore.get, warmupTickStore.get);
}

export interface WarmupSourceExercise {
  id: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment?: string[];
}

export function useWarmup(
  exercises: WarmupSourceExercise[],
  activeInjuries: UserInjury[] = [],
  userId?: string | null
) {
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [excludedByInjury, setExcludedByInjury] = useState<InjuryExclusion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  // FZ-6: тик разминки больше не state экрана — стор (useWarmupTick);
  // ref-зеркало нужно только для арифметики интервала.
  const timeLeftRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Кэш альтернатив разминки — ref, без ререндеров экрана.
  // WARMUP-3a: ключ включает подпись травм — после изменения травмы список
  // variants должен пересчитаться (иначе залипает противопоказанный набор).
  const warmupAltsCacheRef = useRef<Record<string, WarmupAlternativesResult>>({});

  const { settings: timerSettings } = useTimerSettings();
  const warmupOrder = timerSettings.warmupOrder;

  const exerciseKey = exercises.map((e) => e.id).join(',');
  const injuryKey = activeInjuries
    .map((i) => `${i.body_part}|${i.injury_type}|${i.severity}`)
    .join(',');

  // WARMUP-3b: счётчик перегенераций входит в сид подбора. Без него ⟳ была
  // детерминированным no-op: тот же скоринг → тот же список.
  const [regenCounter, setRegenCounter] = useState(0);

  useEffect(() => {
    if (exercises.length > 0) {
      generateWarmup();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey, injuryKey, warmupOrder, regenCounter]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // FZ-6: авто-дополнение по достижению 0 раньше делалось через
  // useEffect([timeLeft]) — теперь прямо в тике интервала (см. completeByTick).

  const generateWarmup = async () => {
    setIsLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(null);
    timeLeftRef.current = 0;
    publishWarmupTick(0);
    try {
      const result = await warmupService.generateWarmup(
        exercises,
        activeInjuries,
        warmupOrder,
        userId,
        // сид подбора: пользователь + состав дня + травмы + номер перегенерации.
        // Один и тот же сид → один и тот же набор (возврат на экран не «прыгает»),
        // ⟳ меняет счётчик → другой набор.
        `warmup|${userId ?? 'anon'}|${exerciseKey}|${injuryKey}|${regenCounter}`
      );
      setWarmupExercises(result.exercises);
      setExcludedByInjury(result.excludedByInjury);
      setCompletedIds(new Set());
    } catch (e) {
      console.error('Ошибка генерации разминки:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /** WARMUP-3b: ⟳ в шапке блока — перегенерация с новым сидом (другой набор). */
  const regenerateWarmup = useCallback(() => setRegenCounter((n) => n + 1), []);

  const clearTick = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // WEB-BUG-6: таймер разминки считал ТИКИ (setInterval 1 Гц, −1 за срабатывание).
  // Браузер троттлит интервалы в фоновой вкладке (~1/мин после 5 мин) → 30-сек
  // удержание «висело» минутами. Теперь — та же схема, что у отдыха и сессии:
  // дедлайн wall-clock, тик только пересчитывает остаток (паттерн
  // RestTimerContext.runInterval).
  const endsAtRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  // WEB-FZ-2 (в): на вебе интервал дополнительно ставится на паузу, когда
  // страница скрыта (document.hidden). Остаток при возврате пересчитывается от
  // дедлайна — потеря нулевая. На нативе useWebPageHidden всегда false.
  const pageHidden = useWebPageHidden();

  const finishWarmupTimer = useCallback(
    (exerciseId: string) => {
      clearTick();
      activeIdRef.current = null;
      setActiveTimerId(null);
      timeLeftRef.current = 0;
      publishWarmupTick(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCompletedIds((prev) => new Set(prev).add(exerciseId));
    },
    [clearTick]
  );

  const runTick = useCallback(() => {
    clearTick();
    timerRef.current = setInterval(() => {
      const secLeft = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      if (timeLeftRef.current !== secLeft) {
        timeLeftRef.current = secLeft;
        publishWarmupTick(secLeft);
      }
      if (secLeft === 0 && activeIdRef.current) {
        // FZ-6: завершение — прямо в тике, без state-эффекта на экране.
        finishWarmupTimer(activeIdRef.current);
      }
    }, 1000);
  }, [clearTick, finishWarmupTimer]);

  // Пауза/догоняние тикера при скрытии/возврате страницы (только веб).
  useEffect(() => {
    if (Platform.OS !== 'web' || !activeTimerId) return;
    if (pageHidden) {
      clearTick();
      return;
    }
    const secLeft = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
    if (secLeft === 0 && activeIdRef.current) {
      finishWarmupTimer(activeIdRef.current);
      return;
    }
    timeLeftRef.current = secLeft;
    publishWarmupTick(secLeft);
    runTick();
  }, [pageHidden, activeTimerId, clearTick, finishWarmupTimer, runTick]);

  const startExerciseTimer = useCallback(
    (exerciseId: string) => {
      const exercise = warmupExercises.find((e) => e.id === exerciseId);
      if (!exercise) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActiveTimerId(exerciseId);
      activeIdRef.current = exerciseId;
      endsAtRef.current = Date.now() + exercise.duration_seconds * 1000;
      timeLeftRef.current = exercise.duration_seconds;
      publishWarmupTick(exercise.duration_seconds);
      runTick();
    },
    [warmupExercises, runTick]
  );

  const stopTimer = useCallback(() => {
    clearTick();
    activeIdRef.current = null;
    setActiveTimerId(null);
    timeLeftRef.current = 0;
    publishWarmupTick(0);
  }, [clearTick]);

  const markAsCompleted = useCallback((exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedIds((prev) => new Set(prev).add(exerciseId));
  }, []);

  const isCompleted = (exerciseId: string) => completedIds.has(exerciseId);

  const isAllCompleted = warmupExercises.length > 0 && completedIds.size >= warmupExercises.length;

  const totalDuration = useMemo(
    () => warmupExercises.reduce((sum, ex) => sum + ex.duration_seconds, 0),
    [warmupExercises]
  );

  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach((ex) => ex.primary_muscles.forEach((m) => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  // ✅ Загрузка альтернатив разминки с кэшем (паттерн из useWorkoutSession).
  // WARMUP-3a: список фильтруется по активным травмам на стороне сервиса
  // (общий rankAlternatives, как у основных упражнений) и приходит вместе со
  // счётчиком скрытых — «N скрыто из-за травм».
  const loadWarmupAlternatives = useCallback(
    async (exercise: WarmupExercise): Promise<WarmupAlternativesResult> => {
      const key = `${exercise.id}|${injuryKey}`;
      const cached = warmupAltsCacheRef.current[key];
      if (cached) return cached;
      const result = await warmupService.getWarmupAlternatives(
        exercise.id,
        {
          primary_muscles: exercise.primary_muscles,
          secondary_muscles: exercise.secondary_muscles,
        },
        activeInjuries
      );
      warmupAltsCacheRef.current = { ...warmupAltsCacheRef.current, [key]: result };
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [injuryKey, activeInjuries]
  );

  // ✅ Локальная замена упражнения разминки (по индексу) + WARMUP-2:
  // запомнить предпочтение в warmup_preferences (originId — упражнение ДО свапа,
  // его передаёт лист, где известен main). upsert идемпотентен
  // (user_id, origin_exercise_id); ошибка сети не откатывает локальную замену —
  // в текущей тренировке она видна в любом случае.
  // WARMUP-3a: противопоказанных вариантов здесь уже нет — они отсекаются в
  // getWarmupAlternatives, поэтому отдельного подтверждения на замену не нужно
  // (так же устроены замены основных упражнений).
  const replaceWarmupExercise = useCallback(
    (index: number, alternative: WarmupExercise, originId?: string) => {
      setWarmupExercises((prev) => {
        const next = [...prev];
        if (index < 0 || index >= next.length) return prev;
        next[index] = alternative;
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (userId && originId && originId !== alternative.id) {
        warmupService
          .setWarmupPreference(userId, originId, alternative.id)
          .catch((e) => console.error('warmup preference не сохранён:', e));
      }
    },
    [userId]
  );

  // WARMUP-2: забыть все запомненные замены (генерацию перезапускает caller).
  const clearWarmupPreferences = useCallback(async () => {
    if (!userId) return;
    await warmupService.clearWarmupPreferences(userId);
  }, [userId]);

  return {
    warmupExercises,
    excludedByInjury,
    isLoading,
    completedIds,
    activeTimerId,
    isAllCompleted,
    totalDuration,
    targetMuscles,
    generateWarmup,
    regenerateWarmup,
    startExerciseTimer,
    stopTimer,
    markAsCompleted,
    isCompleted,
    loadWarmupAlternatives,
    replaceWarmupExercise,
    clearWarmupPreferences,
  };
}
