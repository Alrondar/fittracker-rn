import { useState, useRef, useEffect, useCallback } from 'react';
import { useTimerSettings } from './useTimerSettings';
import { initSounds, playBeep, playFinishSound } from '../lib/timerSounds';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ExerciseData, AlternativeExercise, SetData } from '../types/workout';
import { advanceProgramProgress } from '../services/programsService';
import * as Haptics from 'expo-haptics';

export function useWorkoutSession(workoutId: string, userId: string | null) {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const currentTimeRef = useRef<number>(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ✅ ФИКС быстродействия: alternativesCache больше НЕ state — только ref.
  //    Раньше setAlternativesCache триггерил ререндер экрана при каждой загрузке
  //    альтернатив без пользы (потребитель был мёртвым пропом). Guard от повторной
  //    загрузки работает через ref. В return поле оставлено (читается из ref) ТОЛЬКО
  //    для типовой совместимости со старым [id].tsx — ререндеров оно больше не вызывает.
  const alternativesCacheRef = useRef<Record<string, AlternativeExercise[]>>({});
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const { settings: timerSettings } = useTimerSettings();
  const [isRestFinished, setIsRestFinished] = useState(false);
  const restEndsAtRef = useRef<number>(0);
  const lastBeepRef = useRef<number>(0);
  const exercisesRef = useRef<ExerciseData[]>([]);
  useEffect(() => { exercisesRef.current = exercises; }, [exercises]);

  // Загрузка тренировки
  const loadWorkout = useCallback(async () => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        // ✅ ДОБАВЛЕНО target_reps_range в select workout_exercises — чтобы бейдж
        //    reps_range в ExerciseCard получил значение из программы.
        .select(`name, program_id, started_at, finished_at, duration_seconds, workout_exercises ( id, target_sets, rest_seconds, intensity, target_reps_range, exercises ( id, name, primary_muscles, secondary_muscles, technique, equipment, settings, benefits, risks, injuries, alternatives, media_url ) )`)
        .eq('id', workoutId)
        .single();

      if (error) throw error;

      setWorkoutName(workout.name);
      setProgramId(workout.program_id);

      if (workout.started_at && !workout.finished_at) {
        const savedDuration = workout.duration_seconds || 0;
        if (savedDuration > 0) {
          setInitialTime(savedDuration);
          currentTimeRef.current = savedDuration;
          setIsWorkoutActive(true);
        } else {
          const startTime = new Date(workout.started_at);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          if (elapsed > 0 && elapsed < 86400) {
            setInitialTime(elapsed);
            currentTimeRef.current = elapsed;
            setIsWorkoutActive(true);
          }
        }
      }

      // ✅ Аннотация `: ExerciseData[]` СНЯТА намеренно: маппер добавляет опциональное
      //    поле reps_range, которого может ещё не быть в интерфейсе ExerciseData (патч
      //    типов workout.ts применяется независимо). Без аннотации тип выводится шире и
      //    структурно присваивается в setExercises(ExerciseData[]) без excess-property
      //    ошибки — файл компилируется и ДО, и ПОСЛЕ патча типов. В ExerciseCard поле
      //    читается через безопасный каст (RepsRangeHolder).
      const exercisesData = workout.workout_exercises.map((we: any) => {
        const exercise = we.exercises;
        const sets: SetData[] = [];
        for (let i = 0; i < we.target_sets; i++) {
          sets.push({ weight: '', reps: '' });
        }
        return {
          id: exercise.id,
          workout_exercise_id: we.id,
          name: exercise.name,
          primary_muscles: exercise.primary_muscles || [],
          secondary_muscles: exercise.secondary_muscles || [],
          technique: exercise.technique || '',
          equipment: exercise.equipment || [],
          settings: exercise.settings || '',
          benefits: exercise.benefits || '',
          risks: exercise.risks || '',
          injuries: exercise.injuries || [],
          alternatives: exercise.alternatives || [],
          media_url: exercise.media_url || null,
          target_sets: we.target_sets,
          rest_seconds: we.rest_seconds,
          intensity: we.intensity || 'medium',
          sets,
          reps_range: we.target_reps_range || undefined, // ✅ НОВОЕ (из программы)
        };
      });
      setExercises(exercisesData);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => { loadWorkout(); }, [loadWorkout]);

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (isWorkoutActive && !isFinishing && currentTimeRef.current > 0) {
        supabase
          .from('workouts')
          .update({ duration_seconds: currentTimeRef.current })
          .eq('id', workoutId)
          .then(({ error }) => {
            if (error) console.error('Ошибка сохранения прогресса:', error);
          });
      }
    };
  }, [isWorkoutActive, isFinishing, workoutId]);

  const handleTimerTick = useCallback((seconds: number) => {
    currentTimeRef.current = seconds;
  }, []);

  // ✅ ФИКС бага 3: пишем started_at ТОЛЬКО при самом первом старте новой тренировки.
  //    При возобновлении с паузы / автостарте незавершённой currentTimeRef > 0 → базу
  //    НЕ трогаем: реальный started_at и накопленное время сохраняются.
  const handleTimerStart = useCallback(() => {
    setIsWorkoutActive(true);
    if (currentTimeRef.current === 0) {
      supabase
        .from('workouts')
        .update({ started_at: new Date().toISOString(), duration_seconds: 0 })
        .eq('id', workoutId)
        .then(({ error }) => {
          if (error) console.error('Ошибка сохранения started_at:', error);
        });
    }
  }, [workoutId]);

  const handleTimerStop = useCallback(() => {
    // Пауза: isWorkoutActive не меняем
  }, []);

  const loadAlternatives = useCallback(async (exerciseId: string, primaryMuscles: string[]) => {
    if (alternativesCacheRef.current[exerciseId]) {
      return alternativesCacheRef.current[exerciseId];
    }
    try {
      let query = supabase.from('exercises').select('*').neq('id', exerciseId);
      if (primaryMuscles.length > 0) {
        query = query.overlaps('primary_muscles', primaryMuscles);
      }
      const { data, error } = await query.limit(10);
      if (error) throw error;
      const alternatives: AlternativeExercise[] = (data || []).map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        primary_muscles: ex.primary_muscles || [],
        secondary_muscles: ex.secondary_muscles || [],
        technique: ex.technique || '',
        equipment: ex.equipment || [],
        settings: ex.settings || '',
        benefits: ex.benefits || '',
        risks: ex.risks || '',
        injuries: ex.injuries || [],
        media_url: ex.media_url || null,
      }));
      // ✅ Запись только в ref — без setState, без ререндера экрана
      alternativesCacheRef.current = { ...alternativesCacheRef.current, [exerciseId]: alternatives };
      return alternatives;
    } catch {
      return [];
    }
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const sets = [...exercise.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      exercise.sets = sets;
      updated[exerciseIndex] = exercise;
      return updated;
    });
  }, []);

  const isSetCompleted = useCallback((set: SetData): boolean => set.weight !== '' || set.reps !== '', []);

  const updateExerciseSettings = useCallback((exerciseIndex: number, newSetsCount: number, newRestSeconds: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const currentSets = exercise.sets;
      const newSets: SetData[] = [];
      for (let i = 0; i < newSetsCount; i++) {
        if (i < currentSets.length) newSets.push(currentSets[i]);
        else newSets.push({ weight: '', reps: '' });
      }
      exercise.sets = newSets;
      exercise.rest_seconds = newRestSeconds;
      updated[exerciseIndex] = exercise;
      return updated;
    });
  }, []);

  const replaceExercise = useCallback(async (exerciseIndex: number, alternativeId: string) => {
    const exercise = exercisesRef.current[exerciseIndex];
    if (!exercise) return;
    const alternatives = await loadAlternatives(exercise.id, exercise.primary_muscles);
    const alt = alternatives.find(a => a.id === alternativeId);
    if (!alt) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        id: alt.id,
        name: alt.name,
        primary_muscles: alt.primary_muscles,
        secondary_muscles: alt.secondary_muscles,
        technique: alt.technique,
        equipment: alt.equipment,
        settings: alt.settings,
        benefits: alt.benefits,
        risks: alt.risks,
        injuries: alt.injuries,
        media_url: alt.media_url,
      };
      return updated;
    });
    setReplacements(prev => ({ ...prev, [exercise.workout_exercise_id]: alternativeId }));
    Alert.alert('Заменено', `${exercise.name} → ${alt.name}`);
  }, [loadAlternatives]);

  const resetToOriginal = useCallback((exerciseIndex: number) => {
    const exercise = exercisesRef.current[exerciseIndex];
    if (!exercise) return;
    const workoutExId = exercise.workout_exercise_id;
    Alert.alert('Вернуть оригинальное упражнение?', 'Данные подходов сохранятся', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Вернуть',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          loadWorkout();
          setReplacements(prev => {
            const updated = { ...prev };
            delete updated[workoutExId];
            return updated;
          });
        },
      },
    ]);
  }, [loadWorkout]);

  const runRestInterval = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      const msLeft = restEndsAtRef.current - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setRestTimeLeft(secLeft);
      if (timerSettings.preBeep && secLeft <= 3 && secLeft > 0 && lastBeepRef.current !== secLeft) {
        lastBeepRef.current = secLeft;
        playBeep();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (msLeft <= 0) {
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        restTimerRef.current = null;
        setIsRestFinished(true);
        if (timerSettings.sound) playFinishSound();
        if (timerSettings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 250);
  }, [timerSettings]);

  const startRestTimer = useCallback((restSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRestFinished(false);
    lastBeepRef.current = 0;
    restEndsAtRef.current = Date.now() + restSeconds * 1000;
    setRestTimer(restSeconds);
    setRestTimeLeft(restSeconds);
    initSounds();
    runRestInterval();
  }, [runRestInterval]);

  const adjustRestTimer = useCallback((delta: number) => {
    if (restEndsAtRef.current === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restEndsAtRef.current += delta * 1000;
    const secLeft = Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000));
    setRestTimeLeft(secLeft);
    setRestTimer(prev => (prev ? Math.max(5, prev + delta) : prev));
    if (secLeft > 0) {
      setIsRestFinished(false);
      if (!restTimerRef.current) runRestInterval();
    }
  }, [runRestInterval]);

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
    restEndsAtRef.current = 0;
    setRestTimer(null);
    setRestTimeLeft(0);
    setIsRestFinished(false);
  }, []);

  // Сохранение тренировки.
  // ⚠️ insert (не upsert) оставлен НАМЕРЕННО: upsert по onConflict требует накатанного
  //    уникального индекса ux_workout_logs_ex_set (секция 2 единого SQL-скрипта). Без него
  //    upsert упадёт ошибкой «no unique constraint matching ON CONFLICT» и сломает сохранение.
  //    Идемпотентность закрывается индексом на БД; клиентский upsert — отдельным шагом ПОСЛЕ индекса.
  const saveWorkout = useCallback(async () => {
    if (!isWorkoutActive && currentTimeRef.current === 0) {
      Alert.alert('Тренировка не начата', 'Нажмите "Начать тренировку" перед завершением');
      return;
    }
    const durationSeconds = currentTimeRef.current;
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    Alert.alert('Завершить тренировку?', `Время тренировки: ${formattedTime}\nВсе данные будут сохранены`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Завершить',
        onPress: async () => {
          setSaving(true);
          setIsFinishing(true);
          try {
            const now = new Date();
            const { error: updateError } = await supabase
              .from('workouts')
              .update({ finished_at: now.toISOString(), duration_seconds: durationSeconds })
              .eq('id', workoutId);
            if (updateError) console.error('Ошибка сохранения времени:', updateError);

            let totalLogs = 0;
            for (const exercise of exercisesRef.current) {
              // ✅ ФИКС истории: запоминаем РЕАЛЬНЫЙ индекс подхода ДО фильтра,
              //    иначе пропущенный подход в середине сдвигал set_number в истории.
              const logsToSave = exercise.sets
                .map((set, index) => ({ set, index }))
                .filter(({ set }) => isSetCompleted(set))
                .map(({ set, index }) => ({
                  workout_exercise_id: exercise.workout_exercise_id,
                  set_number: index + 1,
                  weight_kg: parseFloat(set.weight) || 0,
                  reps: parseInt(set.reps) || 0,
                }));
              if (logsToSave.length > 0) {
                const { error } = await supabase.from('workout_logs').insert(logsToSave);
                if (error) throw error;
                totalLogs += logsToSave.length;
              }
            }

            if (programId && userId) {
              try {
                const progress = await advanceProgramProgress(userId, programId);
                if (progress.isCompleted) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Программа завершена!', 'Поздравляем! Ты прошёл всю программу. Выбери новую в разделе "Программы".');
                  router.replace('/(tabs)/programs');
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    'Тренировка завершена!',
                    `Время: ${formattedTime}\nСледующий день: Фаза ${progress.phase} · Неделя ${progress.week} · День ${progress.day}\n\nСохранено подходов: ${totalLogs}`
                  );
                  router.replace('/(tabs)/workouts');
                }
              } catch (progressError: any) {
                console.error('Ошибка обновления прогресса:', progressError);
                Alert.alert('Успех', `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`);
                router.replace('/(tabs)/history');
              }
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Успех', `Тренировка завершена!\nВремя: ${formattedTime}\nСохранено подходов: ${totalLogs}`);
              router.replace('/(tabs)/history');
            }
          } catch (error: any) {
            Alert.alert('Ошибка', error.message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [isWorkoutActive, workoutId, programId, userId, router, isSetCompleted]);

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
    // ✅ Возвращаем для типовой совместимости со старым [id].tsx; это НЕ state →
    //    ререндеров не вызывает. Новый [id].tsx это поле просто не деструктурирует.
    alternativesCache: alternativesCacheRef.current,
    replacements,
    currentTimeRef,
    loadWorkout,
    handleTimerTick,
    handleTimerStart,
    handleTimerStop,
    loadAlternatives,
    updateSet,
    isSetCompleted,
    updateExerciseSettings,
    replaceExercise,
    resetToOriginal,
    startRestTimer,
    stopRestTimer,
    saveWorkout,
  };
}