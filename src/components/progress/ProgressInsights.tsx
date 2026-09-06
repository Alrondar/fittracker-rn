// src/components/progress/ProgressInsights.tsx
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Activity, AlertTriangle, Award, Scale, Sparkles, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { AppCard } from '../ui/AppCard';
import { BODY_PART_LABELS } from '../../constants/injuries';
import type {
  WeeklyVolume,
  StrengthSeries,
  WeightPoint,
  PersonalRecordWithDate,
} from '../../services/progressService';
import type { ChronicPainZone } from '../../utils/painTrend';

interface ProgressInsightsProps {
  weeklyVolume: WeeklyVolume[];
  strengthTrend: StrengthSeries[];
  weightTrend: WeightPoint[];
  personalRecords: PersonalRecordWithDate[];
  /** Фича 4: хронические зоны боли (≥2 недель) из usePainTrend. */
  chronicPainZones?: ChronicPainZone[];
}

export function ProgressInsights({
  weeklyVolume,
  strengthTrend,
  weightTrend,
  personalRecords,
  chronicPainZones = [],
}: ProgressInsightsProps) {
  const { colors } = useTheme();

  const insights = useMemo(() => {
    const result: { icon: React.ReactNode; title: string; subtitle: string }[] = [];

    // 0. Начало отслеживания силы: есть упражнения в топ-3, но ни у одного нет 2+ точек
    const hasAnyMultiPoint = strengthTrend.some((s) => s.points.length >= 2);
    if (strengthTrend.length > 0 && !hasAnyMultiPoint) {
      result.push({
        icon: <TrendingUp size={18} color={colors.primary} />,
        title: 'Начало отслеживания силы',
        subtitle: `Зафиксируй ещё 1–2 тренировки, чтобы увидеть тренд e1RM по ${strengthTrend[0].exerciseName}.`,
      });
    }

    // 1. Сила
    if (strengthTrend.length > 0) {
      const topExercise = strengthTrend[0];
      const points = topExercise.points;
      if (points.length >= 2) {
        const first = points[0].e1rm;
        const last = points[points.length - 1].e1rm;
        if (last > first) {
          result.push({
            icon: <TrendingUp size={18} color={colors.success} />,
            title: 'Становишься сильнее',
            subtitle: `${topExercise.exerciseName}: ${first.toFixed(0)} → ${last.toFixed(0)} кг e1RM`,
          });
        }
      }
    }

    // 2. Объём
    if (weeklyVolume.length >= 2) {
      const current = weeklyVolume[weeklyVolume.length - 1];
      const previous = weeklyVolume[weeklyVolume.length - 2];
      if (current.volume > 0 && previous.volume > 0) {
        const delta = ((current.volume - previous.volume) / previous.volume) * 100;
        if (delta >= 5) {
          result.push({
            icon: <Activity size={18} color={colors.success} />,
            title: 'Больше нагрузки',
            subtitle: `Объём выше предыдущей недели на ${Math.round(delta)}%`,
          });
        } else if (delta <= -5) {
          result.push({
            icon: <Activity size={18} color={colors.warning} />,
            title: 'Меньше нагрузки',
            subtitle: `Объём ниже предыдущей недели на ${Math.round(Math.abs(delta))}%`,
          });
        }
      }
    }

    // 3. Вес
    if (weightTrend.length >= 2) {
      const first = weightTrend[0].weightKg;
      const last = weightTrend[weightTrend.length - 1].weightKg;
      const delta = last - first;
      if (Math.abs(delta) >= 0.5) {
        result.push({
          icon: <Scale size={18} color={delta > 0 ? colors.warning : colors.success} />,
          title: 'Изменение веса',
          subtitle: `За последние замеры: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} кг`,
        });
      }
    }

    // 4. Рекорды
    if (personalRecords.length > 0) {
      const latestPR = personalRecords[0];
      result.push({
        icon: <Award size={18} color={colors.primary} />,
        title: 'Новый рекорд',
        subtitle: `${latestPR.name}: ${latestPR.maxWeight} кг × ${latestPR.reps}`,
      });
    }

    // 5. Хроническая боль (Фича 4): observation + рекомендация.
    //    Не медицинский диагноз (PRODUCT.md §8, §14). Имеет приоритет
    //    перед обычными позитивными инсайтами — добавляется в начало.
    if (chronicPainZones.length > 0) {
      const labels = chronicPainZones
        .map((z) => {
          const label = (BODY_PART_LABELS as Record<string, string>)[z.bodyPart] ?? z.bodyPart;
          return `${label} (${z.weeks} нед.)`;
        })
        .join(', ');
      result.unshift({
        icon: <AlertTriangle size={18} color={colors.error} />,
        title: 'Устойчивая боль',
        subtitle: `${labels}. Рассмотри снижение веса или консультацию со специалистом.`,
      });
    }

    return result.slice(0, 4); // максимум 4 инсайта (хроническая боль + 3 основных)
  }, [weeklyVolume, strengthTrend, weightTrend, personalRecords, chronicPainZones, colors]);

  if (insights.length === 0) {
    return (
      <AppCard variant="default" style={{ marginBottom: SPACING.md }}>
        <View style={{ alignItems: 'center', paddingVertical: SPACING.md }}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Пока мало данных для инсайтов. Продолжай фиксировать тренировки!
          </Text>
        </View>
      </AppCard>
    );
  }

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Sparkles size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Что изменилось</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Последние наблюдения
          </Text>
        </View>
      </View>
      {insights.map((insight, idx) => (
        <AppCard key={idx} variant="compact" style={{ marginBottom: SPACING.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: SPACING.sm }}>{insight.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
                {insight.title}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {insight.subtitle}
              </Text>
            </View>
          </View>
        </AppCard>
      ))}
    </View>
  );
}
