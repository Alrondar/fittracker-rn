import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
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
import { Search, Dumbbell, Check, X, ArrowUpDown } from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';
import { MUSCLE_GROUPS } from '../../src/constants/muscleGroups';
import { getMuscleColor } from '../../src/constants/muscleColors';

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
  
  // Новые state для сортировки
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
    setActiveGroup(prev => prev === groupName ? null : groupName);
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

  // Фильтрация по поиску
  const filteredExercises = exercises.filter(ex => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = ex.name.toLowerCase().includes(query);
    const muscleMatch = getList(ex, 'primary_muscles').some(m =>
      m.toLowerCase().includes(query)
    );
    return nameMatch || muscleMatch;
  });

  // Сортировка упражнений
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'ru');
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'ru');
    // Для popularity можно добавить подсчёт использований в программах
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
      {/* ===== ЗАГОЛОВОК С ИКОНКАМИ ПОИСКА И СОРТИРОВКИ ===== */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
              Справочник упражнений
            </Text>
            <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
              База упражнений
            </Text>
          </View>
          
          {/* Кнопка сортировки */}
          <TouchableOpacity
            onPress={() => setShowSortSheet(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: sortBy !== 'name-asc' ? colors.primaryLight : colors.surfaceSecondary,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: SPACING.sm,
            }}
            activeOpacity={0.7}
          >
            <ArrowUpDown 
              size={20} 
              color={sortBy !== 'name-asc' ? colors.primary : colors.textSecondary} 
              strokeWidth={2} 
            />
          </TouchableOpacity>

          {/* Кнопка поиска */}
          <TouchableOpacity
            onPress={toggleSearch}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: showSearch ? colors.primaryLight : colors.surfaceSecondary,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: SPACING.md,
            }}
            activeOpacity={0.7}
          >
            {showSearch ? (
              <X size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Search size={20} color={colors.textSecondary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        {/* ===== ПОЛЕ ПОИСКА (раскрывается под заголовком) ===== */}
        {showSearch && (
          <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.md,
              paddingHorizontal: SPACING.md,
              height: 44,
              width: '100%',
            }}>
              <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                ref={searchInputRef}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: colors.textPrimary,
                  marginLeft: SPACING.sm,
                  paddingVertical: 0,
                  height: '100%',
                }}
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

      {/* ===== ШАПКА СО СЧЁТЧИКОМ И СБРОСОМ ===== */}
      {selectedMuscles.length > 0 && (
        <View style={[cardStyles.muscleGroupSelectorHeader, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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

      {/* ===== ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ ЧИПОВ ГРУПП ===== */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <FlatList
          horizontal
          data={groupNames}
          keyExtractor={(item) => item}
          renderItem={({ item: groupName }) => {
            const muscles = MUSCLE_GROUPS[groupName];
            const isActive = activeGroup === groupName;
            const selectedInGroup = muscles.filter(m => selectedMuscles.includes(m)).length;
            const hasSelected = selectedInGroup > 0;

            let chipStyle = cardStyles.muscleGroupChipDefault;
            let textStyle = cardStyles.muscleGroupChipTextDefault;
            if (isActive) {
              chipStyle = cardStyles.muscleGroupChipActive;
              textStyle = cardStyles.muscleGroupChipTextActive;
            } else if (hasSelected) {
              chipStyle = cardStyles.muscleGroupChipSelected;
              textStyle = cardStyles.muscleGroupChipTextSelected;
            }

            let badgeStyle: any;
            let badgeTextStyle: any;
            if (isActive) {
              badgeStyle = cardStyles.muscleGroupBadgeActive;
              badgeTextStyle = cardStyles.muscleGroupBadgeTextActive;
            } else if (hasSelected) {
              badgeStyle = cardStyles.muscleGroupBadgeSelected;
              badgeTextStyle = cardStyles.muscleGroupBadgeTextSelected;
            }

            return (
              <TouchableOpacity
                key={groupName}
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

        {/* ===== РАСКРЫВАЮЩИЙСЯ СПИСОК ПОДМЫШЦ ===== */}
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
      </View>

      {/* ===== СПИСОК УПРАЖНЕНИЙ ===== */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <FlatList
          data={sortedExercises}
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

      {/* ===== BOTTOM SHEET ДЛЯ СОРТИРОВКИ ===== */}
      <Modal
        visible={showSortSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortSheet(false)}
      >
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
      </Modal>
    </SafeAreaView>
  );
}