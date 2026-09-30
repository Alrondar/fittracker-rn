import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { PressableScale } from '../ui/PressableScale';
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Plus,
  Calendar,
  Copy,
  RotateCcw,
  GripVertical,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// WEB-3b: ReorderList = NestableDraggableFlatList на нативе, long-press drag на вебе.
import { ReorderList, RowDecorator } from './ReorderList';
import { DayCard } from './DayCard';
import { ProgramPhase, ProgramDay, ProgramExercise } from '../../services/programsService';
import { getPhaseMeta, getPhaseColor } from '../../constants/phaseTypes';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface PhaseCardProps {
  phase: ProgramPhase;
  phaseIndex: number;
  phaseCount: number;
  days: ProgramDay[];
  allDays: ProgramDay[];
  editMode: boolean;
  colors: any;
  cardStyles: any;
  badgeStyles: any;
  /** @deprecated Фазы теперь перетаскиваются через DraggableFlatList в edit.tsx. Пропсы оставлены для обратной совместимости. */
  onMoveUp?: () => void;
  /** @deprecated Фазы теперь перетаскиваются через DraggableFlatList в edit.tsx. Пропсы оставлены для обратной совместимости. */
  onMoveDown?: () => void;
  onEditPhase: () => void;
  onRemovePhase: () => void;
  onAddDay: () => void;
  onAddDayToWeek?: (week: number) => void;
  onCopyTemplateToWeek?: (week: number) => void;
  onResetWeekToTemplate?: (week: number) => void;
  onDayDragEnd: (data: ProgramDay[]) => void;
  onEditDaySettings: (day: ProgramDay, flatIndex: number) => void;
  onExerciseSettings: (day: ProgramDay, exerciseIndex: number) => void;
  onAddExercise: (flatIndex: number) => void;
  onRemoveExercise: (flatIndex: number, exerciseIndex: number) => void;
  onExerciseDragEnd: (flatIndex: number, data: ProgramExercise[]) => void;
  /** Drag handle от DraggableFlatList (edit.tsx). */
  onDrag?: () => void;
  /** Активен ли drag сейчас. */
  isActive?: boolean;
}

export function PhaseCard({
  phase,
  phaseIndex: _phaseIndex,
  phaseCount: _phaseCount,
  days,
  allDays,
  editMode,
  colors,
  cardStyles,
  badgeStyles,
  onEditPhase,
  onRemovePhase,
  onAddDay,
  onAddDayToWeek,
  onCopyTemplateToWeek,
  onResetWeekToTemplate,
  onDayDragEnd,
  onEditDaySettings,
  onExerciseSettings,
  onAddExercise,
  onRemoveExercise,
  onExerciseDragEnd,
  onDrag,
  isActive,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const meta = getPhaseMeta(phase.phase_type);
  const phaseColor = getPhaseColor(phase.phase_type, colors);
  const PhaseIcon = meta.icon;
  const weeksCount = phase.weeks_count || 1;

  const sortByDay = (a: ProgramDay, b: ProgramDay) => (a.day_number || 0) - (b.day_number || 0);
  const weekDays = days.filter((d) => (d.week_number ?? 1) === selectedWeek).sort(sortByDay);
  const templateDays = days.filter((d) => (d.week_number ?? 1) === 1).sort(sortByDay);
  const isOverridden = selectedWeek === 1 || weekDays.length > 0;
  const displayDays = isOverridden ? weekDays : templateDays;
  const isInherited = !isOverridden;
  const canEditDays = editMode && isOverridden;

  const getFlatIndex = (day: ProgramDay) => allDays.indexOf(day);

  const renderDayCard = (day: ProgramDay, drag?: () => void, isActive?: boolean) => {
    const flatIndex = getFlatIndex(day);
    return (
      <DayCard
        day={day}
        dayIndex={flatIndex}
        colors={colors}
        cardStyles={cardStyles}
        badgeStyles={badgeStyles}
        editMode={canEditDays}
        isActive={isActive}
        onDrag={drag}
        onEditSettings={() => onEditDaySettings(day, flatIndex)}
        onExerciseSettings={(exerciseIndex: number) => onExerciseSettings(day, exerciseIndex)}
        onAddExercise={() => onAddExercise(flatIndex)}
        onRemoveExercise={(exerciseIndex: number) => onRemoveExercise(flatIndex, exerciseIndex)}
        onExerciseDragEnd={(data) => onExerciseDragEnd(flatIndex, data)}
      />
    );
  };

  return (
    <View style={{ marginBottom: SPACING.md, marginHorizontal: SPACING.lg }}>
      {/* Заголовок фазы */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: withAlpha(phaseColor, 0.071),
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: withAlpha(phaseColor, 0.251),
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
        }}
      >
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(!expanded);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
          haptic="none"
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: withAlpha(phaseColor, 0.125),
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.sm,
            }}
          >
            <PhaseIcon size={18} color={phaseColor} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
              {phase.name}
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}
            >
              <Text style={[typography.captionSmall, { color: phaseColor, fontWeight: '700' }]}>
                {meta.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Calendar size={11} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                  {weeksCount} нед · {templateDays.length} дн
                </Text>
              </View>
            </View>
          </View>
          {expanded ? (
            <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />
          )}
        </PressableScale>

        {editMode && (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: SPACING.sm }}
          >
            {onDrag && (
              <PressableScale
                onLongPress={onDrag}
                delayLongPress={150}
                disabled={isActive}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ padding: 4, opacity: isActive ? 0.5 : 1 }}
                accessibilityLabel="Перетащить фазу"
                accessibilityRole="button"
              >
                <GripVertical size={18} color={colors.textSecondary} strokeWidth={2} />
              </PressableScale>
            )}
            <PressableScale
              onPress={onEditPhase}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 4 }}
            >
              <Settings size={16} color={colors.primary} strokeWidth={2} />
            </PressableScale>
            <PressableScale
              onPress={onRemovePhase}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 4 }}
            >
              <Trash2 size={16} color={colors.error} strokeWidth={2} />
            </PressableScale>
          </View>
        )}
      </View>

      {expanded && (
        <View style={{ marginTop: SPACING.sm }}>
          {/* Селектор недель */}
          {weeksCount > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: SPACING.sm }}
            >
              <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
                {Array.from({ length: weeksCount }, (_, i) => i + 1).map((w) => {
                  const wOverridden = w === 1 || days.some((d) => (d.week_number ?? 1) === w);
                  const isSelected = selectedWeek === w;
                  return (
                    <PressableScale
                      key={w}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedWeek(w);
                      }}
                      style={{
                        paddingHorizontal: SPACING.md,
                        paddingVertical: SPACING.xs,
                        borderRadius: BORDER_RADIUS.md,
                        borderWidth: 1.5,
                        borderColor: isSelected ? phaseColor : colors.border,
                        backgroundColor: isSelected ? withAlpha(phaseColor, 0.094) : colors.surface,
                      }}
                      haptic="none"
                    >
                      <Text
                        style={[
                          typography.captionSmall,
                          {
                            color: isSelected ? phaseColor : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        Нед {w}
                        {wOverridden && w !== 1 ? ' •' : ''}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Баннер наследования */}
          {isInherited && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: withAlpha(colors.warning, 0.071),
                borderRadius: BORDER_RADIUS.md,
                padding: SPACING.sm,
                marginBottom: SPACING.sm,
              }}
            >
              <Text style={[typography.captionSmall, { color: colors.warning, flex: 1 }]}>
                Неделя {selectedWeek} использует шаблон недели 1
              </Text>
              {editMode && onCopyTemplateToWeek && (
                <PressableScale
                  onPress={() => onCopyTemplateToWeek(selectedWeek)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Copy size={14} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}
                  >
                    Переопределить
                  </Text>
                </PressableScale>
              )}
            </View>
          )}

          {/* Сброс к шаблону */}
          {isOverridden && selectedWeek > 1 && editMode && onResetWeekToTemplate && (
            <PressableScale
              onPress={() => onResetWeekToTemplate(selectedWeek)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginBottom: SPACING.sm,
              }}
            >
              <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                Сбросить к шаблону
              </Text>
            </PressableScale>
          )}

          {/* Дни (web: long-press drag, WEB-3b) */}
          {canEditDays ? (
            <ReorderList
              data={displayDays}
              onDragEnd={({ data }) => onDayDragEnd(data as ProgramDay[])}
              keyExtractor={(item: ProgramDay) => item.id}
              renderItem={({ item: day, drag, isActive }) => (
                <RowDecorator>{renderDayCard(day, drag, isActive)}</RowDecorator>
              )}
            />
          ) : (
            displayDays.map((day) => <View key={day.id}>{renderDayCard(day)}</View>)
          )}

          {/* Добавить день (только для переопределённой недели) */}
          {canEditDays && (
            <PressableScale
              onPress={() => (onAddDayToWeek ? onAddDayToWeek(selectedWeek) : onAddDay())}
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
            </PressableScale>
          )}
        </View>
      )}
    </View>
  );
}
