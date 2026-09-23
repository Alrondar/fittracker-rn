// app/profile/metrics.tsx split (DA-P2-8): графики замеров с чипами-тумблерами.
// FEAT-2.2: выбор графиков хранится в AsyncStorage; long-press по чипу — карточка деталей тренда.
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../../constants/theme';
import { typography } from '../../../styles/typography';
import { AppCard } from '../../ui/AppCard';
import { SectionHeader } from '../../SectionHeader';
import { MetricSparkline } from '../MetricSparkline';
import { FadeIn } from '../../FadeIn';
import { METRIC_FIELDS, type BodyMetric, type MetricKey } from '../../../types/metrics';
import type { TrendPoint } from '../../../utils/trend';

const CHARTS_KEY = 'metrics_charts_selected_v1';

interface Props {
  metrics: BodyMetric[];
}

export function MetricChartsSection({ metrics }: Props) {
  const { colors } = useTheme();
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [chartsReady, setChartsReady] = useState(false);
  const [longPressedMetric, setLongPressedMetric] = useState<MetricKey | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CHARTS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSelectedMetrics(JSON.parse(raw) as MetricKey[]);
          } catch {
            setSelectedMetrics(['waist_cm']);
          }
        } else {
          setSelectedMetrics(['waist_cm']);
        }
      })
      .finally(() => setChartsReady(true));
  }, []);

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      AsyncStorage.setItem(CHARTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sparkFields = METRIC_FIELDS.filter((f) => f.key !== 'weight_kg');

  const pointsFor = (key: MetricKey): TrendPoint[] =>
    metrics
      .filter((m) => m[key] != null)
      .map((m) => ({ date: m.metric_date, value: m[key] as number }));

  const getMetricTrend = (key: MetricKey) => {
    const pts = pointsFor(key);
    if (pts.length < 2) return null;

    const sorted = [...pts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0];
    const previous = sorted[1];

    const diff = latest.value - previous.value;
    const percent = previous.value !== 0 ? (diff / previous.value) * 100 : 0;

    return {
      latestValue: latest.value,
      latestDate: latest.date,
      diff,
      percent,
      direction: (diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    };
  };

  const CHART_COLORS = [colors.primary, colors.success, colors.warning, colors.error];

  return (
    <View style={{ marginBottom: SPACING.xl }}>
      <SectionHeader title="Графики замеров" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: SPACING.xs,
          marginBottom: SPACING.md,
        }}
      >
        {sparkFields.map((f) => {
          const active = selectedMetrics.includes(f.key);
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => toggleMetric(f.key)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLongPressedMetric(f.key);
              }}
              style={{
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.xs,
                borderRadius: BORDER_RADIUS.full,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active
                  ? withAlpha(colors.primary, 0.125)
                  : colors.surfaceSecondary,
              }}
            >
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: '600',
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {longPressedMetric &&
        (() => {
          const trend = getMetricTrend(longPressedMetric);
          const field = sparkFields.find((f) => f.key === longPressedMetric);
          if (!trend || !field) return null;

          const isUp = trend.direction === 'up';
          const isDown = trend.direction === 'down';
          const trendColor = isUp ? colors.error : isDown ? colors.success : colors.textSecondary;
          const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

          return (
            <FadeIn>
              <AppCard
                variant="compact"
                style={{ marginTop: SPACING.md, marginBottom: SPACING.md }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {field.label}
                    </Text>
                    <Text style={[typography.h3, { color: colors.textPrimary }]}>
                      {trend.latestValue} {field.unit}
                    </Text>
                    <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                      {new Date(trend.latestDate).toLocaleDateString('ru-RU')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TrendIcon size={18} color={trendColor} />
                      <Text
                        style={[
                          typography.labelBold,
                          { color: trendColor, marginLeft: SPACING.xs },
                        ]}
                      >
                        {trend.diff > 0 ? '+' : ''}
                        {trend.diff.toFixed(1)} {field.unit}
                      </Text>
                    </View>
                    <Text style={[typography.captionSmall, { color: trendColor }]}>
                      {trend.percent > 0 ? '+' : ''}
                      {trend.percent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ marginTop: SPACING.sm, alignItems: 'center' }}
                  onPress={() => setLongPressedMetric(null)}
                >
                  <Text style={[typography.captionSmall, { color: colors.primary }]}>Закрыть</Text>
                </TouchableOpacity>
              </AppCard>
            </FadeIn>
          );
        })()}

      {chartsReady &&
        selectedMetrics.map((key, i) => {
          const field = sparkFields.find((f) => f.key === key);
          if (!field) return null;
          const pts = pointsFor(key);
          if (pts.length === 0) return null;
          return (
            <MetricSparkline
              key={key}
              label={field.label}
              unit={field.unit}
              color={CHART_COLORS[i % CHART_COLORS.length]}
              points={pts}
            />
          );
        })}
      {selectedMetrics.length > 0 && !longPressedMetric && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, marginTop: SPACING.sm, textAlign: 'center' },
          ]}
        >
          Нажмите на чип, чтобы показать график. Удерживайте для деталей.
        </Text>
      )}
    </View>
  );
}
