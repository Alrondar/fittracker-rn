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
const MIN_SEARCH_LENGTH = 2; // поиск срабатывает от 2 символов

/**
 * Нормализация поискового ввода: trim + «ё» → «е».
 * Дублирует нормализацию в SQL (search_exercises), чтобы queryKey
 * и сервер видели одинаковую строку.
 */
const normalizeSearch = (s: string): string => s.trim().replace(/ё/gi, 'е');

export function useExercises() {
  // ===== UI STATE =====
  const [searchInput, setSearchInput] = useState('');   // печатается в поле
  const [searchQuery, setSearchQuery] = useState('');   // debounce-значение для запроса
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<ExerciseSortBy>('name-asc');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showEquipmentSheet, setShowEquipmentSheet] = useState(false);

  // Debounce + порог в 2 символа + нормализация «ё» → «е».
  // Одиночный символ не фильтрует список (показываем всё), но подсказка видна.
  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = normalizeSearch(searchInput);
      setSearchQuery(normalized.length >= MIN_SEARCH_LENGTH ? normalized : '');
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Подсказка «введите минимум 2 символа» (мгновенная, без debounce)
  const searchTooShort = useMemo(() => {
    const len = searchInput.trim().length;
    return len > 0 && len < MIN_SEARCH_LENGTH;
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

  // ===== REACT QUERY: поиск + фильтры + сортировка через RPC search_exercises =====
  const {
    data,
    isLoading,
    isRefetching,
    isFetching,
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

  // Индикатор «идёт поиск» для поля ввода
  // (фоновые подгрузки следующих страниц не в счёт)
  const isSearching = isFetching && !isFetchingNextPage;

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
    isSearching,        // ✅ для спиннера в поле поиска
    isError,
    hasMore: hasNextPage ?? false,
    loadingMore: isFetchingNextPage,
    searchInput,
    setSearchInput,
    searchTooShort,     // ✅ для подсказки «минимум 2 символа»
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