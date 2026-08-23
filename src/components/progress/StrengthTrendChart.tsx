// src/components/progress/StrengthTrendChart.tsx
// Тренд e1RM по неделям для top-3 упражнений.
// Отвечает на «Становлюсь ли я сильнее?»
//
// Поддерживает фильтрацию по одному упражнению (prop selectedExerciseName),
// чтобы progress.tsx мог показать интерактивный селектор.
import React, { useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { StrengthSeries } from '../../services/progressService';
import { TrendingUp } from 'lucide-react-native';

const LINE_COLORS = ['#6C5CE7', '#00B894', '#FDCB6E'];

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

interface Props {
  series: StrengthSeries[];
  /** Если передано — показать только это упражнение (для селектора в progress.tsx). */
  selectedExerciseName?: string;
}

export function StrengthTrendChart({ series, selectedExerciseName }: Props) {
  const { colors } = useTheme();
  const chartWidth = Dimensions.get('window').width - SPACING.lg * 4;

  // Фильтрация: если выбрано конкретное упражнение — показываем только его.
  const filtered = selectedExerciseName
    ? series.filter((s) => s.exerciseName === selectedExerciseName)
    : series;

  if (series.length === 0) return null;

  // После фильтрации ничего не осталось — честный fallback, а не пустой экран.
  if (filtered.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: SPACING.md,
        }}
      >
        <Text
          style={[
            typography.caption,
            { color: colors.textTertiary, fontStyle: 'italic', textAlign: 'center' },
          ]}
        >
          Нет данных для выбранного упражнения
        </Text>
      </View>
    );
  }

  return (
    <View>
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
          <TrendingUp size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Сила</Text>
          <Text
            style={[
              typography.captionSmall,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
          >
            Расчётный 1ПМ (e1RM)
          </Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BORDER_RADIUS.md,
          borderColor: colors.border,
          borderWidth: 1,
          padding: SPACING.md,
        }}
      >
        {filtered.map((s, idx) => (
          <View
            key={s.exerciseName}
            style={{ marginBottom: idx < filtered.length - 1 ? SPACING.lg : 0 }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: LINE_COLORS[idx % LINE_COLORS.length],
                  marginRight: SPACING.xs,
                }}
              />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {s.exerciseName}
              </Text>
            </View>
            <MiniLineChart
              points={s.points.map((p) => p.e1rm)}
              labels={s.points.map((p) => formatShort(p.weekStart))}
              weekStarts={s.points.map((p) => p.weekStart)}
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
  weekStarts,
}: {
  points: number[];
  labels: string[];
  color: string;
  width: number;
  weekStarts: string[];
}) {
  const { colors } = useTheme();
  // Хук вызывается ДО любых early return (rules-of-hooks): длина серии может
  // меняться между рендерами после refetch.
  const [actualWidth, setActualWidth] = useState<number>(width);
  const height = 60;

  if (points.length === 0) {
    return (
      <Text style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}>
        Недостаточно данных для тренда
      </Text>
    );
  }

  if (points.length === 1) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: SPACING.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Первый замер</Text>
        </View>
        <Text style={[typography.labelBold, { color: colors.textPrimary }]}>
          {points[0].toFixed(1)} кг
        </Text>
      </View>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Расчёт x по датам (weekStarts), а не по индексу
  const dates = weekStarts.map((d) => +new Date(d));
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  // Реальная ширина контейнера: проп width может не учитывать внутренние
  // отступы карточки, из-за чего последняя точка уезжала за правый край.
  const chartW = actualWidth > 0 ? actualWidth : width;
  const PAD = 4; // радиус точки + 1px, чтобы крайние точки не обрезались

  const dotPositions = points.map((val, i) => {
    const x = PAD + ((dates[i] - minDate) / dateRange) * (chartW - PAD * 2);
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  return (
    <View>
      <View
        style={{ height, width: '100%', position: 'relative' }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setActualWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
        }}
      >
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
        {dotPositions.slice(0, -1).map((pos, i) => {
          const next = dotPositions[i + 1];
          const dx = next.x - pos.x;
          const dy = next.y - pos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          // Позиционируем линию так, чтобы её центр совпадал с серединой отрезка
          // между двумя точками. RN поворачивает View вокруг центра, поэтому
          // после поворота концы линии лягут ровно на точки.
          const midX = (pos.x + next.x) / 2;
          const midY = (pos.y + next.y) / 2;
          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: midX - length / 2,
                top: midY - 0.75,
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[typography.overline, { color: colors.textTertiary }]}>{labels[0]}</Text>
        <Text style={[typography.overline, { color: colors.textTertiary }]}>
          {labels[labels.length - 1]}
        </Text>
      </View>
      {points.length >= 2 && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
          <Text
            style={[
              typography.overline,
              {
                color:
                  points[points.length - 1] >= points[0] ? colors.success : colors.error,
              },
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