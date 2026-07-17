import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
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
import { typography } from '../../src/styles/typography';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { MUSCLE_GROUPS } from '../../src/constants/muscleGroups';
import { getMuscleColor } from '../../src/constants/muscleColors';

// Прямой маппинг групп мышц на цвета
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
          style={{ marginTop: SPACING.md }}
          onPress={resetFilters}
        >
          <AppBadge variant="primary" size="medium">
            Сбросить
          </AppBadge>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  const groupNames = Object.keys(MUSCLE_GROUPS);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={commonStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
              Справочник упражнений
            </Text>
            <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
              База упражнений
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <TouchableOpacity
              onPress={() => setShowSortSheet(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: sortBy !== 'name-asc' ? colors.primaryLight : colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
              }}
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
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: showSearch ? colors.primaryLight : colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
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
        </View>

        {showSearch && (
          <View style={{ marginTop: SPACING.md }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: BORDER_RADIUS.lg,
              paddingHorizontal: SPACING.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                ref={searchInputRef}
                style={{ flex: 1, padding: SPACING.md, fontSize: 16, color: colors.textPrimary }}
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
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            Выбрано: {selectedMuscles.length}
          </Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={[typography.labelBold, { color: colors.primary }]}>
              Сбросить
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Muscle groups filter */}
      <View style={{ backgroundColor: colors.background }}>
        <FlatList
          horizontal
          data={groupNames}
          keyExtractor={(item) => item}
          renderItem={({ item: groupName }) => {
            const muscles = MUSCLE_GROUPS[groupName];
            const isActive = activeGroup === groupName;
            const selectedInGroup = muscles.filter(m => selectedMuscles.includes(m)).length;
            const groupColor = getGroupColor(groupName);

            return (
              <TouchableOpacity
                key={groupName}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: SPACING.md,
                  paddingVertical: SPACING.sm,
                  borderRadius: BORDER_RADIUS.full,
                  backgroundColor: isActive ? groupColor + '20' : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? groupColor : colors.border,
                  marginRight: SPACING.sm,
                  marginVertical: SPACING.md,
                  marginHorizontal: SPACING.lg,
                }}
                onPress={() => toggleGroup(groupName)}
                activeOpacity={0.6}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isActive ? groupColor : colors.textPrimary,
                }}>
                  {groupName}
                </Text>
                {selectedInGroup > 0 && (
                  <View style={{
                    marginLeft: SPACING.xs,
                    backgroundColor: groupColor,
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: 'white' }}>
                      {selectedInGroup}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
          showsHorizontalScrollIndicator={false}
        />

        {activeGroup && (
          <View style={{
            paddingHorizontal: SPACING.lg,
            paddingBottom: SPACING.md,
          }}>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: SPACING.sm,
            }}>
              {MUSCLE_GROUPS[activeGroup].map(muscle => {
                const isSelected = selectedMuscles.includes(muscle);
                const muscleColor = getMuscleColor(muscle);

                return (
                  <TouchableOpacity
                    key={muscle}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: SPACING.md,
                      paddingVertical: SPACING.sm,
                      borderRadius: BORDER_RADIUS.md,
                      backgroundColor: isSelected ? muscleColor + '20' : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? muscleColor : colors.border,
                    }}
                    onPress={() => toggleMuscle(muscle)}
                    activeOpacity={0.6}
                  >
                    {isSelected && (
                      <Check size={12} color={muscleColor} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text style={{
                      fontSize: 13,
                      color: isSelected ? muscleColor : colors.textSecondary,
                      fontWeight: '500',
                    }}>
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

            return (
              <FadeIn delay={index * 40}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: SPACING.md,
                    backgroundColor: colors.surface,
                    borderRadius: BORDER_RADIUS.lg,
                    marginBottom: SPACING.sm,
                    marginHorizontal: SPACING.lg,
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderLeftWidth: 4,
                  }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/exercise/${item.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  {/* Иконка оборудования */}
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: borderColor + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: SPACING.md,
                  }}>
                    <EquipmentIcon
                      name={equipment[0] || 'Тренажер'}
                      primaryMuscles={primaryMuscles}
                      size={32}
                      scale={0.9}
                    />
                  </View>

                  {/* Контент */}
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {primaryMuscles.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {primaryMuscles.slice(0, 2).map((muscle, idx) => (
                          <AppBadge
                            key={idx}
                            variant="default"
                            size="small"
                            style={{ backgroundColor: getMuscleColor(muscle) + '15' }}
                            textStyle={{ color: getMuscleColor(muscle) }}
                          >
                            {muscle}
                          </AppBadge>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </FadeIn>
            );
          }}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingBottom: 100 }}
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
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            onPress={() => setShowSortSheet(false)}
            activeOpacity={1}
          />
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: SPACING.lg,
          }}>
            <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
              Сортировка
            </Text>
            {[
              { key: 'name-asc', label: 'По названию (А-Я)' },
              { key: 'name-desc', label: 'По названию (Я-А)' },
              { key: 'popularity', label: 'По популярности' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: SPACING.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortSheet(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  typography.body,
                  {
                    color: sortBy === option.key ? colors.primary : colors.textPrimary,
                    fontWeight: sortBy === option.key ? '600' : '400',
                  }
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