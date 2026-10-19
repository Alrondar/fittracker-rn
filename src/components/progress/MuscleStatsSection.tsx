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
// Чистые производные (период, нагрузка/усталость/сила по slug'ам, топ упражнений)
// — в utils/muscleStats.ts; здесь только рендер и состояние вкладок.
// Цвета шкалы интенсивности — из `colors.primary` текущей темы (colorScale.ts).
//
// UX-принципы (PRODUCT.md §3):
//   - progressive disclosure: L1 — карта, L2 — легенда/списки;
//   - tracker first: в Progress hub аналитика не блокирует основной скролл;
//   - explainability: каждая вкладка имеет подпись «что измеряем»
//     (caption под заголовком);
//   - empty state: дружелюбный текст, без фейковых данных.

import React, { memo, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Activity } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useWeightDisplay } from '../../hooks/useUnitPreferences';
import { useMuscleStats } from '../../hooks/useMuscleStats';
import { SPACING, BORDER_RADIUS, withAlpha } from '../../constants/theme';
import { typography } from '../../styles/typography';
import { MuscleLoadMap } from '../workout/MuscleLoadMap';
import { MuscleLoadModeToggle } from '../ui/MuscleLoadModeToggle';
import { PillToggle } from '../ui/PillToggle';
import { BodyMap } from '../workout/BodyMap';
import { intensityColor } from '../../utils/colorScale';
import { pluralizeDays, type MuscleLoadMode } from '../../utils/muscleLoad';
import { roundE1rm } from '../../utils/e1rm';
import {
  computeFatigue,
  computeStrength,
  fatigueBucket,
  filterRowsByPeriod,
  labelFor,
  rowsToMuscleLoad,
  topExercisesInPeriod,
  type PeriodKey,
} from '../../utils/muscleStats';

type TabKey = 'load' | 'fatigue' | 'strength';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'load', label: 'Нагрузка' },
  { key: 'fatigue', label: 'Усталость' },
  { key: 'strength', label: 'Сила' },
];

// UX-6 (29.09): короткие числовые лейблы — «Неделя/30 дней» обрезались до
// «Нед.../30 д...» в PillToggle; смысл понятен из соседних 90/Всё.
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7', label: '7' },
  { key: '30', label: '30' },
  { key: '90', label: '90' },
  { key: 'all', label: 'Всё' },
];

export type MuscleStatsSectionProps = {
  userId: string | null;
  gender?: 'male' | 'female';
};

export const MuscleStatsSection = memo<MuscleStatsSectionProps>(({ userId, gender = 'male' }) => {
  const { colors } = useTheme();
  // VF-8: e1RM в топ-списке «Сила» показывается в выбранных единицах (хранение — кг)
  const { unitLabel, kgToUnit } = useWeightDisplay();
  const [tab, setTab] = useState<TabKey>('load');
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [loadMode, setLoadMode] = useState<MuscleLoadMode>('total');

  const { rows, isPending, isFetching } = useMuscleStats(userId);

  const rowsAll = useMemo(() => rows ?? [], [rows]);
  const rowsPeriod = useMemo(() => filterRowsByPeriod(rowsAll, period), [rowsAll, period]);

  // ----- Load tab -----
  const muscleLoadPeriod = useMemo(
    () => rowsToMuscleLoad(rowsPeriod, loadMode),
    [rowsPeriod, loadMode]
  );

  // ----- Fatigue tab -----
  const fatigue = useMemo(() => computeFatigue(rowsAll), [rowsAll]);

  const fatigueBodyData = useMemo(() => {
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
      <PillToggle options={TABS} value={tab} onChange={setTab} />

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
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <PillToggle options={PERIODS} value={period} onChange={setPeriod} />
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
                            {kgToUnit(roundE1rm(ex.e1rm))} {unitLabel}
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
