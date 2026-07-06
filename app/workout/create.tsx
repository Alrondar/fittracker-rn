import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { useToast } from '../../src/components/ToastProvider';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { Exercise } from '../../src/types';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Save,
  ArrowLeft,
  Search,
  Trash2,
  Dumbbell,
  Plus
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createInputStyles } from '../../src/styles/components/input';
import { createListStyles } from '../../src/styles/components/list';
import { typography } from '../../src/styles/typography';

export default function CreateWorkoutScreen() {
  const { edit } = useLocalSearchParams();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { userId } = useStore();
  const { showToast } = useToast();

  const cardStyles = createCardStyles(colors);
  const inputStyles = createInputStyles(colors);
  const listStyles = createListStyles(colors);

  useEffect(() => {
    loadExercises();
    if (edit) loadWorkout(edit as string);
  }, [edit]);

  const loadExercises = async () => {
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    if (error) {
      showToast('Ошибка загрузки упражнений', 'error');
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  const loadWorkout = async (id: string) => {
    try {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select()
        .eq('id', id)
        .single();

      if (error) throw error;
      if (workout) {
        setName(workout.name);
        setDescription(workout.description || '');
      }

      const { data: we, error: weError } = await supabase
        .from('workout_exercises')
        .select('*, exercises(*)')
        .eq('workout_id', id)
        .order('order_index');

      if (weError) throw weError;
      if (we) {
        const selectedExercises = we.map((w: any) => w.exercises);
        setSelected(selectedExercises);
      }
    } catch (error: any) {
      showToast('Ошибка загрузки тренировки', 'error');
    }
  };

  const addExercise = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selected.find(s => s.id === ex.id)) {
      setSelected([...selected, ex]);
      showToast(`Добавлено: ${ex.name}`, 'success');
    } else {
      showToast('Это упражнение уже добавлено', 'info');
    }
  };

  const removeExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(selected.filter(s => s.id !== id));
    showToast('Упражнение удалено', 'info');
  };

  const save = async () => {
    if (!name.trim()) {
      showToast('Введите название тренировки', 'error');
      return;
    }
    if (selected.length === 0) {
      showToast('Добавьте хотя бы одно упражнение', 'error');
      return;
    }

    setSaving(true);
    try {
      if (edit) {
        const { error } = await supabase
          .from('workouts')
          .update({ name, description })
          .eq('id', edit);
        if (error) throw error;

        await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', edit);

        for (let i = 0; i < selected.length; i++) {
          const { error: weError } = await supabase.from('workout_exercises').insert({
            workout_id: edit,
            exercise_id: selected[i].id,
            order_index: i,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 90,
          });
          if (weError) throw weError;
        }

        showToast('Тренировка обновлена!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const { data: newWorkout, error } = await supabase
          .from('workouts')
          .insert({ 
            user_id: userId, 
            name, 
            description 
          })
          .select()
          .single();

        if (error) throw error;

        for (let i = 0; i < selected.length; i++) {
          const { error: weError } = await supabase.from('workout_exercises').insert({
            workout_id: newWorkout.id,
            exercise_id: selected[i].id,
            order_index: i,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 90,
          });
          if (weError) throw weError;
        }

        showToast('Тренировка создана!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? exercises.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase())
      )
    : exercises;

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={commonStyles.container}
      >
        {/* Шапка */}
        <View style={[{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
            <ArrowLeft size={24} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[typography.h5, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
            {edit ? 'Редактировать' : 'Новая тренировка'}
          </Text>
          <TouchableOpacity onPress={save} disabled={saving} style={{ padding: SPACING.sm, minWidth: 40, alignItems: 'center' }}>
            {saving ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Save size={24} color={colors.primary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered.slice(0, 20)}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {/* Форма */}
              <View style={{ marginBottom: SPACING.lg }}>
                <TextInput
                  style={[inputStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Название тренировки"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={[inputStyles.input, inputStyles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Описание (необязательно)"
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Выбранные упражнения */}
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
                  Выбранные упражнения ({selected.length})
                </Text>
                {selected.map(ex => (
                  <View key={ex.id} style={[cardStyles.compact, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: SPACING.md }]}>
                    <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{ex.name}</Text>
                      <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
                        {(ex.primary_muscles || []).join(', ')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExercise(ex.id)} style={{ padding: SPACING.sm }}>
                      <Trash2 size={18} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Поиск */}
              <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>Поиск упражнений</Text>
              <View style={[inputStyles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Search size={18} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[inputStyles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Поиск..."
                  placeholderTextColor={colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[listStyles.item, { backgroundColor: colors.surface }]}
              onPress={() => addExercise(item)}
              activeOpacity={0.7}
            >
              <Dumbbell size={20} color={colors.primary} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {(item.primary_muscles || []).join(', ')}
                </Text>
              </View>
              <Plus size={20} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          contentContainerStyle={listStyles.container}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}