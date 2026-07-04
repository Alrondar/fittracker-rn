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
import { Exercise } from '../../src/types';
import * as Haptics from 'expo-haptics';

export default function CreateWorkoutScreen() {
  const { edit } = useLocalSearchParams();
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
    console.log('🔵 CreateWorkoutScreen: Инициализация, edit:', edit);
    loadExercises();
    if (edit) loadWorkout(edit as string);
  }, [edit]);

  const loadExercises = async () => {
    console.log('🔵 Загрузка всех упражнений');
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    if (error) {
      console.error(' Ошибка загрузки упражнений:', error);
      showToast('Ошибка загрузки упражнений', 'error');
    } else {
      console.log('✅ Загружено упражнений:', data?.length);
      setExercises(data || []);
    }
    setLoading(false);
  };

  const loadWorkout = async (id: string) => {
    console.log(' Загрузка тренировки для редактирования:', id);
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
        console.log('✅ Загружено упражнений в тренировке:', selectedExercises.length);
        setSelected(selectedExercises);
      }
    } catch (error: any) {
      console.error('🔴 Ошибка загрузки тренировки:', error);
      showToast('Ошибка загрузки тренировки', 'error');
    }
  };

  const addExercise = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('➕ Добавление упражнения:', ex.name);
    if (!selected.find(s => s.id === ex.id)) {
      setSelected([...selected, ex]);
      showToast(`Добавлено: ${ex.name}`, 'success');
    } else {
      showToast('Это упражнение уже добавлено', 'info');
    }
  };

  const removeExercise = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('🗑️ Удаление упражнения');
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
        console.log('️ Обновление тренировки:', edit);
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
        console.log('➕ Создание новой тренировки');
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
      console.error('🔴 Ошибка сохранения:', error);
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
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {edit ? 'Редактировать' : 'Новая тренировка'}
        </Text>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator color="#7c3aed" />
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
                style={styles.input}
                placeholder="Название тренировки"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Описание (необязательно)"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View style={styles.selectedSection}>
              <Text style={styles.sectionTitle}>
                Выбранные упражнения ({selected.length})
              </Text>
              
              {selected.map(ex => (
                <View key={ex.id} style={styles.selectedCard}>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>{ex.name}</Text>
                    <Text style={styles.selectedMuscles}>
                      {(ex.primary_muscles || []).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                    <Text style={styles.deleteBtn}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Поиск упражнений</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Поиск..."
              value={search}
              onChangeText={setSearch}
            />
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => addExercise(item)}
          >
            <Text style={styles.exerciseIcon}>🏋️</Text>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMuscles}>
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
  container: { flex: 1, backgroundColor: '#faf5ff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  saveButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  saveText: { fontSize: 24 },
  list: { padding: 16 },
  form: { marginBottom: 16 },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectedSection: { marginBottom: 16 },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginVertical: 12,
    color: '#1f2937',
  },
  selectedCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedInfo: { flex: 1 },
  selectedName: { fontWeight: 'bold', fontSize: 14 },
  selectedMuscles: { color: '#6b7280', fontSize: 12 },
  deleteBtn: { fontSize: 20, padding: 4 },
  searchInput: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  exerciseIcon: { fontSize: 24, marginRight: 12 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontWeight: 'bold', fontSize: 14 },
  exerciseMuscles: { color: '#6b7280', fontSize: 12 },
});