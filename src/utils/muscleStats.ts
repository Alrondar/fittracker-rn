// src/utils/muscleStats.ts
// Чистые производные для секции «Мышцы» (MuscleStatsSection): период-фильтр,
// нагрузка по slug'ам, усталость, сохранение силы и топ упражнений.
// Вынесено из компонента (CTR-3, 19.10) — здесь нет React и тем, поэтому это
// можно проверять офлайн, как остальную чистую логику в src/utils/.
import { getSlugsForMuscle } from '../constants/muscleMapSlugs';
import type { MuscleStatsRow } from '../services/muscleStatsService';
import type { MuscleLoad, MuscleLoadMode } from './muscleLoad';
import type { Slug } from '../types/muscleMap';

export type PeriodKey = '7' | '30' | '90' | 'all';

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

export const labelFor = (slug: Slug, fallback: string): string => {
  const mapped = SLUG_LABEL[slug];
  if (mapped && mapped.length > 0) return mapped;
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
};

export function filterRowsByPeriod(
  rows: readonly MuscleStatsRow[],
  period: PeriodKey
): MuscleStatsRow[] {
  if (period === 'all') return rows as MuscleStatsRow[];
  const days = parseInt(period, 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return (rows as MuscleStatsRow[]).filter((r) => new Date(r.date).getTime() >= cutoff);
}

export function rowsToMuscleLoad(
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
      // VF-7: дедуп front∩back (как в muscleLoad.ts) — мышцы, которые крепятся
      // и спереди, и сзади (напр. trapezius), считались дважды
      const uniqueSlugs = Array.from(new Set([...slugs.front, ...slugs.back]));
      for (const slug of uniqueSlugs) {
        const e = ensure(slug, m);
        e.sets += row.sets;
        e.volumeKg += row.volumeKg * PRIMARY_COEFF;
        e.loadScore += row.sets * PRIMARY_COEFF; // Интенсивность = подходы, а не тоннаж
      }
    }
    if (mode === 'total') {
      for (const m of row.secondaryMuscles) {
        const slugs = getSlugsForMuscle(m);
        const uniqueSlugs = Array.from(new Set([...slugs.front, ...slugs.back]));
        for (const slug of uniqueSlugs) {
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

export type SlugFatigue = {
  slug: Slug;
  displayName: string;
  daysSince: number;
};

export function computeFatigue(rows: readonly MuscleStatsRow[]): SlugFatigue[] {
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
export function fatigueBucket(days: number): {
  label: string;
  colorKey: 'error' | 'warning' | 'success' | 'textTertiary';
} {
  if (days <= 2) return { label: 'Фатиг', colorKey: 'error' };
  if (days <= 5) return { label: 'Восстановление', colorKey: 'warning' };
  if (days <= 14) return { label: 'Готовность', colorKey: 'success' };
  return { label: 'Отдых', colorKey: 'textTertiary' };
}

export type SlugStrength = {
  slug: Slug;
  displayName: string;
  /** Сохранение силы: bestE1rm(период) / bestE1rm(всё время). 0..1. */
  retention: number;
  bestE1rmPeriod: number;
  bestE1rmAllTime: number;
};

export function computeStrength(
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

export type TopExercise = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  e1rm: number;
  date: string;
};

export function topExercisesInPeriod(rows: readonly MuscleStatsRow[]): TopExercise[] {
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
