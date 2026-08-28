import { useState, useEffect, useMemo } from 'react';
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
import { ExerciseListItem } from '../services/exercisesService';
import { useProgramPhases } from './useProgramPhases';
import * as Haptics from 'expo-haptics';

const genRandomUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function useProgramEditor(
  programId: string,
  userId: string | null,
  initialEditMode = false,
) {
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(initialEditMode);
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

  // Dirty tracking: сравниваем editedProgram с program (deep-equal через JSON.stringify).
  // Также проверяем deleted IDs — если есть удалённые сущности, считаем dirty.
  const isDirty = useMemo(() => {
    if (!program || !editedProgram) return false;
    if (deletedExerciseIds.length > 0 || deletedDayIds.length > 0 || deletedPhaseIds.length > 0) {
      return true;
    }
    return JSON.stringify(program) !== JSON.stringify(editedProgram);
  }, [program, editedProgram, deletedExerciseIds, deletedDayIds, deletedPhaseIds]);

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
      ],
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
  // СОХРАНЕНИЕ (атомарное через RPC) + СИНХРОНИЗАЦИЯ С ТРЕНИРОВКАМИ
  // ============================================================================
  const saveProgram = async () => {
    setSaving(true);
    try {
      if (!editedProgram) return;
      if (!editedProgram.created_by || editedProgram.created_by !== userId) {
        throw new Error('Нельзя редактировать чужую программу. Сначала скопируйте её.');
      }
      // Формируем снапшот дерева программы для RPC
      const phases = editedProgram.phases || [];
      const days = editedProgram.days || [];
      const snapshot = {
        program_id: editedProgram.id,
        schedule: editedProgram.schedule || [],
        deleted_phase_ids: deletedPhaseIds,
        deleted_day_ids: deletedDayIds,
        deleted_exercise_ids: deletedExerciseIds,
        phases: phases.map((phase, phaseIndex) => ({
          id: phase.id,
          isNew: phase.isNew || false,
          phase_number: phaseIndex + 1,
          name: phase.name,
          phase_type: phase.phase_type,
          weeks_count: phase.weeks_count,
          description: phase.description || '',
          position: phaseIndex + 1,
          days: days
            .filter((d) => d.phase_id === phase.id)
            .map((day, dayIndex) => ({
              id: day.id,
              isNew: day.isNew || false,
              week_number: day.week_number ?? 1,
              day_number: dayIndex + 1,
              name: day.name,
              position: dayIndex + 1,
              exercises: (day.exercises || []).map((exercise, exIndex) => ({
                id: exercise.id,
                isNew: exercise.isNew || false,
                exercise_id: exercise.exercise_id || null,
                exercise_name: exercise.exercise_name,
                sets: exercise.sets,
                reps_range: exercise.reps_range,
                rest_seconds: exercise.rest_seconds,
                intensity: exercise.intensity,
                position: exIndex + 1,
              })),
            })),
        })),
      };
      // Один атомарный RPC вместо Promise.all (PERF-4 + PERF-6)
      const { error } = await supabase.rpc('save_program_snapshot', {
        p_program_id: snapshot.program_id,
        p_schedule: snapshot.schedule,
        p_deleted_phase_ids: snapshot.deleted_phase_ids,
        p_deleted_day_ids: snapshot.deleted_day_ids,
        p_deleted_exercise_ids: snapshot.deleted_exercise_ids,
        p_phases: snapshot.phases,
      });
      if (error) throw error;

      // Принудительный refetch без кэша
      const updatedProgram = await getProgramWithDays(editedProgram.id);
      if (!updatedProgram) {
        throw new Error('Программа не найдена после сохранения');
      }

      // Синхронизация правок с будущими тренировками (FIT-2)
      let syncInfo = null;
      try {
        syncInfo = await syncProgramChanges(editedProgram.id);
      } catch (syncError: any) {
        console.error('[saveProgram] Sync failed:', syncError);
        // Не блокируем сохранение, но возвращаем ошибку для отображения Toast
        throw new Error(`Программа сохранена, но ошибка синхронизации: ${syncError.message}`);
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

  // ARCH-6: exercise типизирован как ExerciseListItem (выход пикера),
  // newExercise — как ProgramExercise (все поля сходятся без кастов).
  const handleAddExerciseFromPicker = async (exercise: ExerciseListItem) => {
    if (selectedDayIndex < 0 || !editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[selectedDayIndex];
    const currentExercises = day.exercises || [];
    const newExercise: ProgramExercise = {
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
    isDirty,
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