import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
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
import { Search, Check, X, ArrowUpDown } from 'lucide-react-native';
import { EquipmentIcon } from '../../src/components/EquipmentIcon';
import { commonStyles } from '../../src/styles/common';
import { 
  createCardStyles, 
  createExerciseCardBorderStyles,
  getMuscleGroupChipStyle,
  getMuscleGroupChipTextStyle,
  getMuscleGroupBadgeStyle,
  getMuscleGroupBadgeTextStyle,
  getMuscleSubgroupItemStyle,
  getMuscleSubgroupItemTextStyle,
  getExerciseIconMainStyle,
  getExerciseIconExtraStyle,
  getMuscleBubbleStyle,
  getMuscleBubbleTextStyle,
} from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { MUSCLE_GROUPS } from '../../src/constants/muscleGroups';
import { getMuscleColor } from '../../src/constants/muscleColors';

// Прямой маппинг групп мышц на цвета (гарантирует правильные цвета чипов)
const GROUP_COLORS: Record<string, string> = {
  'Грудь': '#EF4444',
  'Спина': '#3B82F6',
  'Плечи': '#F59E0B',
  'Руки': '#8B5CF6',
  'Ноги': '#10B981',
  'Пресс и кор': '#EC4899',
};

const getGroupColor = (groupName: string): string => {
  return GROUP_COLORS[groupName] || '#6B7280';
};

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'popularity'>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);

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
    setActiveGroup(prev => (prev === groupName ? null : groupName));
  };

  const toggleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !showSearch;
    setShowSearch(newState);
    if (newState) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  };

  const resetFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMuscles([]);
    setSearchQuery('');
    setActiveGroup(null);
  };

  const filteredExercises = exercises.filter(ex => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = ex.name.toLowerCase().includes(query);
    const muscleMatch = getList(ex, 'primary_muscles').some(m =>
      m.toLowerCase().includes(query)
    );
    return nameMatch || muscleMatch;
  });

  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'ru');
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'ru');
    return 0;
  });

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Search size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Упражнения не найдены
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        {selectedMuscles.length > 0 || searchQuery
          ? 'Попробуйте изменить запрос или сбросить фильтры'
          : 'База упражнений пуста'}
      </Text>
      {(selectedMuscles.length > 0 || searchQuery) && (
        <TouchableOpacity
          style={[badgeStyles.container, { backgroundColor: colors.primaryLight, marginTop: SPACING.md }]}
          onPress={resetFilters}
        >
          <Text style={[badgeStyles.text, { color: colors.primary }]}>
            Сбросить
          </Text>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  const groupNames = Object.keys(MUSCLE_GROUPS);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={cardStyles.screenHeader}>
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.headerTitleWrapper}>
            <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
              Справочник упражнений
            </Text>
            <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
              База упражнений
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSortSheet(true)}
            style={[
              cardStyles.iconButton,
              sortBy !== 'name-asc' ? cardStyles.iconButtonPrimary : cardStyles.iconButtonDefault,
            ]}
            activeOpacity={0.7}
          >
            <ArrowUpDown
              size={20}
              color={sortBy !== 'name-asc' ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleSearch}
            style={[
              cardStyles.iconButton,
              showSearch ? cardStyles.iconButtonPrimary : cardStyles.iconButtonDefault,
            ]}
            activeOpacity={0.7}
          >
            {showSearch ? (
              <X size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Search size={20} color={colors.textSecondary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
        
        {showSearch && (
          <View style={cardStyles.searchWrapper}>
            <View style={cardStyles.searchInputContainer}>
              <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                ref={searchInputRef}
                style={cardStyles.searchInput}
                placeholder="Поиск упражнения"
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Selected muscles indicator */}
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

      {/* Muscle groups filter */}
      <View style={cardStyles.screenHeader}>
        <FlatList
          horizontal
          data={groupNames}
          keyExtractor={(item) => item}
          renderItem={({ item: groupName }) => {
            const muscles = MUSCLE_GROUPS[groupName];
            const isActive = activeGroup === groupName;
            const selectedInGroup = muscles.filter(m => selectedMuscles.includes(m)).length;
            
            // Динамические цвета на основе группы мышц
            const groupColor = getGroupColor(groupName);
            const chipStyle = getMuscleGroupChipStyle(groupColor, isActive);
            const chipTextStyle = getMuscleGroupChipTextStyle(groupColor, isActive);
            const badgeStyle = getMuscleGroupBadgeStyle(groupColor, isActive);
            const badgeTextStyle = getMuscleGroupBadgeTextStyle(groupColor, isActive);

            return (
              <TouchableOpacity
                key={groupName}
                style={chipStyle}
                onPress={() => toggleGroup(groupName)}
                activeOpacity={0.6}
              >
                <Text style={chipTextStyle}>
                  {groupName}
                </Text>
                {selectedInGroup > 0 && (
                  <View style={badgeStyle}>
                    <Text style={badgeTextStyle}>
                      {selectedInGroup}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.sm }}
          showsHorizontalScrollIndicator={false}
        />
        
        {activeGroup && (
          <View style={cardStyles.muscleSubgroupContainer}>
            <View style={cardStyles.muscleSubgroupList}>
              {MUSCLE_GROUPS[activeGroup].map(muscle => {
                const isSelected = selectedMuscles.includes(muscle);
                const muscleColor = getMuscleColor(muscle);
                
                const subgroupStyle = getMuscleSubgroupItemStyle(muscleColor, isSelected, colors.surface, colors.border);
                const subgroupTextStyle = getMuscleSubgroupItemTextStyle(muscleColor, isSelected, colors.textSecondary);

                return (
                  <TouchableOpacity
                    key={muscle}
                    style={subgroupStyle}
                    onPress={() => toggleMuscle(muscle)}
                    activeOpacity={0.6}
                  >
                    {isSelected && (
                      <Check size={12} color={muscleColor} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text style={subgroupTextStyle}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Exercises list */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={sortedExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const primaryMuscles = getList(item, 'primary_muscles');
            const equipment = getList(item, 'equipment');
            const borderColor = primaryMuscles.length > 0
              ? getMuscleColor(primaryMuscles[0])
              : colors.border;
            const borderStyles = createExerciseCardBorderStyles(colors, borderColor);
            const extraEquipment = equipment.slice(1);

            // ЖЕЛЕЗОБЕТОННЫЙ РАДИУС 21, КАК ПРОСИЛ
            const getIconPosition = (index: number, total: number) => {
              const radius = 21;
              const angles = total === 1
                ? [0]
                : total === 2
                ? [-30, 30]
                : [-45, 0, 45];
              const angle = angles[index] || 0;
              const rad = (angle * Math.PI) / 180;
              return {
                right: -radius * Math.cos(rad) + 5,
                top: radius * Math.sin(rad) + 25,
              };
            };

            const iconMainStyle = getExerciseIconMainStyle(borderColor, colors.surface);

            return (
              <FadeIn delay={index * 40}>
                <TouchableOpacity
                  style={[cardStyles.exerciseListItem, borderStyles.exerciseCardWithBorder]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/exercise/${item.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  {/* Блок иконок оборудования */}
                  <View style={cardStyles.exerciseIconContainer}>
                    <View style={iconMainStyle}>
                      <EquipmentIcon
                        name={equipment[0] || 'Тренажер'}
                        primaryMuscles={primaryMuscles}
                        size={42}
                        scale={0.9}
                      />
                    </View>
                    
                    {/* Доп. иконки */}
                    {extraEquipment.map((eq, idx) => {
                      const pos = getIconPosition(idx, extraEquipment.length);
                      const iconExtraStyle = getExerciseIconExtraStyle(pos.right, pos.top, colors.background, borderColor);
                      
                      return (
                        <View key={idx} style={iconExtraStyle}>
                          <EquipmentIcon
                            name={eq}
                            primaryMuscles={primaryMuscles}
                            size={12}
                            scale={0.9}
                          />
                        </View>
                      );
                    })}
                  </View>

                  {/* Контент: название + мышцы */}
                  <View style={cardStyles.exerciseListItemContent}>
                    <Text style={cardStyles.exerciseNameLarge} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {/* Баблы мышц */}
                    {primaryMuscles.length > 0 && (
                      <View style={cardStyles.muscleBubblesContainer}>
                        {primaryMuscles.map((muscle, idx) => {
                          const muscleColor = getMuscleColor(muscle);
                          const bubbleStyle = getMuscleBubbleStyle(muscleColor);
                          const bubbleTextStyle = getMuscleBubbleTextStyle(muscleColor);
                          
                          return (
                            <View key={idx} style={bubbleStyle}>
                              <Text style={bubbleTextStyle}>
                                {muscle}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </FadeIn>
            );
          }}
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

      {/* Sort sheet */}
      {showSortSheet && (
        <>
          <TouchableOpacity
            style={cardStyles.sortOverlay}
            onPress={() => setShowSortSheet(false)}
            activeOpacity={1}
          />
          <View style={cardStyles.sortSheetContainer}>
            <Text style={cardStyles.sortSheetTitle}>Сортировка</Text>
            {[
              { key: 'name-asc', label: 'По названию (А-Я)' },
              { key: 'name-desc', label: 'По названию (Я-А)' },
              { key: 'popularity', label: 'По популярности' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={cardStyles.sortOption}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortSheet(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  cardStyles.sortOptionText,
                  sortBy === option.key && cardStyles.sortOptionTextActive,
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Check size={20} color={colors.primary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}