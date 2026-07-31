import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  getProgramWithDays,
  startProgram,
  syncProgramChanges,
  Program,
  ProgramDay,
  ProgramExercise,
} from '../services/programsService';
import { useProgramPhases } from './useProgramPhases';
import * as Haptics from 'expo-haptics';

const genRandomUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function useProgramEditor(programId: string, userId: string | null) {
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Program | null>(null);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
  const [deletedDayIds, setDeletedDayIds] = useState<string[]>([]);
  const [deletedPhaseIds, setDeletedPhaseIds] = useState<string[]>([]);

  // Модалки
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showExerciseSettings, setShowExerciseSettings] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showPhaseSettings, setShowPhaseSettings] = useState(false);

  // Выбранные элементы
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(-1);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(-1);

  // Фазовая логика вынесена в отдельный хук (SCALE-5: лимит 500 строк)
  const phasesApi = useProgramPhases({
    editedProgram,
    setEditedProgram,
    setDeletedPhaseIds,
    setDeletedDayIds,
    setDeletedExerciseIds,
  });

  useEffect(() => {
    loadProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const loadProgram = async () => {
    try {
      const data = await getProgramWithDays(programId);
      setProgram(data);
      setEditedProgram(data);
    } catch (e) {
      console.error('Ошибка загрузки программы:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProgram = async () => {
    if (!userId) return;
    const { data: existingProgram } = await supabase
      .from('user_programs')
      .select('id')
      .eq('user_id', userId)
      .eq('program_id', program?.id)
      .eq('is_active', true)
      .maybeSingle();
    const { count: existingWorkoutsCount } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('program_id', programId);
    const hasExistingData = existingProgram || (existingWorkoutsCount && existingWorkoutsCount > 0);
    const phases = program?.phases || [];
    const totalWeeks = phases.reduce((sum, p) => sum + (p.weeks_count || 1), 0);
    const message = hasExistingData
      ? `⚠️ ВНИМАНИЕ: Все старые тренировки этой программы будут УДАЛЕНЫ (включая завершённые с историей подходов, личными рекордами и прогрессом).\n\n` +
        `Будут созданы новые тренировки с актуальными упражнениями.\n\n` +
        `Программа: "${program?.name}"\n(${phases.length} фаз · ${totalWeeks} недель)\n\n` +
        `Продолжить?`
      : `Будут созданы тренировки на всю программу "${program?.name}"\n(${phases.length} фаз · ${totalWeeks} недель)`;
    Alert.alert(
      hasExistingData ? 'Перезапустить программу?' : 'Начать программу?',
      message,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: hasExistingData ? 'Перезапустить' : 'Начать',
          style: hasExistingData ? 'destructive' : 'default',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStarting(true);
            try {
              await startProgram(programId);
              const { error: rpcError } = await supabase.rpc('create_workouts_for_program', {
                p_program_id: programId,
                p_user_id: userId,
              });
              if (rpcError) throw rpcError;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/(tabs)/workouts');
            } catch (error: any) {
              Alert.alert('Ошибка', error.message);
            } finally {
              setStarting(false);
            }
          },
        },
      ]
    );
  };

  const toggleEditMode = async () => {
    if (editMode) {
      setEditMode(false);
      setEditedProgram(program);
      setDeletedExerciseIds([]);
      setDeletedDayIds([]);
      setDeletedPhaseIds([]);
    } else {
      const isOwnProgram = !!program?.created_by && program.created_by === userId;
      if (program && !isOwnProgram) {
        await copyProgramToUser();
      } else {
        setEditMode(true);
      }
    }
  };

  const copyProgramToUser = async () => {
    try {
      const { data, error } = await supabase.rpc('copy_program_for_user', {
        p_program_id: program?.id,
        p_user_id: userId,
      });
      if (error) throw error;
      const newProgramId = Array.isArray(data) ? data[0]?.id || data[0] : data?.id || data;
      if (!newProgramId) throw new Error('Не удалось получить ID скопированной программы');
      const newData = await getProgramWithDays(newProgramId);
      setProgram(newData);
      setEditedProgram(newData);
      setEditMode(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    }
  };

  // ============================================================================
  // СОХРАНЕНИЕ (фазовое) + СИНХРОНИЗАЦИЯ С ТРЕНИРОВКАМИ
  // ============================================================================
  const saveProgram = async () => {
    setSaving(true);
    try {
      if (!editedProgram) return;
      if (!editedProgram.created_by || editedProgram.created_by !== userId) {
        throw new Error('Нельзя редактировать чужую программу. Сначала скопируйте её.');
      }
      const phases = editedProgram.phases || [];
      const days = editedProgram.days || [];

      // 1. Расписание программы
      if (editedProgram.schedule) {
        const { error } = await supabase
          .from('programs')
          .update({ schedule: editedProgram.schedule })
          .eq('id', editedProgram.id);
        if (error) throw error;
      }

      const updatePromises: Promise<any>[] = [];

      // 2. Удаление помеченных сущностей
      deletedPhaseIds.forEach(id =>
        updatePromises.push(Promise.resolve(supabase.from('program_phases').delete().eq('id', id)))
      );
      deletedDayIds.forEach(id =>
        updatePromises.push(Promise.resolve(supabase.from('program_days').delete().eq('id', id)))
      );
      deletedExerciseIds.forEach(id =>
        updatePromises.push(Promise.resolve(supabase.from('program_exercises').delete().eq('id', id)))
      );

      // 3. Фазы: insert (новые) / update; маппинг temp id → real id
      const phaseIdMap: Record<string, string> = {};
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        if (phase.isNew) {
          const { data, error } = await supabase
            .from('program_phases')
            .insert({
              program_id: editedProgram.id,
              phase_number: i + 1,
              name: phase.name,
              phase_type: phase.phase_type,
              weeks_count: phase.weeks_count,
              description: phase.description,
              position: i + 1,
            })
            .select()
            .single();
          if (error) throw error;
          phaseIdMap[phase.id] = data.id;
        } else {
          phaseIdMap[phase.id] = phase.id;
          updatePromises.push(
            Promise.resolve(
              supabase
                .from('program_phases')
                .update({
                  phase_number: i + 1,
                  name: phase.name,
                  phase_type: phase.phase_type,
                  weeks_count: phase.weeks_count,
                  description: phase.description,
                  position: i + 1,
                })
                .eq('id', phase.id)
            )
          );
        }
      }

      // 4. Дни (группируем по фазам И неделям) + упражнения
      for (const phase of phases) {
        const realPhaseId = phaseIdMap[phase.id];
        const phaseDays = days.filter(d => d.phase_id === phase.id);
        const byWeek = new Map<number, ProgramDay[]>();
        for (const d of phaseDays) {
          const wn = d.week_number ?? 1;
          if (!byWeek.has(wn)) byWeek.set(wn, []);
          byWeek.get(wn)!.push(d);
        }
        for (const [weekNum, weekDays] of byWeek) {
          weekDays.sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
          for (let j = 0; j < weekDays.length; j++) {
            const day = weekDays[j];
            let realDayId = day.id;
            if (day.isNew) {
              const { data, error } = await supabase
                .from('program_days')
                .insert({
                  program_id: editedProgram.id,
                  phase_id: realPhaseId,
                  week_number: weekNum,
                  day_number: j + 1,
                  name: day.name,
                  position: j + 1,
                })
                .select()
                .single();
              if (error) throw error;
              realDayId = data.id;
            } else {
              updatePromises.push(
                Promise.resolve(
                  supabase
                    .from('program_days')
                    .update({
                      name: day.name,
                      phase_id: realPhaseId,
                      week_number: weekNum,
                      day_number: j + 1,
                      position: j + 1,
                    })
                    .eq('id', day.id)
                )
              );
            }
            const exercises = day.exercises || [];
            for (let k = 0; k < exercises.length; k++) {
              const exercise = exercises[k];
              if (exercise.isNew) {
                updatePromises.push(
                  Promise.resolve(
                    supabase.from('program_exercises').insert({
                      program_day_id: realDayId,
                      exercise_id: exercise.exercise_id,
                      exercise_name: exercise.exercise_name,
                      sets: exercise.sets,
                      reps_range: exercise.reps_range,
                      rest_seconds: exercise.rest_seconds,
                      intensity: exercise.intensity,
                      position: k + 1,
                    })
                  )
                );
              } else {
                updatePromises.push(
                  Promise.resolve(
                    supabase.rpc('update_exercise_position', { p_exercise_id: exercise.id, p_new_position: k + 1 })
                  )
                );
                updatePromises.push(
                  Promise.resolve(
                    supabase
                      .from('program_exercises')
                      .update({
                        sets: exercise.sets,
                        reps_range: exercise.reps_range,
                        rest_seconds: exercise.rest_seconds,
                        intensity: exercise.intensity,
                      })
                      .eq('id', exercise.id)
                  )
                );
              }
            }
          }
        }
      }

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r: any) => r && r.error);
      if (errors.length > 0) {
        console.error('Ошибки сохранения программы:', errors.map(e => e.error));
        throw errors[0].error;
      }

      // Принудительный refetch без кэша
      const updatedProgram = await getProgramWithDays(editedProgram.id);
      if (!updatedProgram) {
        throw new Error('Программа не найдена после сохранения');
      }

      // ✅ НОВОЕ: атомарная синхронизация правок с будущими тренировками (RPC).
      //    Программа уже сохранена, поэтому сбой синхронизации не откатываем —
      //    показываем предупреждение. Будущие тренировки (started_at IS NULL)
      //    обновляются; в процессе и завершённые не трогаются.
      try {
        const syncResult = await syncProgramChanges(editedProgram.id);
        if (
          syncResult.deleted_workouts > 0 ||
          syncResult.deleted_exercises > 0 ||
          syncResult.inserted_exercises > 0
        ) {
          Alert.alert(
            'Синхронизация завершена',
            `Будущие тренировки обновлены:\n` +
              `• Удалено тренировок: ${syncResult.deleted_workouts}\n` +
              `• Обновлено тренировок: ${syncResult.updated_workouts}\n` +
              `• Удалено упражнений: ${syncResult.deleted_exercises}\n` +
              `• Добавлено упражнений: ${syncResult.inserted_exercises}`,
            [{ text: 'OK' }]
          );
        }
      } catch (syncError: any) {
        console.error('[saveProgram] Sync failed:', syncError);
        Alert.alert(
          'Предупреждение',
          'Программа сохранена, но не удалось синхронизировать изменения с будущими тренировками.\n\n' +
            'Будущие тренировки могут содержать устаревшие данные.\n\n' +
            'Ошибка: ' + (syncError.message || 'неизвестная ошибка'),
          [{ text: 'OK' }]
        );
      }

      setProgram(updatedProgram);
      setEditedProgram(updatedProgram);
      setDeletedPhaseIds([]);
      setDeletedDayIds([]);
      setDeletedExerciseIds([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
    } catch (error: any) {
      console.error('Ошибка saveProgram:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить программу');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // ДНИ / УПРАЖНЕНИЯ (плоский индекс — обратная совместимость)
  // ============================================================================
  const updateExerciseParams = (
    dayIndex: number,
    exerciseIndex: number,
    params: Partial<ProgramExercise>,
  ) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    const day = newDays[dayIndex];
    if (!day || !day.exercises) return;
    const newExercises = [...day.exercises];
    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], ...params };
    newDays[dayIndex] = { ...day, exercises: newExercises };
    setEditedProgram({ ...editedProgram, days: newDays });
  };

  const updateDaySettings = (dayIndex: number, settings: Partial<ProgramDay>) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    newDays[dayIndex] = { ...newDays[dayIndex], ...settings };
    setEditedProgram({ ...editedProgram, days: newDays });
  };

  const updateSchedule = (newSchedule: string[]) => {
    if (!editedProgram) return;
    setEditedProgram({ ...editedProgram, schedule: newSchedule });
  };

  const onExerciseDragEnd = (dayIndex: number, data: ProgramExercise[]) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    newDays[dayIndex] = { ...newDays[dayIndex], exercises: data };
    setEditedProgram({ ...editedProgram, days: newDays });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addExercise = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setShowExercisePicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    if (!editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[dayIndex];
    if (!day || !day.exercises) return;
    const exercise = day.exercises[exerciseIndex];
    if (!exercise) return;
    Alert.alert('Удалить упражнение?', `"${exercise.exercise_name}" будет удалено из программы`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          const newExercises = [...(day.exercises || [])];
          newExercises.splice(exerciseIndex, 1);
          const newDays = [...(editedProgram?.days || [])];
          newDays[dayIndex] = { ...day, exercises: newExercises };
          setEditedProgram({ ...(editedProgram as Program), days: newDays });
          if (!exercise.isNew) {
            setDeletedExerciseIds((prev) => [...prev, exercise.id]);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleAddExerciseFromPicker = async (exercise: any) => {
    if (selectedDayIndex < 0 || !editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[selectedDayIndex];
    const currentExercises = day.exercises || [];
    const newExercise: any = {
      id: genRandomUUID(),
      program_day_id: day.id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: 4,
      reps_range: '8-12',
      rest_seconds: 90,
      intensity: 'medium',
      position: currentExercises.length + 1,
      isNew: true,
    };
    const newDays = [...editedProgram.days];
    newDays[selectedDayIndex] = { ...day, exercises: [...currentExercises, newExercise] };
    setEditedProgram({ ...editedProgram, days: newDays });
    setShowExercisePicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return {
    program,
    editedProgram,
    loading,
    starting,
    saving,
    editMode,
    setEditMode,
    setEditedProgram,
    deletedExerciseIds,
    setDeletedExerciseIds,
    deletedDayIds,
    setDeletedDayIds,
    deletedPhaseIds,
    setDeletedPhaseIds,
    showDaySettings,
    setShowDaySettings,
    showExerciseSettings,
    setShowExerciseSettings,
    showExercisePicker,
    setShowExercisePicker,
    showScheduleEditor,
    setShowScheduleEditor,
    showPhaseSettings,
    setShowPhaseSettings,
    selectedDay,
    setSelectedDay,
    selectedExercise,
    setSelectedExercise,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedExerciseIndex,
    setSelectedExerciseIndex,
    selectedPhaseIndex,
    setSelectedPhaseIndex,
    handleStartProgram,
    toggleEditMode,
    saveProgram,
    // Дни / упражнения
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    addExercise,
    removeExercise,
    handleAddExerciseFromPicker,
    // Фазы (из useProgramPhases)
    ...phasesApi,
  };
}