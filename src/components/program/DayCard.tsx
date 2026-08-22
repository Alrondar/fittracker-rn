import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Settings,
  Trash2,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { ProgramDay, ProgramExercise } from '../../services/programsService';
import { createCardStyles } from '../../styles/components/card';
import { createBadgeStyles } from '../../styles/components/badge';
import { getMuscleColor } from '../../constants/muscleColors';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

// Мост к данным мышц из join exercises. Локальный опциональный тип: компонент
// компилируется и работает ДО того, как primary_muscles придёт из БД.
type MusclesHolder = { primary_muscles?: string[] };

// Компактные цветные баблы мышц для строки упражнения. Лимит 3 + «+N».
function ExerciseMuscles({ muscles, colors }: { muscles: string[]; colors: any }) {
  if (muscles.length === 0) return null;
  const shown = muscles.slice(0, 3);
  const extra = muscles.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {shown.map((m, i) => {
        const c = getMuscleColor(m);
        return (
          <View
            key={`m-${i}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c + '1A',
              borderWidth: 1,
              borderColor: c + '55',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: BORDER_RADIUS.full,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: c,
                marginRight: 4,
              }}
            />
            <Text style={[typography.captionSmall, { color: c, fontWeight: '700', fontSize: 10 }]}>
              {m}
            </Text>
          </View>
        );
      })}
      {extra > 0 && (
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: BORDER_RADIUS.full,
          }}
        >
          <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '700', fontSize: 10 }]}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

interface DayCardProps {
  day: ProgramDay;
  dayIndex: number;
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
  editMode: boolean;
  isActive?: boolean;
  onDrag?: () => void;
  onEditSettings: () => void;
  onExerciseSettings: (exerciseIndex: number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onExerciseDragEnd?: (data: ProgramExercise[]) => void;
}

export function DayCard({
  day,
  dayIndex,
  colors,
  cardStyles,
  badgeStyles,
  editMode,
  isActive,
  onDrag,
  onEditSettings,
  onExerciseSettings,
  onAddExercise,
  onRemoveExercise,
  onExerciseDragEnd,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const exercises = day.exercises || [];

  // Единый рендер строки упражнения — используется и в DraggableFlatList, и в map.
  // Вариант B: каждое упражнение — собственная карточка, схема подходов×повторы
  // как пилюля справа (главный визуальный акцент, PRODUCT.md §3.3).
  const renderExerciseItem = ({
    exercise,
    exIndex,
    drag,
    isDragging,
  }: {
    exercise: ProgramExercise;
    exIndex: number;
    drag?: () => void;
    isDragging?: boolean;
  }) => {
    const muscles = (exercise as MusclesHolder).primary_muscles || [];
    return (
      <View style={[cardStyles.dayCardExerciseItem, { opacity: isDragging ? 0.5 : 1 }]}>
        {editMode && onExerciseDragEnd && (
          <TouchableOpacity onPressIn={drag} style={cardStyles.dayCardExerciseItemGrip}>
            <GripVertical size={16} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={cardStyles.dayCardExerciseItemBody}
          onPress={() => editMode && onExerciseSettings(exIndex)}
          activeOpacity={editMode ? 0.7 : 1}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={[cardStyles.dayCardExerciseItemName, { flex: 1 }]} numberOfLines={2}>
              {exercise.exercise_name}
            </Text>
            <View style={cardStyles.dayCardExerciseSchemePill}>
              <Text style={cardStyles.dayCardExerciseSchemePillText}>
                {exercise.sets} × {exercise.reps_range}
              </Text>
            </View>
          </View>
          <ExerciseMuscles muscles={muscles} colors={colors} />
        </TouchableOpacity>
        {editMode && (
          <TouchableOpacity
            onPress={() => onRemoveExercise(exIndex)}
            style={cardStyles.dayCardExerciseDeleteButton}
          >
            <Trash2 size={16} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[cardStyles.dayCardContainer, { opacity: isActive ? 0.5 : 1 }]}>
      {/* Заголовок дня */}
      <View style={cardStyles.dayCardHeader}>
        <TouchableOpacity
          style={cardStyles.dayCardLeftContent}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(!expanded);
          }}
          activeOpacity={0.7}
        >
          {editMode && (
            <TouchableOpacity onPressIn={onDrag} style={cardStyles.dayCardGripButton}>
              <GripVertical size={20} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <View style={cardStyles.dayCardNumberCircle}>
            <Text style={cardStyles.dayCardNumberText}>{day.day_number}</Text>
          </View>
          <View style={cardStyles.dayCardInfo}>
            <Text style={cardStyles.dayCardName}>{day.name}</Text>
            <Text style={cardStyles.dayCardExerciseCount}>{exercises.length} упражнений</Text>
          </View>
          {editMode && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEditSettings();
              }}
              style={cardStyles.dayCardSettingsButton}
            >
              <Settings size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {!editMode && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded(!expanded);
            }}
            style={cardStyles.dayCardChevronButton}
          >
            {expanded ? (
              <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Тело дня (список упражнений) */}
      {expanded && (
        <View style={cardStyles.dayCardExercisesContainer}>
            {editMode && onExerciseDragEnd ? (
              <DraggableFlatList
                data={exercises}
                onDragEnd={({ data }) => onExerciseDragEnd(data as ProgramExercise[])}
                keyExtractor={(item: ProgramExercise) => item.id}
                renderItem={({ item: exercise, drag, isActive: isExerciseActive }) => {
                  const exIndex = exercises.indexOf(exercise as ProgramExercise);
                  return (
                    <ScaleDecorator>
                      {renderExerciseItem({
                        exercise: exercise as ProgramExercise,
                        exIndex,
                        drag,
                        isDragging: isExerciseActive,
                      })}
                    </ScaleDecorator>
                  );
                }}
                scrollEnabled={false}
              />
            ) : (
              exercises.map((exercise: ProgramExercise, exIndex: number) => (
                <View key={exercise.id}>
                  {renderExerciseItem({ exercise, exIndex })}
                </View>
              ))
            )}
          {editMode && (
            <TouchableOpacity onPress={onAddExercise} style={cardStyles.dayCardAddButton}>
              <Plus size={16} color={colors.primary} strokeWidth={2} />
              <Text style={cardStyles.dayCardAddButtonText}>Добавить упражнение</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}