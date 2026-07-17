import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  getProgramWithDays,
  startProgram,
  createWorkoutsFromProgram,
  Program,
  ProgramDay,
  ProgramExercise,
} from '../services/programsService';
import * as Haptics from 'expo-haptics';

// Генерация UUID
const genRandomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function useProgramEditor(programId: string, userId: string | null) {
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Program | null>(null);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);

  // Модалки
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showExerciseSettings, setShowExerciseSettings] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  // Выбранные элементы
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(-1);

  // Поиск упражнений
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'popularity'>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);

  useEffect(() => {
    loadProgram();
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
    Alert.alert(
      'Начать программу?',
      `Будет создано ${program?.days?.length || 0} тренировок на первую неделю программы "${program?.name}"`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Начать',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStarting(true);
            try {
              await startProgram(programId);
              const workoutIds = await createWorkoutsFromProgram(programId, userId);
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
    } else {
      if (program && !program.id.startsWith('user_')) {
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

  const saveProgram = async () => {
    setSaving(true);
    try {
      if (!editedProgram || !editedProgram.days) return;

      const updatePromises: Promise<any>[] = [];
      const days = editedProgram.days || [];

      if (editedProgram.schedule) {
        const { error } = await supabase
          .from('programs')
          .update({ schedule: editedProgram.schedule })
          .eq('id', editedProgram.id);
        if (error) throw error;
      }

      if (deletedExerciseIds.length > 0) {
        deletedExerciseIds.forEach((exerciseId) => {
          updatePromises.push(
            Promise.resolve(supabase.from('program_exercises').delete().eq('id', exerciseId))
          );
        });
      }

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        updatePromises.push(
          Promise.resolve(
            supabase
              .from('program_days')
              .update({ position: i + 1, day_number: i + 1 })
              .eq('id', day.id)
          )
        );
        const exercises = day.exercises || [];
        for (let j = 0; j < exercises.length; j++) {
          const exercise = exercises[j];
          updatePromises.push(
            Promise.resolve(
              supabase.rpc('update_exercise_position', {
                p_exercise_id: exercise.id,
                p_new_position: j + 1,
              })
            )
          );
          if ((exercise as any).isNew) {
            updatePromises.push(
              Promise.resolve(
                supabase.from('program_exercises').insert({
                  id: exercise.id,
                  program_day_id: exercise.program_day_id,
                  exercise_id: (exercise as any).exercise_id,
                  exercise_name: exercise.exercise_name,
                  sets: exercise.sets,
                  reps_range: exercise.reps_range,
                  rest_seconds: exercise.rest_seconds,
                  intensity: exercise.intensity,
                  position: j + 1,
                })
              )
            );
          } else {
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

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r: any) => r.error);
      if (errors.length > 0) throw errors[0].error;

      const updatedProgram = await getProgramWithDays(editedProgram.id);
      setProgram(updatedProgram);
      setEditedProgram(updatedProgram);
      setDeletedExerciseIds([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить программу');
    } finally {
      setSaving(false);
    }
  };

  const updateExerciseParams = (dayIndex: number, exerciseIndex: number, params: Partial<ProgramExercise>) => {
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

  const onDayDragEnd = (data: ProgramDay[]) => {
    if (!editedProgram) return;
    const updatedDays = data.map((day, index) => ({ ...day, day_number: index + 1 }));
    setEditedProgram({ ...editedProgram, days: updatedDays });
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
          if (!(exercise as any).isNew) {
            setDeletedExerciseIds((prev) => [...prev, exercise.id]);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const loadAvailableExercises = async (searchQuery: string = '') => {
    setLoadingExercises(true);
    try {
      let query = supabase.from('exercises').select('*').order('name');
      if (searchQuery.trim()) {
        query = query.filter('name', 'ilike', `%${searchQuery}%`);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error: any) {
      Alert.alert('Ошибка', 'Не удалось загрузить список упражнений');
    } finally {
      setLoadingExercises(false);
    }
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
    setExerciseSearch('');
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
    showDaySettings,
    setShowDaySettings,
    showExerciseSettings,
    setShowExerciseSettings,
    showExercisePicker,
    setShowExercisePicker,
    showScheduleEditor,
    setShowScheduleEditor,
    selectedDay,
    setSelectedDay,
    selectedExercise,
    setSelectedExercise,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedExerciseIndex,
    setSelectedExerciseIndex,
    exerciseSearch,
    setExerciseSearch,
    availableExercises,
    loadingExercises,
    sortBy,
    setSortBy,
    showSortSheet,
    setShowSortSheet,
    handleStartProgram,
    toggleEditMode,
    saveProgram,
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    onDayDragEnd,
    addExercise,
    removeExercise,
    loadAvailableExercises,
    handleAddExerciseFromPicker,
  };
}