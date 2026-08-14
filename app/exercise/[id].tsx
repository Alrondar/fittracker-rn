import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, DimensionValue } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Zap,
  RefreshCw,
  Dumbbell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useExerciseDetail } from '../../src/hooks/useExerciseDetail';
import { TechniqueMediaSlider } from '../../src/components/workout/TechniqueMediaSlider';
import { MuscleBubbles } from '../../src/components/workout/MuscleBubbles';
import { EquipmentBubbles } from '../../src/components/workout/EquipmentBubbles';
import { ExerciseInfoAccordion } from '../../src/components/workout/ExerciseInfoAccordion';
import { RecordsCard } from '../../src/components/exercises/RecordsCard';
import { EXERCISE_CATEGORIES } from '../../src/constants/exerciseCategories';
import { getMuscleColor } from '../../src/constants/muscleColors';
import { SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { commonStyles } from '../../src/styles/common';
import { typography } from '../../src/styles/typography';
import { createCardStyles } from '../../src/styles/components/card';
import { AppButton } from '../../src/components/ui/AppButton';
import { EquipmentIcon } from '../../src/components/EquipmentIcon';
import { FadeIn } from '../../src/components/FadeIn';
import { SectionHeader } from '../../src/components/SectionHeader';

type SectionKey = 'benefits' | 'risks' | 'injuries' | 'settings';

// ===== Скелетон загрузки =====
function DetailSkeleton() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const block = (height: number, width: DimensionValue = '100%') => ({
    height,
    width,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BORDER_RADIUS.lg,
  });

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
        <Animated.View style={[block(220), pulseStyle]} />
        <Animated.View style={[block(30, '72%'), pulseStyle]} />
        <Animated.View style={[block(16, '46%'), pulseStyle]} />
        <Animated.View style={[block(84), pulseStyle]} />
        <Animated.View style={[block(130), pulseStyle]} />
      </View>
    </SafeAreaView>
  );
}

// ===== Состояние ошибки (с реальным текстом из хука) =====
function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string | null }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={commonStyles.center}>
        <AlertTriangle size={64} color={colors.warning} strokeWidth={1.5} />
        <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
          Не удалось загрузить
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: SPACING.xs }]}>
          Проверьте соединение и попробуйте снова
        </Text>
        {message ? (
          <Text
            style={[
              typography.captionSmall,
              {
                color: colors.textTertiary,
                marginTop: SPACING.xs,
                textAlign: 'center',
                paddingHorizontal: SPACING.xl,
              },
            ]}
            numberOfLines={3}
          >
            {message}
          </Text>
        ) : null}
        <AppButton
          title="Повторить"
          variant="primary"
          size="medium"
          onPress={onRetry}
          icon={<RefreshCw size={16} color={colors.textInverse} />}
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    </SafeAreaView>
  );
}

// ===== Упражнение не найдено =====
function NotFoundState({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={commonStyles.center}>
        <Dumbbell size={64} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={[typography.h4, { color: colors.textPrimary, marginTop: SPACING.md }]}>
          Упражнение не найдено
        </Text>
        <AppButton
          title="Назад"
          variant="secondary"
          size="medium"
          onPress={onBack}
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    </SafeAreaView>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useStore();
  const { colors } = useTheme();
  // Стили создаются один раз на смену темы (паттерн CLAUDE.md)
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const {
    exercise,
    alternatives,
    loading,
    isError,
    errorMessage,
    refetch,
    records,
    recordsLoading,
    recordsError,
  } = useExerciseDetail(id as string, userId);

  if (loading) return <DetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} message={errorMessage} />;
  if (!exercise) return <NotFoundState onBack={() => router.back()} />;

const categoryMeta = exercise.category
  ? EXERCISE_CATEGORIES.find(c => c.value === exercise.category)
  : undefined;

const injuries = exercise.injuries ?? [];
const equipment = exercise.equipment ?? [];
const primaryMuscles = exercise.primary_muscles ?? [];
const secondaryMuscles = exercise.secondary_muscles ?? [];
  const CategoryIcon = categoryMeta?.icon;

  // Акцент экрана — цвет целевой группы мышц
  const accentColor = exercise.primary_muscles.length > 0
    ? getMuscleColor(exercise.primary_muscles[0])
    : colors.primary;

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Шапка */}
      <View style={[commonStyles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={commonStyles.backButton}>
          <ChevronLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
          Упражнение
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero: слайдер техники (0.jpg ↔ 1.jpg, автоплей) */}
        {exercise.media_url ? (
          <FadeIn>
            <View style={{ paddingHorizontal: SPACING.lg }}>
              <TechniqueMediaSlider mediaUrl={exercise.media_url} height={220} autoPlay />
            </View>
          </FadeIn>
        ) : null}

        <View style={{ padding: SPACING.lg, paddingTop: exercise.media_url ? SPACING.md : SPACING.lg }}>
          {/* Название */}
          <FadeIn delay={60}>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>
              {exercise.name}
            </Text>
          </FadeIn>

          {/* Категория + оборудование */}
          <FadeIn delay={120}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md }}>
              {categoryMeta && CategoryIcon ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: colors.primary + '15',
                    borderWidth: 1,
                    borderColor: colors.primary + '40',
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 4,
                    borderRadius: BORDER_RADIUS.full,
                  }}
                >
                  <CategoryIcon size={13} color={colors.primary} strokeWidth={2} />
                  <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
                    {categoryMeta.label}
                  </Text>
                </View>
              ) : null}
              {exercise.can_be_activation && (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.warning + '15',
      borderWidth: 1,
      borderColor: colors.warning + '40',
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.full,
    }}
  >
    <Zap size={13} color={colors.warning} strokeWidth={2} />
    <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
      Активация
    </Text>
  </View>
)}
              <EquipmentBubbles equipment={equipment} primaryMuscles={primaryMuscles} />
            </View>
          </FadeIn>

          {/* Целевые и вспомогательные мышцы (акцент — цвет целевой группы) */}
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) ? (
            <FadeIn delay={180}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: BORDER_RADIUS.lg,
                  borderWidth: 1,
                  borderColor: accentColor + '40',
                  borderLeftWidth: 4,
                  borderLeftColor: accentColor,
                  padding: SPACING.md,
                  marginTop: SPACING.lg,
                }}
              >
                {primaryMuscles.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                      <Target size={16} color={accentColor} strokeWidth={2} />
                      <Text
                        style={[
                          typography.captionSmall,
                          {
                            color: colors.textSecondary,
                            fontWeight: '700',
                            marginLeft: 6,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        Целевые мышцы
                      </Text>
                    </View>
                    <MuscleBubbles primaryMuscles={primaryMuscles} />
                  </>
                )}
                {secondaryMuscles.length > 0 && (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: exercise.primary_muscles.length > 0 ? SPACING.md : 0,
                        marginBottom: SPACING.sm,
                      }}
                    >
                      <Zap size={16} color={colors.warning} strokeWidth={2} />
                      <Text
                        style={[
                          typography.captionSmall,
                          {
                            color: colors.textSecondary,
                            fontWeight: '700',
                            marginLeft: 6,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          },
                        ]}
                      >
                        Вспомогательные
                      </Text>
                    </View>
                   <MuscleBubbles secondaryMuscles={secondaryMuscles} />
                  </>
                )}
              </View>
            </FadeIn>
          ) : null}

          {/* ✅ НОВОЕ: Личные рекорды */}
          {userId ? (
            <FadeIn delay={240}>
              <RecordsCard
                records={records}
                loading={recordsLoading}
                error={recordsError}
                accentColor={accentColor}
                cardStyles={cardStyles}
              />
            </FadeIn>
          ) : null}

          {/* Техника выполнения — основной контент, видна сразу */}
          {exercise.technique ? (
            <FadeIn delay={300}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: BORDER_RADIUS.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: SPACING.md,
                  marginTop: SPACING.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                  <BookOpen size={16} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[
                      typography.captionSmall,
                      {
                        color: colors.textSecondary,
                        fontWeight: '700',
                        marginLeft: 6,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      },
                    ]}
                  >
                    Техника выполнения
                  </Text>
                </View>
                <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                  {exercise.technique}
                </Text>
              </View>
            </FadeIn>
          ) : null}

          {/* Вторичные секции — аккордеоны без контурных обводок */}
          <FadeIn delay={360}>
            <View style={{ marginTop: SPACING.lg }}>
              {exercise.benefits ? (
<ExerciseInfoAccordion
  icon={<Sparkles size={14} color={colors.success} />}
  title="Польза"
  titleColor={colors.success}
>
                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                    {exercise.benefits}
                  </Text>
                </ExerciseInfoAccordion>
              ) : null}

              {exercise.risks ? (
                <ExerciseInfoAccordion
                  icon={<AlertTriangle size={14} color={colors.warning} />}
                  title="Риски"
                  titleColor={colors.warning}
                >
                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                    {exercise.risks}
                  </Text>
                </ExerciseInfoAccordion>
              ) : null}

{injuries.length > 0 ? (
  <ExerciseInfoAccordion
    icon={<ShieldAlert size={14} color={colors.error} />}
    title="Противопоказания"
    titleColor={colors.error}
  >
    {injuries.map((injury, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Text style={[typography.body, { color: colors.error, marginRight: 6 }]}>•</Text>
                      <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22, flex: 1 }]}>
                        {injury}
                      </Text>
                    </View>
                  ))}
                </ExerciseInfoAccordion>
              ) : null}

              {exercise.settings ? (
                <ExerciseInfoAccordion
                  icon={<SlidersHorizontal size={14} color={colors.primary} />}
                  title="Настройки"
                  titleColor={colors.primary}
                >
                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                    {exercise.settings}
                  </Text>
                </ExerciseInfoAccordion>
              ) : null}
            </View>
          </FadeIn>

          {/* Альтернативные упражнения */}
          {alternatives.length > 0 && (
            <FadeIn delay={420}>
              <View style={{ marginTop: SPACING.xl }}>
<SectionHeader title="Альтернативные упражнения" count={alternatives.length} style={{ paddingHorizontal: 0, paddingTop: 0 }} />
{alternatives.map(alt => {
  const altPrimaryMuscles = alt.primary_muscles ?? [];
  const altEquipment = alt.equipment ?? [];
  const altAccent = altPrimaryMuscles.length > 0
    ? getMuscleColor(altPrimaryMuscles[0])
    : colors.border;
                  return (
                    <TouchableOpacity
                      key={alt.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push(`/exercise/${alt.id}`);
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surface,
                        borderRadius: BORDER_RADIUS.lg,
                        borderWidth: 1,
                        borderColor: altAccent,
                        borderLeftWidth: 4,
                        padding: SPACING.md,
                        marginBottom: SPACING.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: altAccent + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: SPACING.md,
                        }}
                      >
  <EquipmentIcon
    name={altEquipment[0] || 'Тренажер'}
    primaryMuscles={altPrimaryMuscles}
    size={28}
    scale={0.9}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
                          {alt.name}
                        </Text>
                        <MuscleBubbles primaryMuscles={altPrimaryMuscles.slice(0, 2)} style={{ marginTop: 4 }} />
                      </View>
                      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FadeIn>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}