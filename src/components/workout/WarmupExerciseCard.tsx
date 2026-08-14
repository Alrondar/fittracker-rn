import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import {
  Play,
  Pause,
  Check,
  Clock,
  RotateCcw,
  Dumbbell,
  BookOpen,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { EquipmentIcon } from '../EquipmentIcon';
import { ExerciseInfoAccordion } from './ExerciseInfoAccordion';
import { TechniqueMediaSlider } from './TechniqueMediaSlider';
import { WarmupExercise } from '../../services/warmupService';

// Лимит высоты раскрытого контента для техники со слайдером (190px) + текст
const TECHNIQUE_MAX_HEIGHT = 640;

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

type SectionKey = 'technique' | 'benefits' | 'risks' | 'injuries';

// ===== Компактная карточка альтернативы разминки (горизонтальный слайдер) =====
interface WarmupAlternativeCardProps {
  alt: WarmupExercise;
  onPress: () => void;
  /** PERF-5: живая ширина карточки от родителя (useWindowDimensions). */
  cardWidth: number;
}

/**
 * Мини-карточка замены в горизонтальном слайдере разминки.
 * Не memo: перерисовка дешёвая и случается только при замене/регенерации
 * родительской карточки (не на каждый тик секундомера).
 */
function WarmupAlternativeCard({ alt, onPress, cardWidth }: WarmupAlternativeCardProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        width: cardWidth,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        gap: 6,
      }}
    >
      <Text
        style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '700' }]}
        numberOfLines={2}
      >
        {alt.name}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={11} color={colors.textTertiary} />
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            {alt.duration_seconds} сек
          </Text>
        </View>
        <View
          style={{
            backgroundColor: alt.can_be_activation ? colors.warning + '20' : colors.info + '20',
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: BORDER_RADIUS.sm,
          }}
        >
          <Text
            style={[
              typography.captionSmall,
              {
                color: alt.can_be_activation ? colors.warning : colors.info,
                fontWeight: '700',
              },
            ]}
          >
            {alt.can_be_activation ? 'Активация' : 'Растяжка'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <RotateCcw size={12} color={colors.primary} />
        <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
          Заменить
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ===== Карточка упражнения разминки =====
interface WarmupExerciseCardProps {
  exercise: WarmupExercise;
  index: number;
  completed: boolean;
  isActive: boolean;
  /** Передаётся ТОЛЬКО активной карточке; неактивным — 0, чтобы memo не сбивался тиком. */
  timeLeft: number;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkCompleted: (id: string) => void;
  loadAlternatives: (id: string, muscles: string[]) => Promise<WarmupExercise[]>;
  onReplace: (index: number, alt: WarmupExercise) => void;
}

export const WarmupExerciseCard = memo(function WarmupExerciseCard({
  exercise,
  index,
  completed,
  isActive,
  timeLeft,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
  loadAlternatives,
  onReplace,
}: WarmupExerciseCardProps) {
  const { colors } = useTheme();

  const equipment: string[] = exercise.equipment ?? [];
  // PERF-5: ширина окна реактивна (rotate / iPad Split View / resize).
  // Раньше ALT_CARD_WIDTH считался один раз на уровне модуля и «замерзал».
  const { width: screenWidth } = useWindowDimensions();
  const altCardWidth = screenWidth * 0.7;
  const progress = useSharedValue(0);
  // Ленивый монтаж: слайдер техники создаётся только после первого открытия
  const [everOpened, setEverOpened] = useState<Set<SectionKey>>(new Set());
  // Альтернативы разминки (горизонтальный слайдер замен)
  const [alts, setAlts] = useState<WarmupExercise[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);

  // Загрузка альтернатив с кэшем на уровне useWarmup.
  // Зависимость от exercise.id: при замене упражнения id меняется → подтянутся
  // альтернативы уже для нового упражнения. Цикла нет (fetch не зовёт onReplace).
  useEffect(() => {
    let alive = true;
    setLoadingAlts(true);
    loadAlternatives(exercise.id, exercise.primary_muscles)
      .then((list) => {
        if (alive) setAlts(list);
      })
      .finally(() => {
        if (alive) setLoadingAlts(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const handleReplace = useCallback(
    (alt: WarmupExercise) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onReplace(index, alt);
    },
    [index, onReplace],
  );

  // Плавный прогресс-бар таймера (синхронизирован с тиком раз в секунду)
  useEffect(() => {
    if (isActive && exercise.duration_seconds > 0) {
      progress.value = withTiming(timeLeft / exercise.duration_seconds, {
        duration: 950,
        easing: Easing.linear,
      });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, timeLeft, exercise.duration_seconds, progress]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const hasAlts = !loadingAlts && alts.length > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(300)}>
      <View
        style={{
          backgroundColor: isActive ? colors.warning + '12' : colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: isActive
            ? colors.warning
            : completed
            ? colors.success + '60'
            : colors.border,
          marginBottom: SPACING.sm,
          overflow: 'hidden',
          opacity: completed && !isActive ? 0.7 : 1,
          padding: SPACING.md,
        }}
      >
        {/* Заголовок: номер + название + таймер */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: completed ? colors.success : colors.warning + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: SPACING.md,
            }}
          >
            {completed ? (
              <Animated.View entering={ZoomIn.springify().damping(14).stiffness(220)}>
                <Check size={18} color={colors.textInverse} strokeWidth={3} />
              </Animated.View>
            ) : (
              <Text style={[typography.labelBold, { color: colors.warning }]}>
                {index + 1}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.labelBold,
                {
                  color: colors.textPrimary,
                  textDecorationLine: completed ? 'line-through' : 'none',
                },
              ]}
            >
              {exercise.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                {exercise.duration_seconds} сек
              </Text>
              <View
                style={{
                  backgroundColor: exercise.can_be_activation
                    ? colors.warning + '20'
                    : colors.info + '20',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: BORDER_RADIUS.sm,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color: exercise.can_be_activation ? colors.warning : colors.info,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {exercise.can_be_activation ? 'Активация' : 'Растяжка'}
                </Text>
              </View>
            </View>
          </View>
          {isActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text
                style={[
                  typography.h5,
                  { color: colors.warning, fontVariant: ['tabular-nums'] },
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
              <TouchableOpacity
                onPress={onStopTimer}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Pause size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onStartTimer(exercise.id)}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: completed ? colors.successLight : colors.warning,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {completed ? (
                <Check size={18} color={colors.success} />
              ) : (
                <Play
                  size={16}
                  color={colors.textInverse}
                  fill={colors.textInverse}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Прогресс-бар таймера */}
        {isActive && (
          <View
            style={{
              height: 4,
              backgroundColor: colors.warning + '25',
              marginTop: SPACING.md,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                { height: '100%', backgroundColor: colors.warning, borderRadius: 2 },
                progressStyle,
              ]}
            />
          </View>
        )}

        {/* Бейджи мышц */}
        {(exercise.primary_muscles.length > 0 || exercise.secondary_muscles.length > 0) && (
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md }}
          >
            {exercise.primary_muscles.map((m) => (
              <View
                key={`p-${m}`}
                style={{
                  backgroundColor: colors.primary + '15',
                  borderWidth: 1,
                  borderColor: colors.primary + '40',
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {m}
                </Text>
              </View>
            ))}
            {exercise.secondary_muscles.map((m) => (
              <View
                key={`s-${m}`}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 3,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>{m}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Оборудование: отдельный чип на каждую единицу */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md }}>
{equipment.length > 0 ? (
  equipment.map((eq, i) => (
              <View
                key={`eq-${i}-${eq}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: colors.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 4,
                  borderRadius: BORDER_RADIUS.full,
                }}
              >
                <EquipmentIcon name={eq} size={16} primaryMuscles={exercise.primary_muscles} />
                <Text
                  style={[
                    typography.captionSmall,
                    { color: colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  {formatEquipmentName(eq)}
                </Text>
              </View>
            ))
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: SPACING.sm,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.full,
              }}
            >
              <Dumbbell size={12} color={colors.textTertiary} />
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, fontWeight: '600' },
                ]}
              >
                Без оборудования
              </Text>
            </View>
          )}
        </View>

        {/* Горизонтальный слайдер альтернатив разминки (свайп). */}
        {hasAlts && (
          <View style={{ marginTop: SPACING.md }}>
            <Text
              style={[
                typography.captionSmall,
                {
                  color: colors.textTertiary,
                  fontWeight: '700',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                },
              ]}
            >
              Альтернативы (свайп)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={altCardWidth + SPACING.sm}
              decelerationRate="fast"
              contentContainerStyle={{ paddingRight: SPACING.sm, gap: SPACING.sm }}
            >
              {alts.map((alt) => (
                <WarmupAlternativeCard
                  key={alt.id}
                  alt={alt}
                  onPress={() => handleReplace(alt)}
                  cardWidth={altCardWidth}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Техника — аккордеон со слайдером внутри (ленивый монтаж) */}
        {exercise.technique || exercise.media_url ? (
          <ExerciseInfoAccordion
            icon={<BookOpen size={13} color={colors.primary} />}
            title="Техника"
            titleColor={colors.primary}
            maxHeight={TECHNIQUE_MAX_HEIGHT}
          >
            {everOpened.has('technique') && (
<TechniqueMediaSlider mediaUrl={exercise.media_url ?? null} autoPlay />
            )}
            {exercise.technique ? (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, lineHeight: 18, marginTop: SPACING.sm },
                ]}
              >
                {exercise.technique}
              </Text>
            ) : null}
          </ExerciseInfoAccordion>
        ) : null}

        {/* Польза — свёрнута */}
        {exercise.benefits ? (
          <ExerciseInfoAccordion
            icon={<Sparkles size={13} color={colors.success} />}
            title="Польза"
            titleColor={colors.success}
          >
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
              {exercise.benefits}
            </Text>
          </ExerciseInfoAccordion>
        ) : null}

        {/* Риски — свёрнуты */}
        {exercise.risks ? (
          <ExerciseInfoAccordion
            icon={<AlertTriangle size={13} color={colors.warning} />}
            title="Риски"
            titleColor={colors.warning}
          >
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
              {exercise.risks}
            </Text>
          </ExerciseInfoAccordion>
        ) : null}

        {/* Противопоказания — свёрнуты */}
        {exercise.injuries.length > 0 ? (
          <ExerciseInfoAccordion
            icon={<ShieldAlert size={13} color={colors.error} />}
            title="Противопоказания"
            titleColor={colors.error}
          >
            {exercise.injuries.map((item, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}
              >
                <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>
                  •
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, lineHeight: 18, flex: 1 },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </ExerciseInfoAccordion>
        ) : null}

        {/* Ручная отметка выполнения */}
        {!completed && (
          <TouchableOpacity
            onPress={() => onMarkCompleted(exercise.id)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              marginTop: SPACING.md,
              paddingVertical: SPACING.xs,
              paddingHorizontal: SPACING.sm,
              borderRadius: BORDER_RADIUS.md,
              backgroundColor: colors.successLight,
            }}
          >
            <Check size={14} color={colors.success} />
            <Text
              style={[
                typography.captionSmall,
                { color: colors.success, fontWeight: '600', marginLeft: 4 },
              ]}
            >
              Отметить выполненным
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});