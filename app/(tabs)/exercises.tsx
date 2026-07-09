import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Search, Dumbbell, Check } from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allMuscles, setAllMuscles] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

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
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Search size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Упражнения не найдены
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        {selectedMuscles.length > 0
          ? 'Попробуйте изменить фильтры или сбросить их'
          : 'База упражнений пуста'}
      </Text>
      {selectedMuscles.length > 0 && (
        <TouchableOpacity
          style={[badgeStyles.container, { backgroundColor: colors.primaryLight }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedMuscles([]);
          }}
        >
          <Text style={[badgeStyles.text, { color: colors.primary }]}>
            Сбросить фильтры
          </Text>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Заголовок */}
      <FadeIn style={[commonStyles.header, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          Справочник упражнений
        </Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          База упражнений
        </Text>
      </FadeIn>

      {/* Фильтры по мышцам */}
      <FadeIn style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <FlatList
          horizontal
          data={allMuscles}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                badgeStyles.container,
                {
                  backgroundColor: selectedMuscles.includes(item) ? colors.primaryLight : colors.surface,
                  borderColor: selectedMuscles.includes(item) ? colors.primary : colors.border,
                  marginRight: SPACING.sm,
                  borderRadius: BORDER_RADIUS.full,
                },
              ]}
              onPress={() => toggleMuscle(item)}
              activeOpacity={0.7}
            >
              {selectedMuscles.includes(item) && (
                <Check size={14} color={colors.primary} strokeWidth={2} style={{ marginRight: 4 }} />
              )}
              <Text style={[
                badgeStyles.text,
                {
                  color: selectedMuscles.includes(item) ? colors.primary : colors.textPrimary,
                  fontWeight: selectedMuscles.includes(item) ? 'bold' : 'normal',
                },
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg }}
          showsHorizontalScrollIndicator={false}
        />
      </FadeIn>

      {/* Список упражнений */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 40}>
              <TouchableOpacity
                style={cardStyles.exerciseListItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/exercise/${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={cardStyles.exerciseListItemIcon}>
                  <Dumbbell size={24} color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={cardStyles.exerciseListItemContent}>
                  <Text style={cardStyles.exerciseListItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={cardStyles.exerciseListItemMuscles} numberOfLines={1}>
                    {getList(item, 'primary_muscles').join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            </FadeIn>
          )}
          contentContainerStyle={{ padding: SPACING.lg }}
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