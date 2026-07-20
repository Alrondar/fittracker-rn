import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import {
  Flame,
  RefreshCw,
  Play,
  Pause,
  Check,
  Clock,
  ChevronDown,
  SkipForward,
  Dumbbell,
  BookOpen,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { WarmupExercise } from '../../services/warmupService';

interface WarmupBlockProps {
  warmupExercises: WarmupExercise[];
  isLoading: boolean;
  activeTimerId: string | null;
  timeLeft: number;
  isAllCompleted: boolean;
  totalDuration: number;
  isCompleted: (id: string) => boolean;
  onGenerateWarmup: () => void;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onMarkCompleted: (id: string) => void;
  onSkip: () => void;
}

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

// ===== Раскрывающаяся секция с анимацией высоты =====
function ExpandableSection({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, height]);

  const style = useAnimatedStyle(() => ({
    height: progress.value * height,
    opacity: 0.4 + progress.value * 0.6,
  }));

  return (
    <Animated.View style={[{ overflow: 'hidden' }, style]}>
      <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}

// ===== Информационный блок (техника / польза / риски) =====
function InfoBlock({
  icon,
  title,
  titleColor,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.captionSmall,
            {
              color: titleColor,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 2,
            },
          ]}
        >
          {title}
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

// ===== Карточка упражнения разминки =====
interface WarmupExerciseCardProps {
  exercise: WarmupExercise;
  index: number;
  completed: boolean;
  isActive: boolean;
  timeLeft: number;
  maxScore: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onMarkCompleted: () => void;
}

function WarmupExerciseCard({
  exercise,
  index,
  completed,
  isActive,
  timeLeft,
  maxScore,
  expanded,
  onToggleExpand,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
}: WarmupExerciseCardProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  // Анимация прогресс-бара таймера
  useEffect(() => {
    if (isActive && exercise.duration_seconds > 0) {
      progress.value = withTiming(timeLeft / exercise.duration_seconds, {
        duration: 950,
        easing: Easing.linear,
      });
    } else {
      progress.value = 0;
    }
  }, [isActive, timeLeft, exercise.duration_seconds]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const matchPercent =
    maxScore > 0 ? Math.round((exercise.relevance_score / maxScore) * 100) : 0;
  const hasDetails = Boolean(exercise.technique || exercise.benefits || exercise.risks);
  const equipmentLabel =
    exercise.equipment.length > 0 ? exercise.equipment.join(', ') : 'Без оборудования';

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(300)}>
      <View
        style={{
          backgroundColor: isActive ? colors.warning + '12' : colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: isActive ? colors.warning : completed ? colors.success + '60' : colors.border,
          marginBottom: SPACING.sm,
          overflow: 'hidden',
          opacity: completed && !isActive ? 0.7 : 1,
        }}
      >
        {/* Основная строка */}
        <TouchableOpacity
          onPress={onToggleExpand}
          activeOpacity={0.85}
          disabled={!hasDetails}
          style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.md }}
        >
          {/* Статус / номер */}
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
              <Check size={18} color={colors.textInverse} strokeWidth={3} />
            ) : (
              <Text style={[typography.labelBold, { color: colors.warning }]}>{index + 1}</Text>
            )}
          </View>

          {/* Название и мета */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.labelBold,
                {
                  color: colors.textPrimary,
                  textDecorationLine: completed ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={expanded ? undefined : 2}
            >
              {exercise.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 3,
                flexWrap: 'wrap',
                gap: SPACING.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: 3 }]}>
                  {exercise.duration_seconds} сек
                </Text>
              </View>
              {matchPercent > 0 && (
                <View
                  style={{
                    backgroundColor: colors.primary + '15',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: BORDER_RADIUS.sm,
                  }}
                >
                  <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '700' }]}>
                    совпадение {matchPercent}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Индикатор раскрытия */}
          {hasDetails && (
            <View
              style={{
                marginRight: SPACING.sm,
                transform: [{ rotate: expanded ? '180deg' : '0deg' }],
              }}
            >
              <ChevronDown size={16} color={colors.textTertiary} />
            </View>
          )}

          {/* Управление таймером */}
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
              onPress={onStartTimer}
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
        </TouchableOpacity>

        {/* Прогресс-бар таймера */}
        {isActive && (
          <View
            style={{
              height: 4,
              backgroundColor: colors.warning + '25',
              marginHorizontal: SPACING.md,
              marginBottom: SPACING.md,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[{ height: '100%', backgroundColor: colors.warning, borderRadius: 2 }, progressStyle]}
            />
          </View>
        )}

        {/* Раскрывающиеся детали */}
        <ExpandableSection expanded={expanded && hasDetails}>
          <View
            style={{
              paddingHorizontal: SPACING.md,
              paddingBottom: SPACING.md,
              paddingTop: SPACING.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {/* Мышцы */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md }}>
              {exercise.primary_muscles.map(m => (
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
                  <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '600' }]}>
                    {m}
                  </Text>
                </View>
              ))}
              {exercise.secondary_muscles.map(m => (
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

            {/* Оборудование */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <Dumbbell size={14} color={colors.textSecondary} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: 6 }]}>
                {equipmentLabel}
              </Text>
            </View>

            {/* Техника / Польза / Риски */}
            {exercise.technique ? (
              <InfoBlock
                icon={<BookOpen size={14} color={colors.primary} />}
                title="Техника"
                titleColor={colors.primary}
                text={exercise.technique}
              />
            ) : null}
            {exercise.benefits ? (
              <InfoBlock
                icon={<Sparkles size={14} color={colors.success} />}
                title="Польза"
                titleColor={colors.success}
                text={exercise.benefits}
              />
            ) : null}
            {exercise.risks ? (
              <InfoBlock
                icon={<AlertTriangle size={14} color={colors.warning} />}
                title="Осторожно"
                titleColor={colors.warning}
                text={exercise.risks}
              />
            ) : null}

            {/* Ручная отметка */}
            {!completed && (
              <TouchableOpacity
                onPress={onMarkCompleted}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
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
        </ExpandableSection>
      </View>
    </Animated.View>
  );
}

// ===== Основной блок разминки =====
export function WarmupBlock({
  warmupExercises,
  isLoading,
  activeTimerId,
  timeLeft,
  isAllCompleted,
  totalDuration,
  isCompleted,
  onGenerateWarmup,
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
  onSkip,
}: WarmupBlockProps) {
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const pulse = useSharedValue(0.35);

  // Пульсация скелетона при загрузке
  useEffect(() => {
    if (isLoading) {
      pulse.value = 0.35;
      pulse.value = withRepeat(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [isLoading]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach(ex => ex.primary_muscles.forEach(m => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  const maxScore = useMemo(
    () => warmupExercises.reduce((m, ex) => Math.max(m, ex.relevance_score), 0),
    [warmupExercises]
  );

  const completedCount = warmupExercises.filter(ex => isCompleted(ex.id)).length;
  const mins = Math.max(1, Math.round(totalDuration / 60));

  // Скелетон загрузки
  if (isLoading) {
    return (
      <View style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.md }}>
        <Animated.View
          style={[
            { backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.lg, height: 132 },
            pulseStyle,
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm }}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: SPACING.sm }]}>
            Подбираем упражнения под твою тренировку...
          </Text>
        </View>
      </View>
    );
  }

  if (warmupExercises.length === 0) return null;

  // Свёрнутый режим
  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={() => setCollapsed(false)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: SPACING.sm,
          marginHorizontal: SPACING.lg,
          marginTop: SPACING.md,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          backgroundColor: colors.warning + '12',
          borderRadius: BORDER_RADIUS.full,
          borderWidth: 1,
          borderColor: colors.warning + '40',
        }}
      >
        <Flame size={14} color={colors.warning} />
        <Text style={[typography.captionSmall, { color: colors.textPrimary, fontWeight: '600' }]}>
          Разминка · {warmupExercises.length} упр. · {completedCount}/{warmupExercises.length} ✓
        </Text>
        <ChevronDown size={14} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.warning + '0D',
        borderBottomWidth: 1,
        borderBottomColor: colors.warning + '30',
      }}
    >
      {/* Заголовок */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.warning + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Flame size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>Разминка</Text>
            <View
              style={{
                backgroundColor: colors.warning + '20',
                paddingHorizontal: SPACING.sm,
                paddingVertical: 2,
                borderRadius: BORDER_RADIUS.sm,
              }}
            >
              <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>
                ~{mins} мин
              </Text>
            </View>
          </View>
          {targetMuscles.length > 0 && (
            <Text
              style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}
              numberOfLines={1}
            >
              Под твою тренировку: {targetMuscles.join(' · ')}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGenerateWarmup();
          }}
          style={{ padding: SPACING.sm }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCollapsed(true)} style={{ padding: SPACING.sm }}>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Список упражнений */}
      <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs }}>
        {warmupExercises.map((exercise, index) => (
          <WarmupExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            completed={isCompleted(exercise.id)}
            isActive={activeTimerId === exercise.id}
            timeLeft={timeLeft}
            maxScore={maxScore}
            expanded={expandedId === exercise.id}
            onToggleExpand={() =>
              setExpandedId(prev => (prev === exercise.id ? null : exercise.id))
            }
            onStartTimer={() => onStartTimer(exercise.id)}
            onStopTimer={onStopTimer}
            onMarkCompleted={() => onMarkCompleted(exercise.id)}
          />
        ))}
      </View>

      {/* Футер: пропуск + прогресс */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xs,
          paddingBottom: SPACING.lg,
        }}
      >
        <AppButton
          title="Пропустить"
          variant="secondary"
          size="medium"
          icon={<SkipForward size={16} color={colors.primary} />}
          onPress={onSkip}
          style={{ flex: 1 }}
        />
        <View style={{ flex: 1.3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>Выполнено</Text>
            <Text
              style={[
                typography.captionSmall,
                {
                  color: isAllCompleted ? colors.success : colors.textPrimary,
                  fontWeight: '700',
                },
              ]}
            >
              {isAllCompleted ? 'Готово ✓' : `${completedCount}/${warmupExercises.length}`}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${(completedCount / Math.max(warmupExercises.length, 1)) * 100}%`,
                backgroundColor: isAllCompleted ? colors.success : colors.warning,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}