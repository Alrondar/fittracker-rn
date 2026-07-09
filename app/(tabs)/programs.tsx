import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  getPrograms,
  getMyPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  Program,
  ProgramFilters,
} from '../../src/servises/programsService';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { Toast } from '../../src/components/Toast';
import { useToast } from '../../src/hooks/useToast';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import {
  Sprout,
  Dumbbell,
  Flame,
  Trophy,
  Calendar,
  Search,
  Plus,
  X,
  Edit2,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';
import { supabase } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';

type TabType = 'my' | 'ready';
type SortType = 'date' | 'name' | 'level';
type LevelFilter = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_OPTIONS: { value: LevelFilter; label: string; icon: any; color: string }[] = [
  { value: 'beginner', label: 'Новичок', icon: Sprout, color: '#4CAF50' },
  { value: 'intermediate', label: 'Средний', icon: Dumbbell, color: '#FF9800' },
  { value: 'advanced', label: 'Продвинутый', icon: Flame, color: '#F44336' },
];

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'date', label: 'По дате' },
  { value: 'name', label: 'По названию' },
  { value: 'level', label: 'По сложности' },
];

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  // ✅ ПО УМОЛЧАНИЮ ОТКРЫВАЮТСЯ "МОИ ПРОГРАММЫ"
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<LevelFilter[]>([]);
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Модалка создания/редактирования
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Форма
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState('8');
  const [formLevel, setFormLevel] = useState<LevelFilter>('beginner');
  const [saving, setSaving] = useState(false);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadPrograms();
  }, [activeTab, page, sortBy, selectedLevels, searchQuery]);

  const loadPrograms = async () => {
    try {
      setLoading(page === 1);

      const filters: ProgramFilters = {
        level: selectedLevels.length > 0 ? (selectedLevels as any) : undefined,
        search: searchQuery || undefined,
        sortBy,
        limit: 10,
        offset: (page - 1) * 10,
      };

      let data: Program[];
      if (activeTab === 'my') {
        if (!userId) {
          setPrograms([]);
          return;
        }
        data = await getMyPrograms(userId, filters);
      } else {
        data = await getPrograms(filters);
      }

      if (page === 1) {
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

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    setRefreshing(true);
    loadPrograms();
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setPage(prev => prev + 1);
  };

  const toggleLevel = (level: LevelFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
    setPage(1);
  };

  const handleLongPress = (program: Program) => {
    if (activeTab !== 'my') return;

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
              loadPrograms();
            } catch (e: any) {
              showToast(e.message || 'Не удалось удалить', 'error');
            }
          },
        },
      ]
    );
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
      loadPrograms();
    } catch (e: any) {
      showToast(e.message || 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ✅ ИСПРАВЛЕНИЕ БАГА: копирование готовой программы с переключением на вкладку "Мои"
  const copyProgramToUser = async (program: Program) => {
    if (!userId) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }

    try {
      // Вызываем RPC функцию копирования
     const { data, error } = await supabase.rpc('copy_program_for_user', {
  p_program_id: program.id,
  p_user_id: userId,
});

if (error) throw error;

// RPC может возвращать массив или одну строку
const newProgramId = Array.isArray(data) ? data[0]?.id || data[0] : data?.id || data;

console.log('📋 Скопированная программа ID:', newProgramId);

      if (error) throw error;

      // ✅ Переключаемся на вкладку "Мои программы"
      setActiveTab('my');
      // ✅ Сбрасываем пагинацию
      setPage(1);
      // ✅ Сбрасываем фильтры
      setSelectedLevels([]);
      setSearchQuery('');
      setSortBy('date');
      // ✅ Загружаем обновлённый список
      await loadPrograms();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа скопирована в "Мои программы"', 'success');

      // ✅ Открываем модалку редактирования скопированной программы
      // (опционально — можно убрать, если не нужно сразу редактировать)
      const copiedProgram = await getProgramWithDaysForEdit(newProgramId);
      if (copiedProgram) {
        setEditingProgram(copiedProgram);
        setFormName(copiedProgram.name);
        setFormDescription(copiedProgram.description);
        setFormDuration(copiedProgram.duration.toString());
        setFormLevel(copiedProgram.level);
        setShowCreateModal(true);
      }
    } catch (e: any) {
      showToast(e.message || 'Не удалось скопировать программу', 'error');
    }
  };

  // Вспомогательная функция для получения скопированной программы
  const getProgramWithDaysForEdit = async (programId: string): Promise<Program | null> => {
    try {
      const { data } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
      return data;
    } catch {
      return null;
    }
  };

  const handleProgramPress = (program: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Если это готовая программа — копируем её перед открытием
    if (activeTab === 'ready' && !program.id.startsWith('user_')) {
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
            onPress: () => {
              router.push(`/program/${program.id}`);
            },
          },
        ]
      );
    } else {
      router.push(`/program/${program.id}`);
    }
  };

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'beginner':
        return { label: 'Новичок', color: '#4CAF50', icon: <Sprout size={14} color="#4CAF50" strokeWidth={1.5} /> };
      case 'intermediate':
        return { label: 'Средний', color: '#FF9800', icon: <Dumbbell size={14} color="#FF9800" strokeWidth={1.5} /> };
      case 'advanced':
        return { label: 'Продвинутый', color: '#F44336', icon: <Flame size={14} color="#F44336" strokeWidth={1.5} /> };
      default:
        return { label: level, color: colors.textSecondary, icon: <Dumbbell size={14} color={colors.textSecondary} strokeWidth={1.5} /> };
    }
  };

  const renderProgramCard = ({ item, index }: { item: Program; index: number }) => {
    const levelInfo = getLevelInfo(item.level);
    const isMyProgram = activeTab === 'my';

    return (
      <FadeIn delay={index * 80}>
        <TouchableOpacity
          onPress={() => handleProgramPress(item)}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.85}
        >
          <View style={cardStyles.programCard}>
            {/* Верхняя часть карточки */}
            <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
              {/* Бейджи: Моя, Уровень, Длительность */}
              <View style={cardStyles.header}>
                {isMyProgram && (
                  <View style={cardStyles.myProgramBadge}>
                    <Text style={cardStyles.myProgramBadgeText}>Моя</Text>
                  </View>
                )}
                <View style={[badgeStyles.programBadge, { backgroundColor: levelInfo.color + '15' }]}>
                  {levelInfo.icon}
                  <Text style={[badgeStyles.programBadgeText, { color: levelInfo.color }]}>
                    {levelInfo.label}
                  </Text>
                </View>
                <View style={[badgeStyles.programBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Calendar size={12} color={colors.primary} strokeWidth={2} />
                  <Text style={[badgeStyles.programBadgeText, { color: colors.primary }]}>
                    {item.duration} нед
                  </Text>
                </View>
              </View>

              <Text style={cardStyles.title} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={cardStyles.description} numberOfLines={3}>
                {item.description}
              </Text>
            </View>

            {/* Расписание */}
            {item.schedule && item.schedule.length > 0 && (
              <View
                style={{
                  paddingHorizontal: SPACING.lg,
                  paddingVertical: SPACING.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, marginBottom: SPACING.sm },
                  ]}
                >
                  Расписание:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                  {item.schedule.map((day, idx) => (
                    <View
                      key={idx}
                      style={[
                        badgeStyles.dayChip,
                        { backgroundColor: colors.primary + '15' },
                      ]}
                    >
                      <Text style={[badgeStyles.dayChipText, { color: colors.primary }]}>
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Футер */}
            <View style={cardStyles.programCardFooter}>
              {isMyProgram && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLongPress(item);
                  }}
                  style={{ padding: SPACING.sm, marginRight: SPACING.sm }}
                >
                  <Edit2 size={16} color={colors.primary} strokeWidth={2} />
                </TouchableOpacity>
              )}
              <Text style={[typography.labelBold, { color: colors.primary }]}>
                Подробнее →
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  const renderEmpty = () => (
    <View style={cardStyles.emptyState}>
      <Trophy size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={cardStyles.emptyStateTitle}>
        {activeTab === 'my' ? 'У вас пока нет программ' : 'Программы не найдены'}
      </Text>
      <Text style={cardStyles.emptyStateText}>
        {activeTab === 'my'
          ? 'Создайте свою первую программу тренировок'
          : 'Попробуйте изменить фильтры или поиск'}
      </Text>
      {activeTab === 'my' && (
        <TouchableOpacity
          style={[buttonStyles.primary, { paddingHorizontal: SPACING.xl }]}
          onPress={openCreateModal}
        >
          <View style={buttonStyles.content}>
            <Plus size={20} color="white" strokeWidth={2} />
            <Text style={buttonStyles.textPrimary}>Создать программу</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          Программы тренировок
        </Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          {activeTab === 'my' ? 'Ваши личные программы' : 'Готовые программы от тренеров'}
        </Text>
      </View>

      {/* Табы */}
      <View style={cardStyles.tabContainer}>
        <TouchableOpacity
          style={[cardStyles.tab, activeTab === 'my' && cardStyles.tabActive]}
          onPress={() => {
            setActiveTab('my');
            setPage(1);
            setPrograms([]);
          }}
        >
          <Text style={[cardStyles.tabText, activeTab === 'my' && cardStyles.tabTextActive]}>
            Мои программы
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.tab, activeTab === 'ready' && cardStyles.tabActive]}
          onPress={() => {
            setActiveTab('ready');
            setPage(1);
            setPrograms([]);
          }}
        >
          <Text style={[cardStyles.tabText, activeTab === 'ready' && cardStyles.tabTextActive]}>
            Готовые
          </Text>
        </TouchableOpacity>
      </View>

      {/* Панель поиска и сортировки */}
      <View style={cardStyles.filterBar}>
        <View style={cardStyles.searchRow}>
          <TouchableOpacity
            style={cardStyles.searchButton}
            onPress={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }
            }}
          >
            <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          {showSearch && (
            <View style={cardStyles.searchContainer}>
              <TextInput
                ref={searchInputRef}
                style={cardStyles.searchInput}
                placeholder="Поиск программ..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setPage(1);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setPage(1); }}>
                  <X size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={cardStyles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <ArrowUpDown size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {showSortMenu && (
          <View style={{ marginBottom: SPACING.sm }}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={{
                  paddingVertical: SPACING.sm,
                  paddingHorizontal: SPACING.md,
                  borderRadius: BORDER_RADIUS.md,
                  backgroundColor: sortBy === option.value ? colors.primary + '15' : 'transparent',
                }}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortMenu(false);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    typography.label,
                    { color: sortBy === option.value ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

{/* Чипы фильтров по уровню (для всех вкладок) */}
<View style={cardStyles.filterChips}>
  {LEVEL_OPTIONS.map((option) => {
    const isActive = selectedLevels.includes(option.value);
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          cardStyles.filterChip,
          isActive && cardStyles.filterChipActive,
        ]}
        onPress={() => toggleLevel(option.value)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <option.icon size={14} color={isActive ? 'white' : option.color} strokeWidth={2} />
          <Text
            style={[
              cardStyles.filterChipText,
              isActive && cardStyles.filterChipTextActive,
            ]}
          >
            {option.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  })}
  {selectedLevels.length > 0 && (
    <TouchableOpacity
      style={cardStyles.filterChip}
      onPress={() => { setSelectedLevels([]); setPage(1); }}
    >
      <Text style={cardStyles.filterChipText}>Сбросить</Text>
    </TouchableOpacity>
  )}
</View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={renderProgramCard}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? renderEmpty() : null}
        contentContainerStyle={{
          paddingHorizontal: SPACING.lg,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {/* FAB */}
      {activeTab === 'my' && !loading && (
        <TouchableOpacity
          style={cardStyles.fab}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      {/* Модалка создания/редактирования (bottom sheet) */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[cardStyles.sheetContainer, { maxHeight: '90%' }]}>
                <View style={cardStyles.sheetHeader}>
                  <Text style={cardStyles.sheetTitle}>
                    {editingProgram ? 'Редактировать программу' : 'Новая программа'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <X size={20} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
                  <View style={cardStyles.sheetField}>
                    <Text style={cardStyles.sheetLabel}>Название *</Text>
                    <TextInput
                      style={cardStyles.sheetInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="Например: PPL на 8 недель"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={cardStyles.sheetField}>
                    <Text style={cardStyles.sheetLabel}>Описание</Text>
                    <TextInput
                      style={cardStyles.sheetTextarea}
                      value={formDescription}
                      onChangeText={setFormDescription}
                      placeholder="Краткое описание программы..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={cardStyles.sheetField}>
                    <Text style={cardStyles.sheetLabel}>Недель</Text>
                    <TextInput
                      style={cardStyles.sheetInput}
                      value={formDuration}
                      onChangeText={setFormDuration}
                      placeholder="8"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>

                  {/* Сегментированный контрол уровня */}
                  <View style={cardStyles.sheetField}>
                    <Text style={cardStyles.sheetLabel}>Уровень</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      {LEVEL_OPTIONS.map((option) => {
                        const isSelected = formLevel === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => setFormLevel(option.value)}
                            style={{
                              flex: 1,
                              paddingVertical: SPACING.md,
                              paddingHorizontal: SPACING.sm,
                              borderRadius: BORDER_RADIUS.md,
                              borderWidth: 2,
                              borderColor: isSelected ? option.color : colors.border,
                              backgroundColor: isSelected ? option.color + '15' : colors.surface,
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <option.icon
                              size={20}
                              color={isSelected ? option.color : colors.textTertiary}
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                marginTop: 4,
                                fontSize: 11,
                                fontWeight: '600',
                                color: isSelected ? option.color : colors.textSecondary,
                                textAlign: 'center',
                              }}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      buttonStyles.primary,
                      {
                        backgroundColor: saving ? colors.textTertiary : colors.primary,
                        marginTop: SPACING.lg,
                      },
                    ]}
                    onPress={handleSaveProgram}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={buttonStyles.textPrimary}>
                        {editingProgram ? 'Сохранить изменения' : 'Создать программу'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}