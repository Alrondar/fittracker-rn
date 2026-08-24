import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  getPrograms,
  getMyPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  copyProgramForUser,
  Program,
  ProgramFilters,
} from '../services/programsService';

export type TabType = 'my' | 'ready';
export type SortType = 'date' | 'name' | 'level';
export type LevelFilter = 'beginner' | 'intermediate' | 'advanced';

export interface UseProgramsOptions {
  userId: string | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface UseProgramsReturn {
  // Табы
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  // Данные
  programs: Program[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  // Фильтры и поиск
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  selectedLevels: LevelFilter[];
  toggleLevel: (level: LevelFilter) => void;
  resetLevels: () => void;
  sortBy: SortType;
  setSortBy: (s: SortType) => void;
  showSortMenu: boolean;
  setShowSortMenu: (v: boolean) => void;
  // Модалка формы
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  editingProgram: Program | null;
  setEditingProgram: (p: Program | null) => void;
  // Форма
  formName: string;
  setFormName: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formDuration: string;
  setFormDuration: (v: string) => void;
  formLevel: LevelFilter;
  setFormLevel: (v: LevelFilter) => void;
  saving: boolean;
  // Действия
  onRefresh: () => void;
  loadMore: () => void;
  openCreateModal: () => void;
  handleSaveProgram: () => Promise<void>;
  handleLongPress: (program: Program) => void;
  handleProgramPress: (program: Program) => void;
}

export function usePrograms(options: UseProgramsOptions): UseProgramsReturn {
  const { userId, showToast } = options;
  const router = useRouter();
  const queryClient = useQueryClient();

  // ===== UI STATE =====
  const [activeTabState, setActiveTabState] = useState<TabType>('my');
  const [searchQueryState, setSearchQueryState] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<LevelFilter[]>([]);
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState('8');
  const [formLevel, setFormLevel] = useState<LevelFilter>('beginner');

  // ===== REACT QUERY: Загрузка программ =====
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<Program[], Error>({
    queryKey: ['programs', activeTabState, userId, selectedLevels, searchQueryState, sortBy],
    queryFn: async ({ pageParam }): Promise<Program[]> => {
      const currentPage = pageParam as number;
      const filters: ProgramFilters = {
        level: selectedLevels.length > 0 ? (selectedLevels as any) : undefined,
        search: searchQueryState || undefined,
        sortBy: sortBy,
        limit: 10,
        offset: (currentPage - 1) * 10,
      };

      if (activeTabState === 'my') {
        if (!userId) return [];
        return await getMyPrograms(userId, filters);
      } else {
        return await getPrograms(filters);
      }
    },
    initialPageParam: 1, // ✅ ИСПРАВЛЕНО: обязательный параметр в v5
    getNextPageParam: (lastPage: Program[], allPages: Program[][]) => {
      if (lastPage.length < 10) return undefined;
      return allPages.length + 1;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // ✅ ИСПРАВЛЕНО: Явная типизация
  const programs: Program[] = data?.pages.flat() || [];

  // ===== МУТАЦИИ =====
  const saveMutation = useMutation({
    mutationFn: async (programData: any) => {
      if (editingProgram) {
        return await updateProgram(editingProgram.id, programData);
      } else {
        return await createProgram(programData, userId!);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(editingProgram ? 'Программа обновлена' : 'Программа создана', 'success');
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      showToast(error.message || 'Не удалось сохранить', 'error');
    },
  });

const deleteMutation = useMutation({
  mutationFn: async (programId: string) => {
    await deleteProgram(programId, userId!);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['programs'] });
    queryClient.invalidateQueries({ queryKey: ['userProgramsStatus'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['workouts'] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Программа удалена', 'success');
  },
  onError: (error: any) => {
    showToast(error.message || 'Не удалось удалить', 'error');
  },
});

  // ===== ОБЁРТКИ БЕЗ АНИМАЦИИ (PROG-1: LayoutAnimation убран — CLAUDE.md §9 anti-pattern) =====
  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
  };

  const setSearchQuery = (q: string) => {
    setSearchQueryState(q);
  };

  const toggleLevel = (level: LevelFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const resetLevels = () => {
    setSelectedLevels([]);
  };

  // ===== ДЕЙСТВИЯ =====
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openCreateModal = () => {
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }
    setEditingProgram(null);
    setFormName('');
    setFormDescription('');
    setFormDuration('8');
    setFormLevel('beginner');
    setShowCreateModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveProgram = async () => {
    if (!formName.trim()) {
      showToast('Введите название программы', 'error');
      return;
    }
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }

    const programData = {
      name: formName.trim(),
      description: formDescription.trim(),
      duration: parseInt(formDuration) || 8,
      level: formLevel,
      schedule: [],
    };

    saveMutation.mutate(programData);
  };

  const handleLongPress = (program: Program) => {
    if (activeTabState !== 'my') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Действия с программой',
      `"${program.name}"`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Редактировать',
          onPress: () => {
            setEditingProgram(program);
            setFormName(program.name);
            setFormDescription(program.description);
            setFormDuration(program.duration.toString());
            setFormLevel(program.level);
            setShowCreateModal(true);
          },
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(program.id),
        },
      ]
    );
  };

  const handleProgramPress = (program: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (activeTabState === 'ready' && !program.id.startsWith('user_')) {
      Alert.alert(
        'Редактировать программу?',
        `Программа "${program.name}" будет скопирована в "Мои программы" для редактирования`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Скопировать и редактировать',
            onPress: () => copyToMyPrograms(program),
          },
          {
            text: 'Только посмотреть',
            onPress: () => router.push(`/program/${program.id}`),
          },
        ]
      );
    } else {
      router.push(`/program/${program.id}`);
    }
  };

  const copyToMyPrograms = async (program: Program) => {
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }

    try {
      const copiedProgram = await copyProgramForUser(program.id, userId);
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setActiveTabState('my');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа скопирована в "Мои программы"', 'success');

      setEditingProgram(copiedProgram);
      setFormName(copiedProgram.name);
      setFormDescription(copiedProgram.description);
      setFormDuration(copiedProgram.duration.toString());
      setFormLevel(copiedProgram.level);
      setShowCreateModal(true);
    } catch (e: any) {
      showToast(e.message || 'Не удалось скопировать программу', 'error');
    }
  };

  return {
    activeTab: activeTabState,
    setActiveTab,
    programs,
    loading: isLoading,
    refreshing: isRefetching,
    hasMore: hasNextPage ?? false,
    loadingMore: isFetchingNextPage,
    searchQuery: searchQueryState,
    setSearchQuery,
    showSearch,
    setShowSearch,
    selectedLevels,
    toggleLevel,
    resetLevels,
    sortBy,
    setSortBy,
    showSortMenu,
    setShowSortMenu,
    showCreateModal,
    setShowCreateModal,
    editingProgram,
    setEditingProgram,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    formDuration,
    setFormDuration,
    formLevel,
    setFormLevel,
    saving: saveMutation.isPending,
    onRefresh,
    loadMore,
    openCreateModal,
    handleSaveProgram,
    handleLongPress,
    handleProgramPress,
  };
}