import { memo, useCallback, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Clock, Calendar, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../src/hooks/useTheme';
import { useStore } from '../../src/store/useStore';
import { useHistory } from '../../src/hooks/useHistory';
import type { HistoryWorkout, HistorySection } from '../../src/services/historyService';
import { ListSkeleton } from '../../src/components/Skeleton';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';

type ThemeColors = ReturnType<typeof useTheme>['colors'];
type ThemeGradients = ReturnType<typeof useTheme>['gradients'];

/** Детерминированный выбор градиента из темы по имени тренировки (без хардкода hex). */
function pickGradient(
  name: string,
  gradients: ThemeGradients,
  fallback: string
): [string, string] {
  // Object.keys возвращает string[] — сужаем до keyof, чтобы индексация была типобезопасной
  const keys = Object.keys(gradients) as Array<keyof ThemeGradients>;
  if (keys.length === 0) return [fallback, fallback];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const gradient = gradients[keys[Math.abs(hash) % keys.length]] as readonly string[];
  return [gradient[0] ?? fallback, gradient[1] ?? gradient[0] ?? fallback];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const HistoryWorkoutCard = memo(function HistoryWorkoutCard({
  workout,
  gradients,
  colors,
  onPress,
}: {
  workout: HistoryWorkout;
  gradients: ThemeGradients;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const gradient = useMemo(
    () => pickGradient(workout.name, gradients, colors.primary),
    [workout.name, gradients, colors.primary]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={gradient}
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: SPACING.md,
          }}
        >
          <Text
            style={[typography.h4, { color: colors.textInverse, flex: 1, marginRight: SPACING.md }]}
            numberOfLines={1}
          >
            {workout.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textInverse + 'CC' }]}>
            {formatDate(workout.created_at)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: SPACING.md,
            borderTopWidth: 1,
            borderTopColor: colors.textInverse + '33',
          }}
        >
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.h3, { color: colors.textInverse }]}>{workout.sets}</Text>
            <Text style={[typography.caption, { color: colors.textInverse + 'E6', marginTop: 2 }]}>
              подходов
            </Text>
          </View>

          <View
            style={{
              width: 1,
              height: 30,
              marginHorizontal: SPACING.sm,
              backgroundColor: colors.textInverse + '4D',
            }}
          />

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[typography.h3, { color: colors.textInverse }]}>
              {Math.round(workout.volume)}
            </Text>
            <Text style={[typography.caption, { color: colors.textInverse + 'E6', marginTop: 2 }]}>
              кг
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default function HistoryScreen() {
  const router = useRouter();
  const { colors, gradients } = useTheme();
  const { userId } = useStore();

  const { data, isPending, isRefetching, refetch } = useHistory(userId);

  // ✅ Обновляем историю при каждом возврате на вкладку (вместо useEffect на mount)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleOpenWorkout = useCallback(
    (workout: HistoryWorkout) => {
      if (!workout.id || workout.id === 'undefined' || workout.id === 'null') {
        Alert.alert('Ошибка', `Невозможно открыть тренировку. ID: ${workout.id || 'отсутствует'}`);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/history/${workout.id}`);
    },
    [router]
  );

  const sections = data?.sections ?? [];
  const monthlyStats = data?.monthlyStats;
  const loading = isPending && !data;

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
    <SectionHeader title={section.title} />
  );

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Clock size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>История пуста</Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Завершите первую тренировку, чтобы увидеть её здесь
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
          История тренировок
        </Text>
        <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
          Твои достижения и прогресс
        </Text>
      </View>

      {!loading && monthlyStats && monthlyStats.totalWorkouts > 0 && (
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginLeft: SPACING.sm }]}>
              Этот месяц
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.primary }]}>
                {monthlyStats.totalWorkouts}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                тренировок
              </Text>
            </AppCard>

            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Text style={[typography.h3, { color: colors.success }]}>
                {monthlyStats.totalVolume}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                кг объем
              </Text>
            </AppCard>

            <AppCard variant="compact" style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
              <Trophy size={20} color={colors.warning} />
              <Text style={[typography.h3, { color: colors.warning, marginTop: 4 }]}>
                {monthlyStats.bestWorkout}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                кг рекорд
              </Text>
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
              <HistoryWorkoutCard
                workout={item}
                gradients={gradients}
                colors={colors}
                onPress={() => handleOpenWorkout(item)}
              />
            </FadeIn>
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isPending}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: SPACING.lg }}
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}