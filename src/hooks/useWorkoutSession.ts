// src/hooks/useWorkoutSession.ts
// Orchestrator workout session — использует вынесенные модули:
// - useWorkoutSession.types.ts — внутренние типы
// - useWorkoutSession.mapper.ts — чистые функции маппинга
// - useWorkoutSession.rest.ts — rest timer logic
// - useWorkoutSession.loader.ts — функции загрузки данных
import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ExerciseData, SetData, SetFeedbackPatch, ExercisePainState } from '../types/workout';
import { advanceProgramProgress, replaceExerciseInProgram } from '../services/programsService';
import { getActiveInjuries } from '../services/profileService';
import { painService, PainType } from '../services/painService';
import { mapError } from '../utils/errorMapper';
import { perfMark, perfSince } from '../utils/perf';
import { UserInjury } from '../constants/injuries';
import { AlternativeSourceInput } from '../engine/alternatives';
import { useWorkoutSessionRest } from './workout/useWorkoutSession.rest';
import {
  fetchWorkoutSession,
  fetchAlternatives,
  FetchAlternativesResult,
  updateWorkout,
  upsertWorkoutLogs,
  updateWorkoutExerciseId,
  updateWorkoutExerciseSettings,
} from '../services/workoutService';
import {
  buildExercisesData,
  buildPrevLogsByExerciseId,
  injectPreviousData,
  buildPainStateMap,
} from './workout/useWorkoutSession.mapper';

export function useWorkoutSession(workoutId: string, userId: string | null) {
  const router = useRouter();
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

  // Rest timer — вынесенный hook
  const {
    restTimer,
    restTimeLeft,
    isRestFinished,
    startRestTimer,
    adjustRestTimer,
    stopRestTimer,
    cleanupRestTimer,
    setRestTimeLeft,
  } = useWorkoutSessionRest();

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
            log.reps_right !== null
        );

      if (formattedLogs.length === 0) return;

      try {
        await upsertWorkoutLogs(workoutExerciseId, formattedLogs);
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

      // Восстановление активной тренировки
      if (workoutRow.started_at && !workoutRow.finished_at) {
        const startTime = new Date(workoutRow.started_at);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        if (elapsed > 0 && elapsed < 86400) {
          setInitialTime(elapsed);
          currentTimeRef.current = elapsed;
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

      perfSince('load:start', 'loadWorkout: итого (запросы + маппинг)');
    } catch (error: any) {
      console.error('[useWorkoutSession] loadWorkout:', error);
      Alert.alert('Ошибка', mapError(error));
      setLoadError(mapError(error));
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

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
      flushPendingLogs();
    }, 500);
  }, [flushPendingLogs]);

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
    },
    [persistExerciseSettings]
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
      if (exercise) {
        persistExerciseSettings(exercise.workout_exercise_id, {
          target_sets: exercise.target_sets + count,
        });
      }
    },
    [persistExerciseSettings]
  );

  // ============================================================================
  // REPLACE / RESET
  // ============================================================================
  const replaceExercise = useCallback(
    async (exerciseIndex: number, alternativeId: string) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise) return;

      const loaded = await loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      });
      const alternative = loaded.alternatives.find((item) => item.id === alternativeId);
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

      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
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
        };
        return updated;
      });

      setReplacements((prev) => ({
        ...prev,
        [exercise.workout_exercise_id]: alternativeId,
      }));

      // Alert убран: при наличии программы Alert показывает handleReplaceChoice
      // (UX-5 Feature 1) в [id].tsx; при отсутствии программы — действие настолько
      // лёгкое, что подтверждение не требуется (haptic + мгновенная замена).
    },
    [loadAlternatives, userId, workoutId]
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

      Alert.alert(
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
                Alert.alert('Ошибка', mapError(error));
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
    async (exerciseIndex: number, alternativeId: string) => {
      const exercise = exercisesRef.current[exerciseIndex];
      if (!exercise || !programId) return;

      const loaded = await loadAlternatives(exercise.id, {
        primaryMuscles: exercise.primary_muscles,
        secondaryMuscles: exercise.secondary_muscles,
        equipment: exercise.equipment,
        hasPain: !!exercise.painState,
      });
      const alternative = loaded.alternatives.find((item) => item.id === alternativeId);
      if (!alternative) return;

      // Snapshot для rollback при ошибке сервиса
      const previousExercise = { ...exercise };

      // 1. Локальное (оптимистичное) обновление — как temporary
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExercises((prev) => {
        const updated = [...prev];
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
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
        };
        return updated;
      });

      // 2. Программная замена (persistent + sync будущих тренировок)
      try {
        await replaceExerciseInProgram(
          workoutId,
          exercise.workout_exercise_id,
          alternative.id,
          alternative.name
        );
        Alert.alert(
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
        Alert.alert(
          'Не удалось изменить программу',
          'Программа не была изменена. Возможно, это готовая программа — только личные программы доступны для редактирования.'
        );
      }
    },
    [programId, workoutId, loadAlternatives]
  );

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
        Alert.alert('Ошибка', mapError(error));
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
        Alert.alert('Ошибка', mapError(error));
      }
    },
    [userId, workoutId]
  );

  // ============================================================================
  // SAVE WORKOUT
  // ============================================================================
  const saveWorkout = useCallback(async () => {
    if (!isWorkoutActive && currentTimeRef.current === 0) {
      Alert.alert('Тренировка не начата', 'Нажмите «Начать» на таймере в шапке, затем завершайте');
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
        setSaving(true);
        setIsFinishing(true);
        isFinishingRef.current = true;

        try {
          // VF-3: если подходы не легли в БД — не пишем finished_at.
          // раньше тренировка помечалась завершённой с проглоченными ошибками flush.
          const flushFailures = await flushPendingLogs();
          if (flushFailures > 0) {
            // setSaving снимает внешний finally
            setIsFinishing(false);
            isFinishingRef.current = false;
            Alert.alert(
              'Подходы не сохранены',
              `Не удалось записать данные (${flushFailures} упр.). Проверьте интернет и завершите тренировку повторно — введённые значения не потеряны.`
            );
            return;
          }

          try {
            await updateWorkout(workoutId, {
              finished_at: new Date().toISOString(),
              duration_seconds: durationSeconds,
            });
          } catch (error) {
            throw error;
          }

          let totalLogs = 0;
          exercisesRef.current.forEach((ex) => {
            ex.sets.forEach((s) => {
              if (s.weight !== '' || s.reps !== '') totalLogs++;
            });
          });

          if (programId && userId) {
            try {
              const progress = await advanceProgramProgress(userId, programId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (progress.isCompleted) {
                Alert.alert(
                  'Программа завершена!',
                  'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе «Программы».'
                );
                router.replace('/(tabs)/programs');
              } else {
                Alert.alert(
                  'Тренировка завершена!',
                  `Время: ${formattedTime}\nСледующий день: Фаза ${progress.phase} · Неделя ${progress.week} · День ${progress.day}\n\nСохранено подходов: ${totalLogs}`
                );
                router.replace('/(tabs)/workouts');
              }
            } catch (progressError: any) {
              console.error('Ошибка обновления прогресса:', progressError);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

              const retryAdvance = async () => {
                try {
                  const progress = await advanceProgramProgress(userId!, programId!);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  if (progress.isCompleted) {
                    Alert.alert(
                      'Программа завершена!',
                      'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе «Программы».'
                    );
                    router.replace('/(tabs)/programs');
                  } else {
                    router.replace('/(tabs)/workouts');
                  }
                } catch (e: any) {
                  Alert.alert(
                    'Не удалось продвинуть прогресс',
                    e?.message ||
                      'Прогресс можно продвинуть автоматически при следующей тренировке.'
                  );
                }
              };

              Alert.alert(
                'Тренировка сохранена',
                `Время: ${formattedTime}\nСохранено подходов: ${totalLogs}\n\n` +
                  `Не удалось обновить прогресс программы: ${progressError?.message || 'неизвестная ошибка'}.\n\nПовторить обновление прогресса сейчас?`,
                [
                  {
                    text: 'Позже',
                    style: 'cancel',
                    onPress: () => router.replace('/(tabs)/workouts'),
                  },
                  { text: 'Повторить', onPress: retryAdvance },
                ]
              );
            }
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Успех',
              `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`
            );
            // FIX-ROUTES: вкладки history больше нет (UX-11) — RecentWorkouts
            // живёт в прогресс-хабе.
            router.replace('/(tabs)/progress');
          }
        } catch (error: any) {
          console.error('[useWorkoutSession] saveWorkout:', error);
          Alert.alert('Ошибка', mapError(error));
        } finally {
          setSaving(false);
        }
      }
    }
  }, [isWorkoutActive, workoutId, programId, userId, router, flushPendingLogs]);

  return {
    workoutName,
    programId,
    exercises,
    loading,
    saving,
    isWorkoutActive,
    setIsWorkoutActive,
    initialTime,
    restTimer,
    restTimeLeft,
    setRestTimeLeft,
    isRestFinished,
    adjustRestTimer,
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
    resetToOriginal,
    savePainState,
    clearPainState,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  };
}
