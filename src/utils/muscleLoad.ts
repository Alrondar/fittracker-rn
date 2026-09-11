// src/utils/muscleLoad.ts
//
// Детерминированная агрегация нагрузки на мышцы из логов подходов.
// Используется и в Workout Report (одна тренировка), и в Progress hub
// (неделя / 30 / 90 / все периоды).
//
// Модель (внутренняя, НЕ медицинская истина):
//   - primary мышца получает 100% вклада упражнения
//   - secondary мышца получает 50% вклада (косвенная нагрузка)
//   - sets: количество рабочих (не разминочных) подходов, в которых мышца участвовала
//   - volumeKg = Σ(weight × reps) × коэффициент
//   - loadScore = Σ(weight × reps × rpeFactor) × коэффициент
//       rpeFactor = rpe/10, если указан; иначе DEFAULT_RPE_FACTOR = 0.7
//       (типичный рабочий сет — RPE 7; явно задокументировано, чтобы
//        не создавать ложной точности)
//
// loadScore используется только для раскраски интенсивности — он объясним
// и детерминирован; volumeKg и sets — это «что показываем пользователю».

import type { Slug } from '../types/muscleMap';
import { getSlugsForMuscle } from '../constants/muscleMapSlugs';

export type MuscleLoadSet = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup?: boolean;
};

export type MuscleLoadInputItem = {
  /** Список первичных мышц упражнения (человеко-читаемые названия) */
  primaryMuscles: readonly string[] | null;
  /** Список вторичных мышц упражнения */
  secondaryMuscles: readonly string[] | null;
  /** Рабочие и разминочные подходы (isWarmup=true исключается) */
  sets: readonly MuscleLoadSet[];
};

export type MuscleLoad = {
  slug: Slug;
  /** Одно из названий мышц группы (первое встреченное) — для отображения */
  displayName: string;
  /** Сумма рабочих подходов, в которых участвовала мышца */
  sets: number;
  /** Тоннаж (Σ вес × повторы) с учётом коэффициента primary/secondary */
  volumeKg: number;
  /** Взвешенный объём с учётом RPE — используется для шкалы интенсивности */
  loadScore: number;
};

const PRIMARY_COEFF = 1.0;
const SECONDARY_COEFF = 0.5;
/** Дефолт для подходов без RPE (типичный рабочий сет ~ RPE 7). */
const DEFAULT_RPE_FACTOR = 0.7;

/**
 * Агрегирует нагрузку на мышцы из списка упражнений.
 * Возвращает массив MuscleLoad по slug'ам, отсортированный по volumeKg DESC.
 * Slug'и, по которым нет рабочих подходов, отсутствуют в результате.
 */
export function calculateMuscleLoad(items: readonly MuscleLoadInputItem[]): MuscleLoad[] {
  const bySlug = new Map<Slug, MuscleLoad>();

  const ensure = (slug: Slug, displayName: string): MuscleLoad => {
    let entry = bySlug.get(slug);
    if (!entry) {
      entry = { slug, displayName, sets: 0, volumeKg: 0, loadScore: 0 };
      bySlug.set(slug, entry);
    }
    return entry;
  };

  for (const item of items) {
    const primary = item.primaryMuscles ?? [];
    const secondary = item.secondaryMuscles ?? [];

    let itemSets = 0;
    let itemVolume = 0;
    let itemLoadScore = 0;

    for (const set of item.sets) {
      if (set.isWarmup) continue;
      const w = set.weight ?? 0;
      const r = set.reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const vol = w * r;
      const rpeFactor = set.rpe != null ? set.rpe / 10 : DEFAULT_RPE_FACTOR;
      itemSets += 1;
      itemVolume += vol;
      itemLoadScore += vol * rpeFactor;
    }

    if (itemSets === 0) continue;

    // Primary: полный вклад; sets считается полностью (подход — есть подход)
    primary.forEach((m) => {
      const s = getSlugsForMuscle(m);
      // Используем Set, чтобы избежать дублирования, если мышца есть и в front, и в back (напр. trapezius)
      const uniqueSlugs = Array.from(new Set([...s.front, ...s.back]));
      for (const slug of uniqueSlugs) {
        const entry = ensure(slug, m);
        entry.sets += itemSets;
        entry.volumeKg += itemVolume * PRIMARY_COEFF;
        entry.loadScore += itemLoadScore * PRIMARY_COEFF;
      }
    });
    // Secondary: вклад в volume/loadScore уменьшен, sets — полностью
    secondary.forEach((m) => {
      const s = getSlugsForMuscle(m);
      const uniqueSlugs = Array.from(new Set([...s.front, ...s.back]));
      for (const slug of uniqueSlugs) {
        const entry = ensure(slug, m);
        entry.sets += itemSets;
        entry.volumeKg += itemVolume * SECONDARY_COEFF;
        entry.loadScore += itemLoadScore * SECONDARY_COEFF;
      }
    });
  }

  return Array.from(bySlug.values())
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

/** Плюрализация «сет/сета/сетов» по русским правилам. */
export function pluralizeSets(n: number): string {
  const abs = Math.abs(n);
  const last2 = abs % 100;
  const last = abs % 10;
  if (last2 >= 11 && last2 <= 14) return `${n} сетов`;
  if (last === 1) return `${n} сет`;
  if (last >= 2 && last <= 4) return `${n} сета`;
  return `${n} сетов`;
}

/** Формат тоннажа: `Math.round(kg)` + ru-RU разделитель тысяч + «кг». */
export function formatVolumeKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('ru-RU')} кг`;
}

/** Плюрализация «день/дня/дней» (для вкладки «Усталость»). */
export function pluralizeDays(n: number): string {
  const abs = Math.abs(n);
  const last2 = abs % 100;
  const last = abs % 10;
  if (last2 >= 11 && last2 <= 14) return `${n} дней`;
  if (last === 1) return `${n} день`;
  if (last >= 2 && last <= 4) return `${n} дня`;
  return `${n} дней`;
}

/**
 * Возвращает true, если упражнение затрагивает указанную мышцу (по slug).
 * Используется для фильтрации списка упражнений в отчёте при тапе на карту.
 */
export function exerciseHasMuscle(
  primaryMuscles: readonly string[] | null,
  secondaryMuscles: readonly string[] | null,
  targetSlug: Slug
): boolean {
  const allMuscles = [...(primaryMuscles ?? []), ...(secondaryMuscles ?? [])];
  for (const muscle of allMuscles) {
    const slugs = getSlugsForMuscle(muscle);
    if (slugs.front.includes(targetSlug) || slugs.back.includes(targetSlug)) {
      return true;
    }
  }
  return false;
}
