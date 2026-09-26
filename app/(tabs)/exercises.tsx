// app/(tabs)/exercises.tsx
// Справочник упражнений: поиск, фильтры (группы мышц/мышцы/категории/оборудование/
// активация), сортировка, FlashList со строками-карточками.
// DA-P2-8: split — ExerciseRow, MuscleGroupFilters, ExerciseSearchBar,
// ExerciseSortSheet, ActivationFilterChip в src/components/exercises/.
import { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Search, X, ArrowUpDown } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { useExercises } from '../../src/hooks/useExercises';
import { SPACING } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../src/components/Skeleton';
import { StateBlock } from '../../src/components/ui/StateBlock';
import { FadeIn } from '../../src/components/FadeIn';
import { CategoryStrip } from '../../src/components/exercises/CategoryStrip';
import { EquipmentSheet } from '../../src/components/exercises/EquipmentSheet';
import { ExerciseRow } from '../../src/components/exercises/ExerciseRow';
import { MuscleGroupFilters } from '../../src/components/exercises/MuscleGroupFilters';
import { ExerciseSearchBar } from '../../src/components/exercises/ExerciseSearchBar';
import { ExerciseSortSheet } from '../../src/components/exercises/ExerciseSortSheet';
import { ActivationFilterChip } from '../../src/components/exercises/ActivationFilterChip';
import type { TextInput } from 'react-native';

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);
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

  const handleExercisePress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/exercise/${id}`);
    },
    [router]
  );

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Search size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Упражнения не найдены
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        {activeFiltersCount > 0 || searchInput
          ? 'Попробуйте изменить параметры поиска или сбросить фильтры'
          : 'Измените параметры поиска, чтобы найти нужное упражнение'}
      </Text>
      {(activeFiltersCount > 0 || searchInput) && (
        <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={resetFilters}>
          <AppBadge variant="primary" size="medium">
            Сбросить фильтры
          </AppBadge>
        </TouchableOpacity>
      )}
    </FadeIn>
  );

  const renderError = () => (
    // UX-2 (audit-4): канонный StateBlock.
    <StateBlock
      tone="error"
      title="Не удалось загрузить упражнения"
      description="Проверьте соединение и попробуйте снова"
      actionLabel="Повторить"
      onAction={() => refetch()}
    />
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
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Загружаем ещё...
          </Text>
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

  return (
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={commonStyles.header}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
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
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: sortBy !== 'name-asc' ? colors.primaryLight : colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Сортировка"
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
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: showSearch ? colors.primaryLight : colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={showSearch ? 'Закрыть поиск' : 'Открыть поиск'}
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
          <ExerciseSearchBar
            inputRef={searchInputRef}
            value={searchInput}
            onChangeText={setSearchInput}
            isSearching={isSearching}
            tooShort={searchTooShort}
          />
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

      <View style={{ backgroundColor: colors.background }}>
        <MuscleGroupFilters selectedMuscles={selectedMuscles} onToggleMuscle={toggleMuscle} />
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
        <ActivationFilterChip active={activationOnly} onToggle={toggleActivation} />
      </View>

      {/* Список упражнений */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : isError && exercises.length === 0 ? (
        renderError()
      ) : (
        <FlashList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExerciseRow item={item} onPress={handleExercisePress} />}
          drawDistance={1000}
          contentContainerStyle={{ paddingVertical: SPACING.md, paddingBottom: 100 }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
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

      <ExerciseSortSheet
        visible={showSortSheet}
        sortBy={sortBy}
        onSelect={setSortBy}
        onClose={() => setShowSortSheet(false)}
      />
    </SafeAreaView>
  );
}
