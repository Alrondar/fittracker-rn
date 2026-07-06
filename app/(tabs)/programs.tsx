import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);

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
          icon: <Sprout size={14} color="#4CAF50" strokeWidth={1.5} />,
        };
      case 'intermediate':
        return {
          label: 'Средний',
          color: '#FF9800',
          icon: <Dumbbell size={14} color="#FF9800" strokeWidth={1.5} />,
        };
      case 'advanced':
        return {
          label: 'Продвинутый',
          color: '#F44336',
          icon: <Flame size={14} color="#F44336" strokeWidth={1.5} />,
        };
      default:
        return {
          label: level,
          color: colors.textSecondary,
          icon: <Dumbbell size={14} color={colors.textSecondary} strokeWidth={1.5} />,
        };
    }
  };

  const renderEmpty = () => (
    <FadeIn delay={200} style={commonStyles.emptyContainer}>
      <Trophy size={64} color={colors.textTertiary} strokeWidth={1.5} />
      <Text style={[commonStyles.emptyTitle, { color: colors.textPrimary }]}>
        Программы не найдены
      </Text>
      <Text style={[commonStyles.emptyText, { color: colors.textSecondary }]}>
        Скоро здесь появятся готовые программы тренировок
      </Text>
    </FadeIn>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
                    cardStyles.container,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View style={{ padding: SPACING.lg, paddingBottom: SPACING.md }}>
                    <View style={cardStyles.header}>
                      <View style={[badgeStyles.programBadge, { backgroundColor: levelInfo.color + '15' }]}>
                        {levelInfo.icon}
                        <Text style={[badgeStyles.programBadgeText, { color: levelInfo.color }]}>
                          {levelInfo.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          badgeStyles.programBadge,
                          { backgroundColor: colors.primary + '15' },
                        ]}
                      >
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
                  <View
                    style={[
                      {
                        paddingHorizontal: SPACING.lg,
                        paddingVertical: SPACING.md,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      },
                    ]}
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
                          <Text
                            style={[badgeStyles.dayChipText, { color: colors.primary }]}
                          >
                            {day}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View
                    style={[
                      cardStyles.footer,
                      { borderTopColor: colors.border, borderTopWidth: 1 },
                    ]}
                  >
                    <Text style={[typography.labelBold, { color: colors.primary }]}>
                      Подробнее →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </FadeIn>
          );
        }}
        ListHeaderComponent={
          <View style={commonStyles.header}>
            <Text style={[commonStyles.headerTitle, { color: colors.textPrimary }]}>
              Программы тренировок
            </Text>
            <Text style={[commonStyles.headerSubtitle, { color: colors.textSecondary }]}>
              Выбери программу и начни прогресс
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0 }}
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