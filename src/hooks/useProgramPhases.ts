import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Program, ProgramPhase, ProgramDay } from '../services/programsService';

const genRandomUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

interface UseProgramPhasesOptions {
  editedProgram: Program | null;
  setEditedProgram: React.Dispatch<React.SetStateAction<Program | null>>;
  setDeletedPhaseIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDeletedDayIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDeletedExerciseIds: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Управление фазами программы (добавление/удаление/переупорядочивание,
 * недели, шаблон + переопределения). Чистая логика без побочных эффектов,
 * отделённая от useProgramEditor для соблюдения лимита 500 строк (SCALE-5).
 */
export function useProgramPhases({
  editedProgram,
  setEditedProgram,
  setDeletedPhaseIds,
  setDeletedDayIds,
  setDeletedExerciseIds,
}: UseProgramPhasesOptions) {
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
          const phaseDays = (editedProgram.days || []).filter((d) => d.phase_id === phase.id);
          const newPhases = editedProgram.phases!.filter((_, i) => i !== phaseIndex);
          const newDays = (editedProgram.days || []).filter((d) => d.phase_id !== phase.id);
          setEditedProgram({ ...editedProgram, phases: newPhases, days: newDays });
          if (!phase.isNew) setDeletedPhaseIds((prev) => [...prev, phase.id]);
          const removedDayIds = phaseDays.filter((d) => !d.isNew).map((d) => d.id);
          if (removedDayIds.length) setDeletedDayIds((prev) => [...prev, ...removedDayIds]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const updatePhaseSettings = (phaseIndex: number, settings: Partial<ProgramPhase>) => {
    if (!editedProgram || !editedProgram.phases) return;
    const newPhases = [...editedProgram.phases];
    newPhases[phaseIndex] = { ...newPhases[phaseIndex], ...settings };
    setEditedProgram({ ...editedProgram, phases: newPhases });
  };

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

  const addDayToPhase = (phaseIndex: number) => {
    if (!editedProgram || !editedProgram.phases) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    const phaseDays = (editedProgram.days || []).filter((d) => d.phase_id === phase.id);
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
          if (!day.isNew) setDeletedDayIds((prev) => [...prev, day.id]);
          const removedExIds = (day.exercises || []).filter((ex) => !ex.isNew).map((ex) => ex.id);
          if (removedExIds.length) setDeletedExerciseIds((prev) => [...prev, ...removedExIds]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const copyTemplateToWeek = (phaseIndex: number, week: number) => {
    if (!editedProgram || !editedProgram.phases || week <= 1) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    const templateDays = (editedProgram.days || [])
      .filter((d) => d.phase_id === phase.id && (d.week_number ?? 1) === 1)
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    const newDays: ProgramDay[] = templateDays.map((td) => {
      const newDayId = genRandomUUID();
      return {
        id: newDayId,
        program_id: editedProgram.id,
        phase_id: phase.id,
        week_number: week,
        day_number: td.day_number,
        name: td.name,
        position: td.position,
        exercises: (td.exercises || []).map((ex) => ({
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

  const resetWeekToTemplate = (phaseIndex: number, week: number) => {
    if (!editedProgram || !editedProgram.phases || week <= 1) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    const weekDays = (editedProgram.days || []).filter(
      (d) => d.phase_id === phase.id && (d.week_number ?? 1) === week,
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
              (d) => !(d.phase_id === phase.id && (d.week_number ?? 1) === week),
            );
            setEditedProgram({ ...editedProgram, days: newDays });
            const removedDayIds = weekDays.filter((d) => !d.isNew).map((d) => d.id);
            if (removedDayIds.length) setDeletedDayIds((prev) => [...prev, ...removedDayIds]);
            const removedExIds = weekDays.flatMap((d) =>
              (d.exercises || []).filter((ex) => !ex.isNew).map((ex) => ex.id),
            );
            if (removedExIds.length) setDeletedExerciseIds((prev) => [...prev, ...removedExIds]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const addDayToPhaseWeek = (phaseIndex: number, week: number) => {
    if (!editedProgram || !editedProgram.phases) return;
    const phase = editedProgram.phases[phaseIndex];
    if (!phase) return;
    const weekDays = (editedProgram.days || []).filter(
      (d) => d.phase_id === phase.id && (d.week_number ?? 1) === week,
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

  const getDaysForPhase = (phaseId: string): ProgramDay[] => {
    if (!editedProgram || !editedProgram.days) return [];
    return editedProgram.days
      .filter((d) => d.phase_id === phaseId)
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
  };

  const onDayDragEnd = (data: ProgramDay[], phaseId?: string) => {
    if (!editedProgram || !editedProgram.days) return;
    if (phaseId) {
      const otherDays = editedProgram.days.filter((d) => d.phase_id !== phaseId);
      const reordered = data.map((day, index) => ({
        ...day,
        day_number: index + 1,
        position: index + 1,
      }));
      setEditedProgram({ ...editedProgram, days: [...otherDays, ...reordered] });
    } else {
      const updatedDays = data.map((day, index) => ({ ...day, day_number: index + 1 }));
      setEditedProgram({ ...editedProgram, days: updatedDays });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return {
    addPhase,
    removePhase,
    updatePhaseSettings,
    onPhaseDragEnd,
    movePhase,
    addDayToPhase,
    removeDay,
    getDaysForPhase,
    copyTemplateToWeek,
    resetWeekToTemplate,
    addDayToPhaseWeek,
    onDayDragEnd,
  };
}