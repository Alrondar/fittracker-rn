import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { ClipboardList, Dumbbell, Plus } from 'lucide-react-native';

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadWorkouts();
  }, [userId]);

  const loadWorkouts = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, name, description, program_id, week_number, day_index, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (e: any) {
      console.error('Ошибка загрузки тренировок:', e.message);
      Alert.alert('Ошибка', 'Не удалось загрузить список тренировок');
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

  const navigateToWorkout = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/workout/${id}`);
  };

  const createNewWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/workout/create');
  };

  const renderWorkoutItem = ({ item, index }: { item: any; index: number }) => {
    const isProgramWorkout = !!item.program_id;
    const programLabel = isProgramWorkout
      ? `Неделя ${item.week_number || 1}, День ${item.day_index || 1}`
      : null;

    return (
      <FadeIn delay={index * 60}>
        <TouchableOpacity
          onPress={() => navigateToWorkout(item.id)}
          activeOpacity={0.85}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: isProgramWorkout ? colors.primary : colors.border,
              borderWidth: isProgramWorkout ? 1.5 : 1,
            },
          ]}
        >
          {isProgramWorkout && (
            <View style={[styles.programBadge, { backgroundColor: colors.primary + '15' }]}>
              <View style={styles.badgeContent}>
                <ClipboardList size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.programBadgeText, { color: colors.primary }]}>
                  {programLabel}
                </Text>
              </View>
            </View>
          )}
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description && !isProgramWorkout && (
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.cardFooter}>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={[styles.openText, { color: colors.primary }]}>Начать →</Text>
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={styles.emptyContainer}>
      <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Нет тренировок
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Создайте свою первую тренировку или выберите готовую программу
      </Text>
    </FadeIn>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Тренировки
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Ваши планы и программы
        </Text>
      </View>

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
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

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={createNewWorkout}
        activeOpacity={0.8}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  programBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  programBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cardDate: {
    fontSize: 13,
  },
  openText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});