import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Settings,
  Trash2,
  Clock,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { FadeIn } from '../FadeIn';
import { ProgramDay, ProgramExercise } from '../../services/programsService';
import { createCardStyles } from '../../styles/components/card';
import { createBadgeStyles } from '../../styles/components/badge';

interface DayCardProps {
  day: ProgramDay;
  dayIndex: number;
  getIntensityInfo: (intensity: string) => { label: string; color: string; icon: React.ReactNode };
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
  updateExerciseParams: (dayIndex: number, exerciseIndex: number, params: any) => void;
  onExerciseDragEnd?: (data: ProgramExercise[]) => void;
}

export function DayCard({
  day,
  dayIndex,
  getIntensityInfo,
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
  updateExerciseParams,
  onExerciseDragEnd,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const exercises = day.exercises || [];

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
                const intensityInfo = getIntensityInfo(exercise.intensity);
                return (
                  <ScaleDecorator>
                    <View style={[cardStyles.dayCardExerciseRow, { opacity: isExerciseActive ? 0.5 : 1 }]}>
                      <View style={cardStyles.dayCardExerciseContent}>
                        <TouchableOpacity onPressIn={drag} style={cardStyles.dayCardExerciseGrip}>
                          <GripVertical size={16} color={colors.textTertiary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={cardStyles.dayCardExerciseTouchable}
                          onPress={() => onExerciseSettings(exIndex)}
                          activeOpacity={0.7}
                        >
                          <Text style={cardStyles.dayCardExerciseName} numberOfLines={2}>
                            {exercise.exercise_name}
                          </Text>
                          <View style={cardStyles.dayCardExerciseMeta}>
                            <Text style={cardStyles.dayCardExerciseMetaText}>
                              {exercise.sets} × {exercise.reps_range}
                            </Text>
                            <View style={[badgeStyles.intensityBadge, { backgroundColor: intensityInfo.color + '20' }]}>
                              {intensityInfo.icon}
                              <Text style={[badgeStyles.intensityText, { color: intensityInfo.color }]}>
                                {intensityInfo.label}
                              </Text>
                            </View>
                          </View>
                          <View style={cardStyles.dayCardExerciseRest}>
                            <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                            <Text style={cardStyles.dayCardExerciseRestText}>
                              Отдых: {exercise.rest_seconds} сек
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onRemoveExercise(exIndex)}
                          style={cardStyles.dayCardExerciseDelete}
                        >
                          <Trash2 size={16} color={colors.error} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScaleDecorator>
                );
              }}
            />
          ) : (
            exercises.map((exercise: ProgramExercise, exIndex: number) => {
              const intensityInfo = getIntensityInfo(exercise.intensity);
              return (
                <View key={exercise.id} style={cardStyles.dayCardExerciseRow}>
                  <View style={cardStyles.dayCardExerciseContent}>
                    {editMode && (
                      <View style={cardStyles.dayCardExerciseGrip}>
                        <GripVertical size={16} color={colors.textTertiary} strokeWidth={2} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={cardStyles.dayCardExerciseTouchable}
                      onPress={() => editMode && onExerciseSettings(exIndex)}
                      activeOpacity={editMode ? 0.7 : 1}
                    >
                      <Text style={cardStyles.dayCardExerciseName} numberOfLines={2}>
                        {exercise.exercise_name}
                      </Text>
                      <View style={cardStyles.dayCardExerciseMeta}>
                        <Text style={cardStyles.dayCardExerciseMetaText}>
                          {exercise.sets} × {exercise.reps_range}
                        </Text>
                        <View style={[badgeStyles.intensityBadge, { backgroundColor: intensityInfo.color + '20' }]}>
                          {intensityInfo.icon}
                          <Text style={[badgeStyles.intensityText, { color: intensityInfo.color }]}>
                            {intensityInfo.label}
                          </Text>
                        </View>
                      </View>
                      <View style={cardStyles.dayCardExerciseRest}>
                        <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                        <Text style={cardStyles.dayCardExerciseRestText}>
                          Отдых: {exercise.rest_seconds} сек
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {editMode && (
                      <TouchableOpacity
                        onPress={() => onRemoveExercise(exIndex)}
                        style={cardStyles.dayCardExerciseDelete}
                      >
                        <Trash2 size={16} color={colors.error} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
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