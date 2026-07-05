import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { COLORS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('workouts')
        .select(`
          id, name, created_at,
          workout_exercises (
            workout_logs (weight_kg, reps)
          )
        `)
        .order('created_at', { ascending: false });
      
      const completed = (data || []).filter((w: any) => 
        w.workout_exercises?.some((ex: any) => ex.workout_logs?.length > 0)
      );
      setWorkouts(completed);
    } catch (e) {
      console.error('Ошибка истории:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const calculateVolume = (workout: any) => {
    let volume = 0;
    workout.workout_exercises?.forEach((ex: any) => {
      ex.workout_logs?.forEach((log: any) => {
        volume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
      });
    });
    return volume;
  };

  const calculateSets = (workout: any) => {
    let sets = 0;
    workout.workout_exercises?.forEach((ex: any) => {
      sets += ex.workout_logs?.length || 0;
    });
    return sets;
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>История пуста</Text>
      <Text style={styles.emptyText}>
        Завершите первую тренировку, чтобы увидеть её здесь
      </Text>
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
          renderItem={({ item, index }) => {
            const volume = calculateVolume(item);
            const sets = calculateSets(item);
            
            return (
              <FadeIn delay={index * 50}>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/history/${item.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{sets}</Text>
                      <Text style={styles.statLabel}>подходов</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{Math.round(volume)}</Text>
                      <Text style={styles.statLabel}>кг</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </FadeIn>
            );
          }}
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
  list: { padding: SPACING.lg },
  
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
    alignItems: 'flex-start',
    marginBottom: SPACING.md 
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
  
  statsRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
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
    lineHeight: 20,
  },
});