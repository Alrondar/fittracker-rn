// src/hooks/useWorkoutSession.ts
// Orchestrator workout session — использует вынесенные модули:
// - useWorkoutSession.types.ts — внутренние типы
// - useWorkoutSession.mapper.ts — чистые функции маппинга
// - useWorkoutSession.loader.ts — функции загрузки данных
// (useWorkoutSession.rest.ts удалён 28.09, FZ-1: таймер отдыха живёт в
//  RestTimerProvider, src/components/workout/RestTimerContext.tsx)
import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { feedback } from '../lib/feedback';
import { useQueryClient } from '@tanstack/react-query';

import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { invalidateWorkoutAffectedCaches } from '../lib/queryInvalidation';
import {
  ExerciseData,
  SetData,
  SetFeedbackPatch,
  ExercisePainState,
  AlternativeExercise,
} from '../types/workout';
import {
  replaceExerciseInProgram,
  addExerciseToProgramBelow,
  NEW_PROGRAM_EXERCISE_DEFAULTS,
} from '../services/programsService';
import { getActiveInjuries, profileService } from '../services/profileService';
import { painService, PainType } from '../services/painService';
import { mapError } from '../utils/errorMapper';
import { perfMark, perfSince } from '../utils/perf';
import { UserInjury } from '../constants/injuries';
import { AlternativeSourceInput } from '../engine/alternatives';
import { getRestActions } from '../components/workout/RestTimerContext';
import {
  fetchWorkoutSession,
  fetchAlternatives,
  fetchExerciseHistory,
  FetchAlternativesResult,
  updateWorkout,
  upsertWorkoutLogs,
  updateWorkoutExerciseId,
  updateWorkoutExerciseSettings,
  addWorkoutExerciseBelow,
  removeWorkoutExercise,
  clearWorkoutLogs,
  finishWorkoutAndAdvance,
  type WorkoutFinishResult,
} from '../services/workoutService';
import {
  buildExercisesData,
  buildPrevLogsByExerciseId,
  injectPreviousData,
  buildPainStateMap,
} from './workout/useWorkoutSession.mapper';

export function useWorkoutSession(workoutId: string, userId: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [workoutName, setWorkoutName] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  // UX-2 (audit-12): screen-level ошибка загрузки — раньше провал loadWorkout
  // тонул в Alert, а экран оставался с пустым списком «Нет упражнений».
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const isWorkoutActiveRef = useRef(false);
  const isFinishingRef = useRef(false);
  const currentTimeRef = useRef<number>(0);
  const alternativesCacheRef = useRef<Record<string, FetchAlternativesResult>>({});
  // ENG-5: активные травмы для ранжирования альтернатив (один запрос на сессию)
  const activeInjuriesRef = useRef<UserInjury[] | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  // FD12-3: снимок оригинала до первой замены (в рамках экрана). Хранится в
  // памяти по решению 25.09 (без прод-миграции): переживает перезаход НЕ может —
  // после reload бейдж «Заменено» и кнопка «Вернуть» скрываются, но хотя бы
  // «Вернуть оригинал» в рамках сессии делает ровно то, что обещает.
  const originalsRef = useRef<Map<string, ExerciseData>>(new Map());
  const exercisesRef = useRef<ExerciseData[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLogsRef = useRef<Map<string, SetData[]>>(new Map());

  // Rest timer — FZ-1 (аудит 28.09): весь таймер живёт в RestTimerProvider
  // (src/components/workout/RestTimerContext.tsx); здесь только стабильный
  // прокси к его start — тик не проходит через state экрана вообще.
  // stop/adjust потребляют RestDial/карточки напрямую из контекста провайдера.
  const startRestTimer = useCallback((restSeconds: number, ownerIndex: number | null = null) => {
    getRestActions()?.start(restSeconds, ownerIndex);
  }, []);
  const cleanupRestTimer = useCallback(() => {
    // no-op: RestTimerProvider сам чистит интервал на собственном unmount
    // (это и есть unmount экрана).
  }, []);

  // Синхронизация refs
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  // VF-4/FD12-4: target_sets и rest_seconds должны попадать в БД — mapper строит
  // сеты по target_sets и при перезаходе обрезает лишние логи (auto-add, ENG-13),
  // а отдых иначе откатывается к плану.
  const persistExerciseSettings = useCallback(
    (workoutExerciseId: string, patch: { target_sets?: number; rest_seconds?: number }) => {
      updateWorkoutExerciseSettings(workoutExerciseId, patch).catch((error) => {
        console.error('[persistExerciseSettings] error:', error);
      });
    },
    []
  );

  useEffect(() => {
    isWorkoutActiveRef.current = isWorkoutActive;
  }, [isWorkoutActive]);

  useEffect(() => {
    isFinishingRef.current = isFinishing;
  }, [isFinishing]);

  // ============================================================================
  // P0-B: ПАРАЛЛЕЛЬНЫЙ flush
  // ============================================================================
  // VF-3: возвращает число групп упражнений, которые НЕ удалось записать.
  // Упавшие сеты возвращаются в pendingLogsRef — периодический flush и
  // повторное «Завершить» попробуют отправить их ещё раз.
  const flushPendingLogs = useCallback(async (): Promise<number> => {
    const entries = Array.from(pendingLogsRef.current.entries());
    if (entries.length === 0) return 0;
    pendingLogsRef.current.clear();
    const now = new Date();
    let failures = 0;
    const promises = entries.map(async ([workoutExerciseId, exerciseLogs]) => {
      // Сначала маппим с сохранением оригинального индекса (set_number), затем фильтруем пустые
      const formattedLogs = exerciseLogs
        .map((set, index) => ({
          set_number: index + 1,
          weight_kg: set.weight ? parseFloat(set.weight) : null,
          reps: set.reps ? parseInt(set.reps) : (set.estimatedReps ?? null),
          reps_left: set.reps_left ? parseInt(set.reps_left) : null,
          reps_right: set.reps_right ? parseInt(set.reps_right) : null,
          completed_at: now.toISOString(),
          rpe: set.rpe ?? null,
          rir: set.rir ?? null,
          difficulty: set.difficulty ?? null,
          is_warmup: set.isWarmup ?? false,
          is_estimated_reps: set.reps === '' && set.estimatedReps != null,
        }))
        .filter(
          (log) =>
            log.weight_kg !== null ||
            log.reps !== null ||
            log.reps_left !== null ||
            log.reps_right !== null ||
            // F3 (17.10): сет, где заполнены только обратная связь (RPE/RIR/
            // сложность), раньше отсекался на клиенте и не уходил в БД вообще —
            // после возврата отметка усилия исчезала. Читатели нагрузки
            // (рекомендации, прогноз, недельный объём) такие строки фильтруют,
            // чтобы пустой по весу сет не сбил «Прошлый/Рекомендую».
            log.rpe !== null ||
            log.rir !== null ||
            log.difficulty !== null
        );

      if (formattedLogs.length === 0) return;

      try {
        // F5: длина массива экрана = верхняя граница заменяемого диапазона.
        await upsertWorkoutLogs(workoutExerciseId, formattedLogs, exerciseLogs.length);
      } catch (error) {
        console.error('[flushPendingLogs] error:', error);
        failures++;
        // VF-3: вернуть в pending — повторный flush (или «Завершить») отправит снова.
        // Если за время запроса пользователь уже вбил новые значения (updateSet
        // положил свежий массив под тем же ключом) — не затираем, свежее победит.
        if (!pendingLogsRef.current.has(workoutExerciseId)) {
          pendingLogsRef.current.set(workoutExerciseId, exerciseLogs);
        }
      }
    });

    await Promise.all(promises);
    return failures;
  }, []);

  // BUG-7 (аудит 28.09): single-flight обёртка flush — «Завершить» подхватывает
  // уже идущий debounce-flush вместо параллельного второго прогона (тот
  // видел бы уже очищенную pendingLogsRef → ложные 0 failures при живом
  // падающем запросе, а его собственный catch вернул бы логи в карту).
  const flushPromiseRef = useRef<Promise<number> | null>(null);
  const joinFlush = useCallback((): Promise<number> => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const p = flushPendingLogs().finally(() => {
      if (flushPromiseRef.current === p) flushPromiseRef.current = null;
    });
    flushPromiseRef.current = p;
    return p;
  }, [flushPendingLogs]);

  // ============================================================================
  // LOAD WORKOUT — использует loader + mapper
  // ============================================================================
  const loadWorkout = useCallback(async () => {
    perfMark('load:start');
    setLoadError(null);
    try {
      perfMark('load:q1-start');
      const data = await fetchWorkoutSession(workoutId);
      perfSince('load:q1-start', 'Q1: workout + exercises + logs (параллельно)');

      const {
        workoutRow,
        exerciseRows,
        logsByWorkoutExercise,
        recentLogs,
        referenceData,
        painEvents,
      } = data;

      setWorkoutName(workoutRow.name ?? 'Тренировка');
      setProgramId(workoutRow.program_id);

      // Восстановление активной тренировки.
      // F1 (17.10): базой времени служит накопленный duration_seconds (пишется при
      // уходе с экрана и на «Завершить»), а не wall-clock от started_at. Прежнее
      // правило брало now − started_at и требовало elapsed < 86400: сессия,
      // оставленная на ночь или на сутки, открывалась с 00:00 и неактивным
      // таймером, хотя отработанное время лежало в БД (в проде 4 из 5 открытых
      // тренировок попадали под этот отказ).
      if (workoutRow.started_at && !workoutRow.finished_at) {
        const stored = workoutRow.duration_seconds;
        const elapsed = Math.floor((Date.now() - new Date(workoutRow.started_at).getTime()) / 1000);

        let resumeFrom: number | null = null;
        if (stored && stored > 0) {
          resumeFrom = stored;
        } else if (elapsed > 0 && elapsed < 86400) {
          resumeFrom = elapsed;
        }

        if (resumeFrom !== null) {
          setInitialTime(resumeFrom);
          currentTimeRef.current = resumeFrom;
          startedSavedRef.current = true; // started_at уже в БД — не перезаписывать автостартом
          setIsWorkoutActive(true);
        }
      }

      const workoutExercises = workoutRow.workout_exercises || [];
      const exercisesById = new Map(exerciseRows.map((ex) => [ex.id, ex]));

      // Маппинг через вынесенные чистые функции
      // PR6: pain state по exercise_id — для prefill PainSheet и visual affordance
      const painStateMap = buildPainStateMap(painEvents);
      const exercisesData = buildExercisesData(
        workoutExercises,
        exercisesById,
        logsByWorkoutExercise,
        referenceData,
        painStateMap
      );

      const prevLogsByExerciseId = buildPrevLogsByExerciseId(recentLogs);
      const finalExercisesData = injectPreviousData(exercisesData, prevLogsByExerciseId);
      setExercises(finalExercisesData);

      // UX-3a (I-5): all-time bests по упражнениям сессии — async, не блокирует
      // открытие тренировки; PR-момент «оживает», когда карта приедет. Ошибку
      // глушим тихо: это украшение, а не данные сессии.
      if (userId) {
        const ids = finalExercisesData.map((e) => e.id);
        profileService
          .getPersonalBests(userId, ids)
          .then((bests: Record<string, number>) => {
            setExercises((prev) =>
              prev.some((e) => bests[e.id] != null && e.personalBest == null)
                ? prev.map((e) => (bests[e.id] != null ? { ...e, personalBest: bests[e.id] } : e))
                : prev
            );
          })
          .catch((e: unknown) => console.warn('[useWorkoutSession] personalBests load failed:', e));
      }

      perfSince('load:start', 'loadWorkout: итого (запросы + маппинг)');
    } catch (error: any) {
      console.error('[useWorkoutSession] loadWorkout:', error);
      feedback.alert('Ошибка', mapError(error));
      setLoadError(mapError(error));
    } finally {
      setLoading(false);
    }
  }, [workoutId, userId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // F4 (17.10): уход в фон = тот же долг, что и unmount. Раньше запись была
  // только на unmount и на debounce 500 мс: приложение, закрытое сразу после
  // ввода, теряло последние значения (pendingLogsRef к этому моменту уже очищен
  // у начавшегося flush, а упавший запрос возвращается в память, которая умрёт
  // вместе с процессом). 'hidden' — имя состояния на вебе (RNW не отдаёт
  // 'background'/'inactive'), на нативе оно не встречается.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      // RNW присылает 'visible'/'hidden' — в типах React Native их нет, поэтому
      // сравнение идёт через string-широкое приведение (Platform-специфичных
      // веток здесь заводить нечего: на нативе 'hidden' просто не встречается).
      const stateName = state as string;
      if (stateName !== 'background' && stateName !== 'inactive' && stateName !== 'hidden') return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void joinFlush();

      if (isWorkoutActiveRef.current && !isFinishingRef.current && currentTimeRef.current > 0) {
        updateWorkout(workoutId, { duration_seconds: currentTimeRef.current }).catch((error) => {
          console.error('[useWorkoutSession] AppState flush:', error);
        });
      }
    });

    return () => subscription.remove();
  }, [joinFlush, workoutId]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      cleanupRestTimer();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      flushPendingLogs();

      if (isWorkoutActiveRef.current && !isFinishingRef.current && currentTimeRef.current > 0) {
        updateWorkout(workoutId, { duration_seconds: currentTimeRef.current }).catch((error) => {
          console.error('Ошибка сохранения прогресса:', error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // TIMER CALLBACKS
  // ============================================================================
  const handleTimerTick = useCallback((seconds: number) => {
    currentTimeRef.current = seconds;
  }, []);

  // UX-TIMER: идемпотентность записи started_at — старт вызывается и из pill,
  // и из эффекта автозапуска провайдера при смене isActive.
  const startedSavedRef = useRef(false);

  const handleTimerStart = useCallback(() => {
    setIsWorkoutActive(true);
    // UX-TIMER: старт идёт ТОЛЬКО через WorkoutTimerProvider (pill/панель),
    // но эффект автозапуска провайдера может дёрнуть onStart повторно в том же
    // тике смены isActive — write started_at идемпотентен по флагу.
    if (!startedSavedRef.current) {
      startedSavedRef.current = true;
      updateWorkout(workoutId, {
        started_at: new Date().toISOString(),
        duration_seconds: 0,
      }).catch((error) => {
        console.error('Ошибка сохранения started_at:', error);
      });
    }
  }, [workoutId]);

  const handleTimerStop = useCallback(() => {}, []);

  // ============================================================================
  // LOAD ALTERNATIVES — использует loader + ENG-5 ranking
  // ============================================================================
  const loadAlternatives = useCallback(
    async (exerciseId: string, source: AlternativeSourceInput) => {
      // hasPain влияет на ранжирование (PAIN_ON_SOURCE_GROUP) → учитываем в ключе кэша
      const cacheKey = `${exerciseId}:${source.hasPain ? 'pain' : 'nopain'}`;
      if (alternativesCacheRef.current[cacheKey]) {
        return alternativesCacheRef.current[cacheKey];
      }
      try {
        // ENG-5: активные травмы — лениво, один запрос на сессию
        if (activeInjuriesRef.current === null) {
          activeInjuriesRef.current = userId ? await getActiveInjuries(userId) : [];
        }
        const result = await fetchAlternatives(exerciseId, source, activeInjuriesRef.current);
        alternativesCacheRef.current = {
          ...alternativesCacheRef.current,
          [cacheKey]: result,
        };
        return result;
      } catch (error) {
        console.error('[useWorkoutSession] loadAlternatives:', error);
        return { alternatives: [], excludedCount: 0 };
      }
    },
    [userId]
  );

  // ============================================================================
  // SET MUTATIONS
  // ============================================================================
  const scheduleFlush = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      joinFlush();
    }, 500);
  }, [joinFlush]);

  const updateSet = useCallback(
    (
      exerciseIndex: number,
      setIndex: number,
      field: 'weight' | 'reps' | 'reps_left' | 'reps_right',
      value: string
    ) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], [field]: value };
        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush]
  );

  const updateSetFeedback = useCallback(
    (exerciseIndex: number, setIndex: number, patch: SetFeedbackPatch) => {
      setExercises((prev) => {
        const exercise = prev[exerciseIndex];
        const set = exercise.sets[setIndex];

        // VF-1: сравниваем ВСЕ поля патча, а не только rpe/rir/difficulty.
        // Раньше патч {isWarmup} на пустом сете (rpe/rir/difficulty === undefined
        // с обеих сторон) считался «без изменений» и отбрасывался.
        const changed =
          (patch.rpe !== undefined && set.rpe !== patch.rpe) ||
          (patch.rir !== undefined && set.rir !== patch.rir) ||
          (patch.difficulty !== undefined && set.difficulty !== patch.difficulty) ||
          (patch.isWarmup !== undefined && (set.isWarmup ?? false) !== patch.isWarmup) ||
          (patch.estimatedReps !== undefined && set.estimatedReps !== patch.estimatedReps);
        if (!changed) {
          return prev;
        }

        const updated = [...prev];
        const newExercise = { ...exercise };
        const newSets = [...exercise.sets];
        newSets[setIndex] = { ...set, ...patch };
        newExercise.sets = newSets;
        updated[exerciseIndex] = newExercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, newSets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush]
  );

  const applyProgression = useCallback(
    (exerciseIndex: number, newWeight: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        if (sets.length > 0) {
          sets[0] = { ...sets[0], weight: newWeight.toString() };
        }
        exercise.sets = sets;
        updated[exerciseIndex] = exercise;
        pendingLogsRef.current.set(exercise.workout_exercise_id, sets);
        scheduleFlush();
        return updated;
      });
    },
    [scheduleFlush]
  );

  const isSetCompleted = useCallback((set: SetData): boolean => {
    // `?? ''` — защита от отсутствующих ключей reps_left/right: undefined !== '' иначе
    // считает пустой сет завершённым (ломает RecommendationCard, RPE-чипы, автостарт отдыха)
    return (
      set.weight !== '' ||
      set.reps !== '' ||
      (set.reps_left ?? '') !== '' ||
      (set.reps_right ?? '') !== ''
    );
  }, []);

  const updateExerciseSettings = useCallback(
    (exerciseIndex: number, newSetsCount: number, newRestSeconds: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const exercise = { ...updated[exerciseIndex] };
        const sets = [...exercise.sets];
        const lastSetWithHistory = [...sets].reverse().find((s) => s.previousWeight != null);
        while (sets.length < newSetsCount) {
          sets.push({
            weight: '',
            reps: '',
            reps_left: '',
            reps_right: '',
            previousWeight: lastSetWithHistory?.previousWeight ?? null,
            previousReps: lastSetWithHistory?.previousReps ?? null,
            previousRpe: lastSetWithHistory?.previousRpe ?? null,
          });
        }
        exercise.sets = sets.slice(0, newSetsCount);
        exercise.target_sets = newSetsCount;
        exercise.rest_seconds = newRestSeconds;
        updated[exerciseIndex] = exercise;
        return updated;
      });
      // VF-4/FD12-4: persist — иначе при перезаходе mapper обрежет сеты до старого
      // target_sets, а отдых откатится к плану. Наружу updaters (апдейтер остаётся
      // чистым — CLAUDE.md §9).
      const weId = exercisesRef.current[exerciseIndex]?.workout_exercise_id;
      if (weId)
        persistExerciseSettings(weId, { target_sets: newSetsCount, rest_seconds: newRestSeconds });

      // F2/F5 (17.10): осознанное СОКРАЩЕНИЕ числа подходов должно уехать в БД
      // сразу. Ф5 заменяет только диапазон 1..p_total_sets, поэтому без этого
      // сигнала убранный подход при следующем открытии вернулся бы (Ф2 рисует
      // max(target_sets, сохранённый максимум)). Длина берётся из среза, который
      // видит пользователь, а не из target_sets: при живой сетке 5 и устаревшем
      // target_sets 3 (путь addSet) именно срез отражает намерение.
      const before = exercisesRef.current[exerciseIndex]?.sets ?? [];
      if (weId && before.length > newSetsCount) {
        pendingLogsRef.current.set(weId, before.slice(0, newSetsCount));
        scheduleFlush();
      }
    },
    [persistExerciseSettings, scheduleFlush]
  );

  // ENG-13: добавить N сетов (для warmup toggle auto-add). Раньше экран вызывал
  // addSet синхронно N раз — при переносе persist наружу это давало бы N записей
  // одного и того же (+1) значения, поэтому добавление стало пакетным.
  const addSet = useCallback(
    (exerciseIndex: number, count = 1) => {
      if (count <= 0) return;
      const exercise = exercisesRef.current[exerciseIndex];
      setExercises((prev) => {
        const updated = [...prev];
        const ex = { ...updated[exerciseIndex] };
        const lastSetWithHistory = [...ex.sets].reverse().find((s) => s.previousWeight != null);
        const sets = [...ex.sets];
        for (let i = 0; i < count; i++) {
          sets.push({
            weight: '',
            reps: '',
            reps_left: '',
            reps_right: '',
            previousWeight: lastSetWithHistory?.previousWeight ?? null,
            previousReps: lastSetWithHistory?.previousReps ?? null,
            previousRpe: lastSetWithHistory?.previousRpe ?? null,
          });
        }
        ex.sets = sets;
        // VF-4: auto-add должен двигать и target_sets — иначе mapper при
        // перезаходе выбросит новые сеты (index >= targetSets)
        ex.target_sets = ex.sets.length;
        updated[exerciseIndex] = ex;
        return updated;
      });
      // Снаружи updaters (апдейтер остаётся чистым — CLAUDE.md §9): одно
      // событие → ref синхронен, target_sets + count даёт итог за один запрос
      // F2 (17.10): итог считается от ФАКТИЧЕСКОЙ длины сетки, а не от
      // target_sets — при сохранённых подходах сверх плана (addSet не доехал до
      // БД) target_sets + count записал бы число меньше показанного.
      if (exercise) {
        const shown = exercise.sets?.length ?? exercise.target_sets;
        persistExerciseSettings(exercise.workout_exercise_id, {
          target_sets: Math.max(exercise.target_sets, shown) + count,
        });
      }
    },
    [persistExerciseSettings]
  );

  // ============================================================================
  // RESET-T: сброс начала тренировки
  // ============================================================================

  // Токен — единственный способ сказать провайдеру таймера «обнули отображение»,
  // не заставляя панель писать в БД, а хук — владеть интервалом таймера.
  const [timerResetToken, setTimerResetToken] = useState(0);

  // «Есть что терять» = в любом подходе заполнено хотя бы одно поле, включая
  // обратную связь без веса (Ф3): иначе подтверждение пропустило бы случай
  // «отметил только RPE».
  const hasLoggedSets = useCallback((): boolean => {
    return exercisesRef.current.some((exercise) =>
      (exercise.sets || []).some(
        (set) =>
          set.weight !== '' ||
          set.reps !== '' ||
          (set.reps_left ?? '') !== '' ||
          (set.reps_right ?? '') !== '' ||
          set.rpe != null ||
          set.rir != null ||
          set.difficulty != null
      )
    );
  }, []);

  const applySessionReset = useCallback(
    async (clearLogs: boolean) => {
      // Снимаем debounce: неотправленный ввод после сброса уезжать уже не должен.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (clearLogs) {
        const workoutExerciseIds = exercisesRef.current
          .map((exercise) => exercise.workout_exercise_id)
          .filter(Boolean);
        pendingLogsRef.current.clear();
        await clearWorkoutLogs(workoutExerciseIds);
        // Значения в состоянии гасим обязательно: в БД их нет, а сетки остались
        // бы заполненными и при следующем флэше вернули бы удалённое.
        setExercises((prev) =>
          prev.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({
              ...set,
              weight: '',
              reps: '',
              reps_left: '',
              reps_right: '',
              rpe: null,
              rir: null,
              difficulty: null,
              estimatedReps: null,
              isWarmup: false,
            })),
          }))
        );
      } else {
        // Время сбрасываем ПОСДЛЕ того, как подходы дописаны: иначе сброс
        // лишает пользователя данные, которые он успел ввести.
        await joinFlush();
      }

      await updateWorkout(workoutId, { started_at: null, duration_seconds: 0 });

      // Порядок важен: активность гасим до токена, иначе автостарт по isActive
      // и unmount-запись вернули бы started_at/duration_seconds обратно.
      isWorkoutActiveRef.current = false;
      setIsWorkoutActive(false);
      startedSavedRef.current = false;
      currentTimeRef.current = 0;
      setInitialTime(0);
      setTimerResetToken((prev) => prev + 1);

      if (userId) invalidateWorkoutAffectedCaches(queryClient, userId);
    },
    [workoutId, userId, queryClient, joinFlush]
  );

  const resetSession = useCallback(() => {
    if (isFinishingRef.current) return;

    const run = (clearLogs: boolean) => {
      void (async () => {
        try {
          await applySessionReset(clearLogs);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          feedback.alert(
            'Тренировка сброшена',
            clearLogs
              ? 'Таймер и записанные подходы обнулены. Начни заново по «Начать».'
              : 'Таймер обнулён, подходы остались. Начни заново по «Начать».'
          );
        } catch (error: any) {
          console.error('[useWorkoutSession] resetSession:', error);
          feedback.alert('Ошибка', mapError(error));
        }
      })();
    };

    // Если подходов нет — терять нечего, одного тапа достаточно.
    if (!hasLoggedSets()) {
      run(false);
      return;
    }

    feedback.alert(
      'Сбросить начало тренировки?',
      'Таймер вернётся к 00:00, тренировка снова станет «не начата». Завершать и пересоздавать её не нужно.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Только время', onPress: () => run(false) },
        { text: 'Время и подходы', style: 'destructive', onPress: () => run(true) },
      ]
    );
  }, [applySessionReset, hasLoggedSets]);

  // ============================================================================
  // REPLACE / RESET
  // ============================================================================

  // SWAP-1: раньше замена упражнения меняла карточку, но sets оставались с
  // previous* СТАРОГО упражнения — рекомендатор (calculateProgression) строил
  // «Прошлый/Рекомендую» по истории другого движения (риск неподъёмного веса).
  // swapCardFields при замене мгновенно честно обнуляет чужую историю,
  // reinjectExerciseHistory подтягивает реальную историю и PB нового упражнения
  // (форма запроса = загрузка экрана → результат совпадает с перезаходом).
  const swapCardFields = useCallback((exerciseIndex: number, alternative: AlternativeExercise) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exerciseIndex];
      if (!ex) return prev;
      updated[exerciseIndex] = {
        ...ex,
        id: alternative.id,
        name: alternative.name,
        primary_muscles: alternative.primary_muscles,
        secondary_muscles: alternative.secondary_muscles,
        technique: alternative.technique,
        equipment: alternative.equipment ?? [],
        settings: alternative.settings,
        benefits: alternative.benefits,
        risks: alternative.risks,
        injuries: alternative.injuries,
        media_url: alternative.media_url,
        personalBest: null,
        sets: ex.sets.map((s) => ({
          ...s,
          previousWeight: null,
          previousReps: null,
          previousRpe: null,
        })),
      };
      return updated;
    });
  }, []);

  const reinjectExerciseHistory = useCallback(
    async (exerciseIndex: number, exerciseId: string) => {
      try {
        const [recentLogs, bests] = await Promise.all([
          fetchExerciseHistory(exerciseId, workoutId),
          userId
            ? profileService.getPersonalBests(userId, [exerciseId])
            : Promise.resolve({} as Record<string, number>),
        ]);
        const bySet = buildPrevLogsByExerciseId(recentLogs).get(exerciseId);
        setExercises((prev) => {
          const updated = [...prev];
          const ex = updated[exerciseIndex];
          // Гонка: пока была в сети, карточку могли пересвапить/вернуть —
          // устаревший результат выбрасываем.
          if (!ex || ex.id !== exerciseId) return prev;
          updated[exerciseIndex] = {
            ...ex,
            personalBest: bests[exerciseId] ?? null,
            sets: ex.sets.map((s, i) => {
              const p = bySet?.get(i + 1);
              return {
                ...s,
                previousWeight: p?.weight_kg ?? null,
                previousReps: p?.reps ?? null,
                previousRpe: p?.rpe ?? null,
              };
            }),
          };
          return updated;
        });
      } catch (error) {
        // Провал = карточка остаётся в «нет истории» — это честнее и безопаснее,
        // чем рекомендация от чужого упражнения.
        console.warn('[useWorkoutSession] reinjectExerciseHistory:', error);
      }
    },
    [workoutId, userId]
  );

  const replaceExercise = useCallback(
    async (exerciseIndex: number, alternativeId: string, preset?: AlternativeExercise) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise) return;

      // SEARCH-ALT: карточка, выбранная из поиска по базе, приходит готовой —
      // искать её среди связей упражнения бессмысленно (её там нет).
      const alternative =
        preset ??
        (
          await loadAlternatives(exercise.id, {
            primaryMuscles: exercise.primary_muscles,
            secondaryMuscles: exercise.secondary_muscles,
            equipment: exercise.equipment,
            hasPain: !!exercise.painState,
          })
        ).alternatives.find((item) => item.id === alternativeId);
      if (!alternative) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // FD12-3: запоминаем оригинал до первой замены (цепочка A→B→C откатывает к A)
      if (!originalsRef.current.has(exercise.workout_exercise_id)) {
        originalsRef.current.set(exercise.workout_exercise_id, exercise);
      }

      // ENG-16: Обновляем exercise_id в БД, чтобы логи сохранились под новым упражнением.
      // И обновляем pain_events, чтобы контекст безопасности не потерялся.
      try {
        if (userId) {
          await painService.updatePainEventExerciseId(
            userId,
            workoutId,
            exercise.id, // старый exercise_id
            alternative.id // новый exercise_id
          );
        }
        await updateWorkoutExerciseId(exercise.workout_exercise_id, alternative.id);
      } catch (error) {
        console.error('[useWorkoutSession] replaceExercise DB update:', error);
        // Не прерываем локальное обновление UI, но логируем ошибку
      }

      swapCardFields(exerciseIndex, alternative);
      void reinjectExerciseHistory(exerciseIndex, alternative.id);

      setReplacements((prev) => ({
        ...prev,
        [exercise.workout_exercise_id]: alternativeId,
      }));

      // Alert убран: при наличии программы Alert показывает handleReplaceChoice
      // (UX-5 Feature 1) в [id].tsx; при отсутствии программы — действие настолько
      // лёгкое, что подтверждение не требуется (haptic + мгновенная замена).
    },
    [loadAlternatives, userId, workoutId, swapCardFields, reinjectExerciseHistory]
  );

  // FD12-3: честный возврат. Раньше loadWorkout() перечитывал тренировку из БД,
  // где уже лежала замена, — «Вернуть оригинал» возвращал… заменённое. Теперь
  // откатываем запись обратно: exercise_id в workout_exercises, pain_events
  // (зеркально ENG-16) и карточка в стейте. Снимок оригинала живёт в памяти
  // экрана (решение 25.09 — без прод-миграции), поэтому после перезахода
  // бейджа/кнопки нет (replacements — тоже память).
  const resetToOriginal = useCallback(
    (exerciseIndex: number) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise) return;

      const workoutExerciseId = exercise.workout_exercise_id;
      const original = originalsRef.current.get(workoutExerciseId);
      if (!original) {
        // Оригинала не знаем (например, замена была до перезахода экрана) —
        // врать нечем: перечитываем как есть.
        loadWorkout();
        return;
      }

      feedback.alert(
        'Вернуть оригинальное упражнение?',
        `«${original.name}» вернётся в тренировку, введённые подходы сохранятся`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Вернуть',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              try {
                if (userId) {
                  await painService.updatePainEventExerciseId(
                    userId,
                    workoutId,
                    exercise.id, // текущий (замена)
                    original.id // оригинал
                  );
                }
                await updateWorkoutExerciseId(workoutExerciseId, original.id);
              } catch (error) {
                console.error('[useWorkoutSession] resetToOriginal DB update:', error);
                feedback.alert('Ошибка', mapError(error));
                return; // БД не тронута — бейдж и кнопка остаются
              }

              setExercises((prev) => {
                const updated = [...prev];
                const current = updated[exerciseIndex];
                updated[exerciseIndex] = {
                  ...current,
                  id: original.id,
                  name: original.name,
                  primary_muscles: original.primary_muscles,
                  secondary_muscles: original.secondary_muscles,
                  technique: original.technique,
                  equipment: original.equipment,
                  settings: original.settings,
                  benefits: original.benefits,
                  risks: original.risks,
                  injuries: original.injuries,
                  alternatives: original.alternatives,
                  media_url: original.media_url,
                  // SWAP-1: возвращаем и ИСТОРИЮ оригинала — previous* в текущих
                  // сетах после свапа принадлежат замещавшему упражнению.
                  personalBest: original.personalBest ?? null,
                  sets: current.sets.map((s, i) => {
                    const o = original.sets[i];
                    return {
                      ...s,
                      previousWeight: o?.previousWeight ?? null,
                      previousReps: o?.previousReps ?? null,
                      previousRpe: o?.previousRpe ?? null,
                    };
                  }),
                };
                return updated;
              });
              setReplacements((prev) => {
                const updated = { ...prev };
                delete updated[workoutExerciseId];
                return updated;
              });
              originalsRef.current.delete(workoutExerciseId);
            },
          },
        ]
      );
    },
    [loadWorkout, userId, workoutId]
  );

  // ============================================================================
  // UX-5 Feature 1: PROGRAM REPLACEMENT (permanent)
  // ============================================================================
  /**
   * Заменить упражнение в программе — обновляет program_exercises + sync будущих тренировок.
   * Локальное обновление (текущая тренировка) выполняется тем же update'ом exercises,
   * что и temporary replacement. При ошибке сервиса — ROLLBACK локального состояния
   * (программа не изменилась, UI должен показывать оригинал).
   */
  const replaceExerciseInProgramCb = useCallback(
    async (exerciseIndex: number, alternativeId: string, preset?: AlternativeExercise) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !programId) return;

      // SEARCH-ALT: тот же путь, что у временной замены — готовая карточка из
      // поиска не проходит через связи упражнения.
      const alternative =
        preset ??
        (
          await loadAlternatives(exercise.id, {
            primaryMuscles: exercise.primary_muscles,
            secondaryMuscles: exercise.secondary_muscles,
            equipment: exercise.equipment,
            hasPain: !!exercise.painState,
          })
        ).alternatives.find((item) => item.id === alternativeId);
      if (!alternative) return;

      // Snapshot для rollback при ошибке сервиса
      const previousExercise = { ...exercise };

      // 1. Локальное (оптимистичное) обновление — как temporary (SWAP-1:
      // чужая previous*-история обнуляется сразу; своя подтянется после
      // подтверждения сервера — при rollback previousExercise вернёт её как был)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      swapCardFields(exerciseIndex, alternative);

      // 2. Программная замена (persistent + sync будущих тренировок)
      try {
        await replaceExerciseInProgram(
          workoutId,
          exercise.workout_exercise_id,
          alternative.id,
          alternative.name
        );
        // SWAP-1: программа подтвердила замену — подтягиваем историю нового
        // упражнения (совпадает с тем, что карточка получит при перезаходе).
        void reinjectExerciseHistory(exerciseIndex, alternative.id);
        feedback.alert(
          'Заменено в программе',
          `${previousExercise.name} → ${alternative.name}\n\nИзменение применено к будущим тренировкам программы.`
        );
      } catch (error) {
        console.error('[useWorkoutSession] replaceExerciseInProgram:', error);
        // Rollback локального состояния — программа не изменилась
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = previousExercise;
          return updated;
        });
        feedback.alert(
          'Не удалось изменить программу',
          'Программа не была изменена. Возможно, это готовая программа — только личные программы доступны для редактирования.'
        );
      }
    },
    [programId, workoutId, loadAlternatives, swapCardFields, reinjectExerciseHistory]
  );

  // ============================================================================
  // ADD-BELOW (16.10): упражнение из поиска — новым блоком под текущим
  // ============================================================================

  /**
   * Локальный блок для добавленного упражнения. Дефолты подходов — общие с
   * пикером программы (NEW_PROGRAM_EXERCISE_DEFAULTS), чтобы блок, добавленный
   * отсюда и блок, добавленный в редакторе, выглядели одинаково.
   */
  const buildAddedExercise = (
    card: AlternativeExercise,
    workoutExerciseId: string
  ): ExerciseData => ({
    id: card.id,
    workout_exercise_id: workoutExerciseId,
    name: card.name,
    primary_muscles: card.primary_muscles,
    secondary_muscles: card.secondary_muscles,
    technique: card.technique,
    equipment: card.equipment ?? [],
    settings: card.settings,
    benefits: card.benefits,
    risks: card.risks,
    injuries: card.injuries,
    alternatives: card.alternatives ?? [],
    media_url: card.media_url,
    target_sets: NEW_PROGRAM_EXERCISE_DEFAULTS.sets,
    rest_seconds: NEW_PROGRAM_EXERCISE_DEFAULTS.rest_seconds,
    intensity: NEW_PROGRAM_EXERCISE_DEFAULTS.intensity,
    reps_range: NEW_PROGRAM_EXERCISE_DEFAULTS.reps_range,
    target_rpe: null,
    progression_policy: 'linear',
    painState: null,
    personalBest: null,
    // Ключи reps_left/reps_right обязательны: без них isSetCompleted считает
    // пустой сет завершённым (наследие mapper'а).
    sets: Array.from({ length: NEW_PROGRAM_EXERCISE_DEFAULTS.sets }, () => ({
      weight: '',
      reps: '',
      reps_left: '',
      reps_right: '',
    })),
    isAddedHere: true,
  });

  /**
   * Добавляет выбранное из поиска упражнение новым блоком сразу после
   * `exerciseIndex`.
   *
   * Порядок «сначала блок тренировки, потом программа» не случайность: для НЕ
   * начатой тренировки sync сам вставил бы строку по программе, и мы получили бы
   * дубль. Когда строка уже есть, sync её не трогает (только подтягивает position).
   *
   * Ошибку отдаём наверх без Alert — текст подтверждения и объяснение отказа
   * живут на экране (паттерн handleReplaceChoice).
   */
  const addExerciseFromSearch = useCallback(
    async (exerciseIndex: number, card: AlternativeExercise, scope: 'here' | 'program') => {
      const source = exercisesRef.current[exerciseIndex];
      if (!source) return;

      let createdId: string;
      try {
        const created = await addWorkoutExerciseBelow(workoutId, source.workout_exercise_id, {
          exercise_id: card.id,
          target_sets: NEW_PROGRAM_EXERCISE_DEFAULTS.sets,
          target_reps_range: NEW_PROGRAM_EXERCISE_DEFAULTS.reps_range,
          rest_seconds: NEW_PROGRAM_EXERCISE_DEFAULTS.rest_seconds,
          intensity: NEW_PROGRAM_EXERCISE_DEFAULTS.intensity,
        });
        createdId = created.id;
      } catch (error) {
        console.error('[useWorkoutSession] addExerciseFromSearch insert:', error);
        throw new Error(mapError(error));
      }

      const newIndex = exerciseIndex + 1;
      setExercises((prev) => {
        const updated = [...prev];
        updated.splice(newIndex, 0, buildAddedExercise(card, createdId));
        return updated;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // История нового упражнения (прошлые подходы + PR) подтягивается тем же
      // путём, что при замене: результат совпадает с перезаходом на экран.
      void reinjectExerciseHistory(newIndex, card.id);

      if (scope !== 'program') return;

      try {
        await addExerciseToProgramBelow(workoutId, source.workout_exercise_id, {
          id: card.id,
          name: card.name,
        });
      } catch (error) {
        console.error('[useWorkoutSession] addExerciseToProgramBelow:', error);
        // В программе блока нет — убираем и локальный, и строку тренировки,
        // чтобы «не добавлено» значило «не добавлено нигде».
        setExercises((prev) => prev.filter((ex) => ex.workout_exercise_id !== createdId));
        try {
          await removeWorkoutExercise(createdId);
        } catch (rollbackError) {
          console.error('[useWorkoutSession] add-to-program rollback:', rollbackError);
        }
        throw error;
      }
    },
    [workoutId, reinjectExerciseHistory]
  );

  /** Убирает блок, добавленный в этой сессии. Логи уходят каскадом (ON DELETE CASCADE). */
  const removeAddedExercise = useCallback(async (exerciseIndex: number) => {
    const exercise = exercisesRef.current[exerciseIndex];
    if (!exercise?.isAddedHere) return;

    await removeWorkoutExercise(exercise.workout_exercise_id);
    setExercises((prev) =>
      prev.filter((ex) => ex.workout_exercise_id !== exercise.workout_exercise_id)
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ============================================================================
  // PR6: PAIN STATE (upsert / delete + оптимистичное локальное обновление)
  // ============================================================================
  const savePainState = useCallback(
    async (exerciseIndex: number, painState: ExercisePainState) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !userId) return;
      const previousPainState = exercise.painState ?? null;

      // Оптимистичное обновление — bubble сразу показывает «Боль отмечена»
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], painState };
        return updated;
      });

      try {
        await painService.upsertPainEvent({
          userId,
          workoutId,
          exerciseId: exercise.id,
          painLevel: painState.painLevel,
          painType: (painState.painType as PainType | null) ?? null,
          bodyPart: painState.bodyPart,
          stopExercise: painState.stopExercise,
          notes: painState.notes,
        });
      } catch (error) {
        console.error('[useWorkoutSession] savePainState:', error);
        // Откат к предыдущему состоянию
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = { ...updated[exerciseIndex], painState: previousPainState };
          return updated;
        });
        feedback.alert('Ошибка', mapError(error));
      }
    },
    [userId, workoutId]
  );

  const clearPainState = useCallback(
    async (exerciseIndex: number) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !userId) return;
      const previousPainState = exercise.painState ?? null;

      // Оптимистичное обновление — bubble возвращается к «Боль?»
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = { ...updated[exerciseIndex], painState: null };
        return updated;
      });

      try {
        await painService.deletePainEvent(userId, workoutId, exercise.id);
      } catch (error) {
        console.error('[useWorkoutSession] clearPainState:', error);
        // Откат к предыдущему состоянию
        setExercises((prev) => {
          const updated = [...prev];
          updated[exerciseIndex] = { ...updated[exerciseIndex], painState: previousPainState };
          return updated;
        });
        feedback.alert('Ошибка', mapError(error));
      }
    },
    [userId, workoutId]
  );

  // ============================================================================
  // SAVE WORKOUT
  // ============================================================================
  const saveWorkout = useCallback(async () => {
    // BUG-6 (аудит 28.09): re-entry guard — повторный тап «Завершить» (pill +
    // панель в шапке) во время сети повторял финиш целиком.
    if (isFinishingRef.current) return;
    if (!isWorkoutActive && currentTimeRef.current === 0) {
      feedback.alert(
        'Тренировка не начата',
        'Нажмите «Начать» на таймере в шапке, затем завершайте'
      );
      return;
    }

    const durationSeconds = currentTimeRef.current;
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // UX-TIMER: подтверждение делает confirm-лист в шапке (UX-16 D1) — второй
    // Alert здесь убран, иначе пользователь подтверждал завершение дважды.
    {
      {
        // BUG-6 (аудит 28.09): re-entry guard — повторный «Завершить» (пилюля
        // или панель) во время сети повторял бы финиш целиком.
        if (isFinishingRef.current) return;
        setSaving(true);
        setIsFinishing(true);
        isFinishingRef.current = true;
        // BUG-7: отменяем ожидающий debounce-коммит; в flight flush ниже
        // подхватит pendingLogsRef (свежие значения уже в карте).
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }

        try {
          // VF-3: если подходы не легли в БД — не пишем finished_at.
          // раньше тренировка помечалась завершённой с проглоченными ошибками flush.
          const flushFailures = await joinFlush();
          if (flushFailures > 0) {
            // setSaving снимает внешний finally
            setIsFinishing(false);
            isFinishingRef.current = false;
            feedback.alert(
              'Подходы не сохранены',
              `Не удалось записать данные (${flushFailures} упр.). Проверьте интернет и завершите тренировку повторно — введённые значения не потеряны.`
            );
            return;
          }

          let totalLogs = 0;
          exercisesRef.current.forEach((ex) => {
            ex.sets.forEach((s) => {
              if (s.weight !== '' || s.reps !== '') totalLogs++;
            });
          });

          if (!userId) throw new Error('Нет активной сессии');

          // BUG-1 (аудит 28.09): финиш меняет дашборд/прогресс/историю/мышцы/
          // недельку/прогноз — раньше не инвалидировалось ничего, экраны врали
          // до staleTime (5 мин).
          invalidateWorkoutAffectedCaches(queryClient, userId);

          // ADV-atomic (18.10): закрытие тренировки и сдвиг указателя — одна
          // транзакция на базе. Холостые статусы ('already_advanced',
          // 'pointer_stale', 'not_active') означают «указатель не тронут: этот
          // день уже учтён». До переноса в БД такой же вызов молча
          // перескакивал ещё один тренировочный день.
          const reportFinish = (result: WorkoutFinishResult) => {
            if (result.status === 'finished_no_program') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              feedback.alert(
                'Успех',
                `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
              );
              // FIX-ROUTES: вкладки history больше нет (UX-11) — RecentWorkouts
              // живёт в прогресс-хабе.
              router.replace('/(tabs)/progress');
              return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (result.status === 'completed') {
              feedback.alert(
                'Программа завершена!',
                'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе «Программы».'
              );
              router.replace('/(tabs)/programs');
              return;
            }

            const pointerLine =
              result.status === 'advanced'
                ? `Следующий день: Фаза ${result.phase} · Неделя ${result.week} · День ${result.day}`
                : `Прогресс не менялся: этот день уже учтён. Сейчас: Фаза ${result.phase} · Неделя ${result.week} · День ${result.day}`;

            feedback.alert(
              'Тренировка завершена!',
              `Время: ${formattedTime}\n${pointerLine}\n\nСохранено подходов: ${totalLogs}`
            );
            router.replace('/(tabs)/workouts');
          };

          // Один запрос = вся запись целиком: повтор (кнопка «Повторить», второй
          // тап «Завершить») безопасен — база не переставляет первую метку
          // финиша и не двигает указатель второй раз.
          const doFinish = async () => {
            const result = await finishWorkoutAndAdvance(
              userId,
              workoutId,
              new Date().toISOString(),
              durationSeconds
            );
            reportFinish(result);
          };

          try {
            await doFinish();
          } catch (finishError: any) {
            console.error('[useWorkoutSession] finishWorkoutAndAdvance:', finishError);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Раз training-часть не записана, позволяем повторить «Завершить».
            setIsFinishing(false);
            isFinishingRef.current = false;
            feedback.alert(
              'Не удалось завершить тренировку',
              `${mapError(finishError)}\n\nПодходы сохранены, тренировка ещё не помечена завершённой.`,
              [
                { text: 'Позже', style: 'cancel' },
                {
                  text: 'Повторить',
                  onPress: () => {
                    void doFinish().catch((retryError: any) => {
                      console.error('[useWorkoutSession] finish retry:', retryError);
                      feedback.alert('Ошибка', mapError(retryError));
                    });
                  },
                },
              ]
            );
          }
        } catch (error: any) {
          console.error('[useWorkoutSession] saveWorkout:', error);
          // BUG-6: ошибка = позволяем повторить «Завершить» (иначе guard
          // блокировал бы ретрай до unmount).
          setIsFinishing(false);
          isFinishingRef.current = false;
          feedback.alert('Ошибка', mapError(error));
        } finally {
          setSaving(false);
        }
      }
    }
  }, [isWorkoutActive, workoutId, userId, router, joinFlush, queryClient]);

  return {
    workoutName,
    programId,
    exercises,
    loading,
    saving,
    isWorkoutActive,
    setIsWorkoutActive,
    initialTime,
    alternativesCache: alternativesCacheRef.current,
    replacements,
    currentTimeRef,
    loadWorkout,
    loadError,
    handleTimerTick,
    handleTimerStart,
    handleTimerStop,
    loadAlternatives,
    updateSet,
    updateSetFeedback,
    addSet,
    applyProgression,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    replaceExerciseInProgram: replaceExerciseInProgramCb,
    addExerciseFromSearch,
    removeAddedExercise,
    resetToOriginal,
    savePainState,
    clearPainState,
    startRestTimer,
    saveWorkout,
    resetSession,
    timerResetToken,
  };
}
