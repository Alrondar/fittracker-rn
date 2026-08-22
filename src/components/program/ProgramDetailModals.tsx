import { SheetShell } from '../ui/SheetShell';
import { ScheduleEditorSheet } from './sheets/ScheduleEditorSheet';
import { ShareProgramSheet } from './sheets/ShareProgramSheet';
import { createButtonStyles } from '../../styles/components/button';
import { createBadgeStyles } from '../../styles/components/badge';

interface ProgramDetailModalsProps {
  // Редактор расписания (для просмотра)
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

      {/* Модалка шаринга по коду */}
      <SheetShell
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
      >
        <ShareProgramSheet
          code={shareCode}
          loading={shareLoading}
          programName={programName}
          onShare={onShareViaSystem}
          onClose={() => setShowShareModal(false)}
        />
      </SheetShell>
    </>
  );
}