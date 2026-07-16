import { useState, useEffect } from 'react';
import { Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  getPrograms,
  getMyPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  Program,
  ProgramFilters,
} from '../services/programsService';
import { supabase } from '../lib/supabase';

// Включить LayoutAnimation на Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

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

  // ===== ВНУТРЕННИЕ STATE =====
  const [activeTabState, setActiveTabState] = useState<TabType>('my');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
  const [saving, setSaving] = useState(false);

  // ===== ЗАГРУЗКА ПРОГРАММ =====
  const loadPrograms = async (
    tab: TabType,
    currentPage: number,
    levels: LevelFilter[],
    search: string,
    sort: SortType
  ) => {
    try {
      if (currentPage === 1) {
        setLoading(true);
      }

      const filters: ProgramFilters = {
        level: levels.length > 0 ? (levels as any) : undefined,
        search: search || undefined,
        sortBy: sort,
        limit: 10,
        offset: (currentPage - 1) * 10,
      };

      let data: Program[];
      if (tab === 'my') {
        if (!userId) {
          setPrograms([]);
          return;
        }
        data = await getMyPrograms(userId, filters);
      } else {
        data = await getPrograms(filters);
      }

      if (currentPage === 1) {
        setPrograms(data);
      } else {
        setPrograms(prev => [...prev, ...data]);
      }

      setHasMore(data.length === 10);
    } catch (e: any) {
      console.error('Ошибка загрузки программ:', e);
      showToast('Не удалось загрузить программы', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPrograms(activeTabState, page, selectedLevels, searchQueryState, sortBy);
  }, [activeTabState, page, selectedLevels, searchQueryState, sortBy, userId]);

  // ===== ОБЁРТКИ С АНИМАЦИЕЙ =====
  const setActiveTab = (tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTabState(tab);
    setPage(1);
    setPrograms([]);
  };

  const setSearchQuery = (q: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchQueryState(q);
    setPage(1);
  };

  const toggleLevel = (level: LevelFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
    setPage(1);
  };

  const resetLevels = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedLevels([]);
    setPage(1);
  };

  // ===== ДЕЙСТВИЯ =====
  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    setRefreshing(true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setPage(prev => prev + 1);
  };

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

    setSaving(true);
    try {
      const programData = {
        name: formName.trim(),
        description: formDescription.trim(),
        duration: parseInt(formDuration) || 8,
        level: formLevel,
        schedule: [],
      };

      if (editingProgram) {
        await updateProgram(editingProgram.id, programData);
        showToast('Программа обновлена', 'success');
      } else {
        await createProgram(programData, userId);
        showToast('Программа создана', 'success');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setPage(1);
    } catch (e: any) {
      showToast(e.message || 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
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
          onPress: async () => {
            try {
              await deleteProgram(program.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('Программа удалена', 'success');
              setPage(1);
            } catch (e: any) {
              showToast(e.message || 'Не удалось удалить', 'error');
            }
          },
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
            onPress: () => copyProgramToUser(program),
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

  const copyProgramToUser = async (program: Program) => {
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('copy_program_for_user', {
        p_program_id: program.id,
        p_user_id: userId,
      });

      if (error) throw error;

      // RPC может возвращать массив или одну строку
      const newProgramId = Array.isArray(data)
        ? data[0]?.id || data[0]
        : data?.id || data;

      // Переключаемся на вкладку "Мои программы"
      setActiveTabState('my');
      setPage(1);
      setSelectedLevels([]);
      setSearchQueryState('');
      setSortBy('date');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа скопирована в "Мои программы"', 'success');

      // Открываем модалку редактирования скопированной программы
      if (newProgramId) {
        const { data: copiedData } = await supabase
          .from('programs')
          .select('*')
          .eq('id', newProgramId)
          .single();

        if (copiedData) {
          setEditingProgram(copiedData);
          setFormName(copiedData.name);
          setFormDescription(copiedData.description);
          setFormDuration(copiedData.duration.toString());
          setFormLevel(copiedData.level);
          setShowCreateModal(true);
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Не удалось скопировать программу', 'error');
    }
  };

  return {
    activeTab: activeTabState,
    setActiveTab,
    programs,
    loading,
    refreshing,
    hasMore,
    loadingMore,
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
    saving,
    onRefresh,
    loadMore,
    openCreateModal,
    handleSaveProgram,
    handleLongPress,
    handleProgramPress,
  };
}