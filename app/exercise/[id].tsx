import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { Exercise } from '../../src/types';
import * as Haptics from 'expo-haptics';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercise();
  }, [id]);

  const loadExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select()
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setExercise(data);
    } catch (error: any) {
      console.error('Ошибка загрузки:', error);
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Назад</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Упражнение не найдено</Text>
        </View>
      </View>
    );
  }

  const primaryMuscles = getList(exercise, 'primary_muscles');
  const secondaryMuscles = getList(exercise, 'secondary_muscles');
  const injuries = getList(exercise, 'injuries');
  const equipment = getList(exercise, 'equipment');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>🏋️</Text>
        <Text style={styles.title}>{exercise.name}</Text>
        
        {primaryMuscles.length > 0 && (
          <View style={styles.muscleSection}>
            <Text style={styles.sectionTitle}>Основные мышцы</Text>
            <View style={styles.tags}>
              {primaryMuscles.map((muscle, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {secondaryMuscles.length > 0 && (
          <View style={styles.muscleSection}>
            <Text style={styles.sectionTitle}>Дополнительные мышцы</Text>
            <View style={styles.tags}>
              {secondaryMuscles.map((muscle, idx) => (
                <View key={idx} style={[styles.tag, styles.secondaryTag]}>
                  <Text style={styles.tagText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {exercise.technique ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}> Техника выполнения</Text>
          <Text style={styles.text}>{exercise.technique}</Text>
        </View>
      ) : null}

      {exercise.benefits ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Польза</Text>
          <Text style={styles.text}>{exercise.benefits}</Text>
        </View>
      ) : null}

      {exercise.risks ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Риски</Text>
          <Text style={styles.text}>{exercise.risks}</Text>
        </View>
      ) : null}

      {injuries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Противопоказания</Text>
          {injuries.map((injury, idx) => (
            <Text key={idx} style={styles.listItem}>• {injury}</Text>
          ))}
        </View>
      )}

      {equipment.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}> Оборудование</Text>
          <Text style={styles.text}>{equipment.join(', ')}</Text>
        </View>
      )}

      {exercise.settings ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>️ Настройка</Text>
          <Text style={styles.text}>{exercise.settings}</Text>
        </View>
      ) : null}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, color: '#6b7280' },
  errorText: { color: '#ef4444', fontSize: 16 },
  header: {
    backgroundColor: 'white',
    padding: 16,
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
  content: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  icon: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 24,
  },
  muscleSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  secondaryTag: { backgroundColor: '#f3f4f6' },
  tagText: { color: '#7c3aed', fontSize: 14, fontWeight: '500' },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  text: { fontSize: 15, color: '#374151', lineHeight: 22 },
  listItem: { fontSize: 15, color: '#374151', marginBottom: 6, lineHeight: 22 },
});