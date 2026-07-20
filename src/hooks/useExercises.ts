import { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  getExercises,
  getFilterOptions,
  ExerciseListItem,
  ExerciseSortBy,
  FilterOption,
} from '../services/exercisesService';

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 300;

export function useExercises() {
  // ===== UI STATE =====
  const [searchInput, setSearchInput] = useState('');   // печатается в поле
  const [searchQuery, setSearchQuery] = useState('');   // debounce-значение для запроса
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); // ✅ НОВОЕ
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);   // ✅ НОВОЕ
  const [sortBy, setSortBy] = useState<ExerciseSortBy>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showEquipmentSheet, setShowEquipmentSheet] = useState(false);        // ✅ НОВОЕ

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ===== СЛОВАРИ ФИЛЬТРОВ (один раз, кэш навсегда) =====
  const { data: filterOptions } = useQuery({
    queryKey: ['exerciseFilterOptions'],
    queryFn: getFilterOptions,
    staleTime: Infinity,
  });

  const equipmentOptions: FilterOption[] = filterOptions?.equipment ?? [];

  const categoryCounts: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    (filterOptions?.categories ?? []).forEach(c => {
      map[c.value] = c.count;
    });
    return map;
  }, [filterOptions]);

  // ===== REACT QUERY =====
  const {
    data,
    isLoading,
    isRefetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<ExerciseListItem[], Error>({
    queryKey: ['exercises', selectedMuscles, selectedCategories, selectedEquipment, searchQuery, sortBy],
    queryFn: async ({ pageParam }): Promise<ExerciseListItem[]> => {
      return await getExercises({
        search: searchQuery || undefined,
        muscles: selectedMuscles.length > 0 ? selectedMuscles : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
        sortBy,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  const exercises: ExerciseListItem[] = data?.pages.flat() ?? [];

  // Суммарный счётчик активных фильтров (мышцы + категории + оборудование)
  const activeFiltersCount =
    selectedMuscles.length + selectedCategories.length + selectedEquipment.length;

  // ===== ДЕЙСТВИЯ =====
  const toggleMuscle = useCallback((muscle: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  }, []);

  const toggleCategory = useCallback((category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const toggleEquipment = useCallback((eq: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEquipment(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  }, []);

  const resetFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMuscles([]);
    setSelectedCategories([]);
    setSelectedEquipment([]);
    setSearchInput('');
  }, []);

  const toggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSearch(prev => !prev);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchInput('');
  }, []);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    exercises,
    loading: isLoading,
    refreshing: isRefetching,
    isError,
    hasMore: hasNextPage ?? false,
    loadingMore: isFetchingNextPage,
    searchInput,
    setSearchInput,
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
    loadMore,
    refetch,
  };
}