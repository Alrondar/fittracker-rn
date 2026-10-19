import { memo, useMemo, useState } from 'react';
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
import { ScaleDecorator, NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import { DayCard } from './DayCard';
import { ProgramPhase, ProgramDay } from '../../services/programsService';
import type { EditorActions } from '../../hooks/useProgramEditorRows';
import { getPhaseMeta, getPhaseColor } from '../../constants/phaseTypes';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';

interface PhaseCardProps {
  phase: ProgramPhase;
  /** Дни фазы — стабильный массив см. useDaysByPhase (FZ-5). */
  days: ProgramDay[];
  editMode: boolean;
  colors: any;
  cardStyles: any;
  /** Действия редактора; один неизменный объект на все строки (FZ-5). */
  actions: EditorActions;
  /** Drag handle от DraggableFlatList (edit.tsx). */
  onDrag?: () => void;
  /** Активен ли drag сейчас. */
  isActive?: boolean;
}

export const PhaseCard = memo(function PhaseCard({
  phase,
  days,
  editMode,
  colors,
  cardStyles,
  actions,
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
  // FZ-5: дни долой из рендера — раньше filter+sort×2 гонялись на каждую
  // перерисовку экрана, включая открытие шторки и смену выбранного дня.
  const { weekDays, templateDays } = useMemo(() => {
    const all = days;
    return {
      weekDays: all.filter((d) => (d.week_number ?? 1) === selectedWeek).sort(sortByDay),
      templateDays: all.filter((d) => (d.week_number ?? 1) === 1).sort(sortByDay),
    };
  }, [days, selectedWeek]);
  const isOverridden = selectedWeek === 1 || weekDays.length > 0;
  const displayDays = isOverridden ? weekDays : templateDays;
  const isInherited = !isOverridden;
  const canEditDays = editMode && isOverridden;

  const renderDayCard = (day: ProgramDay, drag?: () => void, isDayActive?: boolean) => (
    <DayCard
      day={day}
      colors={colors}
      cardStyles={cardStyles}
      editMode={canEditDays}
      isActive={isDayActive}
      onDrag={drag}
      actions={actions}
    />
  );

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
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
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
          <View style={{ flex: 1 }}>
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
              onPress={() => actions.editPhase(phase.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ padding: 4 }}
            >
              <Settings size={16} color={colors.primary} strokeWidth={2} />
            </PressableScale>
            <PressableScale
              onPress={() => actions.removePhase(phase.id)}
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
              {editMode && (
                <PressableScale
                  onPress={() => actions.copyTemplateToWeek(phase.id, selectedWeek)}
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
          {isOverridden && selectedWeek > 1 && editMode && (
            <PressableScale
              onPress={() => actions.resetWeekToTemplate(phase.id, selectedWeek)}
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

          {/* Дни */}
          {canEditDays ? (
            <NestableDraggableFlatList
              data={displayDays}
              onDragEnd={({ data }) => actions.dayDragEnd(data as ProgramDay[], phase.id)}
              keyExtractor={(item: ProgramDay) => item.id}
              renderItem={({ item: day, drag, isActive }) => (
                <ScaleDecorator>{renderDayCard(day, drag, isActive)}</ScaleDecorator>
              )}
            />
          ) : (
            displayDays.map((day) => <View key={day.id}>{renderDayCard(day)}</View>)
          )}

          {/* Добавить день (только для переопределённой недели) */}
          {canEditDays && (
            <PressableScale
              onPress={() => actions.addDayToWeek(phase.id, selectedWeek)}
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
});
