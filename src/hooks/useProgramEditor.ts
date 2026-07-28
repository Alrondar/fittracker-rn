import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  getProgramWithDays,
  startProgram,
  Program,
  ProgramPhase,
  ProgramDay,
  ProgramExercise,
} from '../services/programsService';
import * as Haptics from 'expo-haptics';

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
  const [deletedDayIds, setDeletedDayIds] = useState<string[]>([]);     // ✅ НОВОЕ
  const [deletedPhaseIds, setDeletedPhaseIds] = useState<string[]>([]); // ✅ НОВОЕ

  // Модалки
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showExerciseSettings, setShowExerciseSettings] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showPhaseSettings, setShowPhaseSettings] = useState(false); // ✅ НОВОЕ

  // Выбранные элементы
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(-1);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(-1); // ✅ НОВОЕ

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
  const phases = program?.phases || [];
  const totalWeeks = phases.reduce((sum, p) => sum + (p.weeks_count || 1), 0);
  Alert.alert(
    'Начать программу?',
    `Будут созданы тренировки на всю программу "${program?.name}"\n(${phases.length} фаз · ${totalWeeks} недель)`,
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Начать',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setStarting(true);
          try {
            await startProgram(programId);

            // ✅ БЫЛО (медленно, нестабильно):
            // await createWorkoutsFromProgram(programId, userId);

            // ✅ СТАЛО (один серверный запрос, идемпотентно):
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
    // ✅ ФИКС бага 6: «своя копия» определяется по created_by, а не по префиксу id.
    //    RPC copy_program_for_user создаёт копии с uuid без префикса 'user_', поэтому
    //    старая проверка !id.startsWith('user_') принимала СОБСТВЕННУЮ копию за сид и
    //    повторно звала копирование → duplicate key (ux_programs_user_name) / дубль копии.
    //    Своя копия (created_by === userId) → редактируем напрямую, без копирования.
    //    Сид (created_by == null) или чужая программа → копируем себе, как раньше.
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
  // ФАЗЫ (управление)
  // ============================================================================

  /** Добавить фазу (с одним пустым днём по умолчанию). */
  const addPhase = () => {
    if (!editedProgram) return;
    const phases = editedProgram.phases || [];
    const newPhaseId = genRandomUUID();
    const newPhase: ProgramPhase = {
      id: newPhaseId,
      program_id: editedProgram.id,
      phase_number: phases.length + 1,
      name: `Фаза ${phases.length + 1}`,
      phase_type: 'custom',
      weeks_count: 1,
      description: null,
      position: phases.length + 1,
      days: [],
      isNew: true,
    };
    const newDay: ProgramDay = {
      id: genRandomUUID(),
      program_id: editedProgram.id,
      phase_id: newPhaseId,
      week_number: 1,
      day_number: 1,
      name: 'День 1',
      position: 1,
      exercises: [],
      isNew: true,
    };
    setEditedProgram({
      ...editedProgram,
      phases: [...phases, newPhase],
      days: [...(editedProgram.days || []), newDay],
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Удалить фазу вместе с её днями. */
  const removePhase = (phaseIndex: number) => {
    if (!editedProgram || !editedProgram.phases) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    Alert.alert('Удалить фазу?', `"${phase.name}" и все её дни будут удалены`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          const phaseDays = (editedProgram.days || []).filter(d => d.phase_id === phase.id);
          const newPhases = editedProgram.phases!.filter((_, i) => i !== phaseIndex);
          const newDays = (editedProgram.days || []).filter(d => d.phase_id !== phase.id);
          setEditedProgram({ ...editedProgram, phases: newPhases, days: newDays });
          if (!phase.isNew) setDeletedPhaseIds(prev => [...prev, phase.id]);
          const removedDayIds = phaseDays.filter(d => !d.isNew).map(d => d.id);
          if (removedDayIds.length) setDeletedDayIds(prev => [...prev, ...removedDayIds]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  /** Обновить настройки фазы (название, тип, недели, описание). */
  const updatePhaseSettings = (phaseIndex: number, settings: Partial<ProgramPhase>) => {
    if (!editedProgram || !editedProgram.phases) return;
    const newPhases = [...editedProgram.phases];
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], ...settings };
    setEditedProgram({ ...editedProgram, phases: newPhases });
  };

  /** Переупорядочить фазы (drag & drop). */
  const onPhaseDragEnd = (data: ProgramPhase[]) => {
    if (!editedProgram) return;
    const updatedPhases = data.map((phase, index) => ({
      ...phase,
      phase_number: index + 1,
      position: index + 1,
    }));
    setEditedProgram({ ...editedProgram, phases: updatedPhases });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
    /** Переместить фазу стрелками (↑/↓). */
  const movePhase = (phaseIndex: number, direction: 'up' | 'down') => {
    if (!editedProgram || !editedProgram.phases) return;
    const phases = [...editedProgram.phases];
    const targetIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1;
    if (targetIndex < 0 || targetIndex >= phases.length) return;
    [phases[phaseIndex], phases[targetIndex]] = [phases[targetIndex], phases[phaseIndex]];
    const renumbered = phases.map((p, i) => ({ ...p, phase_number: i + 1, position: i + 1 }));
    setEditedProgram({ ...editedProgram, phases: renumbered });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Добавить день в конкретную фазу. */
  const addDayToPhase = (phaseIndex: number) => {
    if (!editedProgram || !editedProgram.phases) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    const phaseDays = (editedProgram.days || []).filter(d => d.phase_id === phase.id);
    const newDay: ProgramDay = {
      id: genRandomUUID(),
      program_id: editedProgram.id,
      phase_id: phase.id,
      week_number: 1,
      day_number: phaseDays.length + 1,
      name: `День ${phaseDays.length + 1}`,
      position: phaseDays.length + 1,
      exercises: [],
      isNew: true,
    };
    setEditedProgram({ ...editedProgram, days: [...(editedProgram.days || []), newDay] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /** Удалить день (по плоскому индексу в editedProgram.days). */
  const removeDay = (dayIndex: number) => {
    if (!editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[dayIndex];
    if (!day) return;
    Alert.alert('Удалить день?', `"${day.name}" будет удалён`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          const newDays = editedProgram.days!.filter((_, i) => i !== dayIndex);
          setEditedProgram({ ...editedProgram, days: newDays });
          if (!day.isNew) setDeletedDayIds(prev => [...prev, day.id]);
          const removedExIds = (day.exercises || []).filter(ex => !ex.isNew).map(ex => ex.id);
          if (removedExIds.length) setDeletedExerciseIds(prev => [...prev, ...removedExIds]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  /** Скопировать шаблон (неделю 1) в неделю N — создать переопределение. */
const copyTemplateToWeek = (phaseIndex: number, week: number) => {
  if (!editedProgram || !editedProgram.phases || week <= 1) return;
  const phase = editedProgram.phases[phaseIndex];
  if (!phase) return;
  const templateDays = (editedProgram.days || [])
    .filter(d => d.phase_id === phase.id && (d.week_number ?? 1) === 1)
    .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

  const newDays: ProgramDay[] = templateDays.map(td => {
    const newDayId = genRandomUUID();
    return {
      id: newDayId,
      program_id: editedProgram.id,
      phase_id: phase.id,
      week_number: week,
      day_number: td.day_number,
      name: td.name,
      position: td.position,
      exercises: (td.exercises || []).map(ex => ({
        ...ex,
        id: genRandomUUID(),
        program_day_id: newDayId,
        isNew: true,
      })),
      isNew: true,
    };
  });

  setEditedProgram({ ...editedProgram, days: [...(editedProgram.days || []), ...newDays] });
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Сбросить неделю к шаблону (удалить переопределение). */
const resetWeekToTemplate = (phaseIndex: number, week: number) => {
  if (!editedProgram || !editedProgram.phases || week <= 1) return;
  const phase = editedProgram.phases[phaseIndex];
  if (!phase) return;
  const weekDays = (editedProgram.days || []).filter(
    d => d.phase_id === phase.id && (d.week_number ?? 1) === week
  );
  if (weekDays.length === 0) return;

  Alert.alert(
    'Сбросить неделю к шаблону?',
    `Изменения недели ${week} будут удалены, снова будет использоваться шаблон недели 1`,
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: () => {
          const newDays = (editedProgram.days || []).filter(
            d => !(d.phase_id === phase.id && (d.week_number ?? 1) === week)
          );
          setEditedProgram({ ...editedProgram, days: newDays });
          const removedDayIds = weekDays.filter(d => !d.isNew).map(d => d.id);
          if (removedDayIds.length) setDeletedDayIds(prev => [...prev, ...removedDayIds]);
          const removedExIds = weekDays.flatMap(d =>
            (d.exercises || []).filter(ex => !ex.isNew).map(ex => ex.id)
          );
          if (removedExIds.length) setDeletedExerciseIds(prev => [...prev, ...removedExIds]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]
  );
};

/** Добавить день в конкретную неделю фазы. */
const addDayToPhaseWeek = (phaseIndex: number, week: number) => {
  if (!editedProgram || !editedProgram.phases) return;
  const phase = editedProgram.phases[phaseIndex];
  if (!phase) return;
  const weekDays = (editedProgram.days || []).filter(
    d => d.phase_id === phase.id && (d.week_number ?? 1) === week
  );
  const newDay: ProgramDay = {
    id: genRandomUUID(),
    program_id: editedProgram.id,
    phase_id: phase.id,
    week_number: week,
    day_number: weekDays.length + 1,
    name: `День ${weekDays.length + 1}`,
    position: weekDays.length + 1,
    exercises: [],
    isNew: true,
  };
  setEditedProgram({ ...editedProgram, days: [...(editedProgram.days || []), newDay] });
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
  
  /** Дни фазы (отсортированы по day_number). */
  const getDaysForPhase = (phaseId: string): ProgramDay[] => {
    if (!editedProgram || !editedProgram.days) return [];
    return editedProgram.days
      .filter(d => d.phase_id === phaseId)
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
  };

  // ============================================================================
  // СОХРАНЕНИЕ (фазовое)
  // ============================================================================

  const saveProgram = async () => {
    setSaving(true);
    try {
      if (!editedProgram) return;
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

        // Группируем дни по неделям
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
          name: day.name,                 // ✅ ДОБАВЛЕНО: сохраняем название дня
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
      if (errors.length > 0) throw errors[0].error;

      const updatedProgram = await getProgramWithDays(editedProgram.id);
      setProgram(updatedProgram);
      setEditedProgram(updatedProgram);
      setDeletedPhaseIds([]);
      setDeletedDayIds([]);
      setDeletedExerciseIds([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить программу');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // ДНИ / УПРАЖНЕНИЯ (плоский индекс — обратная совместимость)
  // ============================================================================

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

  /** Переупорядочить дни. Если передан phaseId — только в пределах фазы. */
  const onDayDragEnd = (data: ProgramDay[], phaseId?: string) => {
    if (!editedProgram || !editedProgram.days) return;
    if (phaseId) {
      const otherDays = editedProgram.days.filter(d => d.phase_id !== phaseId);
      const reordered = data.map((day, index) => ({ ...day, day_number: index + 1, position: index + 1 }));
      setEditedProgram({ ...editedProgram, days: [...otherDays, ...reordered] });
    } else {
      const updatedDays = data.map((day, index) => ({ ...day, day_number: index + 1 }));
      setEditedProgram({ ...editedProgram, days: updatedDays });
    }
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
            setDeletedExerciseIds(prev => [...prev, exercise.id]);
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
    deletedDayIds,            // ✅ НОВОЕ
    setDeletedDayIds,         // ✅ НОВОЕ
    deletedPhaseIds,          // ✅ НОВОЕ
    setDeletedPhaseIds,       // ✅ НОВОЕ
    showDaySettings,
    setShowDaySettings,
    showExerciseSettings,
    setShowExerciseSettings,
    showExercisePicker,
    setShowExercisePicker,
    showScheduleEditor,
    setShowScheduleEditor,
    showPhaseSettings,        // ✅ НОВОЕ
    setShowPhaseSettings,     // ✅ НОВОЕ
    selectedDay,
    setSelectedDay,
    selectedExercise,
    setSelectedExercise,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedExerciseIndex,
    setSelectedExerciseIndex,
    selectedPhaseIndex,       // ✅ НОВОЕ
    setSelectedPhaseIndex,    // ✅ НОВОЕ
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
    // Фазы
    addPhase,                 // ✅ НОВОЕ
    removePhase,              // ✅ НОВОЕ
    updatePhaseSettings,      // ✅ НОВОЕ
    onPhaseDragEnd,  
    movePhase,        // ✅ НОВОЕ
    addDayToPhase,            // ✅ НОВОЕ
    removeDay,                // ✅ НОВОЕ
    getDaysForPhase,          // ✅ НОВОЕ
    // Дни / упражнения
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    onDayDragEnd,
    addExercise,
    removeExercise,
    loadAvailableExercises,
    handleAddExerciseFromPicker,
    copyTemplateToWeek,    // ✅ НОВОЕ
    resetWeekToTemplate,   // ✅ НОВОЕ
    addDayToPhaseWeek,     // ✅ НОВОЕ
  };
}