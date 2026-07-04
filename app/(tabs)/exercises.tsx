import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, getList } from '../../src/lib/supabase';
import { Exercise } from '../../src/types';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allMuscles, setAllMuscles] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('🔵 ExercisesScreen: Инициализация');
    loadMuscles();
  }, []);

  useEffect(() => {
    console.log(' Загрузка упражнений с фильтром:', selectedMuscles);
    loadExercises();
  }, [selectedMuscles]);

  const loadMuscles = async () => {
    try {
      console.log('🔵 Загрузка списка мышц');
      const { data, error } = await supabase
        .from('exercises')
        .select('primary_muscles');
      
      if (error) {
        console.error('🔴 Ошибка загрузки мышц:', error);
        Alert.alert('Ошибка', error.message);
        return;
      }

      console.log('✅ Получено записей для мышц:', data?.length);
      
      const musclesSet = new Set<string>();
      (data || []).forEach((ex: any) => {
        const muscles = getList(ex, 'primary_muscles');
        muscles.forEach(m => musclesSet.add(m));
      });
      
      const muscles = Array.from(musclesSet).sort();
      console.log('✅ Уникальных мышц:', muscles.length, muscles);
      setAllMuscles(muscles);
    } catch (e) {
      console.error('🔴 Исключение при загрузке мышц:', e);
    }
  };

  const loadExercises = async () => {
    setLoading(true);
    try {
      console.log('🔵 Запрос упражнений...');
      
      let query = supabase.from('exercises').select('*');
      
      if (selectedMuscles.length > 0) {
        console.log('🔍 Применение фильтра:', selectedMuscles);
        query = query.overlaps('primary_muscles', selectedMuscles);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) {
        console.error('🔴 Ошибка загрузки упражнений:', error);
        Alert.alert('Ошибка', error.message);
        return;
      }

      console.log('✅ Загружено упражнений:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 Первое упражнение:', data[0].name);
      }
      
      setExercises(data || []);
    } catch (e: unknown) {
      console.error('🔴 Исключение при загрузке упражнений:', e);
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Обновление справочника');
    setRefreshing(true);
    loadExercises();
  };

  const toggleMuscle = (muscle: string) => {
    console.log(' Переключение мышцы:', muscle);
    setSelectedMuscles(prev =>
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle) 
        : [...prev, muscle]
    );
  };

  const clearFilters = () => {
    console.log('🧹 Очистка фильтров');
    setSelectedMuscles([]);
  };

  const renderEmpty = () => (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyText}>Упражнения не найдены</Text>
      <Text style={styles.emptySubtext}>Попробуйте изменить фильтры</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Фильтры */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={allMuscles}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                selectedMuscles.includes(item) && styles.chipSelected,
              ]}
              onPress={() => toggleMuscle(item)}
            >
              <Text style={[
                styles.chipText,
                selectedMuscles.includes(item) && styles.chipTextSelected,
              ]}>
                {selectedMuscles.includes(item) ? '✓ ' : ''}{item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
          showsHorizontalScrollIndicator={false}
        />
        
        {selectedMuscles.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearText}>✕ Сбросить</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Список упражнений */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : exercises.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                console.log('👆 Открытие упражнения:', item.id, item.name);
                router.push(`/exercise/${item.id}`);
              }}
            >
              <Text style={styles.icon}>🏋️</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  Основная: {getList(item, 'primary_muscles').join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#7c3aed']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  filters: { 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersList: { 
    paddingVertical: 12, 
    paddingHorizontal: 8 
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: 'white',
  },
  chipSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  chipText: { 
    color: '#374151',
    fontSize: 14,
  },
  chipTextSelected: { 
    color: '#7c3aed', 
    fontWeight: 'bold' 
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    alignSelf: 'center',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  emptyIcon: { 
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: { 
    fontSize: 18, 
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: { 
    color: '#9ca3af', 
    fontSize: 14,
    textAlign: 'center',
  },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: { 
    fontSize: 32, 
    marginRight: 12 
  },
  cardContent: { 
    flex: 1 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginTop: 4 
  },
});