import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings,
  Trash2,
  Plus,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { DayCard } from './DayCard';
import { ProgramPhase, ProgramDay, ProgramExercise } from '../../services/programsService';
import { getPhaseMeta, getPhaseColor } from '../../constants/phaseTypes';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface PhaseCardProps {
  phase: ProgramPhase;
  phaseIndex: number;
  phaseCount: number;
  days: ProgramDay[];      // дни фазы (отсортированы по day_number)
  allDays: ProgramDay[];   // все дни программы (для flat-индекса DayCard)
  editMode: boolean;
  colors: any;
  cardStyles: any;
  badgeStyles: any;
  getIntensityInfo: (intensity: string) => { label: string; color: string; icon: React.ReactNode };
  // Операции с фазой
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditPhase: () => void;
  onRemovePhase: () => void;
  onAddDay: () => void;
  onDayDragEnd: (data: ProgramDay[]) => void;
  // Операции с днями/упражнениями (транзитом в DayCard, с flat-индексом)
  onEditDaySettings: (day: ProgramDay, flatIndex: number) => void;
  onExerciseSettings: (day: ProgramDay, exerciseIndex: number) => void;
  onAddExercise: (flatIndex: number) => void;
  onRemoveExercise: (flatIndex: number, exerciseIndex: number) => void;
  updateExerciseParams: (flatIndex: number, exerciseIndex: number, params: any) => void;
  onExerciseDragEnd: (flatIndex: number, data: ProgramExercise[]) => void;
}

export function PhaseCard({
  phase,
  phaseIndex,
  phaseCount,
  days,
  allDays,
  editMode,
  colors,
  cardStyles,
  badgeStyles,
  getIntensityInfo,
  onMoveUp,
  onMoveDown,
  onEditPhase,
  onRemovePhase,
  onAddDay,
  onDayDragEnd,
  onEditDaySettings,
  onExerciseSettings,
  onAddExercise,
  onRemoveExercise,
  updateExerciseParams,
  onExerciseDragEnd,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(true);

  const meta = getPhaseMeta(phase.phase_type);
  const phaseColor = getPhaseColor(phase.phase_type, colors);
  const PhaseIcon = meta.icon;

  // Flat-индекс дня в общем списке editedProgram.days (для колбэков DayCard)
  const getFlatIndex = (day: ProgramDay) => allDays.indexOf(day);

  const renderDayCard = (day: ProgramDay, drag?: () => void, isActive?: boolean) => {
    const flatIndex = getFlatIndex(day);
    return (
      <DayCard
        day={day}
        dayIndex={flatIndex}
        getIntensityInfo={getIntensityInfo}
        colors={colors}
        cardStyles={cardStyles}
        badgeStyles={badgeStyles}
        editMode={editMode}
        isActive={isActive}
        onDrag={drag}
        onEditSettings={() => onEditDaySettings(day, flatIndex)}
        onExerciseSettings={(exerciseIndex: number) => onExerciseSettings(day, exerciseIndex)}
        onAddExercise={() => onAddExercise(flatIndex)}
        onRemoveExercise={(exerciseIndex: number) => onRemoveExercise(flatIndex, exerciseIndex)}
        updateExerciseParams={updateExerciseParams}
        onExerciseDragEnd={(data) => onExerciseDragEnd(flatIndex, data)}
      />
    );
  };

  return (
    <View style={{ marginBottom: SPACING.md, marginHorizontal: SPACING.lg }}>
      {/* ===== Заголовок фазы ===== */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: phaseColor + '12',
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: phaseColor + '40',
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
        }}
      >
        {/* Раскрытие + инфо */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(!expanded);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: phaseColor + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.sm,
            }}
          >
            <PhaseIcon size={18} color={phaseColor} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
              {phase.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}>
              <Text style={[typography.captionSmall, { color: phaseColor, fontWeight: '700' }]}>
                {meta.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Calendar size={11} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  {phase.weeks_count} нед · {days.length} дн
                </Text>
              </View>
            </View>
          </View>
          {expanded ? (
            <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />
          )}
        </TouchableOpacity>

        {/* Кнопки редактирования фазы (стрелки + настройки + удаление) */}
        {editMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: SPACING.sm }}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={phaseIndex === 0}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ opacity: phaseIndex === 0 ? 0.3 : 1, padding: 4 }}
            >
              <ChevronUp size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={phaseIndex === phaseCount - 1}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ opacity: phaseIndex === phaseCount - 1 ? 0.3 : 1, padding: 4 }}
            >
              <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEditPhase}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 4 }}
            >
              <Settings size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRemovePhase}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 4 }}
            >
              <Trash2 size={16} color={colors.error} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ===== Дни фазы ===== */}
      {expanded && (
        <View style={{ marginTop: SPACING.sm }}>
          {editMode ? (
            <DraggableFlatList
              data={days}
              onDragEnd={({ data }) => onDayDragEnd(data as ProgramDay[])}
              keyExtractor={(item: ProgramDay) => item.id}
              renderItem={({ item: day, drag, isActive }) => (
                <ScaleDecorator>{renderDayCard(day, drag, isActive)}</ScaleDecorator>
              )}
              scrollEnabled={false} // скроллит внешний контейнер; drag работает по видимым дням
            />
          ) : (
            days.map(day => <View key={day.id}>{renderDayCard(day)}</View>)
          )}

          {/* Добавить день */}
          {editMode && (
            <TouchableOpacity
              onPress={onAddDay}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.xs,
                paddingVertical: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border,
                marginTop: SPACING.xs,
              }}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.labelBold, { color: colors.primary }]}>Добавить день</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}