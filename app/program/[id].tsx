import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getProgramWithDays,
  startProgram,
  createWorkoutsFromProgram,
  Program,
  ProgramDay,
  ProgramExercise,
} from '../../src/servises/programsService';
import { useStore } from '../../src/store/useStore';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { Toast } from '../../src/components/Toast';
import { useToast } from '../../src/hooks/useToast';
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import {
  Sprout,
  Dumbbell,
  Flame,
  Clock,
  Calendar,
  ChevronRight,
  ChevronDown,
  Play,
  TrendingUp,
  Minus,
  TrendingDown,
  Pencil,
  GripVertical,
  Plus,
  X,
  Save,
  Settings,
  Trash2,
  Search,
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { supabase } from '../../src/lib/supabase';

// Генерация UUID
const genRandomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const { toast, showToast, hideToast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Program | null>(null);
  const [showDaySettings, setShowDaySettings] = useState(false);
  const [showExerciseSettings, setShowExerciseSettings] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(-1);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  useEffect(() => {
    loadProgram();
  }, [id]);

  const loadProgram = async () => {
    try {
      const data = await getProgramWithDays(id as string);
      setProgram(data);
      setEditedProgram(data);
    } catch (e) {
      console.error('Ошибка загрузки программы:', e);
      showToast('Не удалось загрузить программу', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProgram = async () => {
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }
    Alert.alert(
      'Начать программу?',
      `Будет создано ${program?.days?.length || 0} тренировок на первую неделю программы "${program?.name}"`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Начать',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStarting(true);
            try {
              await startProgram(id as string);
              const workoutIds = await createWorkoutsFromProgram(id as string, userId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast(`Программа начата! Создано тренировок: ${workoutIds.length}`, 'success');
              router.replace('/(tabs)/workouts');
            } catch (error: any) {
              showToast(error.message, 'error');
            } finally {
              setStarting(false);
            }
          },
        },
      ]
    );
  };

  const toggleEditMode = async () => {
    if (editMode) {
      setEditMode(false);
      setEditedProgram(program);
      setDeletedExerciseIds([]);
    } else {
      if (program && !program.id.startsWith('user_')) {
        await copyProgramToUser();
      } else {
        setEditMode(true);
      }
    }
  };

  const copyProgramToUser = async () => {
    try {
      const { data, error } = await supabase.rpc('copy_program_for_user', {
        p_program_id: program?.id,
        p_user_id: userId,
      });
      if (error) throw error;
      const newData = await getProgramWithDays(data);
      setProgram(newData);
      setEditedProgram(newData);
      setEditMode(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа скопирована в "Мои программы"', 'info');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const saveProgram = async () => {
    setSaving(true);
    try {
      if (!editedProgram || !editedProgram.days) {
        showToast('Нет данных для сохранения', 'error');
        setSaving(false);
        return;
      }

      console.log('💾 SAVING - Порядок дней:', editedProgram.days.map(d => d.name));

      const updatePromises: Promise<any>[] = [];
      const days = editedProgram.days || [];

      // 1. УДАЛЕНИЕ упражнений из БД
      if (deletedExerciseIds.length > 0) {
        deletedExerciseIds.forEach((exerciseId) => {
          updatePromises.push(
            Promise.resolve(
              supabase.from('program_exercises').delete().eq('id', exerciseId)
            )
          );
        });
      }

      // 2. Обновление дней и упражнений
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        
        // Прямой update вместо RPC (исправление сохранения порядка дней)
        updatePromises.push(
          Promise.resolve(
            supabase
              .from('program_days')
              .update({
                position: i + 1,
                day_number: i + 1,
              })
              .eq('id', day.id)
          )
        );

        const exercises = day.exercises || [];
        for (let j = 0; j < exercises.length; j++) {
          const exercise = exercises[j];
          updatePromises.push(
            Promise.resolve(
              supabase.rpc('update_exercise_position', {
                p_exercise_id: exercise.id,
                p_new_position: j + 1,
              })
            )
          );

          if ((exercise as any).isNew) {
            updatePromises.push(
              Promise.resolve(
                supabase.from('program_exercises').insert({
                  id: exercise.id,
                  program_day_id: exercise.program_day_id,
                  exercise_id: (exercise as any).exercise_id,
                  exercise_name: exercise.exercise_name,
                  sets: exercise.sets,
                  reps_range: exercise.reps_range,
                  rest_seconds: exercise.rest_seconds,
                  intensity: exercise.intensity,
                  position: j + 1,
                })
              )
            );
          } else {
            updatePromises.push(
              Promise.resolve(
                supabase
                  .from('program_exercises')
                  .update({
                    sets: exercise.sets,
                    reps_range: exercise.reps_range,
                    rest_seconds: exercise.rest_seconds,
                    intensity: exercise.intensity,
                  })
                  .eq('id', exercise.id)
              )
            );
          }
        }
      }

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r: any) => r.error);
      if (errors.length > 0) {
        console.error('❌ Ошибки сохранения:', errors);
        throw errors[0].error;
      }
      console.log('✅ Все обновления сохранены успешно');

      const updatedProgram = await getProgramWithDays(editedProgram.id);
      setProgram(updatedProgram);
      setEditedProgram(updatedProgram);
      setDeletedExerciseIds([]);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа сохранена', 'success');
      setEditMode(false);
    } catch (error: any) {
      showToast(error.message || 'Не удалось сохранить программу', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateExerciseParams = (
    dayIndex: number,
    exerciseIndex: number,
    params: Partial<ProgramExercise>
  ) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    const day = newDays[dayIndex];
    if (!day || !day.exercises) return;
    const newExercises = [...day.exercises];
    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], ...params };
    newDays[dayIndex] = { ...day, exercises: newExercises };
    setEditedProgram({ ...editedProgram, days: newDays });
  };

  const updateDaySettings = (dayIndex: number, settings: Partial<ProgramDay>) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    newDays[dayIndex] = { ...newDays[dayIndex], ...settings };
    setEditedProgram({ ...editedProgram, days: newDays });
  };

  // Обработчик перетаскивания упражнений
  const onExerciseDragEnd = (dayIndex: number, data: ProgramExercise[]) => {
    if (!editedProgram || !editedProgram.days) return;
    const newDays = [...editedProgram.days];
    newDays[dayIndex] = { ...newDays[dayIndex], exercises: data };
    setEditedProgram({ ...editedProgram, days: newDays });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Обработчик перетаскивания дней
  const onDayDragEnd = (data: ProgramDay[]) => {
    if (!editedProgram) return;
    console.log('🔥 DRAG END - Новый порядок:', data.map(d => d.name));
    const updatedDays = data.map((day, index) => ({
      ...day,
      day_number: index + 1,
    }));
    setEditedProgram({ ...editedProgram, days: updatedDays });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addExercise = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setShowExercisePicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    if (!editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[dayIndex];
    if (!day || !day.exercises) return;
    const exercise = day.exercises[exerciseIndex];
    if (!exercise) return;

    Alert.alert(
      'Удалить упражнение?',
      `"${exercise.exercise_name}" будет удалено из программы`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const newExercises = [...(day.exercises || [])];
            newExercises.splice(exerciseIndex, 1);
            const newDays = [...(editedProgram?.days || [])];
            newDays[dayIndex] = { ...day, exercises: newExercises };
            setEditedProgram({ ...(editedProgram as Program), days: newDays });
            if (!(exercise as any).isNew) {
              setDeletedExerciseIds((prev) => [...prev, exercise.id]);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Упражнение удалено', 'success');
          },
        },
      ]
    );
  };

  const loadAvailableExercises = async (searchQuery: string = '') => {
    setLoadingExercises(true);
    try {
      let query = supabase.from('exercises').select('*').order('name');
      if (searchQuery.trim()) {
        query = query.filter('name', 'ilike', `%${searchQuery}%`);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setAvailableExercises(data || []);
    } catch (error: any) {
      showToast('Не удалось загрузить список упражнений', 'error');
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleAddExerciseFromPicker = async (exercise: any) => {
    if (selectedDayIndex < 0 || !editedProgram || !editedProgram.days) return;
    const day = editedProgram.days[selectedDayIndex];
    const currentExercises = day.exercises || [];
    const newExercise: any = {
      id: genRandomUUID(),
      program_day_id: day.id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: 4,
      reps_range: '8-12',
      rest_seconds: 90,
      intensity: 'medium',
      position: currentExercises.length + 1,
      isNew: true,
    };
    const newDays = [...editedProgram.days];
    newDays[selectedDayIndex] = { ...day, exercises: [...currentExercises, newExercise] };
    setEditedProgram({ ...editedProgram, days: newDays });
    setShowExercisePicker(false);
    setExerciseSearch('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Упражнение добавлено', 'success');
  };

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

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ИСПРАВЛЕНИЕ 1: добавлен nestedScrollEnabled={true} */}
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: SPACING.xl + 10, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}
        >
          <FadeIn>
            <Text style={[typography.h3, { color: 'white', marginBottom: SPACING.sm }]}>{displayProgram.name}</Text>
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
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: SPACING.md, borderRadius: BORDER_RADIUS.md }}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.sm, fontWeight: '600' }]}>
                Расписание:
              </Text>
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

        <View style={{ padding: SPACING.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
            <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
              Дни программы ({displayProgram.days?.length || 0})
            </Text>
            {editMode && (
              <TouchableOpacity
                onPress={() => Alert.alert('Настройки дней', 'Здесь будет редактирование дней программы')}
                style={[{ padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: colors.surfaceSecondary }]}
              >
                <Settings size={18} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Drag & Drop для дней в режиме редактирования */}
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
            />
          ) : (
            (displayProgram.days || []).map((day: ProgramDay, dayIndex: number) => (
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
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

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

      {/* Toast уведомления */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

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
        />
      </Modal>
    </SafeAreaView>
  );
}

// ИСПРАВЛЕНИЕ 3: полностью переписан DayCard
function DayCard({
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
}: {
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
  onExerciseSettings: (index: number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (index: number) => void;
  updateExerciseParams: (dayIndex: number, exerciseIndex: number, params: any) => void;
  onExerciseDragEnd?: (data: ProgramExercise[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const exercises = day.exercises || [];

  return (
    <View
      style={[
        cardStyles.container,
        {
          borderColor: colors.border,
          borderWidth: 1.5,
          borderRadius: BORDER_RADIUS.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          marginBottom: SPACING.md,
          opacity: isActive ? 0.5 : 1,
        },
      ]}
    >
      {/* --- ЗАГОЛОВОК ДНЯ --- */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md }}>
        {/* ЛЕВАЯ ЧАСТЬ: Номер, Текст, Шестеренка (Настройки) */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => {
            // Раскрываем день даже в режиме редактирования, чтобы менять упражнения
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpanded(!expanded);
          }}
          activeOpacity={0.7}
        >
          {/* Иконка Grip (для перетаскивания) */}
          {editMode && (
            <TouchableOpacity
              onPressIn={onDrag} // Drag срабатывает при касании ручки
              style={{ marginRight: SPACING.sm, padding: SPACING.xs, zIndex: 10 }}
            >
              <GripVertical size={20} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.md,
              backgroundColor: colors.primary + '20',
            }}
          >
            <Text style={[typography.h5, { color: colors.primary }]}>{day.day_number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 2 }]}>{day.name}</Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>{exercises.length} упражнений</Text>
          </View>
          {/* Шестеренка настроек дня */}
          {editMode && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEditSettings();
              }}
              style={{ padding: SPACING.sm, marginRight: SPACING.xs }}
            >
              <Settings size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {/* ПРАВАЯ ЧАСТЬ: Шеврон (стрелочка) */}
        {!editMode && (
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(!expanded); }}>
            {expanded ? <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.5} /> : <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />}
          </TouchableOpacity>
        )}
      </View>

      {/* --- ТЕЛО ДНЯ (СПИСОК УПРАЖНЕНИЙ) --- */}
      {expanded && (
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
          {/* Drag & Drop для упражнений в режиме редактирования */}
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
                    <View
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        paddingVertical: SPACING.sm,
                        opacity: isExerciseActive ? 0.5 : 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                        {/* Ручка для перетаскивания упражнения */}
                        <TouchableOpacity onPressIn={drag} style={{ paddingTop: SPACING.xs }}>
                          <GripVertical size={16} color={colors.textTertiary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => onExerciseSettings(exIndex)} activeOpacity={0.7}>
                          <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs, lineHeight: 18 }]} numberOfLines={2}>
                            {exercise.exercise_name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                            <Text style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '500' }]}>
                              {exercise.sets} × {exercise.reps_range}
                            </Text>
                            <View style={[badgeStyles.intensityBadge, { backgroundColor: intensityInfo.color + '20' }]}>
                              {intensityInfo.icon}
                              <Text style={[badgeStyles.intensityText, { color: intensityInfo.color }]}>{intensityInfo.label}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>Отдых: {exercise.rest_seconds} сек</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onRemoveExercise(exIndex)} style={{ padding: SPACING.sm }}>
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
                <View key={exercise.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                    {editMode && (
                      <View style={{ paddingTop: SPACING.xs }}>
                        <GripVertical size={16} color={colors.textTertiary} strokeWidth={2} />
                      </View>
                    )}
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => editMode && onExerciseSettings(exIndex)} activeOpacity={editMode ? 0.7 : 1}>
                      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs, lineHeight: 18 }]} numberOfLines={2}>
                        {exercise.exercise_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                        <Text style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '500' }]}>
                          {exercise.sets} × {exercise.reps_range}
                        </Text>
                        <View style={[badgeStyles.intensityBadge, { backgroundColor: intensityInfo.color + '20' }]}>
                          {intensityInfo.icon}
                          <Text style={[badgeStyles.intensityText, { color: intensityInfo.color }]}>{intensityInfo.label}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                        <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>Отдых: {exercise.rest_seconds} сек</Text>
                      </View>
                    </TouchableOpacity>
                    {editMode && (
                      <TouchableOpacity onPress={() => onRemoveExercise(exIndex)} style={{ padding: SPACING.sm }}>
                        <Trash2 size={16} color={colors.error} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          {editMode && (
            <TouchableOpacity
              onPress={onAddExercise}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: SPACING.md,
                borderRadius: BORDER_RADIUS.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.primary,
                backgroundColor: colors.primaryLight,
                marginTop: SPACING.sm,
              }}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.labelBold, { color: colors.primary, marginLeft: SPACING.sm }]}>Добавить упражнение</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ExerciseSettingsSheet({ exercise, colors, buttonStyles, onSave, onClose }: { exercise: ProgramExercise | null; colors: any; buttonStyles: any; onSave: (params: any) => void; onClose: () => void }) {
  const [sets, setSets] = useState(exercise?.sets || 3);
  const [repsRange, setRepsRange] = useState(exercise?.reps_range || '8-12');
  const [restSeconds, setRestSeconds] = useState(exercise?.rest_seconds || 90);
  const [intensity, setIntensity] = useState<'high' | 'medium' | 'low'>((exercise?.intensity as 'high' | 'medium' | 'low') || 'medium');

  const intensities = [
    { value: 'low' as const, label: 'Низкая', color: '#4CAF50', icon: TrendingDown },
    { value: 'medium' as const, label: 'Средняя', color: '#FFC107', icon: Minus },
    { value: 'high' as const, label: 'Высокая', color: '#F44336', icon: TrendingUp },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Настройки упражнения</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Подходы</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
            <TouchableOpacity onPress={() => setSets(Math.max(1, sets - 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.textPrimary, minWidth: 40, textAlign: 'center' }]}>{sets}</Text>
            <TouchableOpacity onPress={() => setSets(Math.min(10, sets + 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Повторения</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface }}
            value={repsRange}
            onChangeText={setRepsRange}
            placeholder="например: 8-12"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Отдых (секунды)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg }}>
            <TouchableOpacity onPress={() => setRestSeconds(Math.max(30, restSeconds - 15))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: colors.textPrimary, minWidth: 60, textAlign: 'center' }]}>{restSeconds}с</Text>
            <TouchableOpacity onPress={() => setRestSeconds(Math.min(300, restSeconds + 15))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Интенсивность</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {intensities.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setIntensity(item.value)}
                style={{ flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: intensity === item.value ? item.color : colors.border, backgroundColor: intensity === item.value ? item.color + '15' : colors.surface, alignItems: 'center' }}
              >
                <item.icon size={20} color={intensity === item.value ? item.color : colors.textSecondary} strokeWidth={2} />
                <Text style={[typography.labelBold, { color: intensity === item.value ? item.color : colors.textSecondary, marginTop: SPACING.xs }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={() => onSave({ sets, reps_range: repsRange, rest_seconds: restSeconds, intensity })} style={[buttonStyles.primary, { backgroundColor: colors.primary }]}>
          <Text style={buttonStyles.textPrimary}>Сохранить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DaySettingsSheet({ day, colors, buttonStyles, onSave, onClose }: { day: ProgramDay | null; colors: any; buttonStyles: any; onSave: (params: any) => void; onClose: () => void }) {
  const [dayName, setDayName] = useState(day?.name || '');
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Настройки дня</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: SPACING.md }]}>Название дня</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: 16, color: colors.textPrimary, backgroundColor: colors.surface }}
            value={dayName}
            onChangeText={setDayName}
            placeholder="например: День 1: Push"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <TouchableOpacity onPress={() => onSave({ name: dayName })} style={[buttonStyles.primary, { backgroundColor: colors.primary }]}>
          <Text style={buttonStyles.textPrimary}>Сохранить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExercisePickerSheet({ searchQuery, onSearchChange, exercises, loading, onLoadExercises, onSelectExercise, onClose, colors, badgeStyles }: { searchQuery: string; onSearchChange: (query: string) => void; exercises: any[]; loading: boolean; onLoadExercises: (query: string) => void; onSelectExercise: (exercise: any) => void; onClose: () => void; colors: any; badgeStyles: any }) {
  useEffect(() => {
    const timeoutId = setTimeout(() => { onLoadExercises(searchQuery); }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const getPrimaryMusclesColor = (muscle: string) => {
    const colors_map: Record<string, string> = { 'грудь': '#F44336', 'спина': '#2196F3', 'ноги': '#4CAF50', 'плечи': '#FF9800', 'руки': '#9C27B0', 'пресс': '#FFC107' };
    return colors_map[muscle.toLowerCase()] || colors.primary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: SPACING.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={[typography.h5, { color: colors.textPrimary }]}>Добавить упражнение</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md }}>
            <Search size={18} color={colors.textTertiary} strokeWidth={2} />
            <TextInput style={{ flex: 1, padding: SPACING.md, fontSize: 16, color: colors.textPrimary }} placeholder="Поиск по названию..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={onSearchChange} autoFocus />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <X size={18} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {loading ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md }]}>Загрузка...</Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <Dumbbell size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' }]}>
              {searchQuery ? 'Упражнения не найдены' : 'Начните вводить название упражнения'}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
            {exercises.map((exercise) => {
              const primaryMuscles = exercise.primary_muscles || [];
              return (
                <TouchableOpacity key={exercise.id} onPress={() => onSelectExercise(exercise)} style={{ padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: primaryMuscles[0] ? getPrimaryMusclesColor(primaryMuscles[0]) + '20' : colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                    <Dumbbell size={20} color={primaryMuscles[0] ? getPrimaryMusclesColor(primaryMuscles[0]) : colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 4 }]}>{exercise.name}</Text>
                    {primaryMuscles.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {primaryMuscles.slice(0, 3).map((muscle: string, idx: number) => (
                          <View key={idx} style={[badgeStyles.intensityBadge, { backgroundColor: getPrimaryMusclesColor(muscle) + '15', paddingHorizontal: 8, paddingVertical: 2 }]}>
                            <Text style={[badgeStyles.intensityText, { color: getPrimaryMusclesColor(muscle), fontSize: 11 }]}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View style={{ marginTop: SPACING.md, marginHorizontal: SPACING.lg, padding: SPACING.md, backgroundColor: colors.primaryLight, borderRadius: BORDER_RADIUS.md }}>
          <Text style={[typography.caption, { color: colors.primary }]}>Параметры по умолчанию: 4 подхода × 8-12 повт., отдых 90с, средняя интенсивность</Text>
        </View>
      </View>
    </View>
  );
}