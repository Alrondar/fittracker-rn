import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getList, getString } from '../../src/lib/supabase';
import { useStore } from '../../src/store/useStore';
import { Exercise } from '../../src/types';
import { useTheme } from '../../src/hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Wrench,
  Settings,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles } from '../../src/styles/common';
import { createCardStyles } from '../../src/styles/components/card';
import { createBadgeStyles, createEquipmentBadgeStyles, createMuscleBadgeStyles } from '../../src/styles/components/badge';
import { typography } from '../../src/styles/typography';
import { getMuscleColor } from '../../src/constants/muscleColors';
import { EquipmentIcon } from '../../src/components/EquipmentIcon';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPrograms, setRelatedPrograms] = useState<any[]>([]);
  const [similarExercises, setSimilarExercises] = useState<Exercise[]>([]);
  const [personalRecords, setPersonalRecords] = useState({
    maxWeight: 0,
    maxReps: 0,
    totalVolume: 0,
  });

  // Состояния для карусели изображений
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const cycleAnim = useRef(new Animated.Value(0)).current;

  const cardStyles = createCardStyles(colors);
  const badgeStyles = createBadgeStyles(colors);
  const equipmentBadgeStyles = createEquipmentBadgeStyles(colors);
  const muscleBadgeStyles = createMuscleBadgeStyles(colors);

  useEffect(() => {
    loadExercise();
  }, [id]);

  useEffect(() => {
    if (exercise) {
      loadRelatedPrograms();
      loadSimilarExercises();
      loadPersonalRecords();
      setupImageCarousel();
    }
    return () => {
      cycleAnim.stopAnimation();
    };
  }, [exercise]);

  const loadExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select()
        .eq('id', id)
        .single();
      if (error) throw error;
      setExercise(data);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupImageCarousel = () => {
    const mediaUrl = getString(exercise!, 'media_url');
    if (!mediaUrl) {
      setImageUrls([]);
      return;
    }

    const url0 = mediaUrl;
    const url1 = mediaUrl.replace(/\/\d+\.jpg$/, '/1.jpg');
    const urls = [url0, url1];

    setImageUrls(urls);

    // Предзагрузка
    urls.forEach((url) => Image.prefetch(url).catch(() => {}));

    // Сброс анимации
    cycleAnim.setValue(0);

    // Один бесконечный цикл: 4 секунды = по 2 сек на каждое фото
    Animated.loop(
      Animated.timing(cycleAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Вычисляем opacity на основе позиции цикла
  // 0-0.2: первое изображение полностью видно
  // 0.2-0.3: плавный crossfade (первое исчезает, второе появляется)
  // 0.3-0.7: второе изображение полностью видно
  // 0.7-0.8: плавный crossfade обратно
  // 0.8-1.0: первое изображение снова видно
  const opacity1 = cycleAnim.interpolate({
    inputRange: [0, 0.2, 0.3, 0.7, 0.8, 1],
    outputRange: [1, 1, 0, 0, 1, 1],
  });

  const opacity2 = cycleAnim.interpolate({
    inputRange: [0, 0.2, 0.3, 0.7, 0.8, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });

  const loadRelatedPrograms = async () => {
    if (!exercise) return;
    try {
      const { data } = await supabase
        .from('program_exercises')
        .select('program_id, programs(id, name, level, duration)')
        .eq('exercise_id', exercise.id)
        .limit(5);
      if (data) {
        const programs = data
          .map((item: any) => item.programs)
          .filter((p: any) => p !== null);
        setRelatedPrograms(programs);
      }
    } catch (e) {
      console.error('Ошибка загрузки программ:', e);
    }
  };

  const loadSimilarExercises = async () => {
    if (!exercise) return;
    const primaryMuscles = getList(exercise, 'primary_muscles');
    if (primaryMuscles.length === 0) return;
    try {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .neq('id', exercise.id)
        .overlaps('primary_muscles', primaryMuscles)
        .limit(5);
      if (data) setSimilarExercises(data);
    } catch (e) {
      console.error('Ошибка загрузки похожих:', e);
    }
  };

  const loadPersonalRecords = async () => {
    if (!userId || !exercise) return;
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(
          'weight_kg, reps, completed_at, workout_exercises!inner(exercise_id, workouts!inner(user_id))'
        )
        .eq('workout_exercises.exercise_id', exercise.id)
        .eq('workout_exercises.workouts.user_id', userId)
        .not('weight_kg', 'is', null)
        .not('reps', 'is', null);
      if (error) throw error;
      if (data && data.length > 0) {
        const maxWeight = Math.max(...data.map((log: any) => log.weight_kg));
        const maxReps = Math.max(...data.map((log: any) => log.reps));
        const totalVolume = data.reduce(
          (sum: number, log: any) => sum + log.weight_kg * log.reps,
          0
        );
        setPersonalRecords({ maxWeight, maxReps, totalVolume });
      }
    } catch (e) {
      console.error('Ошибка загрузки рекордов:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            commonStyles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={commonStyles.backButton}
          >
            <Text style={[commonStyles.backText, { color: colors.primary }]}>
              ← Назад
            </Text>
          </TouchableOpacity>
        </View>
        <View style={commonStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: SPACING.md },
            ]}
          >
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            commonStyles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={commonStyles.backButton}
          >
            <Text style={[commonStyles.backText, { color: colors.primary }]}>
              ← Назад
            </Text>
          </TouchableOpacity>
        </View>
        <View style={commonStyles.center}>
          <Text style={[typography.body, { color: colors.error }]}>
            Упражнение не найдено
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const primaryMuscles = getList(exercise, 'primary_muscles');
  const secondaryMuscles = getList(exercise, 'secondary_muscles');
  const injuries = getList(exercise, 'injuries');
  const equipment = getList(exercise, 'equipment');

  return (
    <ScrollView
      style={[commonStyles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          commonStyles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={commonStyles.backButton}
        >
          <Text style={[commonStyles.backText, { color: colors.primary }]}>
            ← Назад
          </Text>
        </TouchableOpacity>
      </View>

      {/* Заголовок БЕЗ иконки */}
      <View
        style={[
          cardStyles.container,
          { borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}
      >
        <Text style={cardStyles.exerciseDetailName}>{exercise.name}</Text>

        {/* Основные мышцы */}
        {primaryMuscles.length > 0 && (
          <View style={cardStyles.exerciseDetailMuscleSection}>
            <Text style={cardStyles.exerciseDetailMuscleTitle}>
              Основные мышцы
            </Text>
            <View style={cardStyles.exerciseDetailMuscleList}>
              {primaryMuscles.map((muscle, idx) => {
                const muscleColor = getMuscleColor(muscle);
                return (
                  <View
                    key={idx}
                    style={[
                      muscleBadgeStyles.muscleBadge,
                      { backgroundColor: muscleColor + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        muscleBadgeStyles.muscleBadgeText,
                        { color: muscleColor },
                      ]}
                    >
                      {muscle}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Дополнительные мышцы - ТЕПЕРЬ ЦВЕТНЫЕ */}
        {secondaryMuscles.length > 0 && (
          <View style={cardStyles.exerciseDetailMuscleSection}>
            <Text style={cardStyles.exerciseDetailMuscleTitle}>
              Дополнительные мышцы
            </Text>
            <View style={cardStyles.exerciseDetailMuscleList}>
              {secondaryMuscles.map((muscle, idx) => {
                const muscleColor = getMuscleColor(muscle);
                return (
                  <View
                    key={idx}
                    style={[
                      muscleBadgeStyles.muscleBadge,
                      { backgroundColor: muscleColor + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        muscleBadgeStyles.muscleBadgeText,
                        { color: muscleColor },
                      ]}
                    >
                      {muscle}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* БЛОК С КАРУСЕЛЬЮ ИЗОБРАЖЕНИЙ */}
      {imageUrls.length > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Демонстрация
            </Text>
          </View>

          <View style={cardStyles.exerciseDetailMediaContainer}>
            {/* Первое изображение */}
            <Animated.Image
              source={{ uri: imageUrls[0] }}
              style={[
                cardStyles.exerciseDetailMediaImage,
                { opacity: opacity1 },
              ]}
              resizeMode="cover"
            />

            {/* Второе изображение */}
            {imageUrls[1] && (
              <Animated.Image
                source={{ uri: imageUrls[1] }}
                style={[
                  cardStyles.exerciseDetailMediaImage,
                  { opacity: opacity2 },
                ]}
                resizeMode="cover"
              />
            )}

            {/* Индикаторы */}
            {imageUrls.length > 1 && (
              <View style={cardStyles.exerciseDetailMediaIndicators}>
                <View
                  style={[
                    cardStyles.exerciseDetailMediaDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[
                    cardStyles.exerciseDetailMediaDot,
                    { backgroundColor: colors.textTertiary + '60' },
                  ]}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Личные рекорды */}
      {personalRecords.maxWeight > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <TrendingUp size={20} color="#4CAF50" strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Личные рекорды
            </Text>
          </View>
          <View style={cardStyles.recordsContainer}>
            <View style={cardStyles.recordItem}>
              <Text
                style={[
                  cardStyles.recordValue,
                  cardStyles.recordValuePrimary,
                ]}
              >
                {personalRecords.maxWeight}кг
              </Text>
              <Text style={cardStyles.recordLabel}>Макс. вес</Text>
            </View>
            <View style={cardStyles.recordItem}>
              <Text
                style={[
                  cardStyles.recordValue,
                  cardStyles.recordValueSuccess,
                ]}
              >
                {personalRecords.maxReps}
              </Text>
              <Text style={cardStyles.recordLabel}>Макс. повторы</Text>
            </View>
            <View style={cardStyles.recordItem}>
              <Text
                style={[
                  cardStyles.recordValue,
                  cardStyles.recordValueWarning,
                ]}
              >
                {(personalRecords.totalVolume / 1000).toFixed(1)}т
              </Text>
              <Text style={cardStyles.recordLabel}>Общий тоннаж</Text>
            </View>
          </View>
        </View>
      )}

      {/* Техника выполнения */}
      {exercise.technique ? (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Техника выполнения
            </Text>
          </View>
          <Text style={cardStyles.exerciseDetailSectionText}>
            {exercise.technique}
          </Text>
        </View>
      ) : null}

      {/* Польза */}
      {exercise.benefits ? (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <CheckCircle size={20} color="#4CAF50" strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>Польза</Text>
          </View>
          <Text style={cardStyles.exerciseDetailSectionText}>
            {exercise.benefits}
          </Text>
        </View>
      ) : null}

      {/* Риски */}
      {exercise.risks ? (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <AlertTriangle size={20} color="#FF9800" strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>Риски</Text>
          </View>
          <Text style={cardStyles.exerciseDetailSectionText}>
            {exercise.risks}
          </Text>
        </View>
      ) : null}

      {/* Противопоказания */}
      {injuries.length > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <AlertCircle size={20} color="#F44336" strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Противопоказания
            </Text>
          </View>
          {injuries.map((injury, idx) => (
            <Text key={idx} style={cardStyles.exerciseDetailInjuryText}>
              • {injury}
            </Text>
          ))}
        </View>
      )}

      {/* Оборудование */}
      {equipment.length > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <Wrench size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Оборудование
            </Text>
          </View>
          <View style={cardStyles.exerciseDetailEquipmentContainer}>
            {equipment.map((eq, idx) => (
              <View key={idx} style={cardStyles.exerciseDetailEquipmentCard}>
                <View style={cardStyles.exerciseDetailEquipmentIconContainer}>
                  <EquipmentIcon
                    name={eq}
                    primaryMuscles={primaryMuscles}
                    size={32}
                    scale={0.9}
                  />
                </View>
                <Text style={cardStyles.exerciseDetailEquipmentText}>
                  {eq}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Настройка */}
      {exercise.settings ? (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Настройка
            </Text>
          </View>
          <Text style={cardStyles.exerciseDetailSectionText}>
            {exercise.settings}
          </Text>
        </View>
      ) : null}

      {/* Используемые в программах */}
      {relatedPrograms.length > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <TrendingUp size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Используется в программах
            </Text>
          </View>
          {relatedPrograms.map((program, idx) => (
            <TouchableOpacity
              key={idx}
              style={cardStyles.relatedItem}
              onPress={() => router.push(`/program/${program.id}`)}
            >
              <Text style={cardStyles.relatedItemName} numberOfLines={1}>
                {program.name}
              </Text>
              <View style={cardStyles.relatedItemMeta}>
                <Text style={cardStyles.relatedItemMetaText}>
                  {program.duration} нед
                </Text>
                <ChevronRight
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Похожие упражнения */}
      {similarExercises.length > 0 && (
        <View style={cardStyles.exerciseDetailSection}>
          <View style={cardStyles.exerciseDetailSectionHeader}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            <Text style={cardStyles.exerciseDetailSectionTitle}>
              Похожие упражнения
            </Text>
          </View>
          {similarExercises.map((ex, idx) => (
            <TouchableOpacity
              key={idx}
              style={cardStyles.similarItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/exercise/${ex.id}`);
              }}
            >
              <View style={cardStyles.similarItemIcon}>
                <Settings size={20} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={cardStyles.similarItemContent}>
                <Text style={cardStyles.similarItemName} numberOfLines={1}>
                  {ex.name}
                </Text>
                <Text style={cardStyles.similarItemMuscles} numberOfLines={1}>
                  {getList(ex, 'primary_muscles').join(', ')}
                </Text>
              </View>
              <ChevronRight
                size={16}
                color={colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}