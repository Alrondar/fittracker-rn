import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

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
        return { label: 'Новичок', color: '#4CAF50', icon: '🌱' };
      case 'intermediate':
        return { label: 'Средний', color: '#FF9800', icon: '💪' };
      case 'advanced':
        return { label: 'Продвинутый', color: '#F44336', icon: '🔥' };
      default:
        return { label: level, color: colors.textSecondary, icon: '' };
    }
  };

  const getIntensityInfo = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return { label: 'Высокая', color: '#F44336', icon: '🔴' };
      case 'medium':
        return { label: 'Средняя', color: '#FF9800', icon: '🟡' };
      case 'low':
        return { label: 'Низкая', color: '#4CAF50', icon: '🟢' };
      default:
        return { label: intensity, color: colors.textSecondary, icon: '' };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Программа не найдена
        </Text>
      </View>
    );
  }

  const levelInfo = getLevelInfo(program.level);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Шапка программы */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <FadeIn>
            <Text style={styles.headerTitle}>{program.name}</Text>
            <Text style={styles.headerDescription}>{program.description}</Text>

            <View style={styles.headerMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  {levelInfo.icon} {levelInfo.label}
                </Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  ⏱ {program.duration} недель
                </Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  📅 {program.schedule.length} дн/нед
                </Text>
              </View>
            </View>

            {/* Расписание */}
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleLabel}>Расписание:</Text>
              <View style={styles.scheduleDays}>
                {program.schedule.map((day, idx) => (
                  <View key={idx} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        </LinearGradient>

        {/* Дни программы */}
        <View style={styles.daysSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Дни программы ({program.days?.length})
          </Text>

          {program.days?.map((day, dayIndex) => (
            <FadeIn key={day.id} delay={dayIndex * 80}>
              <DayCard
                day={day}
                getIntensityInfo={getIntensityInfo}
                colors={colors}
              />
            </FadeIn>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Кнопка "Начать программу" */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={handleStartProgram}
          disabled={starting}
          activeOpacity={0.8}
        >
          {starting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.startButtonText}> Начать программу</Text>
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
}: {
  day: ProgramDay;
  getIntensityInfo: (intensity: string) => { label: string; color: string; icon: string };
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.dayHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeaderLeft}>
          <View style={[styles.dayNumber, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.dayNumberText, { color: colors.primary }]}>
              {day.day_number}
            </Text>
          </View>
          <View style={styles.dayInfo}>
            <Text style={[styles.dayName, { color: colors.textPrimary }]}>
              {day.name}
            </Text>
            <Text style={[styles.dayExercisesCount, { color: colors.textSecondary }]}>
              {day.exercises?.length || 0} упражнений
            </Text>
          </View>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
          {expanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {expanded && day.exercises && (
        <View style={styles.exercisesList}>
          {day.exercises.map((exercise, exIndex) => {
            const intensityInfo = getIntensityInfo(exercise.intensity);
            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.exerciseMain}>
                  <Text
                    style={[styles.exerciseName, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {exercise.exercise_name}
                  </Text>
                  <View style={styles.exerciseMeta}>
                    <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                      {exercise.sets} × {exercise.reps_range}
                    </Text>
                    <View
                      style={[
                        styles.intensityBadge,
                        { backgroundColor: intensityInfo.color + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityText,
                          { color: intensityInfo.color },
                        ]}
                      >
                        {intensityInfo.icon} {intensityInfo.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.exerciseRest, { color: colors.textSecondary }]}>
                    ⏱ Отдых: {exercise.rest_seconds} сек
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: SPACING.sm,
    lineHeight: 30,
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  metaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  metaBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  scheduleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  scheduleDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayChip: {
    backgroundColor: 'white',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  dayChipText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  daysSection: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayExercisesCount: {
    fontSize: 12,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
  exercisesList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  exerciseRow: {
    borderBottomWidth: 1,
    paddingVertical: SPACING.md,
  },
  exerciseMain: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  exerciseSets: {
    fontSize: 13,
    fontWeight: '500',
  },
  intensityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  intensityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseRest: {
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  startButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});