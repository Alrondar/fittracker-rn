// src/components/dashboard/WorkoutForecastSheet.tsx
// Фича 7: L2 sheet с разбивкой прогноза по упражнениям.
// PRODUCT.md §3.2 (progressive disclosure) — тяжёлая информация раскрывается по тапу.
// PRODUCT.md §14 — disclaimer о том, что прогноз ориентировочный.

import React from 'react';
import { View, Text } from 'react-native';
import { Feather, Minus, TrendingUp } from 'lucide-react-native';
import { SheetShell } from '../ui/SheetShell';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import type { ForecastDifficulty } from '../../utils/workoutForecast';
import type { WorkoutForecastWithNames } from '../../services/forecastService';

interface Props {
  visible: boolean;
  onClose: () => void;
  result: WorkoutForecastWithNames | null;
}

function difficultyColor(difficulty: ForecastDifficulty, colors: any): string {
  switch (difficulty) {
    case 'easy':
      return colors.success;
    case 'hard':
      return colors.warning;
    case 'normal':
      return colors.textSecondary;
    case 'unknown':
    default:
      return colors.textTertiary;
  }
}

function difficultyIcon(difficulty: ForecastDifficulty, size: number, color: string) {
  const props = { size, color, strokeWidth: 2 };
  switch (difficulty) {
    case 'easy':
      return <Feather {...props} />;
    case 'hard':
      return <TrendingUp {...props} />;
    case 'normal':
    case 'unknown':
    default:
      return <Minus {...props} />;
  }
}

function difficultyLabel(difficulty: ForecastDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'Лёгкая';
    case 'hard':
      return 'Тяжёлая';
    case 'normal':
      return 'Обычная';
    case 'unknown':
    default:
      return 'Неизвестно';
  }
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)} т`;
  }
  return `${Math.round(volume)} кг`;
}

export function WorkoutForecastSheet({ visible, onClose, result }: Props) {
  const { colors } = useTheme();

  // SheetShell требует children; если данных ещё нет — просто не рендерим.
  // Пользователь увидит sheet только после того, как данные будут готовы.
  if (!result) {
    return null;
  }

  const exerciseNames = result.exerciseNames ?? {};
  const color = difficultyColor(result.difficulty, colors);

  return (
    <SheetShell visible={visible} title="Прогноз следующей тренировки" onClose={onClose}>
      {/* Итоговая оценка */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          padding: SPACING.md,
          borderRadius: BORDER_RADIUS.lg,
          backgroundColor: color + '15',
          borderWidth: 1,
          borderColor: color + '40',
          marginBottom: SPACING.lg,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: color + '25',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {difficultyIcon(result.difficulty, 22, color)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h5, { color }]}>{difficultyLabel(result.difficulty)}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {result.explanation}
          </Text>
        </View>
      </View>

      {/* Цифры: прогноз vs средний */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: SPACING.md,
          marginBottom: SPACING.lg,
          borderRadius: BORDER_RADIUS.lg,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {formatVolume(result.forecastVolume)}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            Ожидаемый объём
          </Text>
        </View>
        <View
          style={{
            width: 1,
            backgroundColor: colors.border,
          }}
        />
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h4, { color: colors.textPrimary }]}>
            {formatVolume(result.avgWorkoutVolume)}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
            Средняя тренировка
          </Text>
        </View>
      </View>

      {/* Разбивка по упражнениям */}
      <Text style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
        По упражнениям
      </Text>
      {result.perExercise.map((ex) => {
        const name = exerciseNames[ex.exerciseId] || ex.exerciseId;
        return (
          <View
            key={ex.exerciseId}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: SPACING.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1, marginRight: SPACING.sm }}>
              <Text style={[typography.bodySmall, { color: colors.textPrimary }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                {ex.sessionCount === 0 ? 'Нет истории' : `На основе ${ex.sessionCount} тренировок`}
              </Text>
            </View>
            <Text style={[typography.labelBold, { color: colors.textSecondary }]}>
              {ex.sessionCount === 0 ? '—' : formatVolume(ex.avgVolume)}
            </Text>
          </View>
        );
      })}

      {result.missingHistory && (
        <Text
          style={[
            typography.captionSmall,
            { color: colors.textTertiary, marginTop: SPACING.md, fontStyle: 'italic' },
          ]}
        >
          * Для некоторых упражнений нет истории за последние 4 недели — их вклад в прогноз не
          учтён.
        </Text>
      )}

      <Text
        style={[
          typography.captionSmall,
          { color: colors.textTertiary, marginTop: SPACING.lg, textAlign: 'center' },
        ]}
      >
        Прогноз основан на ваших реальных данных за последние 4 недели. Это наблюдение, а не
        предписание.
      </Text>
    </SheetShell>
  );
}
