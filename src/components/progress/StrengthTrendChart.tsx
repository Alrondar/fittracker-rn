// src/components/progress/StrengthTrendChart.tsx
// Тренд e1RM по неделям для top-3 упражнений.
// Отвечает на «Становлюсь ли я сильнее?»
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { SectionHeader } from '../SectionHeader';
import { StrengthSeries } from '../../services/progressService';

const LINE_COLORS = ['#6C5CE7', '#00B894', '#FDCB6E'];

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

interface Props {
  series: StrengthSeries[];
}

export function StrengthTrendChart({ series }: Props) {
  const { colors } = useTheme();
  const chartWidth = Dimensions.get('window').width - SPACING.lg * 4;

  if (series.length === 0) return null;

  return (
    <View>
      <SectionHeader title="Сила (e1RM)" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.md,
          borderColor: colors.border,
          borderWidth: 1,
          padding: SPACING.md,
        }}
      >
        {series.map((s, idx) => (
          <View key={s.exerciseName} style={{ marginBottom: idx < series.length - 1 ? SPACING.lg : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: LINE_COLORS[idx % LINE_COLORS.length],
                  marginRight: SPACING.xs,
                }}
              />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{s.exerciseName}</Text>
            </View>
            <MiniLineChart
              points={s.points.map((p) => p.e1rm)}
              labels={s.points.map((p) => formatShort(p.weekStart))}
              color={LINE_COLORS[idx % LINE_COLORS.length]}
              width={chartWidth}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Минимальный линейный график без внешних зависимостей.
 * Рисует polyline через View'ы (без react-native-svg).
 */
function MiniLineChart({
  points,
  labels,
  color,
  width,
}: {
  points: number[];
  labels: string[];
  color: string;
  width: number;
}) {
  const { colors } = useTheme();
  const height = 60;

  if (points.length < 2) {
    return (
      <Text style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}>
        Недостаточно данных для тренда
      </Text>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const dotPositions = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  return (
    <View>
      <View style={{ height, width, position: 'relative' }}>
        {dotPositions.map((pos, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: pos.x - 3,
              top: pos.y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        ))}
        {/* Соединительные линии через View с rotation */}
        {dotPositions.slice(0, -1).map((pos, i) => {
          const next = dotPositions[i + 1];
          const dx = next.x - pos.x;
          const dy = next.y - pos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: length,
                height: 1.5,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
                opacity: 0.7,
              }}
            />
          );
        })}
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[typography.overline, { color: colors.textTertiary }]}>{labels[0]}</Text>
        <Text style={[typography.overline, { color: colors.textTertiary }]}>{labels[labels.length - 1]}</Text>
      </View>
      {/* Delta */}
      {points.length >= 2 && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
          <Text
            style={[
              typography.overline,
              { color: points[points.length - 1] >= points[0] ? colors.success : colors.error },
            ]}
          >
            {points[points.length - 1] >= points[0] ? '↑' : '↓'}{' '}
            {Math.abs(points[points.length - 1] - points[0]).toFixed(1)} кг
          </Text>
        </View>
      )}
    </View>
  );
}