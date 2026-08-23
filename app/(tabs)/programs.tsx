import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useToast } from '../../src/hooks/useToast';
import { usePrograms } from '../../src/hooks/usePrograms';
import { ProgramCard } from '../../src/components/ProgramCard';
import { LEVEL_COLORS } from '../../src/constants/semanticColors';
import { ProgramFormSheet } from '../../src/components/ProgramFormSheet';
import { ImportProgramSheet } from '../../src/components/program/sheets/ImportProgramSheet';
import { SheetShell } from '../../src/components/ui/SheetShell';
import { importProgramByCode } from '../../src/services/programSharingService';
import { getUserProgramsStatus, activateProgram } from '../../src/services/programsService';
import { FadeIn } from '../../src/components/FadeIn';
import { Toast } from '../../src/components/Toast';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import {
  Search,
  Plus,
  X,
  ArrowUpDown,
  Trophy,
  Link2,
  Sprout,
  Dumbbell,
  Flame,
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { typography } from '../../src/styles/typography';

const SORT_OPTIONS = [
  { value: 'date' as const, label: 'По дате' },
  { value: 'name' as const, label: 'По названию' },
  { value: 'level' as const, label: 'По сложности' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner' as const, label: 'Новичок', icon: Sprout, color: LEVEL_COLORS.beginner },
  {
    value: 'intermediate' as const,
    label: 'Средний',
    icon: Dumbbell,
    color: LEVEL_COLORS.intermediate,
  },
  { value: 'advanced' as const, label: 'Продвинутый', icon: Flame, color: LEVEL_COLORS.advanced },
];

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const {
    activeTab,
    setActiveTab,
    programs,
    loading,
    refreshing,
    hasMore,
    loadingMore,
    searchQuery,
    setSearchQuery,
    showSearch,
    setShowSearch,
    selectedLevels,
    toggleLevel,
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
  } = usePrograms({ userId, showToast });

  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const badgeStyles = useMemo(() => createBadgeStyles(colors), [colors]);
  const buttonStyles = useMemo(() => createButtonStyles(colors), [colors]);

  // ===== Статусы программ пользователя (активность + completed_at) =====
  // Один запрос на весь список: из него выводим и активную программу (для бейджа
  // «Текущая» и сортировки), и completed_at (для диалога «начать заново?»).
  const { data: userProgramsStatus } = useQuery({
    queryKey: ['userProgramsStatus', userId],
    queryFn: () => getUserProgramsStatus(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const statusMap = useMemo(() => {
    const m: Record<string, { is_active: boolean; completed_at: string | null }> = {};
    (userProgramsStatus || []).forEach((s) => {
      m[s.program_id] = { is_active: s.is_active, completed_at: s.completed_at };
    });
    return m;
  }, [userProgramsStatus]);

  const activeProgramId = useMemo(
    () => Object.keys(statusMap).find((id) => statusMap[id].is_active) ?? null,
    [statusMap]
  );

  // Мутация активации: { programId, reset }. reset=true — «начать заново».
  const activateMutation = useMutation({
    mutationFn: (args: { programId: string; reset: boolean }) =>
      activateProgram(args.programId, userId as string, args.reset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['userProgramsStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Программа активирована', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Не удалось активировать', 'error');
    },
  });

  // ===== Импорт программы по коду =====
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async () => {
    setImportError(null);
    setImporting(true);
    try {
      const newId = await importProgramByCode(importCode, userId!);
      showToast('Программа добавлена', 'success');
      setShowImportModal(false);
      setImportCode('');
      onRefresh();
      router.push(`/program/${newId}`);
    } catch (e: any) {
      setImportError(e.message || 'Не удалось импортировать');
    } finally {
      setImporting(false);
    }
  };

  // ===== Активация программы (с учётом завершённости) =====
  const handleActivatePress = useCallback(
    (programId: string, programName: string) => {
      if (!userId || programId === activeProgramId) return; // защита от случайного клика
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Edge-case: программа полностью пройдена — предлагаем начать заново.
      if (statusMap[programId]?.completed_at) {
        Alert.alert(
          'Программа завершена',
          `«${programName}» полностью пройдена.\n\nНачать заново? Прогресс и история тренировок этой программы будут сброшены (прогресс других программ сохранится).`,
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Начать заново',
              style: 'destructive',
              onPress: () => activateMutation.mutate({ programId, reset: true }),
            },
          ]
        );
        return;
      }

      Alert.alert(
        'Активировать программу?',
        `Вы переключаетесь на "${programName}". Прогресс других программ сохранится.`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Активировать',
            onPress: () => activateMutation.mutate({ programId, reset: false }),
          },
        ]
      );
    },
    [userId, activeProgramId, statusMap, activateMutation]
  );

  // ===== Сортировка: активная программа всегда сверху =====
  const sortedPrograms = useMemo(() => {
    if (!activeProgramId) return programs;
    return [...programs].sort((a, b) => {
      const aActive = a.id === activeProgramId;
      const bActive = b.id === activeProgramId;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [programs, activeProgramId]);

  const renderProgramCard = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <FadeIn delay={index * 80}>
        <ProgramCard
          item={item}
          index={index}
          isMyProgram={activeTab === 'my'}
          isActive={item.id === activeProgramId}
          onPress={() => handleProgramPress(item)}
          onLongPress={() => handleLongPress(item)}
          onEditPress={() => {
            setEditingProgram(item);
            setFormName(item.name);
            setFormDescription(item.description);
            setFormDuration(item.duration.toString());
            setFormLevel(item.level);
            setShowCreateModal(true);
          }}
          onActivatePress={() => handleActivatePress(item.id, item.name)}
          colors={colors}
          cardStyles={cardStyles}
          badgeStyles={badgeStyles}
        />
      </FadeIn>
    ),
    [
      activeTab,
      activeProgramId,
      handleProgramPress,
      handleLongPress,
      setEditingProgram,
      setFormName,
      setFormDescription,
      setFormDuration,
      setFormLevel,
      setShowCreateModal,
      handleActivatePress,
      colors,
      cardStyles,
      badgeStyles,
    ]
  );

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
            <Plus size={20} color={colors.textInverse} strokeWidth={2} />
            <Text style={buttonStyles.textPrimary}>Создать программу</Text>
          </View>
        </TouchableOpacity>
      )}
      {activeTab === 'ready' && (
        <TouchableOpacity
          style={[buttonStyles.primary, { paddingHorizontal: SPACING.xl }]}
          onPress={() => {
            setImportError(null);
            setShowImportModal(true);
          }}
        >
          <View style={buttonStyles.content}>
            <Link2 size={20} color={colors.textInverse} strokeWidth={2} />
            <Text style={buttonStyles.textPrimary}>Импортировать по коду</Text>
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
          onPress={() => setActiveTab('my')}
        >
          <Text style={[cardStyles.tabText, activeTab === 'my' && cardStyles.tabTextActive]}>
            Мои программы
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cardStyles.tab, activeTab === 'ready' && cardStyles.tabActive]}
          onPress={() => setActiveTab('ready')}
        >
          <Text style={[cardStyles.tabText, activeTab === 'ready' && cardStyles.tabTextActive]}>
            Готовые
          </Text>
        </TouchableOpacity>
      </View>

      {/* Панель поиска, импорта и сортировки */}
      <View style={cardStyles.filterBar}>
        <View style={cardStyles.searchRow}>
          <TouchableOpacity
            style={cardStyles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          {showSearch && (
            <View style={cardStyles.searchContainer}>
              <TextInput
                style={cardStyles.searchInput}
                placeholder="Поиск программ..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <TouchableOpacity
            style={cardStyles.sortButton}
            onPress={() => {
              setImportError(null);
              setShowImportModal(true);
            }}
          >
            <Link2 size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={cardStyles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <ArrowUpDown size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        {showSortMenu && (
          <SheetShell title="Сортировка" onClose={() => setShowSortMenu(false)}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={{
                  paddingVertical: SPACING.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortMenu(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: sortBy === option.value ? colors.primary : colors.textPrimary,
                      fontWeight: sortBy === option.value ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </SheetShell>
        )}
        {/* Чипы фильтров по уровню */}
        <View style={cardStyles.filterChips}>
          {LEVEL_OPTIONS.map((option) => {
            const isActive = selectedLevels.includes(option.value);
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.value}
                style={[cardStyles.filterChip, isActive && cardStyles.filterChipActive]}
                onPress={() => toggleLevel(option.value)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon
                    size={14}
                    color={isActive ? colors.textInverse : option.color}
                    strokeWidth={2}
                  />
                  <Text
                    style={[cardStyles.filterChipText, isActive && cardStyles.filterChipTextActive]}
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
              onPress={() => selectedLevels.forEach((l) => toggleLevel(l))}
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
    <SafeAreaView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <FlatList
        data={sortedPrograms}
        keyExtractor={(item) => item.id}
        renderItem={renderProgramCard}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? renderEmpty() : null}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {/* FAB */}
      {activeTab === 'my' && !loading && (
        <TouchableOpacity style={cardStyles.fab} onPress={openCreateModal} activeOpacity={0.8}>
          <Plus size={24} color={colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      {/* Sheet формы (INVENTORY §6: SheetShell паттерн) */}
      {showCreateModal && (
        <ProgramFormSheet
          editingProgram={editingProgram}
          formName={formName}
          formDescription={formDescription}
          formDuration={formDuration}
          formLevel={formLevel}
          saving={saving}
          onSave={handleSaveProgram}
          onClose={() => setShowCreateModal(false)}
          onFormNameChange={setFormName}
          onFormDescriptionChange={setFormDescription}
          onFormDurationChange={setFormDuration}
          onFormLevelChange={setFormLevel}
          colors={colors}
          cardStyles={cardStyles}
          buttonStyles={buttonStyles}
        />
      )}

      {/* Sheet импорта по коду */}
      {showImportModal && (
        <ImportProgramSheet
          code={importCode}
          onChangeCode={(v) => {
            setImportCode(v);
            setImportError(null);
          }}
          importing={importing}
          error={importError}
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </SafeAreaView>
  );
}