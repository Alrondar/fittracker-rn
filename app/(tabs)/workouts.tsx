import { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Workout } from '../../src/types';
import { useStore } from '../../src/store/useStore';
import { ListSkeleton } from '../../src/components/Skeleton';
import { SwipeToDeleteCard } from '../../src/components/SwipeableCard';
import { CustomBottomSheet } from '../../src/components/BottomSheet';
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Состояния для Bottom Sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  
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
    Haptics.impactAsync();
    setRefreshing(true);
    loadWorkouts();
  };

  // Обработчики для Bottom Sheet
  const handleLongPress = (workout: Workout) => {
      console.log('🎯 handleLongPress вызван для:', workout.name);
    Haptics.impactAsync();
    setSelectedWorkout(workout);
    setSheetVisible(true);
  };

  const handleEdit = () => {
    if (selectedWorkout) {
      router.push(`/workout/create?edit=${selectedWorkout.id}`);
    }
  };

  const handleDelete = async () => {
    if (selectedWorkout) {
      try {
        await supabase.from('workout_exercises').delete().eq('workout_id', selectedWorkout.id);
        await supabase.from('workouts').delete().eq('id', selectedWorkout.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadWorkouts();
      } catch (e: any) {
        Alert.alert('Ошибка', e.message);
      }
    }
  };

  const sheetItems = useMemo(() => [
    { 
      label: 'Редактировать', 
      icon: '✏️', 
      onPress: handleEdit 
    },
    { 
      label: 'Удалить', 
      icon: '🗑️', 
      onPress: handleDelete,
      destructive: true 
    },
  ], [selectedWorkout]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: colors.textTertiary }]}>🏋️♂️</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Пока нет тренировок</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Создай свою первую программу, чтобы начать отслеживать прогресс!</Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/workout/create')}
      >
        <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>+ Создать тренировку</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
renderItem={({ item, index }) => (
  <View style={{ opacity: 1 }}>
    <SwipeToDeleteCard 
      onDelete={() => handleDeleteFromSwipe(item)}
      onLongPress={() => handleLongPress(item)}
      onPress={() => {
        console.log('👆 Короткое нажатие - открываем:', item.name);
        router.push(`/workout/${item.id}`);
      }}
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description || 'Нет описания'}
        </Text>
      </View>
    </SwipeToDeleteCard>
  </View>
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

      <View style={styles.fabContainer}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync();
            router.push('/workout/create');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet для действий с тренировкой */}
      <CustomBottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSelectedWorkout(null);
        }}
        title={selectedWorkout?.name || ''}
        items={sheetItems}
      />
    </View>
  );

  // Отдельная функция для удаления через свайп
  async function handleDeleteFromSwipe(item: Workout) {
    try {
      await supabase.from('workout_exercises').delete().eq('workout_id', item.id);
      await supabase.from('workouts').delete().eq('id', item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      loadWorkouts();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    elevation: 2,
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
    flex: 1,
    marginRight: SPACING.md,
  },
  cardDate: { 
    fontSize: 12 
  },
  cardSubtitle: { 
    fontSize: 14,
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
  emptyButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  emptyButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  fabContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    fontSize: 28,
    marginTop: -2,
  },
});