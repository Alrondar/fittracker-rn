import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SPACING } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { ClipboardList, Dumbbell, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

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
        .order('week_number', { ascending: true })
        .order('day_index', { ascending: true });
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
            cardStyles.container,
            {
              borderColor: isProgramWorkout ? colors.primary : colors.border,
              borderWidth: isProgramWorkout ? 1.5 : 1,
            },
          ]}
        >
          {isProgramWorkout && (
            <View style={[badgeStyles.programBadge, { backgroundColor: colors.primary + '15' }]}>
              <View style={badgeStyles.container}>
                <ClipboardList size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[badgeStyles.programBadgeText, { color: colors.primary }]}>
                  {programLabel}
                </Text>
              </View>
            </View>
          )}
          <Text style={cardStyles.title} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description && !isProgramWorkout && (
            <Text style={cardStyles.description} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={cardStyles.footer}>
            <Text style={cardStyles.date}>
              {new Date(item.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={[typography.buttonSmall, { color: colors.primary }]}>Начать →</Text>
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Нет тренировок
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Создайте свою первую тренировку или выберите готовую программу
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          Тренировки
        </Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
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
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0, paddingBottom: 100 }}
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
        style={[commonStyles.fab, { backgroundColor: colors.primary }]}
        onPress={createNewWorkout}
        activeOpacity={0.8}
      >
        <Plus size={28} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}