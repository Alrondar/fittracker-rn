import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Workout } from '../../src/types';
import { useStore } from '../../src/store/useStore';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { setWorkouts: setStoreWorkouts } = useStore();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select()
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const list = data || [];
      setWorkouts(list);
      setStoreWorkouts(list);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadWorkouts();
  };

  const deleteWorkout = async (id: string, name: string) => {
    Alert.alert(
      'Удалить тренировку?',
      `"${name}" будет удалена навсегда`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await supabase.from('workout_exercises').delete().eq('workout_id', id);
              await supabase.from('workouts').delete().eq('id', id);
              loadWorkouts();
            } catch (e: any) {
              Alert.alert('Ошибка', e.message);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏋️‍♂️</Text>
      <Text style={styles.emptyTitle}>Пока нет тренировок</Text>
      <Text style={styles.emptyText}>Создай свою первую программу, чтобы начать отслеживать прогресс!</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/workout/create')}
      >
        <Text style={styles.emptyButtonText}>+ Создать тренировку</Text>
      </TouchableOpacity>
    </FadeIn>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 50}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/workout/${item.id}`);
                }}
                onLongPress={() => deleteWorkout(item.id, item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {item.description || 'Нет описания'}
                </Text>
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

      <FadeIn delay={300}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/workout/create');
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.md,
  },
  cardDate: { 
    color: COLORS.textTertiary, 
    fontSize: 12 
  },
  cardSubtitle: { 
    color: COLORS.textSecondary,
    fontSize: 14,
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
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  emptyButtonText: {
    color: COLORS.textInverse,
    fontWeight: 'bold',
    fontSize: 16,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabText: { 
    color: COLORS.textInverse, 
    fontWeight: 'bold', 
    fontSize: 28,
    marginTop: -2, // Визуальная центровка плюса
  },
});