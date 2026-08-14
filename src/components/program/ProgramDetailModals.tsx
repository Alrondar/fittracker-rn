import { Modal } from 'react-native';
import { PhaseSettingsSheet } from './sheets/PhaseSettingsSheet';
import { ExerciseSettingsSheet } from './sheets/ExerciseSettingsSheet';
import { DaySettingsSheet } from './sheets/DaySettingsSheet';
import { ExercisePickerSheet } from './sheets/ExercisePickerSheet';
import { ScheduleEditorSheet } from './sheets/ScheduleEditorSheet';
import { ShareProgramSheet } from './sheets/ShareProgramSheet';
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

interface ProgramDetailModalsProps {
  // Настройки фазы
  showPhaseSettings: boolean;
  setShowPhaseSettings: (v: boolean) => void;
  selectedPhase: ProgramPhase | null;
  onSavePhaseSettings: (settings: { name: string; phase_type: PhaseType; weeks_count: number }) => void;
  // Настройки упражнения
  showExerciseSettings: boolean;
  setShowExerciseSettings: (v: boolean) => void;
  selectedExercise: ProgramExercise | null;
  onSaveExerciseParams: (params: { sets: number; reps_range: string; rest_seconds: number; intensity: 'low' | 'medium' | 'high' }) => void;  // Настройки дня
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
  // Шаринг программы
  showShareModal: boolean;
  setShowShareModal: (v: boolean) => void;
  shareCode: string | null;
  shareLoading: boolean;
  programName: string;
  onShareViaSystem: () => void;
  // Стили
  colors: any;
  buttonStyles: ReturnType<typeof createButtonStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}

export function ProgramDetailModals({
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
  showShareModal,
  setShowShareModal,
  shareCode,
  shareLoading,
  programName,
  onShareViaSystem,
  colors,
  buttonStyles,
  badgeStyles,
}: ProgramDetailModalsProps) {
  return (
    <>
      <Modal
        visible={showPhaseSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhaseSettings(false)}
      >
        <PhaseSettingsSheet
          phase={selectedPhase}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSavePhaseSettings}
          onClose={() => setShowPhaseSettings(false)}
        />
      </Modal>

      <Modal
        visible={showExerciseSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseSettings(false)}
      >
        <ExerciseSettingsSheet
          exercise={selectedExercise}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSaveExerciseParams}
          onClose={() => setShowExerciseSettings(false)}
        />
      </Modal>

      <Modal
        visible={showDaySettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDaySettings(false)}
      >
        <DaySettingsSheet
          day={selectedDay}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={onSaveDaySettings}
          onClose={() => setShowDaySettings(false)}
        />
      </Modal>

      {/* Пикер самодостаточен: поиск/фильтры/иконки живёт внутри него.
          Экран передаёт только колбэк выбора + закрытие + стили. */}
      <Modal
        visible={showExercisePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <ExercisePickerSheet
          onSelectExercise={onSelectExercise}
          onClose={() => setShowExercisePicker(false)}
          colors={colors}
          badgeStyles={badgeStyles}
        />
      </Modal>

      <Modal
        visible={showScheduleEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleEditor(false)}
      >
        <ScheduleEditorSheet
          schedule={schedule}
          onSave={onSaveSchedule}
          onClose={() => setShowScheduleEditor(false)}
          colors={colors}
          buttonStyles={buttonStyles}
          badgeStyles={badgeStyles}
        />
      </Modal>

      {/* Модалка шаринга по коду */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <ShareProgramSheet
          code={shareCode}
          loading={shareLoading}
          programName={programName}
          onShare={onShareViaSystem}
          onClose={() => setShowShareModal(false)}
        />
      </Modal>
    </>
  );
}