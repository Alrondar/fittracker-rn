import { useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Search, Check, X, ArrowUpDown, AlertTriangle, Flame, Zap } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useExercises } from '../../src/hooks/useExercises';
import { ExerciseListItem, ExerciseSortBy } from '../../src/services/exercisesService';
import { MUSCLE_GROUPS } from '../../src/constants/muscleGroups';
import { getMuscleColor, MUSCLE_COLORS } from '../../src/constants/muscleColors';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { EquipmentIcon } from '../../src/components/EquipmentIcon';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { CategoryStrip } from '../../src/components/exercises/CategoryStrip';
import { EquipmentSheet } from '../../src/components/exercises/EquipmentSheet';

// Цвет группы мышц — из единых констант
const getGroupColor = (groupName: string): string =>
  MUSCLE_COLORS[groupName.toLowerCase()] || '#6B7280';

// ===== Мемоизированная строка списка =====
interface ExerciseRowProps {
  item: ExerciseListItem;
  onPress: (id: string) => void;
}

const ExerciseRow = memo(function ExerciseRow({ item, onPress }: ExerciseRowProps) {
  const { colors } = useTheme();
  const borderColor =
    item.primary_muscles.length > 0 ? getMuscleColor(item.primary_muscles[0]) : colors.border;
  return (
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
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: borderColor + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: SPACING.md,
        }}
      >
        <EquipmentIcon
          name={item.equipment[0] || 'Тренажер'}
          primaryMuscles={item.primary_muscles}
          size={32}
          scale={0.9}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.primary_muscles.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {item.primary_muscles.slice(0, 2).map((muscle, idx) => (
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
        {(item.popularity ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <Flame size={11} color={colors.warning} />
            <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
              {item.popularity}
            </Text>
          </View>
        )}
        {item.can_be_activation && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <Zap size={11} color={colors.warning} />
            <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '600' }]}>
              Активация
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const {
    exercises,
    loading,
    refreshing,
    isSearching,
    isError,
    hasMore,
    loadingMore,
    searchInput,
    setSearchInput,
    searchTooShort,
    showSearch,
    toggleSearch,
    closeSearch,
    selectedMuscles,
    toggleMuscle,
    selectedCategories,
    toggleCategory,
    selectedEquipment,
    toggleEquipment,
    resetFilters,
    activeFiltersCount,
    sortBy,
    setSortBy,
    showSortSheet,
    setShowSortSheet,
    showEquipmentSheet,
    setShowEquipmentSheet,
    equipmentOptions,
    categoryCounts,
    onRefresh,
    activationOnly,
    toggleActivation,
    loadMore,
    refetch,
  } = useExercises();

  const handleToggleSearch = () => {
    const willOpen = !showSearch;
    if (willOpen) {
      toggleSearch();
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      closeSearch();
    }
  };

  const toggleGroup = (groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveGroup((prev) => (prev === groupName ? null : groupName));
  };

  const handleExercisePress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/exercise/${id}`);
    },
    [router],
  );

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Search size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Упражнения не найдены
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        {activeFiltersCount > 0 || searchInput
          ? 'Попробуйте изменить запрос или сбросить фильтры'
          : 'База упражнений пуста'}
      </Text>
      {(activeFiltersCount > 0 || searchInput) && (
        <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={resetFilters}>
          <AppBadge variant="primary" size="medium">
            Сбросить
          </AppBadge>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  const renderError = () => (
    <View style={commonStyles.emptyContainer}>
      <AlertTriangle size={64} color={colors.warning} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Не удалось загрузить упражнения
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Проверьте соединение и попробуйте снова
      </Text>
      <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={() => refetch()}>
        <AppBadge variant="primary" size="medium">
          Повторить
        </AppBadge>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: SPACING.sm,
            paddingVertical: SPACING.lg,
          }}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Загружаем ещё...</Text>
        </View>
      );
    }
    if (!hasMore && exercises.length > 0) {
      return (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, textAlign: 'center', paddingVertical: SPACING.lg },
          ]}
        >
          Показаны все упражнения ({exercises.length})
        </Text>
      );
    }
    return null;
  };

  const groupNames = Object.keys(MUSCLE_GROUPS);

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
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
              onPress={handleToggleSearch}
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
        {/* Поиск: живой спиннер + подсветка рамки + подсказка */}
        {showSearch && (
          <View style={{ marginTop: SPACING.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: BORDER_RADIUS.lg,
                paddingHorizontal: SPACING.md,
                borderWidth: 1,
                borderColor: searchTooShort ? colors.warning : colors.border,
              }}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              )}
              <TextInput
                ref={searchInputRef}
                style={{ flex: 1, padding: SPACING.md, fontSize: 16, color: colors.textPrimary }}
                placeholder="Поиск упражнения"
                placeholderTextColor={colors.textTertiary}
                value={searchInput}
                onChangeText={setSearchInput}
                autoFocus
                returnKeyType="search"
              />
              {searchInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchInput('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            {searchTooShort && (
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.warning, marginTop: SPACING.xs, paddingHorizontal: SPACING.xs },
                ]}
              >
                Введите минимум 2 символа
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Индикатор активных фильтров */}
      {activeFiltersCount > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.sm,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            Выбрано: {activeFiltersCount}
          </Text>
          <TouchableOpacity onPress={resetFilters}>
            <Text style={[typography.labelBold, { color: colors.primary }]}>Сбросить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Фильтр по группам мышц */}
      <View style={{ backgroundColor: colors.background }}>
        <FlatList
          horizontal
          data={groupNames}
          keyExtractor={(item) => item}
          renderItem={({ item: groupName }) => {
            const muscles = MUSCLE_GROUPS[groupName];
            const isActive = activeGroup === groupName;
            const selectedInGroup = muscles.filter((m) => selectedMuscles.includes(m)).length;
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
                }}
                onPress={() => toggleGroup(groupName)}
                activeOpacity={0.6}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isActive ? groupColor : colors.textPrimary,
                  }}
                >
                  {groupName}
                </Text>
                {selectedInGroup > 0 && (
                  <View
                    style={{
                      marginLeft: SPACING.xs,
                      backgroundColor: groupColor,
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textInverse }}>
                      {selectedInGroup}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.md,
            gap: SPACING.sm,
          }}
          showsHorizontalScrollIndicator={false}
        />
        {activeGroup && (
          <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {MUSCLE_GROUPS[activeGroup].map((muscle) => {
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
                      <Check
                        size={12}
                        color={muscleColor}
                        strokeWidth={2.5}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        color: isSelected ? muscleColor : colors.textSecondary,
                        fontWeight: '500',
                      }}
                    >
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        {/* Лента категорий + триггер оборудования */}
        <CategoryStrip
          selectedCategories={selectedCategories}
          categoryCounts={categoryCounts}
          onToggleCategory={toggleCategory}
          equipmentSelectedCount={selectedEquipment.length}
          onOpenEquipmentSheet={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowEquipmentSheet(true);
          }}
        />
        {/* Фильтр «Только активация» */}
        <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
          <TouchableOpacity
            onPress={toggleActivation}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 6,
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              borderRadius: BORDER_RADIUS.full,
              backgroundColor: activationOnly ? colors.warning + '20' : colors.surface,
              borderWidth: 1,
              borderColor: activationOnly ? colors.warning : colors.border,
            }}
          >
            <Zap
              size={14}
              color={activationOnly ? colors.warning : colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: activationOnly ? colors.warning : colors.textSecondary,
                  fontWeight: activationOnly ? '700' : '500',
                },
              ]}
            >
              Только активация
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Список упражнений */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : isError && exercises.length === 0 ? (
        renderError()
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExerciseRow item={item} onPress={handleExercisePress} />}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingBottom: 100 }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          windowSize={7}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Шкаф оборудования */}
      {showEquipmentSheet && (
        <EquipmentSheet
          options={equipmentOptions}
          selected={selectedEquipment}
          onToggle={toggleEquipment}
          onReset={() => selectedEquipment.forEach((eq) => toggleEquipment(eq))}
          onClose={() => setShowEquipmentSheet(false)}
        />
      )}

      {/* Лист сортировки */}
      {showSortSheet && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.overlay,
            }}
            onPress={() => setShowSortSheet(false)}
            activeOpacity={1}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: SPACING.lg,
            }}
          >
            <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.md }]}>
              Сортировка
            </Text>
            {(
              [
                { key: 'name-asc', label: 'По названию (А-Я)' },
                { key: 'name-desc', label: 'По названию (Я-А)' },
                { key: 'popularity', label: 'По популярности' },
              ] as { key: ExerciseSortBy; label: string }[]
            ).map((option) => (
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
                  setSortBy(option.key);
                  setShowSortSheet(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: sortBy === option.key ? colors.primary : colors.textPrimary,
                      fontWeight: sortBy === option.key ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && <Check size={20} color={colors.primary} strokeWidth={2} />}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}