import { useCallback } from 'react';
import { View, Text, SectionList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, Calendar, Trophy } from 'lucide-react-native';

import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useHistory } from '../../src/hooks/useHistory';
import type { HistorySection } from '../../src/services/historyService';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { userId } = useStore();
  const router = useRouter();

  const { data, isPending, isFetching, refetch } = useHistory(userId);

  const sections = data?.sections ?? [];
  const monthlyStats = data?.monthlyStats ?? { totalWorkouts: 0, totalVolume: 0, bestWorkout: 0 };
  const loading = isPending;
  const refreshing = isFetching && !isPending;

  // Обновляем историю при каждом возврате на вкладку
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Детерминированный выбор градиента из палитры на основе цветов темы.
  // Заменяет хардкод hex: адаптируется к выбранному акценту и светлой/тёмной теме,
  // сохраняя визуальное разнообразие карточек.
  const getWorkoutGradient = (workoutName: string): [string, string] => {
    const palette: [string, string][] = [
      [colors.primary, colors.primaryLight],
      [colors.success, colors.primary],
      [colors.warning, colors.error],
      [colors.primary, colors.success],
      [colors.error, colors.primary],
      [colors.success, colors.warning],
      [colors.primaryLight, colors.primary],
      [colors.warning, colors.primary],
    ];
    let hash = 0;
    for (let i = 0; i < workoutName.length; i++) {
      const char = workoutName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Clock size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>История пуста</Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Завершите первую тренировку, чтобы увидеть её здесь
      </Text>
    </FadeIn>
  );

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
    <SectionHeader title={section.title} />
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>История тренировок</Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>Твои достижения и прогресс</Text>
      </View>

      {!loading && monthlyStats.totalWorkouts > 0 && (
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
              Этот месяц
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.primary }]}>{monthlyStats.totalWorkouts}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>тренировок</Text>
            </AppCard>
            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.success }]}>{monthlyStats.totalVolume}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>кг объем</Text>
            </AppCard>
            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Trophy size={20} color={colors.warning} />
              <Text style={[typography.h3, { color: colors.warning, marginTop: 4 }]}>{monthlyStats.bestWorkout}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>кг рекорд</Text>
            </AppCard>
          </View>
        </View>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 50}>
              <TouchableOpacity
                onPress={() => {
                  if (!item.id || item.id === 'undefined' || item.id === 'null') {
                    Alert.alert('Ошибка', `Невозможно открыть тренировку. ID: ${item.id || 'отсутствует'}`);
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/history/${item.id}`);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={getWorkoutGradient(item.name)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: SPACING.lg,
                    borderRadius: BORDER_RADIUS.lg,
                    marginBottom: SPACING.md,
                    marginHorizontal: SPACING.lg,
                    elevation: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                    <Text style={[typography.h4, { color: colors.textInverse, flex: 1, marginRight: SPACING.md }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textInverse + 'CC' }]}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: colors.textInverse + '33' }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[typography.h3, { color: colors.textInverse }]}>{item.sets}</Text>
                      <Text style={[typography.caption, { color: colors.textInverse + 'E6', marginTop: 2 }]}>подходов</Text>
                    </View>
                    <View style={{ width: 1, height: 30, marginHorizontal: SPACING.sm, backgroundColor: colors.textInverse + '4D' }} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[typography.h3, { color: colors.textInverse }]}>{Math.round(item.volume)}</Text>
                      <Text style={[typography.caption, { color: colors.textInverse + 'E6', marginTop: 2 }]}>кг</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </FadeIn>
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: SPACING.lg }}
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}