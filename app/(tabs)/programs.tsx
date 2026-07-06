import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getPrograms, Program } from '../../src/servises/programsService';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Sprout, Dumbbell, Flame, Trophy, Calendar } from 'lucide-react-native';

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const data = await getPrograms();
      setPrograms(data);
    } catch (e) {
      console.error('Ошибка загрузки программ:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadPrograms();
  };

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'beginner':
        return { 
          label: 'Новичок', 
          color: '#4CAF50', 
          icon: <Sprout size={14} color="#4CAF50" strokeWidth={1.5} /> 
        };
      case 'intermediate':
        return { 
          label: 'Средний', 
          color: '#FF9800', 
          icon: <Dumbbell size={14} color="#FF9800" strokeWidth={1.5} /> 
        };
      case 'advanced':
        return { 
          label: 'Продвинутый', 
          color: '#F44336', 
          icon: <Flame size={14} color="#F44336" strokeWidth={1.5} /> 
        };
      default:
        return { 
          label: level, 
          color: colors.textSecondary, 
          icon: <Dumbbell size={14} color={colors.textSecondary} strokeWidth={1.5} /> 
        };
    }
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={styles.emptyContainer}>
      <Trophy size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Программы не найдены
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Скоро здесь появятся готовые программы тренировок
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const levelInfo = getLevelInfo(item.level);
          return (
            <FadeIn delay={index * 80}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/program/${item.id}`);
                }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.levelBadge, { backgroundColor: levelInfo.color + '15' }]}>
                        {levelInfo.icon}
                        <Text style={[styles.cardLevel, { color: levelInfo.color }]}>
                          {levelInfo.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.durationBadge,
                          { backgroundColor: colors.primary + '15' },
                        ]}
                      >
                        <Calendar size={12} color={colors.primary} strokeWidth={2} />
                        <Text style={[styles.durationText, { color: colors.primary }]}>
                          {item.duration} нед
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.cardTitle, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={[styles.cardDescription, { color: colors.textSecondary }]}
                      numberOfLines={3}
                    >
                      {item.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.scheduleSection,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scheduleLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Расписание:
                    </Text>
                    <View style={styles.scheduleDays}>
                      {item.schedule.map((day, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.dayChip,
                            { backgroundColor: colors.primary + '15' },
                          ]}
                        >
                          <Text
                            style={[styles.dayText, { color: colors.primary }]}
                          >
                            {day}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.openText, { color: colors.primary }]}
                    >
                      Подробнее →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </FadeIn>
          );
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Программы тренировок
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Выбери программу и начни прогресс
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTop: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  cardLevel: {
    fontSize: 13,
    fontWeight: '600',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  scheduleSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  scheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  openText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});