// src/components/workout/MuscleLoadMap.tsx
//
// Полноразмерная анатомическая карта нагрузки на мышцы + легенда.
// Используется:
//   - в Workout Report (app/progress/[id].tsx) для одной тренировки;
//   - в Progress hub (MuscleStatsSection) для периода (неделя/30/90/всё).
//
// Цвета шкалы интенсивности берутся из `colors.primary` текущей темы:
// при смене темы карта автоматически перекрашивается (см. colorScale.ts).
//
// Архитектурные правила:
//   - supabase в UI запрещён (CLAUDE.md §2) — данные приходят через props;
//   - `colors.primary`, `colors.textTertiary` и т.п. только через useTheme() (§7);
//   - без внешних зависимостей от react-native-body-highlighter (локальный BodyMap);
//   - состояние empty: серые контуры + сообщение.

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { BodyMap } from './BodyMap';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { intensityColor } from '../../utils/colorScale';
import { pluralizeSets, formatVolumeKg } from '../../utils/muscleLoad';
import type { MuscleLoad } from '../../utils/muscleLoad';
import type { Slug } from '../../types/muscleMap';

export type MuscleLoadMapProps = {
  /** Массив MuscleLoad по slug'ам. Пустой — карта в empty-состоянии. */
  muscleLoad: readonly MuscleLoad[];
  /** Пол силуэта: 'male' (default) | 'female' */
  gender?: 'male' | 'female';
  /** Масштаб BodyMap. Для полной страницы ~0.8; для компактного отчёта ~0.5–0.6. */
  scale?: number;
  /** Заголовок секции. Если пусто — не рендерится. */
  title?: string;
  /** Подпись под картой (например, «Спереди / Сзади»). По умолчанию подписи видны. */
  showSideLabels?: boolean;
  /** Показывать легенду-список мышц под картой (по умолчанию true). */
  showLegend?: boolean;
  /** Коллбэк при тапе на мышцу на карте (для будущей интерактивности). */
  onMusclePress?: (slug: Slug) => void;
  /** Коллбэк при тапе на строку легенды. */
  onLegendPress?: (slug: Slug) => void;
};

/**
 * Human-readable названия мышц на русском.
 * Fallback — оригинальный displayName из MuscleLoad (который берётся из БД).
 */
const SLUG_LABEL: Record<Slug, string> = {
  abs: 'Пресс',
  adductors: 'Приводящие бедра',
  ankles: 'Голеностоп',
  biceps: 'Бицепс',
  calves: 'Икры',
  chest: 'Грудь',
  deltoids: 'Дельты',
  feet: 'Стопы',
  forearm: 'Предплечья',
  gluteal: 'Ягодицы',
  hamstring: 'Бицепс бедра',
  hands: 'Кисти',
  hair: '',
  head: '',
  knees: 'Колени',
  'lower-back': 'Низ спины',
  neck: 'Шея',
  obliques: 'Косые',
  quadriceps: 'Квадрицепсы',
  tibialis: 'Передняя голень',
  trapezius: 'Трапеция',
  triceps: 'Трицепс',
  'upper-back': 'Верх спины',
  abductors: 'Отводящие бедра',
};

function labelForSlug(slug: Slug, fallback: string): string {
  const mapped = SLUG_LABEL[slug];
  if (mapped && mapped.length > 0) return mapped;
  // Capitalize fallback
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

export const MuscleLoadMap = memo<MuscleLoadMapProps>(
  ({
    muscleLoad,
    gender = 'male',
    scale = 0.8,
    title,
    showSideLabels = true,
    showLegend = true,
    onMusclePress,
    onLegendPress,
  }) => {
    const { colors } = useTheme();

    // Нормализуем loadScore → 0..1 для раскраски (максимальный = 1).
    const { maxLoadScore, slugToLoad } = useMemo(() => {
      let max = 0;
      const map = new Map<Slug, MuscleLoad>();
      for (const entry of muscleLoad) {
        map.set(entry.slug, entry);
        if (entry.loadScore > max) max = entry.loadScore;
      }
      return { maxLoadScore: max, slugToLoad: map };
    }, [muscleLoad]);

    // bodyData для BodyMap: для каждого slug — цвет, основанный на intensity
    const bodyData = useMemo(() => {
      const base = colors.textTertiary; // цвет «не задействованной» мышцы
      return Array.from(slugToLoad.entries()).map(([slug, entry]) => {
        const intensity = maxLoadScore > 0 ? entry.loadScore / maxLoadScore : 0;
        return {
          slug,
          color: intensityColor(colors.primary, base, intensity),
          intensity: Math.max(1, Math.round(intensity * 5)),
        };
      });
    }, [slugToLoad, maxLoadScore, colors.primary, colors.textTertiary]);

    const hasData = muscleLoad.length > 0;
    const maxVolume = hasData ? Math.max(...muscleLoad.map((m) => m.volumeKg)) : 0;

    const handleBodyPress = (part: { slug?: Slug }) => {
      if (onMusclePress && part?.slug) onMusclePress(part.slug);
    };

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {!!title && (
          <Text style={[typography.h5, { color: colors.textPrimary, marginBottom: SPACING.sm }]}>
            {title}
          </Text>
        )}

        {/* Карты: спереди / сзади */}
        <View style={styles.mapsRow}>
          <View style={styles.mapColumn}>
            {showSideLabels && (
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, marginBottom: 4, fontWeight: '600' },
                ]}
              >
                Спереди
              </Text>
            )}
            <BodyMap
              side="front"
              data={bodyData}
              scale={scale}
              gender={gender}
              border="none"
              defaultFill={colors.textTertiary}
              onBodyPartPress={onMusclePress ? handleBodyPress : undefined}
            />
          </View>
          <View style={styles.mapColumn}>
            {showSideLabels && (
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textTertiary, marginBottom: 4, fontWeight: '600' },
                ]}
              >
                Сзади
              </Text>
            )}
            <BodyMap
              side="back"
              data={bodyData}
              scale={scale}
              gender={gender}
              border="none"
              defaultFill={colors.textTertiary}
              onBodyPartPress={onMusclePress ? handleBodyPress : undefined}
            />
          </View>
        </View>

        {/* Легенда */}
        {showLegend && (
          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            {!hasData ? (
              <Text
                style={[
                  typography.body,
                  { color: colors.textTertiary, textAlign: 'center', paddingVertical: SPACING.sm },
                ]}
              >
                Мышцы не указаны
              </Text>
            ) : (
              <>
                <Text
                  style={[
                    typography.labelBold,
                    { color: colors.textPrimary, marginBottom: SPACING.sm },
                  ]}
                >
                  Нагрузка по мышцам
                </Text>
                {muscleLoad.map((entry) => {
                  const ratio = maxVolume > 0 ? entry.volumeKg / maxVolume : 0;
                  const fill = intensityColor(
                    colors.primary,
                    colors.textTertiary,
                    maxLoadScore > 0 ? entry.loadScore / maxLoadScore : 0
                  );
                  return (
                    <View
                      key={entry.slug}
                      style={[
                        styles.legendRow,
                        {
                          borderBottomColor: colors.borderLight,
                        },
                      ]}
                      // accessibilityRole для тапа на строку
                      accessible={!!onLegendPress}
                      accessibilityRole={onLegendPress ? 'button' : 'none'}
                      accessibilityLabel={`${labelForSlug(
                        entry.slug,
                        entry.displayName
                      )}: ${pluralizeSets(entry.sets)}, ${formatVolumeKg(entry.volumeKg)}`}
                    >
                      <View style={[styles.pill, { backgroundColor: fill, borderColor: fill }]} />
                      <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                        <Text
                          numberOfLines={1}
                          style={[
                            typography.body,
                            { color: colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {labelForSlug(entry.slug, entry.displayName)}
                        </Text>
                        {/* Мини-бар пропорции */}
                        <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: fill,
                                width: `${Math.max(4, ratio * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: SPACING.sm }}>
                        <Text
                          style={[
                            typography.captionSmall,
                            { color: colors.textSecondary, fontWeight: '600' },
                          ]}
                        >
                          {pluralizeSets(entry.sets)}
                        </Text>
                        <Text
                          style={[
                            typography.captionSmall,
                            { color: colors.textTertiary, marginTop: 2 },
                          ]}
                        >
                          {formatVolumeKg(entry.volumeKg)}
                        </Text>
                      </View>
                      {onLegendPress && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                          }}
                          // onPress недоступно в View — используем TouchableOpacity-обёртку при необходимости
                          // Для L1-отчёта onLegendPress не используется.
                        />
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </View>
    );
  }
);

MuscleLoadMap.displayName = 'MuscleLoadMap';

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  mapsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  mapColumn: {
    alignItems: 'center',
    flex: 1,
  },
  legend: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  pill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
