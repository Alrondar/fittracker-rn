import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeInDown,
  ZoomIn,
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
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppButton } from '../ui/AppButton';
import { EquipmentIcon } from '../EquipmentIcon';
import { TechniqueMediaSlider } from './TechniqueMediaSlider';
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

// Лимиты высоты раскрытого контента
const DEFAULT_MAX_HEIGHT = 300;   // польза / риски / противопоказания
const TECHNIQUE_MAX_HEIGHT = 640; // техника со слайдером (190px) + текст

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

const formatEquipmentName = (name: string) =>
  name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ===== Раскрывающаяся секция (тот же механизм, что в ExerciseCard) =====
function ExpandableSection({
  expanded,
  maxHeight,
  children,
}: {
  expanded: boolean;
  maxHeight: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const style = useAnimatedStyle(() => ({
    maxHeight: progress.value * maxHeight,
    opacity: 0.1 + progress.value * 0.9,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));

  return (
    // Свёрнутая секция не перехватывает касания (слайдер внутри не блокирует соседей)
    <Animated.View pointerEvents={expanded ? 'auto' : 'none'} style={[{ overflow: 'hidden' }, style]}>
      <View style={{ paddingTop: SPACING.sm, paddingBottom: SPACING.xs, paddingHorizontal: 2 }}>
        {children}
      </View>
    </Animated.View>
  );
}

// ===== Аккордеон без обводки: цветной значок + заголовок + шеврон =====
type SectionKey = 'technique' | 'benefits' | 'risks' | 'injuries';

function CollapsibleInfo({
  icon,
  title,
  titleColor,
  expanded,
  onToggle,
  maxHeight = DEFAULT_MAX_HEIGHT,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  expanded: boolean;
  onToggle: () => void;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: SPACING.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.xs + 2,
          paddingHorizontal: SPACING.sm,
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        {icon}
        <Text
          style={[
            typography.captionSmall,
            {
              color: titleColor,
              fontWeight: '700',
              marginLeft: 6,
              flex: 1,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            },
          ]}
        >
          {title}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDown size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
      <ExpandableSection expanded={expanded} maxHeight={maxHeight}>
        {children}
      </ExpandableSection>
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
  onStartTimer,
  onStopTimer,
  onMarkCompleted,
}: WarmupExerciseCardProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  // ✅ Ленивый монтаж: слайдер создаётся только после первого открытия техники
  const [everOpened, setEverOpened] = useState<Set<SectionKey>>(new Set());

  const toggleSection = (key: SectionKey) => {
    setEverOpened(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setOpenSection(prev => (prev === key ? null : key));
  };

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
  }, [isActive, timeLeft, exercise.duration_seconds]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

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
              <Text style={[typography.labelBold, { color: colors.warning }]}>{index + 1}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.labelBold,
                { color: colors.textPrimary, textDecorationLine: completed ? 'line-through' : 'none' },
              ]}
            >
              {exercise.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[typography.captionSmall, { color: colors.textSecondary, marginLeft: 3 }]}>
                {exercise.duration_seconds} сек
              </Text>
            </View>
          </View>

          {isActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text style={[typography.h5, { color: colors.warning, fontVariant: ['tabular-nums'] }]}>
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
                <Play size={16} color={colors.textInverse} fill={colors.textInverse} style={{ marginLeft: 2 }} />
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
              style={[{ height: '100%', backgroundColor: colors.warning, borderRadius: 2 }, progressStyle]}
            />
          </View>
        )}

        {/* Бейджи мышц */}
        {(exercise.primary_muscles.length > 0 || exercise.secondary_muscles.length > 0) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md }}>
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
                <Text style={[typography.captionSmall, { color: colors.primary, fontWeight: '600' }]}>{m}</Text>
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
        )}

        {/* Оборудование: отдельный чип на каждую единицу */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md }}>
          {exercise.equipment.length > 0 ? (
            exercise.equipment.map((eq, i) => (
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
                <Text style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}>
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
              <Text style={[typography.captionSmall, { color: colors.textTertiary, fontWeight: '600' }]}>
                Без оборудования
              </Text>
            </View>
          )}
        </View>

        {/* ✅ Техника — аккордеон со слайдером внутри (ленивый монтаж) */}
        {(exercise.technique || exercise.media_url) ? (
          <CollapsibleInfo
            icon={<BookOpen size={13} color={colors.primary} />}
            title="Техника"
            titleColor={colors.primary}
            expanded={openSection === 'technique'}
            onToggle={() => toggleSection('technique')}
            maxHeight={TECHNIQUE_MAX_HEIGHT}
          >
            {everOpened.has('technique') && (
              <TechniqueMediaSlider
                mediaUrl={exercise.media_url}
                autoPlay={openSection === 'technique'} // автоплей только в открытом виде
              />
            )}
            {exercise.technique ? (
              <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, marginTop: SPACING.sm }]}>
                {exercise.technique}
              </Text>
            ) : null}
          </CollapsibleInfo>
        ) : null}

        {/* Польза — свёрнута */}
        {exercise.benefits ? (
          <CollapsibleInfo
            icon={<Sparkles size={13} color={colors.success} />}
            title="Польза"
            titleColor={colors.success}
            expanded={openSection === 'benefits'}
            onToggle={() => toggleSection('benefits')}
          >
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
              {exercise.benefits}
            </Text>
          </CollapsibleInfo>
        ) : null}

        {/* Риски — свёрнуты */}
        {exercise.risks ? (
          <CollapsibleInfo
            icon={<AlertTriangle size={13} color={colors.warning} />}
            title="Риски"
            titleColor={colors.warning}
            expanded={openSection === 'risks'}
            onToggle={() => toggleSection('risks')}
          >
            <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18 }]}>
              {exercise.risks}
            </Text>
          </CollapsibleInfo>
        ) : null}

        {/* Противопоказания — свёрнуты */}
        {exercise.injuries.length > 0 ? (
          <CollapsibleInfo
            icon={<ShieldAlert size={13} color={colors.error} />}
            title="Противопоказания"
            titleColor={colors.error}
            expanded={openSection === 'injuries'}
            onToggle={() => toggleSection('injuries')}
          >
            {exercise.injuries.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={[typography.bodySmall, { color: colors.error, marginRight: 6 }]}>•</Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary, lineHeight: 18, flex: 1 }]}>
                  {item}
                </Text>
              </View>
            ))}
          </CollapsibleInfo>
        ) : null}

        {/* Ручная отметка выполнения */}
        {!completed && (
          <TouchableOpacity
            onPress={onMarkCompleted}
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
            <Text style={[typography.captionSmall, { color: colors.success, fontWeight: '600', marginLeft: 4 }]}>
              Отметить выполненным
            </Text>
          </TouchableOpacity>
        )}
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
  const pulse = useSharedValue(0.35);
  const footerProgress = useSharedValue(0);

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

  const completedCount = warmupExercises.filter(ex => isCompleted(ex.id)).length;

  // Анимация прогресса в футере
  useEffect(() => {
    footerProgress.value = withTiming(completedCount / Math.max(warmupExercises.length, 1), {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [completedCount, warmupExercises.length]);

  const footerProgressStyle = useAnimatedStyle(() => ({ width: `${footerProgress.value * 100}%` }));

  const targetMuscles = useMemo(() => {
    const set = new Set<string>();
    warmupExercises.forEach(ex => ex.primary_muscles.forEach(m => set.add(m)));
    return Array.from(set).slice(0, 4);
  }, [warmupExercises]);

  const mins = Math.max(1, Math.round(totalDuration / 60));

  // Скелетон загрузки
  if (isLoading) {
    return (
      <View style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.md }}>
        <Animated.View
          style={[{ backgroundColor: colors.surfaceSecondary, borderRadius: BORDER_RADIUS.lg, height: 132 }, pulseStyle]}
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
              <Text style={[typography.captionSmall, { color: colors.warning, fontWeight: '700' }]}>~{mins} мин</Text>
            </View>
          </View>
          {targetMuscles.length > 0 && (
            <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
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
            onStartTimer={() => onStartTimer(exercise.id)}
            onStopTimer={onStopTimer}
            onMarkCompleted={() => onMarkCompleted(exercise.id)}
          />
        ))}
      </View>

      {/* Футер: пропуск + прогресс выполнения */}
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
                { color: isAllCompleted ? colors.success : colors.textPrimary, fontWeight: '700' },
              ]}
            >
              {isAllCompleted ? 'Готово ✓' : `${completedCount}/${warmupExercises.length}`}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 3, overflow: 'hidden' }}>
            <Animated.View
              style={[
                { height: '100%', backgroundColor: isAllCompleted ? colors.success : colors.warning, borderRadius: 3 },
                footerProgressStyle,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}