// src/components/progress/MuscleStatsSection.tsx
//
// Секция «Мышцы» в Progress hub (app/(tabs)/progress.tsx).
// Отвечает на вопрос «Как распределяется нагрузка и восстанавливаются мышцы?».
//
// Три вкладки:
//   - Нагрузка (L1+L2): анатомическая карта + легенда за выбранный период (7/30/90/Всё).
//   - Усталость (L1): карта окрашена по давности последней тренировки мышцы
//     (фатиг/восстановление/готовность/отдых). Список мышц с указанием дней.
//   - Сила (L1): карта окрашена по сохранению силы (best e1RM в периоде / all-time best).
//     Список топ-упражнений с e1RM.
//
// Источники данных: useMuscleStats (react-query) → muscleStatsService → Supabase.
// Цвета шкалы интенсивности — из `colors.primary` текущей темы (colorScale.ts).
//
// UX-принципы (PRODUCT.md §3):
//   - progressive disclosure: L1 — карта, L2 — легенда/списки;
//   - tracker first: в Progress hub аналитика не блокирует основной скролл;
//   - explainability: каждая вкладка имеет подпись «что измеряем»
//     (caption под заголовком);
//   - empty state: дружелюбный текст, без фейковых данных.

import React, { memo, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Activity } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useMuscleStats } from '../../hooks/useMuscleStats';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { MuscleLoadMap } from '../workout/MuscleLoadMap';
import { MuscleLoadModeToggle } from '../ui/MuscleLoadModeToggle';
import { BodyMap } from '../workout/BodyMap';
import { intensityColor } from '../../utils/colorScale';
import {
  calculateMuscleLoad,
  pluralizeSets,
  pluralizeDays,
  formatVolumeKg,
  type MuscleLoadMode,
} from '../../utils/muscleLoad';
import { roundE1rm } from '../../utils/e1rm';
import { getSlugsForMuscle } from '../../constants/muscleMapSlugs';
import type { MuscleLoad } from '../../utils/muscleLoad';
import type { MuscleStatsRow } from '../../services/muscleStatsService';
import type { Slug } from '../../types/muscleMap';

type TabKey = 'load' | 'fatigue' | 'strength';
type PeriodKey = '7' | '30' | '90' | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'load', label: 'Нагрузка' },
  { key: 'fatigue', label: 'Усталость' },
  { key: 'strength', label: 'Сила' },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7', label: 'Неделя' },
  { key: '30', label: '30 дней' },
  { key: '90', label: '90 дней' },
  { key: 'all', label: 'Всё' },
];

/** Human-readable slug → название мышцы. Дублируем из MuscleLoadMap.tsx. */
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

const labelFor = (slug: Slug, fallback: string): string => {
  const mapped = SLUG_LABEL[slug];
  if (mapped && mapped.length > 0) return mapped;
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
};

function filterRowsByPeriod(rows: readonly MuscleStatsRow[], period: PeriodKey): MuscleStatsRow[] {
  if (period === 'all') return rows as MuscleStatsRow[];
  const days = parseInt(period, 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return (rows as MuscleStatsRow[]).filter((r) => new Date(r.date).getTime() >= cutoff);
}

function rowsToMuscleLoad(
  rows: readonly MuscleStatsRow[],
  mode: MuscleLoadMode = 'total'
): MuscleLoad[] {
  // Каждый MuscleStatsRow уже агрегирован на уровне упражнения в тренировке.
  // Для calculateMuscleLoad нужно разложить его обратно в «sets»-входной формат:
  // используем псевдо-один-сет с суммарным весом (weight × reps).
  // Это эквивалентно прямому суммированию volumeKg/loadScore/sets по slug'ам
  // (модель в muscleLoad.ts аддитивна).
  const bySlug = new Map<Slug, MuscleLoad>();
  const PRIMARY_COEFF = 1.0;
  const SECONDARY_COEFF = 0.5;

  const ensure = (slug: Slug, displayName: string): MuscleLoad => {
    let e = bySlug.get(slug);
    if (!e) {
      e = { slug, displayName, sets: 0, volumeKg: 0, loadScore: 0 };
      bySlug.set(slug, e);
    }
    return e;
  };

  for (const row of rows) {
    if (row.sets === 0) continue;
    for (const m of row.primaryMuscles) {
      const slugs = getSlugsForMuscle(m);
      for (const slug of [...slugs.front, ...slugs.back]) {
        const e = ensure(slug, m);
        e.sets += row.sets;
        e.volumeKg += row.volumeKg * PRIMARY_COEFF;
        e.loadScore += row.sets * PRIMARY_COEFF; // Интенсивность = подходы, а не тоннаж
      }
    }
    if (mode === 'total') {
      for (const m of row.secondaryMuscles) {
        const slugs = getSlugsForMuscle(m);
        for (const slug of [...slugs.front, ...slugs.back]) {
          const e = ensure(slug, m);
          e.sets += row.sets * SECONDARY_COEFF;
          e.volumeKg += row.volumeKg * SECONDARY_COEFF;
          e.loadScore += row.sets * SECONDARY_COEFF; // Интенсивность = подходы × 0.5
        }
      }
    }
  }

  return Array.from(bySlug.values())
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

type SlugFatigue = {
  slug: Slug;
  displayName: string;
  daysSince: number;
};

function computeFatigue(rows: readonly MuscleStatsRow[]): SlugFatigue[] {
  const lastBySlug = new Map<Slug, { displayName: string; lastDateMs: number }>();
  const nowMs = Date.now();

  for (const row of rows) {
    const dMs = new Date(row.date).getTime();
    const add = (muscles: string[]) => {
      for (const m of muscles) {
        const slugs = getSlugsForMuscle(m);
        for (const slug of [...slugs.front, ...slugs.back]) {
          const cur = lastBySlug.get(slug);
          if (!cur || cur.lastDateMs < dMs) {
            lastBySlug.set(slug, { displayName: m, lastDateMs: dMs });
          }
        }
      }
    };
    add(row.primaryMuscles);
    add(row.secondaryMuscles);
  }

  return Array.from(lastBySlug.entries())
    .map(([slug, { displayName, lastDateMs }]) => ({
      slug,
      displayName,
      daysSince: Math.max(0, Math.floor((nowMs - lastDateMs) / (24 * 60 * 60 * 1000))),
    }))
    .sort((a, b) => a.daysSince - b.daysSince);
}

/** Бакеты усталости по дням с последней тренировки. */
function fatigueBucket(days: number): {
  label: string;
  colorKey: 'error' | 'warning' | 'success' | 'textTertiary';
} {
  if (days <= 2) return { label: 'Фатиг', colorKey: 'error' };
  if (days <= 5) return { label: 'Восстановление', colorKey: 'warning' };
  if (days <= 14) return { label: 'Готовность', colorKey: 'success' };
  return { label: 'Отдых', colorKey: 'textTertiary' };
}

type SlugStrength = {
  slug: Slug;
  displayName: string;
  /** Сохранение силы: bestE1rm(период) / bestE1rm(всё время). 0..1. */
  retention: number;
  bestE1rmPeriod: number;
  bestE1rmAllTime: number;
};

function computeStrength(
  rowsPeriod: readonly MuscleStatsRow[],
  rowsAll: readonly MuscleStatsRow[]
): SlugStrength[] {
  const bestAll = new Map<Slug, { displayName: string; best: number }>();
  for (const row of rowsAll) {
    const add = (muscles: string[]) => {
      for (const m of muscles) {
        const slugs = getSlugsForMuscle(m);
        for (const slug of [...slugs.front, ...slugs.back]) {
          const cur = bestAll.get(slug);
          if (!cur || cur.best < row.bestE1rm) {
            bestAll.set(slug, { displayName: m, best: row.bestE1rm });
          }
        }
      }
    };
    add(row.primaryMuscles);
    add(row.secondaryMuscles);
  }

  const bestPer = new Map<Slug, number>();
  for (const row of rowsPeriod) {
    const add = (muscles: string[]) => {
      for (const m of muscles) {
        const slugs = getSlugsForMuscle(m);
        for (const slug of [...slugs.front, ...slugs.back]) {
          const cur = bestPer.get(slug);
          if (!cur || cur < row.bestE1rm) bestPer.set(slug, row.bestE1rm);
        }
      }
    };
    add(row.primaryMuscles);
    add(row.secondaryMuscles);
  }

  const result: SlugStrength[] = [];
  for (const [slug, { displayName, best }] of bestAll) {
    const periodBest = bestPer.get(slug) ?? 0;
    const retention = best > 0 ? periodBest / best : 0;
    result.push({
      slug,
      displayName,
      retention,
      bestE1rmPeriod: periodBest,
      bestE1rmAllTime: best,
    });
  }
  return result.sort((a, b) => b.retention - a.retention);
}

type TopExercise = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  e1rm: number;
  date: string;
};

function topExercisesInPeriod(rows: readonly MuscleStatsRow[]): TopExercise[] {
  // По каждому упражнению берём максимум e1RM за период.
  const byExercise = new Map<string, TopExercise>();
  for (const row of rows) {
    const cur = byExercise.get(row.exerciseId);
    if (!cur || cur.e1rm < row.bestE1rm) {
      byExercise.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        primaryMuscle: row.primaryMuscles[0] ?? '',
        e1rm: row.bestE1rm,
        date: row.date,
      });
    }
  }
  return Array.from(byExercise.values())
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 5);
}

// =====================================================================

export type MuscleStatsSectionProps = {
  userId: string | null;
  gender?: 'male' | 'female';
};

export const MuscleStatsSection = memo<MuscleStatsSectionProps>(({ userId, gender = 'male' }) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('load');
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [loadMode, setLoadMode] = useState<MuscleLoadMode>('total');

  const { rows, isPending, isFetching } = useMuscleStats(userId);

  const rowsAll = rows ?? [];
  const rowsPeriod = useMemo(() => filterRowsByPeriod(rowsAll, period), [rowsAll, period]);

  // ----- Load tab -----
  const muscleLoadPeriod = useMemo(
    () => rowsToMuscleLoad(rowsPeriod, loadMode),
    [rowsPeriod, loadMode]
  );

  // ----- Fatigue tab -----
  const fatigue = useMemo(() => computeFatigue(rowsAll), [rowsAll]);

  const fatigueBodyData = useMemo(() => {
    const base = colors.textTertiary;
    return fatigue.map((f) => {
      const bucket = fatigueBucket(f.daysSince);
      // Интенсивность: чем меньше дней — тем ярче цвет (но цвет не primary,
      // а семантический bucket.colorKey). Проще: использовать withAlpha.
      const fill = withAlpha(colors[bucket.colorKey], f.daysSince <= 14 ? 1 : 0.4);
      return { slug: f.slug, color: fill, intensity: 1 };
    });
  }, [fatigue, colors]);

  // ----- Strength tab -----
  const strength = useMemo(() => computeStrength(rowsPeriod, rowsAll), [rowsPeriod, rowsAll]);
  const topExercises = useMemo(() => topExercisesInPeriod(rowsPeriod), [rowsPeriod]);

  const strengthBodyData = useMemo(() => {
    const base = colors.textTertiary;
    return strength.map((s) => {
      // retention 0..1 → intensity для primary
      const fill = intensityColor(colors.primary, base, s.retention);
      return { slug: s.slug, color: fill, intensity: Math.max(1, Math.round(s.retention * 5)) };
    });
  }, [strength, colors.primary, colors.textTertiary]);

  const isEmpty = rowsAll.length === 0;

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: withAlpha(colors.primary, 0.1),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING.sm,
          }}
        >
          <Activity size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.labelBold, { color: colors.textPrimary }]}>Мышцы</Text>
          <Text style={[typography.captionSmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Как распределяется нагрузка и восстанавливается тело
          </Text>
        </View>
        {isFetching && !isPending && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Tabs */}
      <View
        style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabButton, selected && { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Вкладка: ${t.label}`}
            >
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: selected ? colors.textInverse : colors.textSecondary,
                    fontWeight: '600',
                  },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isPending ? (
        <View
          style={{
            padding: SPACING.xl,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginTop: SPACING.md }]}
          >
            Загружаем статистику по мышцам…
          </Text>
        </View>
      ) : isEmpty ? (
        <View
          style={{
            padding: SPACING.xl,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Заверши первую тренировку — и здесь появится распределение нагрузки по мышцам.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: SPACING.sm }}>
          {tab === 'load' && (
            <>
              {/* Период и режим */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: SPACING.sm,
                }}
              >
                <View
                  style={[
                    styles.tabRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      flex: 1,
                      marginRight: SPACING.sm,
                    },
                  ]}
                >
                  {PERIODS.map((p) => {
                    const selected = period === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => setPeriod(p.key)}
                        style={[styles.tabButton, selected && { backgroundColor: colors.primary }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Период: ${p.label}`}
                      >
                        <Text
                          style={[
                            typography.captionSmall,
                            {
                              color: selected ? colors.textInverse : colors.textSecondary,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <MuscleLoadModeToggle mode={loadMode} onChange={setLoadMode} />
              </View>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginBottom: SPACING.md },
                ]}
              >
                {loadMode === 'total'
                  ? 'Общий объём включает косвенную нагрузку (secondary мышцы = 50%).'
                  : 'Прямая нагрузка учитывает только primary мышцы.'}
              </Text>
              <View style={{ marginTop: SPACING.md }}>
                <MuscleLoadMap
                  muscleLoad={muscleLoadPeriod}
                  gender={gender}
                  scale={0.7}
                  showSideLabels
                />
              </View>
              <Text
                style={[
                  typography.captionSmall,
                  {
                    color: colors.textTertiary,
                    marginTop: SPACING.sm,
                    textAlign: 'center',
                    fontStyle: 'italic',
                  },
                ]}
              >
                Интенсивность = эффективные подходы (primary = 100%, secondary = 50%).
              </Text>
            </>
          )}

          {tab === 'fatigue' && (
            <>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginBottom: SPACING.md },
                ]}
              >
                Усталость показывает, как давно тренировалась каждая мышца. Высокий показатель
                означает, что мышца отдыхала.
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.mapsRow}>
                  <View style={styles.mapColumn}>
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
                      ]}
                    >
                      Спереди
                    </Text>
                    <BodyMap
                      side="front"
                      data={fatigueBodyData}
                      scale={0.7}
                      gender={gender}
                      border="none"
                      defaultFill={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.mapColumn}>
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
                      ]}
                    >
                      Сзади
                    </Text>
                    <BodyMap
                      side="back"
                      data={fatigueBodyData}
                      scale={0.7}
                      gender={gender}
                      border="none"
                      defaultFill={colors.textTertiary}
                    />
                  </View>
                </View>

                {/* Легенда-бакетов */}
                <View
                  style={[
                    styles.bucketRow,
                    {
                      borderTopColor: colors.border,
                      marginTop: SPACING.md,
                      paddingTop: SPACING.md,
                    },
                  ]}
                >
                  {(['error', 'warning', 'success', 'textTertiary'] as const).map((k) => {
                    const labels: Record<typeof k, string> = {
                      error: 'Фатиг',
                      warning: 'Восст.',
                      success: 'Готовн.',
                      textTertiary: 'Отдых',
                    };
                    const days: Record<typeof k, string> = {
                      error: '0–2 д.',
                      warning: '3–5 д.',
                      success: '6–14 д.',
                      textTertiary: '15+ д.',
                    };
                    return (
                      <View key={k} style={styles.bucketItem}>
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors[k],
                            marginBottom: 4,
                          }}
                        />
                        <Text
                          style={[
                            typography.captionSmall,
                            { color: colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {labels[k]}
                        </Text>
                        <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                          {days[k]}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Список мышц */}
                <View
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    marginTop: SPACING.md,
                    paddingTop: SPACING.sm,
                  }}
                >
                  {fatigue.slice(0, 8).map((f) => {
                    const bucket = fatigueBucket(f.daysSince);
                    return (
                      <View
                        key={f.slug}
                        style={[styles.legendRow, { borderBottomColor: colors.borderLight }]}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors[bucket.colorKey],
                          }}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            typography.body,
                            { color: colors.textPrimary, flex: 1, marginLeft: SPACING.sm },
                          ]}
                        >
                          {labelFor(f.slug, f.displayName)}
                        </Text>
                        <Text
                          style={[
                            typography.captionSmall,
                            { color: colors.textSecondary, fontWeight: '600' },
                          ]}
                        >
                          {f.daysSince === 0 ? 'сегодня' : `${pluralizeDays(f.daysSince)} назад`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {tab === 'strength' && (
            <>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginBottom: SPACING.md },
                ]}
              >
                Сила показывает сохранённую мышечную силу. Проведи тренировку ещё раз, чтобы
                обновить показатели.
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.mapsRow}>
                  <View style={styles.mapColumn}>
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
                      ]}
                    >
                      Спереди
                    </Text>
                    <BodyMap
                      side="front"
                      data={strengthBodyData}
                      scale={0.7}
                      gender={gender}
                      border="none"
                      defaultFill={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.mapColumn}>
                    <Text
                      style={[
                        typography.captionSmall,
                        { color: colors.textTertiary, fontWeight: '600', marginBottom: 4 },
                      ]}
                    >
                      Сзади
                    </Text>
                    <BodyMap
                      side="back"
                      data={strengthBodyData}
                      scale={0.7}
                      gender={gender}
                      border="none"
                      defaultFill={colors.textTertiary}
                    />
                  </View>
                </View>

                <View
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    marginTop: SPACING.md,
                    paddingTop: SPACING.sm,
                  }}
                >
                  <Text
                    style={[
                      typography.labelBold,
                      { color: colors.textPrimary, marginBottom: SPACING.sm },
                    ]}
                  >
                    Топ упражнения
                  </Text>
                  {topExercises.length === 0 ? (
                    <Text
                      style={[typography.body, { color: colors.textTertiary, fontStyle: 'italic' }]}
                    >
                      Нет данных о e1RM за этот период
                    </Text>
                  ) : (
                    topExercises.map((ex) => (
                      <View
                        key={ex.exerciseId}
                        style={[styles.legendRow, { borderBottomColor: colors.borderLight }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[typography.body, { color: colors.textPrimary }]}
                          >
                            {ex.exerciseName}
                          </Text>
                          {!!ex.primaryMuscle && (
                            <Text
                              style={[
                                typography.captionSmall,
                                { color: colors.textTertiary, marginTop: 2 },
                              ]}
                            >
                              {ex.primaryMuscle}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={[typography.body, { color: colors.primary, fontWeight: '700' }]}
                          >
                            {roundE1rm(ex.e1rm)} кг
                          </Text>
                          <Text
                            style={[
                              typography.captionSmall,
                              { color: colors.textTertiary, marginTop: 2 },
                            ]}
                          >
                            e1RM
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color: colors.textTertiary,
                      marginTop: SPACING.md,
                      fontStyle: 'italic',
                    },
                  ]}
                >
                  e1RM — оценочный одноповторный максимум (формулы Эпли/Бжицки/Ватана).
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
});

MuscleStatsSection.displayName = 'MuscleStatsSection';

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  tabButton: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
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
  bucketRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bucketItem: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
});
