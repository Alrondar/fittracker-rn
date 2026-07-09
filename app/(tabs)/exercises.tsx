import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ViewStyle,
  TextStyle,
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
import { MUSCLE_GROUPS } from '../../src/constants/muscleGroups';

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const router = useRouter();
  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

  useEffect(() => {
    loadExercises();
  }, [selectedMuscles]);

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

  const toggleGroup = (groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveGroup(prev => prev === groupName ? null : groupName);
  };

  const resetFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMuscles([]);
    setActiveGroup(null);
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
          style={[badgeStyles.container, { backgroundColor: colors.primaryLight, marginTop: SPACING.md }]}
          onPress={resetFilters}
        >
          <Text style={[badgeStyles.text, { color: colors.primary }]}>
            Сбросить фильтры
          </Text>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  const groupNames = Object.keys(MUSCLE_GROUPS);

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

      {/* Фильтр мышц: горизонтальные чипы + аккордеон */}
      <FadeIn style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {/* Шапка со счётчиком и сбросом */}
        {selectedMuscles.length > 0 && (
          <View style={cardStyles.muscleGroupSelectorHeader}>
            <Text style={cardStyles.muscleGroupSelectorHeaderText}>
              Выбрано: {selectedMuscles.length}
            </Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={cardStyles.muscleGroupSelectorResetText}>
                Сбросить
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Горизонтальный скролл чипов групп */}
        <FlatList
          horizontal
          data={groupNames}
          keyExtractor={(item) => item}
          renderItem={({ item: groupName }) => {
            const muscles = MUSCLE_GROUPS[groupName];
            const isActive = activeGroup === groupName;
            const selectedInGroup = muscles.filter(m => selectedMuscles.includes(m)).length;
            const hasSelected = selectedInGroup > 0;

            // Определяем стиль чипа
            let chipStyle = cardStyles.muscleGroupChipDefault;
            let textStyle = cardStyles.muscleGroupChipTextDefault;
            if (isActive) {
              chipStyle = cardStyles.muscleGroupChipActive;
              textStyle = cardStyles.muscleGroupChipTextActive;
            } else if (hasSelected) {
              chipStyle = cardStyles.muscleGroupChipSelected;
              textStyle = cardStyles.muscleGroupChipTextSelected;
            }

            // Определяем стиль badge
            let badgeStyle: ViewStyle | undefined;
            let badgeTextStyle: TextStyle | undefined;
            if (isActive) {
              badgeStyle = cardStyles.muscleGroupBadgeActive;
              badgeTextStyle = cardStyles.muscleGroupBadgeTextActive;
            } else if (hasSelected) {
              badgeStyle = cardStyles.muscleGroupBadgeSelected;
              badgeTextStyle = cardStyles.muscleGroupBadgeTextSelected;
            }

            return (
              <TouchableOpacity
                style={[cardStyles.muscleGroupChip, chipStyle]}
                onPress={() => toggleGroup(groupName)}
                activeOpacity={0.7}
              >
                <Text style={[cardStyles.muscleGroupChipText, textStyle]}>
                  {groupName}
                </Text>
                {selectedInGroup > 0 && (
                  <View style={[cardStyles.muscleGroupBadge, badgeStyle]}>
                    <Text style={[cardStyles.muscleGroupBadgeText, badgeTextStyle]}>
                      {selectedInGroup}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg }}
          showsHorizontalScrollIndicator={false}
        />

        {/* Раскрывающийся список подмышц активной группы */}
        {activeGroup && (
          <View style={cardStyles.muscleSubgroupContainer}>
            <View style={cardStyles.muscleSubgroupList}>
              {MUSCLE_GROUPS[activeGroup].map(muscle => {
                const isSelected = selectedMuscles.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      badgeStyles.container,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: BORDER_RADIUS.full,
                      },
                    ]}
                    onPress={() => toggleMuscle(muscle)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Check size={12} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        badgeStyles.text,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontSize: 12,
                        },
                      ]}
                    >
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
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