import { SheetShell } from '../ui/SheetShell';
import { PhaseSettingsSheet } from './sheets/PhaseSettingsSheet';
import { ExerciseSettingsSheet } from './sheets/ExerciseSettingsSheet';
import { DaySettingsSheet } from './sheets/DaySettingsSheet';
import { ExercisePickerSheet } from './sheets/ExercisePickerSheet';
import { ScheduleEditorSheet } from './sheets/ScheduleEditorSheet';
import {
  ProgramPhase,
  ProgramDay,
  ProgramExercise,
} from '../../services/programsService';
import { ExerciseListItem } from '../../services/exercisesService';
import { PhaseType } from '../../constants/phaseTypes';
import { createButtonStyles } from '../../styles/components/button';
import { createBadgeStyles } from '../../styles/components/badge';

export interface DaySettingsPayload {
  name: string;
  phase_type: PhaseType;
  weeks_count: number;
  description: string;
}

interface ProgramEditorModalsProps {
  // Настройки фазы
  showPhaseSettings: boolean;
  setShowPhaseSettings: (v: boolean) => void;
  selectedPhase: ProgramPhase | null;
  onSavePhaseSettings: (settings: { name: string; phase_type: PhaseType; weeks_count: number }) => void;
  // Настройки упражнения
  showExerciseSettings: boolean;
  setShowExerciseSettings: (v: boolean) => void;
  selectedExercise: ProgramExercise | null;
  onSaveExerciseParams: (params: { sets: number; reps_range: string; rest_seconds: number; intensity: 'low' | 'medium' | 'high' }) => void;
  // Настройки дня
  showDaySettings: boolean;
  setShowDaySettings: (v: boolean) => void;
  selectedDay: ProgramDay | null;
  onSaveDaySettings: (settings: DaySettingsPayload) => void;
  // Пикер упражнений
  showExercisePicker: boolean;
  setShowExercisePicker: (v: boolean) => void;
  onSelectExercise: (exercise: ExerciseListItem) => void;
  // Редактор расписания
  showScheduleEditor: boolean;
  setShowScheduleEditor: (v: boolean) => void;
  schedule: string[];
  onSaveSchedule: (newSchedule: string[]) => void;
  // Стили
  colors: any;
  buttonStyles: ReturnType<typeof createButtonStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}

export function ProgramEditorModals({
  showPhaseSettings,
  setShowPhaseSettings,
  selectedPhase,
  onSavePhaseSettings,
  showExerciseSettings,
  setShowExerciseSettings,
  selectedExercise,
  onSaveExerciseParams,
  showDaySettings,
  setShowDaySettings,
  selectedDay,
  onSaveDaySettings,
  showExercisePicker,
  setShowExercisePicker,
  onSelectExercise,
  showScheduleEditor,
  setShowScheduleEditor,
  schedule,
  onSaveSchedule,
  colors,
  buttonStyles,
  badgeStyles,
}: ProgramEditorModalsProps) {
  return (
    <>
      <SheetShell
        visible={showPhaseSettings}
        onClose={() => setShowPhaseSettings(false)}
      >
        <PhaseSettingsSheet
          phase={selectedPhase}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSavePhaseSettings}
          onClose={() => setShowPhaseSettings(false)}
        />
      </SheetShell>

      <SheetShell
        visible={showExerciseSettings}
        onClose={() => setShowExerciseSettings(false)}
      >
        <ExerciseSettingsSheet
          exercise={selectedExercise}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSaveExerciseParams}
          onClose={() => setShowExerciseSettings(false)}
        />
      </SheetShell>

      <SheetShell
        visible={showDaySettings}
        onClose={() => setShowDaySettings(false)}
      >
        <DaySettingsSheet
          day={selectedDay}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSaveDaySettings}
          onClose={() => setShowDaySettings(false)}
        />
      </SheetShell>

      <SheetShell
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
      >
        <ExercisePickerSheet
          onSelectExercise={onSelectExercise}
          onClose={() => setShowExercisePicker(false)}
          colors={colors}
          badgeStyles={badgeStyles}
        />
      </SheetShell>

      <SheetShell
        visible={showScheduleEditor}
        onClose={() => setShowScheduleEditor(false)}
      >
        <ScheduleEditorSheet
          schedule={schedule}
          onSave={onSaveSchedule}
          onClose={() => setShowScheduleEditor(false)}
          colors={colors}
          buttonStyles={buttonStyles}
          badgeStyles={badgeStyles}
        />
      </SheetShell>
    </>
  );
}