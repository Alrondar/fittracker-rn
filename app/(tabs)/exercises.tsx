import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, getList } from '../../src/lib/supabase';
import { Exercise } from '../../src/types';
import { ListSkeleton } from '../../src/components/Skeleton';
import * as Haptics from 'expo-haptics';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allMuscles, setAllMuscles] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadMuscles();
  }, []);

  useEffect(() => {
    loadExercises();
  }, [selectedMuscles]);

  const loadMuscles = async () => {
    try {
      const { data } = await supabase.from('exercises').select('primary_muscles');
      const musclesSet = new Set<string>();
      (data || []).forEach((ex: any) => {
        getList(ex, 'primary_muscles').forEach(m => musclesSet.add(m));
      });
      setAllMuscles(Array.from(musclesSet).sort());
    } catch (e) {
      console.error('Ошибка загрузки мышц:', e);
    }
  };

  const loadExercises = async () => {
    setLoading(true);
    try {
      let query = supabase.from('exercises').select('*');
      if (selectedMuscles.length > 0) {
        query = query.overlaps('primary_muscles', selectedMuscles);
      }
      const { data } = await query.order('name');
      setExercises(data || []);
    } catch (e) {
      console.error('Ошибка загрузки упражнений:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExercises();
  };

  const toggleMuscle = (muscle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
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
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Список или Скелетон */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/exercise/${item.id}`);
              }}
            >
              <Text style={styles.icon}>🏋️</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {getList(item, 'primary_muscles').join(', ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  filters: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filtersList: { paddingVertical: 12, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: 'white',
  },
  chipSelected: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  chipText: { color: '#374151', fontSize: 14 },
  chipTextSelected: { color: '#7c3aed', fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12,
    marginBottom: 12, elevation: 2,
  },
  icon: { fontSize: 32, marginRight: 12 },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#6b7280', marginBottom: 8 },
  emptySubtext: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});