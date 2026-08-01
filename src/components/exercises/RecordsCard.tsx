import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Trophy, Calendar } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { createCardStyles } from '../../styles/components/card';
import { ExerciseRecords } from '../../services/exercisesService';

// ===== Хелперы =====

const pluralize = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

const formatRelativeDate = (iso: string): string => {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return 'сегодня';
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatVolume = (kg: number): string =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)} т` : `${Math.round(kg)} кг`;

// Count-up: плавный «набегающий» счётчик для главного рекорда
function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplay(0);
      return;
    }
    const steps = 24;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const eased = 1 - Math.pow(1 - step / steps, 3); // easeOutCubic
      setDisplay(value * eased);
      if (step >= steps) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

interface RecordsCardProps {
  records: ExerciseRecords | null;
  loading: boolean;
  error?: string | null; // ✅ НОВОЕ
  accentColor: string;
  cardStyles: ReturnType<typeof createCardStyles>;
}

export function RecordsCard({ records, loading, error, accentColor, cardStyles }: RecordsCardProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    if (loading) {
      pulse.value = withRepeat(
        withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      return () => cancelAnimation(pulse);
    }
  }, [loading]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Скелетон
  if (loading) {
    return (
      <Animated.View
        style={[
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: BORDER_RADIUS.lg,
            height: 170,
            marginTop: SPACING.lg,
          },
          pulseStyle,
        ]}
      />
    );
  }
   if (error) {
    return (
      <View
        style={{
          backgroundColor: colors.error + '08',
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: colors.error + '40',
          padding: SPACING.md,
          marginTop: SPACING.lg,
        }}
      >
        <Text style={[typography.captionSmall, { color: colors.error, fontWeight: '700' }]}>
          Не удалось загрузить рекорды
        </Text>
        <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 4 }]}>
          {error}
        </Text>
      </View>
    );
  }

  const hasData = !!records && records.totalSets > 0;

  // Пустое состояние — мотивирующая заглушка
  if (!hasData) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          padding: SPACING.lg,
          marginTop: SPACING.lg,
          alignItems: 'center',
        }}
      >
        <Trophy size={28} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={[typography.labelBold, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
          Вы ещё не выполняли это упражнение
        </Text>
        <Text style={[typography.captionSmall, { color: colors.textTertiary, marginTop: 2, textAlign: 'center' }]}>
          Проведите первую тренировку — рекорды появятся здесь
        </Text>
      </View>
    );
  }

  const r = records as ExerciseRecords;
  const hasWeight = r.maxWeight !== null && r.maxWeight > 0;
  const weightDecimals = hasWeight && (r.maxWeight as number) % 1 !== 0 ? 1 : 0;

  // Вторичные рекорды (1ПМ — всегда только при наличии веса)
  const stats: { label: string; value: string; styleKey: 'primary' | 'success' | 'warning' }[] = [];
  if (r.estimatedOneRM !== null) {
    stats.push({ label: 'Расчётный 1ПМ', value: `${Math.round(r.estimatedOneRM)} кг`, styleKey: 'primary' });
  }
  if (hasWeight && r.maxReps !== null && r.maxReps > 0) {
    stats.push({ label: 'Макс. повторы', value: `×${r.maxReps}`, styleKey: 'success' });
  }
  if (r.totalVolume > 0) {
    stats.push({ label: 'Общий тоннаж', value: formatVolume(r.totalVolume), styleKey: 'warning' });
  }

  const valueStyleByKey = {
    primary: cardStyles.recordValuePrimary,
    success: cardStyles.recordValueSuccess,
    warning: cardStyles.recordValueWarning,
  };

  return (
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
      {/* Шапка */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: accentColor + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Trophy size={16} color={accentColor} strokeWidth={2} />
        </View>
        <Text
          style={[
            typography.captionSmall,
            {
              color: colors.textSecondary,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              flex: 1,
            },
          ]}
        >
          Личные рекорды
        </Text>
        <View
          style={{
            backgroundColor: accentColor + '15',
            paddingHorizontal: SPACING.sm,
            paddingVertical: 3,
            borderRadius: BORDER_RADIUS.full,
          }}
        >
          <Text style={[typography.captionSmall, { color: accentColor, fontWeight: '700' }]}>
            {r.workoutCount} {pluralize(r.workoutCount, 'тренировка', 'тренировки', 'тренировок')}
          </Text>
        </View>
      </View>

      {/* Главный рекорд */}
      <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
        {hasWeight ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text
                style={[
                  typography.h2,
                  { color: accentColor, fontWeight: '800', fontVariant: ['tabular-nums'] },
                ]}
              >
                <CountUp value={r.maxWeight as number} decimals={weightDecimals} />
              </Text>
              <Text style={[typography.h5, { color: colors.textSecondary, marginLeft: 6, marginBottom: 3 }]}>
                кг
              </Text>
            </View>
            {r.repsAtMaxWeight > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                × {r.repsAtMaxWeight} {pluralize(r.repsAtMaxWeight, 'повтор', 'повтора', 'повторов')} в лучшем подходе
              </Text>
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text
                style={[
                  typography.h2,
                  { color: accentColor, fontWeight: '800', fontVariant: ['tabular-nums'] },
                ]}
              >
                ×<CountUp value={r.maxReps ?? 0} decimals={0} />
              </Text>
              <Text style={[typography.h5, { color: colors.textSecondary, marginLeft: 6, marginBottom: 3 }]}>
                повторов
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              без записанного веса
            </Text>
          </>
        )}
      </View>

      {/* Вторичные рекорды */}
      {stats.length > 0 && (
        <>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={cardStyles.recordsContainer}>
            {stats.map(stat => (
              <View key={stat.label} style={cardStyles.recordItem}>
                <Text style={[cardStyles.recordValue, valueStyleByKey[stat.styleKey]]}>
                  {stat.value}
                </Text>
                <Text style={cardStyles.recordLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Футер: дата и суммарные подходы */}
      {r.lastPerformedAt ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingTop: SPACING.xs,
          }}
        >
          <Calendar size={12} color={colors.textTertiary} strokeWidth={2} />
          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
            Последний раз: {formatRelativeDate(r.lastPerformedAt)} · {r.totalSets}{' '}
            {pluralize(r.totalSets, 'подход', 'подхода', 'подходов')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}