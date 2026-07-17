import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useToast } from '../../src/hooks/useToast';
import { usePrograms } from '../../src/hooks/usePrograms';
import { ProgramCard } from '../../src/components/ProgramCard';
import { ProgramFormSheet } from '../../src/components/ProgramFormSheet';
import { FadeIn } from '../../src/components/FadeIn';
import { Toast } from '../../src/components/Toast';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { Search, Plus, X, ArrowUpDown, Trophy } from 'lucide-react-native';
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
  { value: 'beginner' as const, label: 'Новичок', icon: require('lucide-react-native').Sprout, color: '#4CAF50' },
  { value: 'intermediate' as const, label: 'Средний', icon: require('lucide-react-native').Dumbbell, color: '#FF9800' },
  { value: 'advanced' as const, label: 'Продвинутый', icon: require('lucide-react-native').Flame, color: '#F44336' },
];

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();
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

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);

  const renderProgramCard = ({ item, index }: { item: any; index: number }) => (
    <FadeIn delay={index * 80}>
      <ProgramCard
        item={item}
        index={index}
        isMyProgram={activeTab === 'my'}
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
        colors={colors}
        cardStyles={cardStyles}
        badgeStyles={badgeStyles}
      />
    </FadeIn>
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
            }}
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
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
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

        {/* Чипы фильтров по уровню */}
        <View style={cardStyles.filterChips}>
          {LEVEL_OPTIONS.map((option) => {
            const isActive = selectedLevels.includes(option.value);
            const Icon = option.icon;
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
                  <Icon size={14} color={isActive ? 'white' : option.color} strokeWidth={2} />
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
              onPress={() => {
                // Сброс фильтров — нужно вызвать через хук
                // Для простоты: вызываем toggleLevel для каждого выбранного
                selectedLevels.forEach(l => toggleLevel(l));
              }}
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

      {/* Модалка формы */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
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
      </Modal>
    </SafeAreaView>
  );
}