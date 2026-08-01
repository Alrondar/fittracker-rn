import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { SPACING, BORDER_RADIUS } from '../constants/theme';
import { typography } from '../styles/typography';
import Svg, { Polyline, Path, Circle } from 'react-native-svg';

interface ProgressPoint {
  date: string;
  maxWeight: number;
  volume: number;
}

interface ExerciseProgressCardProps {
  exerciseName: string;
  history: ProgressPoint[];
  currentMaxWeight: number;
  currentVolume: number;
  trend: 'up' | 'down' | 'stable';
  selectedMetric: 'weight' | 'volume';
  colors: any;
}

export function ExerciseProgressCard({
  exerciseName,
  history,
  currentMaxWeight,
  currentVolume,
  trend,
  selectedMetric,
  colors,
}: ExerciseProgressCardProps) {
  if (history.length < 2) return null;

  // Получаем значения для выбранной метрики
  const values = history.map(h => selectedMetric === 'weight' ? h.maxWeight : h.volume);
  const currentValue = selectedMetric === 'weight' ? currentMaxWeight : currentVolume;
  const previousValue = values[values.length - 2] || 0;
  
  // Расчёт изменения
  const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const changeText = change > 0 ? `+${change.toFixed(1)}%` : change < 0 ? `${change.toFixed(1)}%` : '0%';
  
  // Цвет тренда
  const trendColor = trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : colors.textSecondary;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // Расчёт SVG координат
  const chartWidth = 200;
  const chartHeight = 60;
  const padding = 10;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((value - minValue) / valueRange) * (chartHeight - 2 * padding);
    return { x, y, value };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  
  // Путь для области под линией
  const areaPath = `M ${points[0].x},${chartHeight - padding} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${chartHeight - padding} Z`;

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      {/* Заголовок */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]} numberOfLines={2}>
            {exerciseName}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={16} color={trendColor} strokeWidth={2} />
          <Text style={[typography.caption, { color: trendColor, fontWeight: '600' }]}>
            {changeText}
          </Text>
        </View>
      </View>

      {/* Мини-график */}
      <View style={{ marginBottom: SPACING.md }}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Область под линией */}
          <Path
            d={areaPath}
            fill={trendColor}
            opacity={0.1}
          />
          {/* Линия тренда */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={trendColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Точки */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 4 : 2}
              fill={index === points.length - 1 ? trendColor : colors.surface}
              stroke={trendColor}
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      {/* Текущее значение */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            {selectedMetric === 'weight' ? 'Макс. вес' : 'Объём'}
          </Text>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {currentValue.toFixed(1)} {selectedMetric === 'weight' ? 'кг' : 'кг'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            Тренировок
          </Text>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
            {history.length}
          </Text>
        </View>
      </View>
    </View>
  );
}