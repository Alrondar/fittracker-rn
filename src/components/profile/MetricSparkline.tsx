// src/components/profile/MetricSparkline.tsx
// FEAT-2.2: компактный спарклайн одного замера в СОБСТВЕННОМ масштабе.
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { buildTrend, TrendPoint } from '../../utils/trend';

const W = 320;
const H = 72;
const PAD_X = 6;
const PAD_Y = 8;

interface MetricSparklineProps {
  label: string;
  unit: string;
  color: string;
  points: TrendPoint[];
}

export function MetricSparkline({ label, unit, color, points }: MetricSparklineProps) {
  const { colors } = useTheme();
  const trend = useMemo(() => buildTrend(points), [points]);

  const geometry = useMemo(() => {
    if (!trend || trend.points.length < 2) return null;
    const { points: pts, smoothed, min, max } = trend;
    const span = Math.max(max - min, 0.5);
    const t0 = +new Date(pts[0].date);
    const t1 = +new Date(pts[pts.length - 1].date);
    const tSpan = Math.max(t1 - t0, 1);
    const x = (i: number) => PAD_X + ((+new Date(pts[i].date) - t0) / tSpan) * (W - PAD_X * 2);
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);
    const smoothPath = smoothed
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');
    return { x, y, smoothPath, pts };
  }, [trend]);

  if (!trend) return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACING.xs }}>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color, fontWeight: '700' }]}>
          {trend.last.toFixed(1)} {unit} · Δ {trend.deltaTotal > 0 ? '+' : ''}
          {trend.deltaTotal.toFixed(1)}
        </Text>
      </View>
      {geometry ? (
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Path d={geometry.smoothPath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Circle
            cx={geometry.x(geometry.pts.length - 1)}
            cy={geometry.y(geometry.pts[geometry.pts.length - 1].value)}
            r={3.5}
            fill={color}
          />
        </Svg>
      ) : (
        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
          Нужно минимум два замера
        </Text>
      )}
    </View>
  );
}