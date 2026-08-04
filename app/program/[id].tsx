import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  Dumbbell,
  Flame,
  Play,
  Save,
  Plus,
  TrendingUp,
  Minus,
  TrendingDown,
} from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProgramEditor } from '../../src/hooks/useProgramEditor';
import { mapError } from '../../src/utils/errorMapper';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { ListSkeleton } from '../../src/components/Skeleton';
import { Toast } from '../../src/components/Toast';
import { useToast } from '../../src/hooks/useToast';
import { LEVEL_COLORS } from '../../src/constants/semanticColors';
import { PhaseCard } from '../../src/components/program/PhaseCard';
import { ProgramHero } from '../../src/components/program/ProgramHero';
import { ProgramFabs } from '../../src/components/program/ProgramFabs';
import { ProgramDetailModals } from '../../src/components/program/ProgramDetailModals';
import { generateShareCode, formatShareCode } from '../../src/services/programSharingService';

// Светлый цвет поверх НЕтемизируемых цветных фонов (кнопки «Сохранить»/«Начать»
// в футере). Обоснование — см. ProgramHero.tsx.
const ON_COLOR = '#FFFFFF';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { toast, showToast, hideToast } = useToast();

  // Фабрики стилей — через useMemo (правило доки: никогда не пересоздавать в теле).
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const badgeStyles = useMemo(() => createBadgeStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  // Мёртвый слой пикера (exerciseSearch/availableExercises/loadAvailableExercises/
  // sortBy/showSortSheet) НЕ деструктурируем: пикер самодостаточен на useExercises.
  const {
    program,
    editedProgram,
    setEditedProgram,
    loading,
    starting,
    saving,
    editMode,
    setEditMode,
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
    // Фазы
    addPhase,
    removePhase,
    updatePhaseSettings,
    movePhase,
    addDayToPhase,
    getDaysForPhase,
    copyTemplateToWeek,
    resetWeekToTemplate,
    addDayToPhaseWeek,
    // Дни / упражнения
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    onDayDragEnd,
    addExercise,
    removeExercise,
    handleAddExerciseFromPicker,
  } = useProgramEditor(id as string, userId);

  // ===== Шаринг по коду =====
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const getLevelInfo = useCallback(
    (level: string) => {
      switch (level) {
        case 'beginner':
          return {
            label: 'Новичок',
            color: LEVEL_COLORS.beginner,
            icon: <Sprout size={16} color={LEVEL_COLORS.beginner} strokeWidth={1.5} />,
          };
        case 'intermediate':
          return {
            label: 'Средний',
            color: LEVEL_COLORS.intermediate,
            icon: <Dumbbell size={16} color={LEVEL_COLORS.intermediate} strokeWidth={1.5} />,
          };
        case 'advanced':
          return {
            label: 'Продвинутый',
            color: LEVEL_COLORS.advanced,
            icon: <Flame size={16} color={LEVEL_COLORS.advanced} strokeWidth={1.5} />,
          };
        default:
          return {
            label: level,
            color: colors.textSecondary,
            icon: <Dumbbell size={16} color={colors.textSecondary} strokeWidth={1.5} />,
          };
      }
    },
    [colors],
  );

  const getIntensityInfo = useCallback(
    (intensity: string) => {
      switch (intensity) {
        case 'high':
          return {
            label: 'Высокая',
            color: colors.error,
            icon: <TrendingUp size={12} color={colors.error} strokeWidth={2} />,
          };
        case 'medium':
          return {
            label: 'Средняя',
            color: colors.warning,
            icon: <Minus size={12} color={colors.warning} strokeWidth={2} />,
          };
        case 'low':
          return {
            label: 'Низкая',
            color: colors.success,
            icon: <TrendingDown size={12} color={colors.success} strokeWidth={2} />,
          };
        default:
          return {
            label: intensity,
            color: colors.textSecondary,
            icon: <Minus size={12} color={colors.textSecondary} strokeWidth={2} />,
          };
      }
    },
    [colors],
  );

  if (loading) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: 'center', marginTop: 100 },
          ]}
        >
          Программа не найдена
        </Text>
      </View>
    );
  }

  const displayProgram = editMode && editedProgram ? editedProgram : program;
  const levelInfo = getLevelInfo(displayProgram.level);
  const phases = displayProgram.phases || [];
  const allDays = displayProgram.days || [];

  // ===== Действия шаринга (program сужен до non-null) =====
const openShare = async () => {
  setShowShareModal(true);
  if (shareCode) return;
  setShareLoading(true);
  try {
    const code = await generateShareCode(program.id);
    setShareCode(code);
  } catch (e: any) {
    console.error('[program] generateShareCode:', e);
    showToast(mapError(e), 'error');
  } finally {
    setShareLoading(false);
  }
};

  const shareViaSystem = () => {
    if (!shareCode) return;
    const formatted = formatShareCode(shareCode);
    Share.share({
      message: `Моя программа «${program.name}» в FitTracker. Код для импорта: ${formatted}`,
      title: 'Поделиться программой',
    }).catch(() => {});
  };

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgramHero
          programName={displayProgram.name}
          programDescription={displayProgram.description}
          duration={displayProgram.duration}
          schedule={displayProgram.schedule}
          levelInfo={levelInfo}
          editMode={editMode}
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
              editMode={editMode}
              colors={colors}
              cardStyles={cardStyles}
              badgeStyles={badgeStyles}
              getIntensityInfo={getIntensityInfo}
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
                if (day.exercises) {
                  const flatIndex = allDays.indexOf(day);
                  setSelectedDay(day);
                  setSelectedDayIndex(flatIndex);
                  setSelectedExercise(day.exercises[exerciseIndex]);
                  setSelectedExerciseIndex(exerciseIndex);
                  setShowExerciseSettings(true);
                }
              }}
              onAddExercise={(flatIndex) => addExercise(flatIndex)}
              onRemoveExercise={(flatIndex, exerciseIndex) =>
                removeExercise(flatIndex, exerciseIndex)
              }
              updateExerciseParams={updateExerciseParams}
              onExerciseDragEnd={(flatIndex, data) => onExerciseDragEnd(flatIndex, data)}
              onAddDayToWeek={(week) => addDayToPhaseWeek(phaseIndex, week)}
              onCopyTemplateToWeek={(week) => copyTemplateToWeek(phaseIndex, week)}
              onResetWeekToTemplate={(week) => resetWeekToTemplate(phaseIndex, week)}
            />
          ))}

          {/* Добавить фазу (только в режиме редактирования) */}
          {editMode && (
            <TouchableOpacity
              onPress={addPhase}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.xs,
                marginHorizontal: SPACING.lg,
                marginTop: SPACING.xs,
                marginBottom: SPACING.md,
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.primary,
                backgroundColor: colors.primary + '08',
              }}
            >
              <Plus size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.labelBold, { color: colors.primary }]}>Добавить фазу</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Футер с кнопками */}
      <View
        style={[
          commonStyles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          {editMode && (
            <TouchableOpacity
              style={[buttonStyles.secondary, { flex: 1 }]}
              onPress={() => {
                setEditMode(false);
                setEditedProgram(program);
                setDeletedExerciseIds([]);
              }}
            >
              <Text style={buttonStyles.textSecondary}>Отмена</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              buttonStyles.primary,
              buttonStyles.large,
              {
                flex: editMode ? 2 : 1,
                backgroundColor: editMode ? colors.success : colors.primary,
              },
            ]}
            onPress={editMode ? saveProgram : handleStartProgram}
            disabled={saving || starting}
            activeOpacity={0.8}
          >
            {saving || starting ? (
              <ActivityIndicator color={ON_COLOR} size="small" />
            ) : (
              <View style={buttonStyles.content}>
                {editMode ? (
                  <>
                    <Save size={20} color={ON_COLOR} strokeWidth={2} />
                    <Text style={buttonStyles.textPrimary}>Сохранить</Text>
                  </>
                ) : (
                  <>
                    <Play size={20} color={ON_COLOR} strokeWidth={2} fill={ON_COLOR} />
                    <Text style={buttonStyles.textPrimary}>Начать программу</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ProgramFabs
        editMode={editMode}
        onOpenShare={openShare}
        onToggleEditMode={toggleEditMode}
        colors={colors}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* ===== Модалки (вынесены в ProgramDetailModals) ===== */}
      <ProgramDetailModals
        showPhaseSettings={showPhaseSettings}
        setShowPhaseSettings={setShowPhaseSettings}
        selectedPhase={selectedPhaseIndex >= 0 ? phases[selectedPhaseIndex] : null}
        onSavePhaseSettings={(settings) => {
          if (selectedPhaseIndex >= 0) {
            updatePhaseSettings(selectedPhaseIndex, settings);
            showToast('Настройки фазы сохранены (не забудьте сохранить программу)', 'success');
          }
          setShowPhaseSettings(false);
        }}
        showExerciseSettings={showExerciseSettings}
        setShowExerciseSettings={setShowExerciseSettings}
        selectedExercise={selectedExercise}
        onSaveExerciseParams={(params) => {
          if (selectedExercise && selectedDayIndex >= 0 && selectedExerciseIndex >= 0) {
            updateExerciseParams(selectedDayIndex, selectedExerciseIndex, params);
            showToast('Параметры обновлены', 'success');
          }
          setShowExerciseSettings(false);
        }}
        showDaySettings={showDaySettings}
        setShowDaySettings={setShowDaySettings}
        selectedDay={selectedDay}
        onSaveDaySettings={(settings) => {
          if (selectedDayIndex >= 0) {
            updateDaySettings(selectedDayIndex, settings);
            showToast('Настройки дня сохранены', 'success');
          }
          setShowDaySettings(false);
        }}
        showExercisePicker={showExercisePicker}
        setShowExercisePicker={setShowExercisePicker}
        onSelectExercise={handleAddExerciseFromPicker}
        showScheduleEditor={showScheduleEditor}
        setShowScheduleEditor={setShowScheduleEditor}
        schedule={editedProgram?.schedule || []}
        onSaveSchedule={(newSchedule) => {
          updateSchedule(newSchedule);
          showToast('Расписание обновлено (не забудьте сохранить программу)', 'success');
          setShowScheduleEditor(false);
        }}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        shareCode={shareCode}
        shareLoading={shareLoading}
        programName={program.name}
        onShareViaSystem={shareViaSystem}
        colors={colors}
        buttonStyles={buttonStyles}
        badgeStyles={badgeStyles}
      />
    </SafeAreaView>
  );
}