import { useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Clock, Calendar, Trophy } from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';

interface WorkoutSection {
  title: string;
  data: any[];
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    bestWorkout: 0,
  });
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`id, name, created_at, workout_exercises ( id, workout_logs ( weight_kg, reps ) )`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const completed = (data || []).filter((w: any) =>
        w.workout_exercises?.some((ex: any) => ex.workout_logs?.length > 0)
      );

      const grouped = groupByMonth(completed);
      setSections(grouped);

      const stats = calculateMonthlyStats(completed);
      setMonthlyStats(stats);
    } catch (e: any) {
      console.error('Ошибка истории:', e.message);
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

  const groupByMonth = (workouts: any[]): WorkoutSection[] => {
    const groups: Record<string, any[]> = {};
    workouts.forEach((workout) => {
      const date = new Date(workout.created_at);
      const monthYear = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      const formattedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!groups[formattedMonth]) groups[formattedMonth] = [];
      groups[formattedMonth].push(workout);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const calculateMonthlyStats = (workouts: any[]) => {
    const now = new Date();
    const thisMonthWorkouts = workouts.filter((w) => {
      const date = new Date(w.created_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    let totalVolume = 0;
    let bestWorkout = 0;

    thisMonthWorkouts.forEach((workout) => {
      let workoutVolume = 0;
      workout.workout_exercises?.forEach((ex: any) => {
        ex.workout_logs?.forEach((log: any) => {
          workoutVolume += (parseFloat(log.weight_kg) || 0) * (parseInt(log.reps) || 0);
        });
      });
      totalVolume += workoutVolume;
      if (workoutVolume > bestWorkout) bestWorkout = workoutVolume;
    });

    return {
      totalWorkouts: thisMonthWorkouts.length,
      totalVolume: Math.round(totalVolume),
      bestWorkout: Math.round(bestWorkout),
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

  const getWorkoutGradient = (workoutName: string): [string, string] => {
    const gradients: [string, string][] = [
      ['#EF4444', '#F97316'], ['#3B82F6', '#8B5CF6'], ['#10B981', '#059669'],
      ['#8B5CF6', '#EC4899'], ['#06B6D4', '#3B82F6'], ['#F59E0B', '#EF4444'],
      ['#14B8A6', '#3B82F6'], ['#F97316', '#EAB308'], ['#EC4899', '#8B5CF6'],
      ['#22C55E', '#14B8A6'], ['#6366F1', '#A855F7'], ['#14B8A6', '#10B981'],
      ['#F43F5E', '#F97316'], ['#0EA5E9', '#06B6D4'], ['#84CC16', '#22C55E'],
    ];
    let hash = 0;
    for (let i = 0; i < workoutName.length; i++) {
      const char = workoutName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Clock size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>История пуста</Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Завершите первую тренировку, чтобы увидеть её здесь
      </Text>
    </FadeIn>
  );

  const renderSectionHeader = ({ section }: { section: WorkoutSection }) => (
    <View style={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: colors.background }}>
      <Text style={[typography.h5, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>История тренировок</Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>Твои достижения и прогресс</Text>
      </View>

      {!loading && monthlyStats.totalWorkouts > 0 && (
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
              Этот месяц
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, alignItems: 'center', padding: SPACING.md, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.primary }]}>{monthlyStats.totalWorkouts}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>тренировок</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: SPACING.md, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.success }]}>{monthlyStats.totalVolume}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>кг объем</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: SPACING.md, backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, marginHorizontal: 4 }}>
              <Trophy size={20} color={colors.warning} />
              <Text style={[typography.h3, { color: colors.warning, marginTop: 4 }]}>{monthlyStats.bestWorkout}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>кг рекорд</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item, index }) => {
            const volume = calculateVolume(item);
            const sets = calculateSets(item);
            const gradient = getWorkoutGradient(item.name);

            return (
              <FadeIn delay={index * 50}>
                <TouchableOpacity
                  onPress={() => {
                    if (!item.id || item.id === 'undefined' || item.id === 'null') {
                      Alert.alert('Ошибка', `Невозможно открыть тренировку. ID: ${item.id || 'отсутствует'}`);
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/history/${item.id}`);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      padding: SPACING.lg,
                      borderRadius: BORDER_RADIUS.lg,
                      marginBottom: SPACING.md,
                      marginHorizontal: SPACING.lg,
                      elevation: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                      <Text style={[typography.h4, { color: 'white', flex: 1, marginRight: SPACING.md }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)' }]}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[typography.h3, { color: 'white' }]}>{sets}</Text>
                        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>подходов</Text>
                      </View>
                      <View style={{ width: 1, height: 30, marginHorizontal: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[typography.h3, { color: 'white' }]}>{Math.round(volume)}</Text>
                        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>кг</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </FadeIn>
            );
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: SPACING.lg }}
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}