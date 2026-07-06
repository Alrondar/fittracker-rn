import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getProgramWithDays,
  startProgram,
  createWorkoutsFromProgram,
  Program,
  ProgramDay,
  ProgramExercise,
} from '../../src/servises/programsService';
import { useStore } from '../../src/store/useStore';
import { FadeIn } from '../../src/components/FadeIn';
import { ListSkeleton } from '../../src/components/Skeleton';
import { SPACING, BORDER_RADIUS, GRADIENTS } from '../../src/constants/theme';
import { useTheme } from '../../src/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  Dumbbell,
  Flame,
  Clock,
  Calendar,
  ChevronRight,
  ChevronDown,
  Play,
  TrendingUp,
  Minus,
  TrendingDown,
} from 'lucide-react-native';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles } from '../../src/styles/components/badge';
import { createButtonStyles } from '../../src/styles/components/button';
import { createListStyles } from '../../src/styles/components/list';
import { typography } from '../../src/styles/typography';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const buttonStyles = createButtonStyles(colors);
  const listStyles = createListStyles(colors);

  useEffect(() => {
    loadProgram();
  }, [id]);

  const loadProgram = async () => {
    try {
      const data = await getProgramWithDays(id as string);
      setProgram(data);
    } catch (e) {
      console.error('Ошибка загрузки программы:', e);
      Alert.alert('Ошибка', 'Не удалось загрузить программу');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProgram = async () => {
    if (!userId) {
      Alert.alert('Ошибка', 'Необходимо войти в аккаунт');
      return;
    }
    Alert.alert(
      'Начать программу?',
      `Будет создано ${program?.days?.length} тренировок на первую неделю программы "${program?.name}"`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Начать',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStarting(true);
            try {
              await startProgram(id as string);
              const workoutIds = await createWorkoutsFromProgram(
                id as string,
                userId
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Успех!',
                `Программа начата! Создано тренировок: ${workoutIds.length}`
              );
              router.replace('/(tabs)/workouts');
            } catch (error: any) {
              Alert.alert('Ошибка', error.message);
            } finally {
              setStarting(false);
            }
          },
        },
      ]
    );
  };

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'beginner':
        return {
          label: 'Новичок',
          color: '#4CAF50',
          icon: <Sprout size={16} color="#4CAF50" strokeWidth={1.5} />,
        };
      case 'intermediate':
        return {
          label: 'Средний',
          color: '#FF9800',
          icon: <Dumbbell size={16} color="#FF9800" strokeWidth={1.5} />,
        };
      case 'advanced':
        return {
          label: 'Продвинутый',
          color: '#F44336',
          icon: <Flame size={16} color="#F44336" strokeWidth={1.5} />,
        };
      default:
        return {
          label: level,
          color: colors.textSecondary,
          icon: <Dumbbell size={16} color={colors.textSecondary} strokeWidth={1.5} />,
        };
    }
  };

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return {
          label: 'Высокая',
          color: '#F44336',
          icon: <TrendingUp size={12} color="#F44336" strokeWidth={2} />,
        };
      case 'medium':
        return {
          label: 'Средняя',
          color: '#FF9800',
          icon: <Minus size={12} color="#FF9800" strokeWidth={2} />,
        };
      case 'low':
        return {
          label: 'Низкая',
          color: '#4CAF50',
          icon: <TrendingDown size={12} color="#4CAF50" strokeWidth={2} />,
        };
      default:
        return {
          label: intensity,
          color: colors.textSecondary,
          icon: <Minus size={12} color={colors.textSecondary} strokeWidth={2} />,
        };
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 100 }]}>
          Программа не найдена
        </Text>
      </View>
    );
  }

  const levelInfo = getLevelInfo(program.level);

  return (
    <View style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Шапка программы */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: SPACING.lg, paddingBottom: SPACING.xl }}
        >
          <FadeIn>
            <Text style={[typography.h3, { color: 'white', marginBottom: SPACING.sm }]}>
              {program.name}
            </Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.lg }]}>
              {program.description}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg }}>
              <View style={badgeStyles.metaBadge}>
                {levelInfo.icon}
                <Text style={badgeStyles.metaBadgeText}>{levelInfo.label}</Text>
              </View>
              <View style={badgeStyles.metaBadge}>
                <Clock size={14} color="white" strokeWidth={1.5} />
                <Text style={badgeStyles.metaBadgeText}>{program.duration} недель</Text>
              </View>
              <View style={badgeStyles.metaBadge}>
                <Calendar size={14} color="white" strokeWidth={1.5} />
                <Text style={badgeStyles.metaBadgeText}>{program.schedule.length} дн/нед</Text>
              </View>
            </View>
            {/* Расписание */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: SPACING.md, borderRadius: BORDER_RADIUS.md }}>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.sm, fontWeight: '600' }]}>
                Расписание:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                {program.schedule.map((day, idx) => (
                  <View key={idx} style={badgeStyles.dayChip}>
                    <Text style={badgeStyles.dayChipText}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        </LinearGradient>

        {/* Дни программы */}
        <View style={{ padding: SPACING.lg }}>
          <Text style={[commonStyles.sectionTitle, { color: colors.textPrimary }]}>
            Дни программы ({program.days?.length})
          </Text>
          {program.days?.map((day: ProgramDay, dayIndex: number) => (
            <FadeIn key={day.id} delay={dayIndex * 80}>
              <DayCard
                day={day}
                getIntensityInfo={getIntensityInfo}
                colors={colors}
                cardStyles={cardStyles}
                badgeStyles={badgeStyles}
                listStyles={listStyles}
              />
            </FadeIn>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Кнопка "Начать программу" */}
      <View style={[commonStyles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[buttonStyles.primary, buttonStyles.large, { backgroundColor: colors.primary }]}
          onPress={handleStartProgram}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <View style={buttonStyles.content}>
              <Play size={20} color="white" strokeWidth={2} fill="white" />
              <Text style={buttonStyles.textPrimary}>Начать программу</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Карточка дня
function DayCard({
  day,
  getIntensityInfo,
  colors,
  cardStyles,
  badgeStyles,
  listStyles,
}: {
  day: ProgramDay;
  getIntensityInfo: (intensity: string) => { label: string; color: string; icon: React.ReactNode };
  colors: any;
  cardStyles: ReturnType<typeof createCardStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
  listStyles: ReturnType<typeof createListStyles>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[cardStyles.container, { borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }]}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: SPACING.md,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md, backgroundColor: colors.primary + '20' }]}>
            <Text style={[typography.h5, { color: colors.primary }]}>
              {day.day_number}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: 2 }]}>
              {day.name}
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
              {day.exercises?.length || 0} упражнений
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.5} />
        ) : (
          <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.5} />
        )}
      </TouchableOpacity>

      {expanded && day.exercises && (
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
          {day.exercises.map((exercise: ProgramExercise, exIndex: number) => {
            const intensityInfo = getIntensityInfo(exercise.intensity);
            return (
              <View
                key={exercise.id}
                style={[listStyles.exerciseRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.xs, lineHeight: 18 }]}
                    numberOfLines={2}
                  >
                    {exercise.exercise_name}
                  </Text>
                  <View style={listStyles.exerciseMeta}>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, fontWeight: '500' }]}>
                      {exercise.sets} × {exercise.reps_range}
                    </Text>
                    <View
                      style={[
                        badgeStyles.intensityBadge,
                        { backgroundColor: intensityInfo.color + '20' },
                      ]}
                    >
                      {intensityInfo.icon}
                      <Text
                        style={[
                          badgeStyles.intensityText,
                          { color: intensityInfo.color },
                        ]}
                      >
                        {intensityInfo.label}
                      </Text>
                    </View>
                  </View>
                  <View style={listStyles.exerciseRest}>
                    <Clock size={12} color={colors.textSecondary} strokeWidth={1.5} />
                    <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                      Отдых: {exercise.rest_seconds} сек
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}