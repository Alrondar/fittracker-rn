import { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { X, Search, Check, ArrowUpDown, Zap, Flame, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { useTheme } from '../../../hooks/useTheme';
import { useExercises } from '../../../hooks/useExercises';
import { ExerciseListItem, ExerciseSortBy } from '../../../services/exercisesService';
import { MUSCLE_GROUPS } from '../../../constants/muscleGroups';
import { getMuscleColor, MUSCLE_COLORS } from '../../../constants/muscleColors';
import { EquipmentIcon } from '../../EquipmentIcon';
import { AppBadge } from '../../ui/AppBadge';
import { CategoryStrip } from '../../exercises/CategoryStrip';
import { EquipmentSheet } from '../../exercises/EquipmentSheet';

interface ExercisePickerSheetProps {
  onSelectExercise: (exercise: ExerciseListItem) => void;
  onClose: () => void;
  colors: any;
  badgeStyles: any;
}

const getGroupColor = (groupName: string): string =>
  MUSCLE_COLORS[groupName.toLowerCase()] || '#6B7280';

// ===== Мемоизированная строка результата (иконка оборудования вместо заглушки-гантели) =====
interface PickerRowProps {
  item: ExerciseListItem;
  onPress: (exercise: ExerciseListItem) => void;
}

const PickerRow = memo(function PickerRow({ item, onPress }: PickerRowProps) {
  const { colors } = useTheme();
  const borderColor =
    item.primary_muscles.length > 0 ? getMuscleColor(item.primary_muscles[0]) : colors.border;
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        gap: SPACING.md,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: borderColor + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <EquipmentIcon
          name={item.equipment[0] || 'Тренажер'}
          primaryMuscles={item.primary_muscles}
          size={24}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 }}>
          {(item.popularity ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Flame size={11} color={colors.warning} />
              <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                {item.popularity}
              </Text>
            </View>
          )}
          {item.can_be_activation && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Zap size={11} color={colors.warning} />
              <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '600' }]}>
                Активация
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ===== Пикер: самодостаточен на useExercises (поиск + фильтры справочника) =====
export function ExercisePickerSheet({
  onSelectExercise,
  onClose,
  colors,
  badgeStyles,
}: ExercisePickerSheetProps) {
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
    activationOnly,
    toggleActivation,
    onRefresh,
    loadMore,
    refetch,
  } = useExercises();

  const handlePick = useCallback(
    (exercise: ExerciseListItem) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelectExercise(exercise);
    },
    [onSelectExercise],
  );

  const toggleGroup = (groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveGroup((prev) => (prev === groupName ? null : groupName));
  };

  const groupNames = Object.keys(MUSCLE_GROUPS);

  // Фильтры живут в скроллящемся заголовке списка → не съедают фиксированную высоту модалки.
  const renderHeader = () => (
    <View>
      {/* Лента групп мышц + раскрытие отдельных мышц (как в справочнике) */}
      <FlatList
        horizontal
        data={groupNames}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          gap: SPACING.sm,
        }}
        renderItem={({ item: groupName }) => {
          const muscles = MUSCLE_GROUPS[groupName];
          const isActive = activeGroup === groupName;
          const selectedInGroup = muscles.filter((m) => selectedMuscles.includes(m)).length;
          const groupColor = getGroupColor(groupName);
          return (
            <TouchableOpacity
              onPress={() => toggleGroup(groupName)}
              activeOpacity={0.6}
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
            >
              <Text
                style={{
                  fontSize: 13,
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
      />
      {activeGroup && (
        <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {MUSCLE_GROUPS[activeGroup].map((muscle) => {
              const isSelected = selectedMuscles.includes(muscle);
              const muscleColor = getMuscleColor(muscle);
              return (
                <TouchableOpacity
                  key={muscle}
                  onPress={() => toggleMuscle(muscle)}
                  activeOpacity={0.6}
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
                      fontSize: 12,
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

      {/* Категории + триггер шкафа оборудования (переиспользуем справочник) */}
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

      {/* Тумблер «Только активация» + индикатор сброса фильтров */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.sm,
          gap: SPACING.sm,
        }}
      >
        <TouchableOpacity
          onPress={toggleActivation}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
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
            Активация
          </Text>
        </TouchableOpacity>
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            onPress={resetFilters}
            style={{ paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm }}
          >
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              Сбросить ({activeFiltersCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>
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

  const renderEmpty = () => (
    <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
      <Dumbbell size={48} color={colors.textTertiary} strokeWidth={1.5} />
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
        ]}
      >
        {searchInput || activeFiltersCount > 0
          ? 'Ничего не найдено. Измените запрос или сбросьте фильтры.'
          : 'Начните вводить название упражнения'}
      </Text>
      {(searchInput || activeFiltersCount > 0) && (
        <TouchableOpacity onPress={resetFilters} style={{ marginTop: SPACING.md }}>
          <AppBadge variant="primary" size="medium">
            Сбросить
          </AppBadge>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '88%',
        }}
      >
        {/* Фиксированный верх: заголовок + поиск */}
        <View
          style={{
            paddingTop: SPACING.lg,
            paddingHorizontal: SPACING.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: SPACING.md,
            }}
          >
            <Text style={[typography.h5, { color: colors.textPrimary }]}>Добавить упражнение</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <TouchableOpacity
                onPress={() => setShowSortSheet(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    sortBy !== 'name-asc' ? colors.primaryLight : colors.surfaceSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ArrowUpDown
                  size={18}
                  color={sortBy !== 'name-asc' ? colors.primary : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceSecondary,
              borderRadius: BORDER_RADIUS.md,
              paddingHorizontal: SPACING.md,
              marginBottom: SPACING.md,
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
              style={{ flex: 1, padding: SPACING.md, fontSize: 16, color: colors.textPrimary }}
              placeholder="Поиск по названию..."
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
                { color: colors.warning, marginBottom: SPACING.sm },
              ]}
            >
              Введите минимум 2 символа
            </Text>
          )}
        </View>

        {/* Результаты + фильтры в скроллящемся заголовке */}
        {loading ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError && exercises.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center' },
              ]}
            >
              Не удалось загрузить упражнения
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: SPACING.md }}>
              <AppBadge variant="primary" size="medium">
                Повторить
              </AppBadge>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PickerRow item={item} onPress={handlePick} />}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            windowSize={7}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}

        {/* Плашка параметров по умолчанию */}
        <View
          style={{
            marginHorizontal: SPACING.lg,
            marginTop: SPACING.sm,
            marginBottom: SPACING.lg,
            padding: SPACING.md,
            backgroundColor: colors.primaryLight,
            borderRadius: BORDER_RADIUS.md,
          }}
        >
          <Text style={[typography.caption, { color: colors.primary }]}>
            По умолчанию: 4 подхода × 8-12 повт., отдых 90с, средняя интенсивность
          </Text>
        </View>
      </View>

      {/* Шкаф оборудования (оверлей) */}
      {showEquipmentSheet && (
        <EquipmentSheet
          options={equipmentOptions}
          selected={selectedEquipment}
          onToggle={toggleEquipment}
          onReset={() => selectedEquipment.forEach((eq) => toggleEquipment(eq))}
          onClose={() => setShowEquipmentSheet(false)}
        />
      )}

      {/* Лист сортировки (оверлей) */}
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
    </View>
  );
}