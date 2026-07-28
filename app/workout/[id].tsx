import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  Dumbbell,
  Flame,
  Clock,
  Calendar,
  Play,
  Pencil,
  X,
  Save,
  Plus,
  TrendingUp,
  Minus,
  TrendingDown,
  Share2,
} from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProgramEditor } from '../../src/hooks/useProgramEditor';
import { SPACING, GRADIENTS, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { Toast } from '../../src/components/Toast';
import { useToast } from '../../src/hooks/useToast';
import { LEVEL_COLORS } from '../../src/constants/semanticColors';
import { PhaseCard } from '../../src/components/program/PhaseCard';
import { ExerciseSettingsSheet } from '../../src/components/program/sheets/ExerciseSettingsSheet';
import { DaySettingsSheet } from '../../src/components/program/sheets/DaySettingsSheet';
import { ExercisePickerSheet } from '../../src/components/program/sheets/ExercisePickerSheet';
import { ScheduleEditorSheet } from '../../src/components/program/sheets/ScheduleEditorSheet';
import { PhaseSettingsSheet } from '../../src/components/program/sheets/PhaseSettingsSheet';
import { ShareProgramSheet } from '../../src/components/program/sheets/ShareProgramSheet';
import { generateShareCode, formatShareCode } from '../../src/services/programSharingService';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const queryClient = useQueryClient();

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
    addPhase,
    removePhase,
    updatePhaseSettings,
    movePhase,
    addDayToPhase,
    getDaysForPhase,
    copyTemplateToWeek,
    resetWeekToTemplate,
    addDayToPhaseWeek,
    updateExerciseParams,
    updateDaySettings,
    updateSchedule,
    onExerciseDragEnd,
    onDayDragEnd,
    addExercise,
    removeExercise,
    loadAvailableExercises,
    handleAddExerciseFromPicker,
  } = useProgramEditor(id as string, userId);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  // ===== Шаринг по коду =====
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // ===== Старт программы =====
  // ✅ После старта инвалидируем кэши списков, чтобы «Тренировки» и «Dashboard»
  //    подтянули свежие данные сразу, а не только при ручном pull-to-refresh.
  //    Тост даёт явный сигнал, что программа начата.
  const onStartProgram = useCallback(async () => {
    try {
      await handleStartProgram();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['userPrograms'] }),
        queryClient.invalidateQueries({ queryKey: ['programs'] }),
      ]);

      showToast('Программа начата', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Не удалось начать программу', 'error');
    }
  }, [handleStartProgram, queryClient, showToast]);

  const getLevelInfo = (level: string) => {
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
  };

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
    [colors]
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

  // ===== Действия шаринга =====
  const openShare = async () => {
    setShowShareModal(true);

    if (shareCode) return;

    setShareLoading(true);

    try {
      const code = await generateShareCode(program.id);
      setShareCode(code);
    } catch (e: any) {
      showToast(e.message || 'Не удалось создать код', 'error');
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

  const renderHero = () => (
    <LinearGradient
      colors={GRADIENTS.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: SPACING.xl + 10,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
      }}
    >
      <FadeIn>
        <Text style={[typography.h3, { color: 'white', marginBottom: SPACING.sm }]}>
          {displayProgram.name}
        </Text>
        <Text
          style={[
            typography.body,
            { color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.lg },
          ]}
        >
          {displayProgram.description}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACING.sm,
            marginBottom: SPACING.lg,
          }}
        >
          <View style={badgeStyles.metaBadge}>
            {levelInfo.icon}
            <Text style={badgeStyles.metaBadgeText}>{levelInfo.label}</Text>
          </View>

          <View style={badgeStyles.metaBadge}>
            <Clock size={14} color="white" strokeWidth={1.5} />
            <Text style={badgeStyles.metaBadgeText}>{displayProgram.duration} недель</Text>
          </View>

          <View style={badgeStyles.metaBadge}>
            <Calendar size={14} color="white" strokeWidth={1.5} />
            <Text style={badgeStyles.metaBadgeText}>
              {displayProgram.schedule.length} дн/нед
            </Text>
          </View>
        </View>

        <View style={cardStyles.scheduleBlock}>
          <View style={cardStyles.scheduleHeader}>
            <Text
              style={[
                typography.caption,
                { color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
              ]}
            >
              Расписание:
            </Text>

            {editMode && (
              <TouchableOpacity
                onPress={() => setShowScheduleEditor(true)}
                style={cardStyles.scheduleEditButton}
                activeOpacity={0.7}
              >
                <Pencil size={16} color="white" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {displayProgram.schedule.map((day, idx) => (
              <View key={idx} style={badgeStyles.dayChip}>
                <Text style={badgeStyles.dayChipText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </FadeIn>
    </LinearGradient>
  );

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
        {renderHero()}

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
              <Text style={[typography.labelBold, { color: colors.primary }]}>
                Добавить фазу
              </Text>
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
            onPress={editMode ? saveProgram : onStartProgram}
            disabled={saving || starting}
            activeOpacity={0.8}
          >
            {saving || starting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View style={buttonStyles.content}>
                {editMode ? (
                  <>
                    <Save size={20} color="white" strokeWidth={2} />
                    <Text style={buttonStyles.textPrimary}>Сохранить</Text>
                  </>
                ) : (
                  <>
                    <Play size={20} color="white" strokeWidth={2} fill="white" />
                    <Text style={buttonStyles.textPrimary}>Начать программу</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* FAB «Поделиться» (только вне режима редактирования) */}
      {!editMode && (
        <TouchableOpacity
          onPress={openShare}
          style={{
            position: 'absolute',
            top: SPACING.xl + 35 + 52,
            right: SPACING.lg,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <Share2 size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* FAB редактирования */}
      <TouchableOpacity
        onPress={toggleEditMode}
        style={{
          position: 'absolute',
          top: SPACING.xl + 35,
          right: SPACING.lg,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        {editMode ? (
          <X size={20} color={colors.error} strokeWidth={2} />
        ) : (
          <Pencil size={20} color={colors.primary} strokeWidth={2} />
        )}
      </TouchableOpacity>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* ===== Модалки ===== */}
      <Modal
        visible={showPhaseSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhaseSettings(false)}
      >
        <PhaseSettingsSheet
          phase={selectedPhaseIndex >= 0 ? phases[selectedPhaseIndex] : null}
          colors={colors}
          buttonStyles={buttonStyles}
          onSave={(settings) => {
            if (selectedPhaseIndex >= 0) {
              updatePhaseSettings(selectedPhaseIndex, settings);
              showToast('Настройки фазы сохранены (не забудьте сохранить программу)', 'success');
            }
            setShowPhaseSettings(false);
          }}
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
          onSave={(params) => {
            if (selectedExercise && selectedDayIndex >= 0 && selectedExerciseIndex >= 0) {
              updateExerciseParams(selectedDayIndex, selectedExerciseIndex, params);
              showToast('Параметры обновлены', 'success');
            }
            setShowExerciseSettings(false);
          }}
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
          onSave={(settings) => {
            if (selectedDayIndex >= 0) {
              updateDaySettings(selectedDayIndex, settings);
              showToast('Настройки дня сохранены', 'success');
            }
            setShowDaySettings(false);
          }}
          onClose={() => setShowDaySettings(false)}
        />
      </Modal>

      <Modal
        visible={showExercisePicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowExercisePicker(false);
          setExerciseSearch('');
        }}
      >
        <ExercisePickerSheet
          searchQuery={exerciseSearch}
          onSearchChange={setExerciseSearch}
          exercises={availableExercises}
          loading={loadingExercises}
          onLoadExercises={loadAvailableExercises}
          onSelectExercise={handleAddExerciseFromPicker}
          onClose={() => {
            setShowExercisePicker(false);
            setExerciseSearch('');
          }}
          colors={colors}
          badgeStyles={badgeStyles}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showSortSheet={showSortSheet}
          setShowSortSheet={setShowSortSheet}
        />
      </Modal>

      <Modal
        visible={showScheduleEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleEditor(false)}
      >
        <ScheduleEditorSheet
          schedule={editedProgram?.schedule || []}
          onSave={(newSchedule) => {
            updateSchedule(newSchedule);
            showToast('Расписание обновлено (не забудьте сохранить программу)', 'success');
            setShowScheduleEditor(false);
          }}
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
          programName={program.name}
          onShare={shareViaSystem}
          onClose={() => setShowShareModal(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}