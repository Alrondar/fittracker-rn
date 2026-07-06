import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Clock } from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      setWorkouts(completed);
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
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Clock size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        История пуста
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Завершите первую тренировку, чтобы увидеть её здесь
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          История тренировок
        </Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          Твои достижения и прогресс
        </Text>
      </View>

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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/history/${item.id}`);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={index % 2 === 0 ? GRADIENTS.hero : GRADIENTS.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      padding: SPACING.lg,
                      borderRadius: BORDER_RADIUS.lg,
                      marginBottom: SPACING.md,
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
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0 }}
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
    </SafeAreaView>
  );
}