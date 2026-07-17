import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
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
  TrendingUp,
  Minus,
  TrendingDown,
} from 'lucide-react-native';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useProgramEditor } from '../../src/hooks/useProgramEditor';
import { SPACING, GRADIENTS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { Toast } from '../../src/components/Toast';
import { useToast } from '../../src/hooks/useToast';
import { DayCard } from '../../src/components/program/DayCard';
import { ExerciseSettingsSheet } from '../../src/components/program/sheets/ExerciseSettingsSheet';
import { DaySettingsSheet } from '../../src/components/program/sheets/DaySettingsSheet';
import { ExercisePickerSheet } from '../../src/components/program/sheets/ExercisePickerSheet';
import { ScheduleEditorSheet } from '../../src/components/program/sheets/ScheduleEditorSheet';
import { ProgramDay } from '../../src/services/programsService';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { toast, showToast, hideToast } = useToast();

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
  } = useProgramEditor(id as string, userId);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'beginner':
        return { label: 'Новичок', color: '#4CAF50', icon: <Sprout size={16} color="#4CAF50" strokeWidth={1.5} /> };
      case 'intermediate':
        return { label: 'Средний', color: '#FF9800', icon: <Dumbbell size={16} color="#FF9800" strokeWidth={1.5} /> };
      case 'advanced':
        return { label: 'Продвинутый', color: '#F44336', icon: <Flame size={16} color="#F44336" strokeWidth={1.5} /> };
      default:
        return { label: level, color: colors.textSecondary, icon: <Dumbbell size={16} color={colors.textSecondary} strokeWidth={1.5} /> };
    }
  };

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return { label: 'Высокая', color: '#F44336', icon: <TrendingUp size={12} color="#F44336" strokeWidth={2} /> };
      case 'medium':
        return { label: 'Средняя', color: '#FFC107', icon: <Minus size={12} color="#FFC107" strokeWidth={2} /> };
      case 'low':
        return { label: 'Низкая', color: '#4CAF50', icon: <TrendingDown size={12} color="#4CAF50" strokeWidth={2} /> };
      default:
        return { label: intensity, color: colors.textSecondary, icon: <Minus size={12} color={colors.textSecondary} strokeWidth={2} /> };
    }
  };

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
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 100 }]}>
          Программа не найдена
        </Text>
      </View>
    );
  }

  const displayProgram = editMode && editedProgram ? editedProgram : program;
  const levelInfo = getLevelInfo(displayProgram.level);

  const renderListHeader = () => (
    <LinearGradient
      colors={GRADIENTS.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: SPACING.xl + 10, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}
    >
      <FadeIn>
        <Text style={[typography.h3, { color: 'white', marginBottom: SPACING.sm }]}>
          {displayProgram.name}
        </Text>
        <Text style={[typography.body, { color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.lg }]}>
          {displayProgram.description}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
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
            <Text style={badgeStyles.metaBadgeText}>{displayProgram.schedule.length} дн/нед</Text>
          </View>
        </View>
        <View style={cardStyles.scheduleBlock}>
          <View style={cardStyles.scheduleHeader}>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', fontWeight: '600' }]}>
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
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ flex: 1 }}>
        {editMode ? (
          <DraggableFlatList
            data={displayProgram.days || []}
            onDragEnd={({ data }) => onDayDragEnd(data as ProgramDay[])}
            keyExtractor={(item: ProgramDay) => item.id}
            renderItem={({ item: day, drag, isActive }) => {
              const dayIndex = (displayProgram.days || []).indexOf(day);
              return (
                <ScaleDecorator>
                  <DayCard
                    day={day}
                    dayIndex={dayIndex}
                    getIntensityInfo={getIntensityInfo}
                    colors={colors}
                    cardStyles={cardStyles}
                    badgeStyles={badgeStyles}
                    editMode={editMode}
                    isActive={isActive}
                    onDrag={drag}
                    onEditSettings={() => {
                      setSelectedDay(day);
                      setSelectedDayIndex(dayIndex);
                      setShowDaySettings(true);
                    }}
                    onExerciseSettings={(exerciseIndex: number) => {
                      if (day.exercises) {
                        setSelectedExercise(day.exercises[exerciseIndex]);
                        setSelectedExerciseIndex(exerciseIndex);
                        setShowExerciseSettings(true);
                      }
                    }}
                    onAddExercise={() => addExercise(dayIndex)}
                    onRemoveExercise={(exerciseIndex: number) => removeExercise(dayIndex, exerciseIndex)}
                    updateExerciseParams={updateExerciseParams}
                    onExerciseDragEnd={(data) => onExerciseDragEnd(dayIndex, data)}
                  />
                </ScaleDecorator>
              );
            }}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : (
          <FlatList
            data={displayProgram.days || []}
            keyExtractor={(item: ProgramDay) => item.id}
            renderItem={({ item: day }) => {
              const dayIndex = (displayProgram.days || []).indexOf(day);
              return (
                <FadeIn key={day.id} delay={dayIndex * 80}>
                  <DayCard
                    day={day}
                    dayIndex={dayIndex}
                    getIntensityInfo={getIntensityInfo}
                    colors={colors}
                    cardStyles={cardStyles}
                    badgeStyles={badgeStyles}
                    editMode={editMode}
                    onEditSettings={() => {
                      setSelectedDay(day);
                      setSelectedDayIndex(dayIndex);
                      setShowDaySettings(true);
                    }}
                    onExerciseSettings={(exerciseIndex: number) => {
                      if (day.exercises) {
                        setSelectedExercise(day.exercises[exerciseIndex]);
                        setSelectedExerciseIndex(exerciseIndex);
                        setShowExerciseSettings(true);
                      }
                    }}
                    onAddExercise={() => addExercise(dayIndex)}
                    onRemoveExercise={(exerciseIndex: number) => removeExercise(dayIndex, exerciseIndex)}
                    updateExerciseParams={updateExerciseParams}
                  />
                </FadeIn>
              );
            }}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={<View style={{ height: 100 }} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}
      </View>

      {/* Футер с кнопками */}
      <View style={[commonStyles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
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
            style={[buttonStyles.primary, buttonStyles.large, { flex: editMode ? 2 : 1, backgroundColor: editMode ? colors.success : colors.primary }]}
            onPress={editMode ? saveProgram : handleStartProgram}
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

      {/* FAB Кнопка редактирования */}
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

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      {/* Модалки */}
      <Modal visible={showExerciseSettings} transparent animationType="slide" onRequestClose={() => setShowExerciseSettings(false)}>
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

      <Modal visible={showDaySettings} transparent animationType="slide" onRequestClose={() => setShowDaySettings(false)}>
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

      <Modal visible={showExercisePicker} transparent animationType="slide" onRequestClose={() => { setShowExercisePicker(false); setExerciseSearch(''); }}>
        <ExercisePickerSheet
          searchQuery={exerciseSearch}
          onSearchChange={setExerciseSearch}
          exercises={availableExercises}
          loading={loadingExercises}
          onLoadExercises={loadAvailableExercises}
          onSelectExercise={handleAddExerciseFromPicker}
          onClose={() => { setShowExercisePicker(false); setExerciseSearch(''); }}
          colors={colors}
          badgeStyles={badgeStyles}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showSortSheet={showSortSheet}
          setShowSortSheet={setShowSortSheet}
        />
      </Modal>

      <Modal visible={showScheduleEditor} transparent animationType="slide" onRequestClose={() => setShowScheduleEditor(false)}>
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
    </SafeAreaView>
  );
}