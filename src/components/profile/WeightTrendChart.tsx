// src/components/profile/WeightTrendChart.tsx
// FEAT-2.2: лёгкий SVG-график тренда веса (react-native-svg, без chart-библиотек).
// Пунктир — сырые замеры, сплошная — скользящее среднее, точка — последний замер.
// Цвет нейтральный (primary): «вниз/вверх» не оцениваем как хорошо/плохо —
// оценка появится, когда onboarding (FEAT-2.3) даст цель (похудение/набор).
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { buildWeightTrend, WeightPoint } from '../../utils/trend';

const W = 320;
const H = 140;
const PAD_X = 8;
const PAD_Y = 12;

interface WeightTrendChartProps {
  points: WeightPoint[];
  height?: number;
}

export function WeightTrendChart({ points, height = H }: WeightTrendChartProps) {
  const { colors } = useTheme();
  const trend = useMemo(() => buildWeightTrend(points), [points]);

  const geometry = useMemo(() => {
    if (!trend || trend.points.length < 2) return null;
    const { points: pts, smoothed, min, max } = trend;
    const span = Math.max(max - min, 0.5); // защита от вырожденной прямой
    const t0 = +new Date(pts[0].date);
    const t1 = +new Date(pts[pts.length - 1].date);
    const tSpan = Math.max(t1 - t0, 1);
    const x = (i: number) =>
      PAD_X + ((+new Date(pts[i].date) - t0) / tSpan) * (W - PAD_X * 2);
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (height - PAD_Y * 2);
    const rawPath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`)
      .join(' ');
    const smoothPath = smoothed
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');
    return { x, y, rawPath, smoothPath, pts };
  }, [trend, height]);

  if (!trend) return null;

  if (!geometry) {
    return (
      <View style={{ paddingVertical: SPACING.lg, alignItems: 'center' }}>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
          Недостаточно замеров для тренда — добавь минимум два.
        </Text>
      </View>
    );
  }

  const { rawPath, smoothPath, x, y, pts } = geometry;
  const lastI = pts.length - 1;
  const slopeLabel =
    trend.direction === 'stable'
      ? 'стабильно'
      : `${trend.slopePerWeek > 0 ? '+' : '−'}${Math.abs(trend.slopePerWeek).toFixed(1)} кг/нед`;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACING.xs }}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>
          {trend.last.toFixed(1)} кг
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
          {slopeLabel} · Δ {trend.deltaTotal > 0 ? '+' : ''}{trend.deltaTotal.toFixed(1)} кг
        </Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
        <Path d={rawPath} fill="none" stroke={colors.border} strokeWidth={1} strokeDasharray="2 3" />
        <Path d={smoothPath} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={x(lastI)} cy={y(pts[lastI].weightKg)} r={4} fill={colors.primary} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs }}>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
          min {trend.min.toFixed(1)}
        </Text>
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
          max {trend.max.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}