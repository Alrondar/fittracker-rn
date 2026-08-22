import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, X } from 'lucide-react-native';
import { useStore } from '../../../src/store/useStore';
import { useTheme } from '../../../src/hooks/useTheme';
import { useProgramEditor } from '../../../src/hooks/useProgramEditor';
import { mapError } from '../../../src/utils/errorMapper';
import { SPACING } from '../../../src/constants/theme';
import { commonStyles } from '../../../src/styles/common';
import { createCardStyles } from '../../../src/styles/components/card';
import { createBadgeStyles } from '../../../src/styles/components/badge';
import { createButtonStyles } from '../../../src/styles/components/button';
import { typography } from '../../../src/styles/typography';
import { ListSkeleton } from '../../../src/components/Skeleton';
import { Toast } from '../../../src/components/Toast';
import { useToast } from '../../../src/hooks/useToast';
import { PhaseCard } from '../../../src/components/program/PhaseCard';
import { ProgramHero } from '../../../src/components/program/ProgramHero';
import { ProgramEditorModals } from '../../../src/components/program/ProgramEditorModals';

const ON_COLOR = '#FFFFFF';

export default function ProgramEditScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const badgeStyles = useMemo(() => createBadgeStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  // initialEditMode = true для экрана редактирования
  const {
    program,
    editedProgram,
    loading,
    saving,
    setEditMode,
    saveProgram,
    getDaysForPhase,
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
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    removeExercise,
    handleAddExerciseFromPicker,
    addPhase,
    removePhase,
    updatePhaseSettings,
    movePhase,
    addDayToPhase,
    copyTemplateToWeek,
    resetWeekToTemplate,
    addDayToPhaseWeek,
    onDayDragEnd,
  } = useProgramEditor(id as string, userId, true);

  const handleSave = async () => {
    try {
      await saveProgram();
      showToast('Программа сохранена. Будущие тренировки обновлены.', 'success');
      router.back();
    } catch (error: any) {
      showToast(mapError(error), 'error');
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    router.back();
  };

  if (loading || !program || !editedProgram) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  const phases = editedProgram.phases || [];
  const allDays = editedProgram.days || [];

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header с Breadcrumb */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={handleCancel} style={{ padding: SPACING.xs }}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            Программа › Редактирование
          </Text>
          <Text
            style={[typography.labelBold, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {program.name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.xs,
            backgroundColor: colors.primary,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.sm,
            borderRadius: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color={ON_COLOR} size="small" />
          ) : (
            <>
              <Save size={18} color={ON_COLOR} strokeWidth={2} />
              <Text style={[typography.labelBold, { color: ON_COLOR }]}>Сохранить</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgramHero
          programName={program.name}
          programDescription={program.description}
          duration={program.duration}
          schedule={program.schedule}
          editMode={true}
          onOpenScheduleEditor={() => setShowScheduleEditor(true)}
          colors={colors}
          cardStyles={cardStyles}
          badgeStyles={badgeStyles}
        />

        {/* ===== Фазы ===== */}
        <View style={{ paddingTop: SPACING.md }}>
          {phases.map((phase, phaseIndex) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              phaseIndex={phaseIndex}
              phaseCount={phases.length}
              days={getDaysForPhase(phase.id)}
              allDays={allDays}
              editMode={true}
              colors={colors}
              cardStyles={cardStyles}
              badgeStyles={badgeStyles}
              onMoveUp={() => movePhase(phaseIndex, 'up')}
              onMoveDown={() => movePhase(phaseIndex, 'down')}
              onEditPhase={() => {
                setSelectedPhaseIndex(phaseIndex);
                setShowPhaseSettings(true);
              }}
              onRemovePhase={() => removePhase(phaseIndex)}
              onAddDay={() => addDayToPhase(phaseIndex)}
              onDayDragEnd={(data) => onDayDragEnd(data, phase.id)}
              onEditDaySettings={(day, flatIndex) => {
                setSelectedDay(day);
                setSelectedDayIndex(flatIndex);
                setShowDaySettings(true);
              }}
              onExerciseSettings={(day, exerciseIndex) => {
                setSelectedDay(day);
                setSelectedExercise(day.exercises?.[exerciseIndex] || null);
                setSelectedExerciseIndex(exerciseIndex);
                setShowExerciseSettings(true);
              }}
              onAddExercise={(flatIndex) => {
                setSelectedDayIndex(flatIndex);
                setShowExercisePicker(true);
              }}
              onRemoveExercise={(flatIndex, exerciseIndex) =>
                removeExercise(flatIndex, exerciseIndex)
              }
              onExerciseDragEnd={onExerciseDragEnd}
              onAddDayToWeek={(week) => addDayToPhaseWeek(phaseIndex, week)}
              onCopyTemplateToWeek={(week) => copyTemplateToWeek(phaseIndex, week)}
              onResetWeekToTemplate={(week) => resetWeekToTemplate(phaseIndex, week)}
            />
          ))}

          {/* Добавить фазу */}
          <TouchableOpacity
            onPress={addPhase}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              paddingVertical: SPACING.md,
              marginHorizontal: SPACING.lg,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.border,
              marginTop: SPACING.md,
            }}
          >
            <Text style={[typography.labelBold, { color: colors.primary }]}>
              + Добавить фазу
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Футер с кнопкой Отмена */}
      <View
        style={[
          commonStyles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[buttonStyles.secondary, { flex: 1 }]}
          onPress={handleCancel}
          disabled={saving}
        >
          <View style={buttonStyles.content}>
            <X size={20} color={colors.textPrimary} strokeWidth={2} />
            <Text style={buttonStyles.textSecondary}>Отмена</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* ===== Модалки Editor ===== */}
      <ProgramEditorModals
        showPhaseSettings={showPhaseSettings}
        setShowPhaseSettings={setShowPhaseSettings}
        selectedPhase={selectedPhaseIndex >= 0 ? phases[selectedPhaseIndex] : null}
        onSavePhaseSettings={(settings) => {
          if (selectedPhaseIndex >= 0) {
            updatePhaseSettings(selectedPhaseIndex, settings);
            setShowPhaseSettings(false);
          }
        }}
        showExerciseSettings={showExerciseSettings}
        setShowExerciseSettings={setShowExerciseSettings}
        selectedExercise={selectedExercise}
        onSaveExerciseParams={(params) => {
          if (selectedDay && selectedExerciseIndex >= 0) {
            // Находим реальный flatIndex дня
            const flatIndex = allDays.findIndex((d) => d.id === selectedDay.id);
            if (flatIndex >= 0) {
              updateExerciseParams(flatIndex, selectedExerciseIndex, params);
            }
            setShowExerciseSettings(false);
          }
        }}
        showDaySettings={showDaySettings}
        setShowDaySettings={setShowDaySettings}
        selectedDay={selectedDay}
        onSaveDaySettings={(settings) => {
          if (selectedDayIndex >= 0) {
            updateDaySettings(selectedDayIndex, settings);
            setShowDaySettings(false);
          }
        }}
        showExercisePicker={showExercisePicker}
        setShowExercisePicker={setShowExercisePicker}
        onSelectExercise={handleAddExerciseFromPicker}
        showScheduleEditor={showScheduleEditor}
        setShowScheduleEditor={setShowScheduleEditor}
        schedule={program.schedule || []}
        onSaveSchedule={(newSchedule) => {
          updateSchedule(newSchedule);
          setShowScheduleEditor(false);
        }}
        colors={colors}
        buttonStyles={buttonStyles}
        badgeStyles={badgeStyles}
      />
    </SafeAreaView>
  );
}