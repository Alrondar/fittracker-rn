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
import { FadeIn } from '../../src/components/FadeIn';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <FadeIn delay={200} style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>Упражнения не найдены</Text>
      <Text style={styles.emptyText}>
        {selectedMuscles.length > 0 
          ? 'Попробуйте изменить фильтры или сбросить их'
          : 'База упражнений пуста'}
      </Text>
      {selectedMuscles.length > 0 && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedMuscles([]);
          }}
        >
          <Text style={styles.resetButtonText}>Сбросить фильтры</Text>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  return (
    <View style={styles.container}>
      {/* Фильтры */}
      <FadeIn style={styles.filters}>
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
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                selectedMuscles.includes(item) && styles.chipTextSelected,
              ]}>
                {selectedMuscles.includes(item) && '✓ '}{item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
          showsHorizontalScrollIndicator={false}
        />
      </FadeIn>

      {/* Список или Скелетон */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 40}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/exercise/${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.icon}>🏋️</Text>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {getList(item, 'primary_muscles').join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            </FadeIn>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: { 
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filtersList: { 
    paddingVertical: SPACING.md, 
    paddingHorizontal: SPACING.lg 
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { 
    backgroundColor: COLORS.primaryLight, 
    borderColor: COLORS.primary 
  },
  chipText: { 
    color: COLORS.textPrimary, 
    fontSize: 14 
  },
  chipTextSelected: { 
    color: COLORS.primary, 
    fontWeight: 'bold' 
  },
  list: { padding: SPACING.lg },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  icon: { 
    fontSize: 32, 
    marginRight: SPACING.md 
  },
  cardContent: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary 
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    marginTop: SPACING.xs 
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: SPACING.lg },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary, 
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: { 
    color: COLORS.textSecondary, 
    fontSize: 14, 
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});