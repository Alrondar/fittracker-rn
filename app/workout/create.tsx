import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {edit ? 'Редактировать' : 'Новая тренировка'}
        </Text>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>💾</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered.slice(0, 20)}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.form}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Название тренировки"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Описание (необязательно)"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View style={styles.selectedSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Выбранные упражнения ({selected.length})
              </Text>
              
              {selected.map(ex => (
                <View key={ex.id} style={[styles.selectedCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.selectedInfo}>
                    <Text style={[styles.selectedName, { color: colors.textPrimary }]}>{ex.name}</Text>
                    <Text style={[styles.selectedMuscles, { color: colors.textSecondary }]}>
                      {(ex.primary_muscles || []).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                    <Text style={styles.deleteBtn}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Поиск упражнений</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="🔍 Поиск..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.exerciseItem, { backgroundColor: colors.surface }]}
            onPress={() => addExercise(item)}
          >
            <Text style={styles.exerciseIcon}>️</Text>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.exerciseMuscles, { color: colors.textSecondary }]}>
                {(item.primary_muscles || []).join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  saveButton: {
    padding: SPACING.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  saveText: { fontSize: 24 },
  list: { padding: SPACING.lg },
  form: { marginBottom: SPACING.lg },
  input: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectedSection: { marginBottom: SPACING.lg },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginVertical: SPACING.md,
  },
  selectedCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedInfo: { flex: 1 },
  selectedName: { fontWeight: 'bold', fontSize: 14 },
  selectedMuscles: { fontSize: 12 },
  deleteBtn: { fontSize: 20, padding: 4 },
  searchInput: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  exerciseIcon: { fontSize: 24, marginRight: SPACING.md },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontWeight: 'bold', fontSize: 14 },
  exerciseMuscles: { fontSize: 12 },
});