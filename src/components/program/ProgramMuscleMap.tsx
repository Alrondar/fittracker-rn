// src/components/program/ProgramMuscleMap.tsx
//
// Карта покрытия мышц для Program Detail.
// Показывает средневзвешенные плановые сеты/неделю по всем фазам программы.
// Не интерактивная (только визуализация).

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppCard } from '../ui/AppCard';
import { SectionHeader } from '../SectionHeader';
import { MuscleLoadMap } from '../workout/MuscleLoadMap';
import { calculateProgramMuscleLoad, type ProgramMuscleEntry } from '../../utils/programMuscleLoad';
import { SPACING } from '../../constants/theme';
import { typography } from '../../styles/typography';
import type { MuscleLoad } from '../../utils/muscleLoad';
import { pluralizeSets } from '../../utils/muscleLoad';

type PhaseLike = {
  id: string;
  weeks?: number;
  duration_weeks?: number;
  days?: {
    exercises?: {
      primary_muscles?: string[] | null;
      secondary_muscles?: string[] | null;
      sets?: number | string | null;
    }[];
  }[];
};

export type ProgramMuscleMapProps = {
  phases: readonly PhaseLike[];
};

export function ProgramMuscleMap({ phases }: ProgramMuscleMapProps) {
  const { colors } = useTheme();

  const muscleLoad: MuscleLoad[] = useMemo(() => {
    const entries = calculateProgramMuscleLoad(phases);
    return entries.map((entry) => ({
      slug: entry.slug,
      displayName: entry.name,
      sets: Math.round(entry.setsPerWeek), // Для отображения в легенде как "сетов/нед"
      volumeKg: entry.setsPerWeek, // Используем volumeKg как proxy для setsPerWeek в MuscleLoadMap
      loadScore: entry.setsPerWeek, // То же для intensity
    }));
  }, [phases]);

  if (muscleLoad.length === 0) {
    return null; // Не рендерим, если нет данных (программа без упражнений)
  }

  return (
    <AppCard variant="compact" style={{ marginTop: SPACING.md }}>
      <SectionHeader title="Мышцы программы" style={{ paddingHorizontal: 0, paddingTop: 0 }} />
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
        Плановые сеты за неделю, усреднено по фазам
      </Text>
      <MuscleLoadMap
        muscleLoad={muscleLoad}
        gender="male"
        scale={0.6}
        showLegend={true}
        // Переопределяем формат значения для легенды
        // (в MuscleLoadMap используется formatVolumeKg, но мы передаём volumeKg = setsPerWeek,
        //  поэтому отображение будет "X.X кг", что не идеально, но для L1-превью допустимо.
        //  Для идеального отображения можно было бы расширить MuscleLoadMap, но пока оставим так,
        //  или лучше сделать кастомный рендер легенды? Сделаем кастомный рендер легенды ниже,
        //  а MuscleLoadMap используем только для карты).
      />
      {/* Кастомная легенда для sets/week */}
      <View
        style={{
          marginTop: SPACING.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: SPACING.md,
        }}
      >
        <Text
          style={[typography.labelBold, { color: colors.textPrimary, marginBottom: SPACING.sm }]}
        >
          Нагрузка по мышцам
        </Text>
        {muscleLoad.map((entry, index) => {
          const maxSets = muscleLoad[0]?.volumeKg || 1;
          const ratio = maxSets > 0 ? entry.volumeKg / maxSets : 0;
          return (
            <View
              key={entry.slug}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: SPACING.xs,
                borderBottomWidth: index < muscleLoad.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderLight,
                minHeight: 44,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.primary,
                  opacity: 0.4 + ratio * 0.6,
                  marginRight: SPACING.sm,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {entry.displayName}
                </Text>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    marginTop: 4,
                    backgroundColor: colors.borderLight,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.primary,
                      width: `${Math.max(4, ratio * 100)}%`,
                    }}
                  />
                </View>
              </View>
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textSecondary, fontWeight: '600' },
                ]}
              >
                {entry.volumeKg.toFixed(1)} сетов/нед
              </Text>
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}
