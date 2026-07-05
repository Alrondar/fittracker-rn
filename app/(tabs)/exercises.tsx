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
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';

export default function ExercisesScreen() {
  const { colors } = useTheme();
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
      <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Упражнения не найдены</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {selectedMuscles.length > 0 
          ? 'Попробуйте изменить фильтры или сбросить их'
          : 'База упражнений пуста'}
      </Text>
      {selectedMuscles.length > 0 && (
        <TouchableOpacity 
          style={[styles.resetButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedMuscles([]);
          }}
        >
          <Text style={[styles.resetButtonText, { color: colors.primary }]}>Сбросить фильтры</Text>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FadeIn style={[styles.filters, { backgroundColor: colors.surface }]}>
        <FlatList
          horizontal
          data={allMuscles}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                { 
                  backgroundColor: selectedMuscles.includes(item) ? colors.primaryLight : colors.surface,
                  borderColor: selectedMuscles.includes(item) ? colors.primary : colors.border
                },
              ]}
              onPress={() => toggleMuscle(item)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                { color: selectedMuscles.includes(item) ? colors.primary : colors.textPrimary },
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

      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 40}>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/exercise/${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.icon}>🏋️</Text>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
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
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: {
    borderBottomWidth: 1,
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
    marginRight: SPACING.sm,
  },
  chipText: { 
    fontSize: 14 
  },
  chipTextSelected: { 
    fontWeight: 'bold' 
  },
  list: { padding: SPACING.lg },
  card: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    elevation: 2,
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
  },
  cardSubtitle: { 
    fontSize: 14,
    marginTop: SPACING.xs 
  },
  
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
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: { 
    fontSize: 14, 
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  resetButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  resetButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});