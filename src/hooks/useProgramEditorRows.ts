// FZ-5 (аудит 28.09, пакет 19.10): редактор программы держит список фаз, и
// каждая перерисовка экрана — открытие шторки, выбранный день, индикатор
// сохранения — пересобирала всё дерево: 3 PhaseCard + 18 DayCard на пустяк.
// Мемоизация строк работает только когда props неизменны, поэтому здесь два
// кирпича: списки дней с сохраняемой идентичностью и фасад действий с одним
// неизменным объектом.
import { useEffect, useMemo, useRef } from 'react';
import type { ProgramDay, ProgramExercise } from '../services/programsService';
import type { useProgramEditor } from './useProgramEditor';

/** Пустой список фазы без дней: один объект на всё приложение, иначе `?? []`
 *  дал бы каждой строке новый массив и сравнение всегда было бы «изменилось». */
export const NO_DAYS: ProgramDay[] = [];

/**
 * Дни, сгруппированные по фазе. Массив фазы сохраняет идентичность между
 * пересчётами, если её дни не поменялись: при правке одного дня объекты
 * остальных дней остаются теми же, и остальные строки не перерисовываются.
 */
export function useDaysByPhase(days: ProgramDay[] | undefined): Record<string, ProgramDay[]> {
  const cache = useRef<Record<string, ProgramDay[]>>({});

  return useMemo(() => {
    const next: Record<string, ProgramDay[]> = {};
    for (const day of days ?? []) {
      if (!day.phase_id) continue;
      (next[day.phase_id] ??= []).push(day);
    }
    for (const [phaseId, list] of Object.entries(next)) {
      list.sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
      const prev = cache.current[phaseId];
      const same =
        !!prev && prev.length === list.length && prev.every((d, i) => Object.is(d, list[i]));
      if (same) next[phaseId] = prev!;
    }
    cache.current = next;
    return next;
  }, [days]);
}

/**
 * Набор действий строки редактора. Индексы резолвятся по id в момент вызова,
 * поэтому строке не нужно знать ни свой индекс, ни плоский индекс дня — и строка
 * может не перерисовываться при сдвиге соседей.
 */
export interface EditorActions {
  editPhase: (phaseId: string) => void;
  removePhase: (phaseId: string) => void;
  addDay: (phaseId: string) => void;
  addDayToWeek: (phaseId: string, week: number) => void;
  copyTemplateToWeek: (phaseId: string, week: number) => void;
  resetWeekToTemplate: (phaseId: string, week: number) => void;
  dayDragEnd: (data: ProgramDay[], phaseId: string) => void;
  editDay: (dayId: string) => void;
  exerciseSettings: (dayId: string, exerciseIndex: number) => void;
  addExercise: (dayId: string) => void;
  removeExercise: (dayId: string, exerciseIndex: number) => void;
  exerciseDragEnd: (dayId: string, data: ProgramExercise[]) => void;
}

/**
 * Экран программы только для чтения: карточки в `editMode={false}` действия не
 * вызывают, но prop обязателен — один заглушечный объект вместо тринадцати
 * пустых стрелок в JSX (FZ-5).
 */
export const NOOP_ACTIONS: EditorActions = {
  editPhase: () => {},
  removePhase: () => {},
  addDay: () => {},
  addDayToWeek: () => {},
  copyTemplateToWeek: () => {},
  resetWeekToTemplate: () => {},
  dayDragEnd: () => {},
  editDay: () => {},
  exerciseSettings: () => {},
  addExercise: () => {},
  removeExercise: () => {},
  exerciseDragEnd: () => {},
};

/**
 * Фасад над хуком редактора: объект создаётся один раз и всегда зовёт самый
 * свежий обработчик. Это держит идентичность props строки, не меняя сами
 * обработчики — поведение остаётся ровно тем же, что было у экрана.
 */
export function useProgramEditorActions(
  editor: ReturnType<typeof useProgramEditor>
): EditorActions {
  const ref = useRef(editor);
  useEffect(() => {
    ref.current = editor;
  });

  return useMemo<EditorActions>(
    () => ({
      editPhase: (phaseId) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i < 0) return;
        e.setSelectedPhaseIndex(i);
        e.setShowPhaseSettings(true);
      },
      removePhase: (phaseId) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i >= 0) e.removePhase(i);
      },
      addDay: (phaseId) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i >= 0) e.addDayToPhase(i);
      },
      addDayToWeek: (phaseId, week) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i >= 0) e.addDayToPhaseWeek(i, week);
      },
      copyTemplateToWeek: (phaseId, week) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i >= 0) e.copyTemplateToWeek(i, week);
      },
      resetWeekToTemplate: (phaseId, week) => {
        const e = ref.current;
        const i = (e.editedProgram?.phases || []).findIndex((p) => p.id === phaseId);
        if (i >= 0) e.resetWeekToTemplate(i, week);
      },
      dayDragEnd: (data, phaseId) => ref.current.onDayDragEnd(data, phaseId),
      editDay: (dayId) => {
        const e = ref.current;
        const days = e.editedProgram?.days || [];
        const i = days.findIndex((d) => d.id === dayId);
        if (i < 0) return;
        e.setSelectedDay(days[i]);
        e.setSelectedDayIndex(i);
        e.setShowDaySettings(true);
      },
      exerciseSettings: (dayId, exerciseIndex) => {
        const e = ref.current;
        const days = e.editedProgram?.days || [];
        const i = days.findIndex((d) => d.id === dayId);
        if (i < 0) return;
        e.setSelectedDay(days[i]);
        e.setSelectedExercise(days[i].exercises?.[exerciseIndex] ?? null);
        e.setSelectedExerciseIndex(exerciseIndex);
        e.setShowExerciseSettings(true);
      },
      addExercise: (dayId) => {
        const e = ref.current;
        const i = (e.editedProgram?.days || []).findIndex((d) => d.id === dayId);
        if (i < 0) return;
        // Ровно то, что делал экран до пакета: выбор дня + открытие пикера.
        // Хук добавляет сюда хаптик — раньше на этой кнопке его не было.
        e.setSelectedDayIndex(i);
        e.setShowExercisePicker(true);
      },
      removeExercise: (dayId, exerciseIndex) => {
        const e = ref.current;
        const i = (e.editedProgram?.days || []).findIndex((d) => d.id === dayId);
        if (i >= 0) e.removeExercise(i, exerciseIndex);
      },
      exerciseDragEnd: (dayId, data) => {
        const e = ref.current;
        const i = (e.editedProgram?.days || []).findIndex((d) => d.id === dayId);
        if (i >= 0) e.onExerciseDragEnd(i, data);
      },
    }),
    [ref]
  );
}
