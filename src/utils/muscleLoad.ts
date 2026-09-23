// src/utils/muscleLoad.ts
//
// Детерминированная агрегация нагрузки на мышцы из логов подходов.
// Используется и в Workout Report (одна тренировка), и в Progress hub
// (неделя / 30 / 90 / все периоды).
//
// Модель (внутренняя, НЕ медицинская истина, основана на подходе OpenGym):
//   - Интенсивность подсветки на карте считается ТОЛЬКО по эффективным подходам (sets).
//     Тоннаж (volumeKg) намеренно НЕ используется для расчёта интенсивности, т.к.
//     100 кг в жиме ногами против 12 кг в махах в стороны ничего не говорят о том,
//     какая мышца работала тяжелее.
//   - primary мышца получает 100% вклада упражнения (1.0 × sets)
//   - secondary мышца получает 50% вклада (0.5 × sets) как косвенная нагрузка
//   - volumeKg = Σ(weight × reps) × коэффициент (показывается только как справка в легенде)
//   - loadScore = Σ(sets) × коэффициент (используется ТОЛЬКО для шкалы интенсивности карты)
//   - RPE/RIR не участвуют в расчёте: они относятся к отдельному сигналу субъективной интенсивности.
//
// loadScore используется только для раскраски интенсивности — он объясним
// и детерминирован; volumeKg и sets — это «что показываем пользователю».

import type { Slug } from '../types/muscleMap';
import { getSlugsForMuscle } from '../constants/muscleMapSlugs';
import { kgToLb } from '../hooks/useUnitPreferences';

export type MuscleLoadSet = {
  weight: number | null;
  reps: number | null;
  isWarmup?: boolean;
};

export type MuscleLoadMode = 'total' | 'direct';

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
  /** Эффективные подходы с коэффициентом primary/secondary — шкала интенсивности карты */
  loadScore: number;
};

const PRIMARY_COEFF = 1.0;
const SECONDARY_COEFF = 0.5;

/**
 * Агрегирует нагрузку на мышцы из списка упражнений.
 * Возвращает массив MuscleLoad по slug'ам, отсортированный по volumeKg DESC.
 * Slug'и, по которым нет рабочих подходов, отсутствуют в результате.
 *
 * @param mode - 'total' (primary + secondary) или 'direct' (только primary)
 */
export function calculateMuscleLoad(
  items: readonly MuscleLoadInputItem[],
  mode: MuscleLoadMode = 'total'
): MuscleLoad[] {
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

    for (const set of item.sets) {
      if (set.isWarmup) continue;
      const w = set.weight ?? 0;
      const r = set.reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const vol = w * r;
      itemSets += 1;
      itemVolume += vol;
    }

    if (itemSets === 0) continue;

    // Primary: полный вклад в intensity (loadScore = sets)
    primary.forEach((m) => {
      const s = getSlugsForMuscle(m);
      // Используем Set, чтобы избежать дублирования, если мышца есть и в front, и в back (напр. trapezius)
      const uniqueSlugs = Array.from(new Set([...s.front, ...s.back]));
      for (const slug of uniqueSlugs) {
        const entry = ensure(slug, m);
        entry.sets += itemSets;
        entry.volumeKg += itemVolume * PRIMARY_COEFF;
        entry.loadScore += itemSets * PRIMARY_COEFF; // Интенсивность = подходы, а не тоннаж
      }
    });
    // Secondary: вклад в intensity и sets уменьшен (косвенная нагрузка)
    // В режиме 'direct' вторичные мышцы полностью игнорируются
    if (mode === 'total') {
      secondary.forEach((m) => {
        const s = getSlugsForMuscle(m);
        const uniqueSlugs = Array.from(new Set([...s.front, ...s.back]));
        for (const slug of uniqueSlugs) {
          const entry = ensure(slug, m);
          entry.sets += itemSets * SECONDARY_COEFF;
          entry.volumeKg += itemVolume * SECONDARY_COEFF;
          entry.loadScore += itemSets * SECONDARY_COEFF; // Интенсивность = подходы × 0.5
        }
      });
    }
  }

  return Array.from(bySlug.values())
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.volumeKg - a.volumeKg);
}

/** Плюрализация «сет/сета/сетов» по русским правилам (поддерживает дробные значения). */
export function pluralizeSets(n: number): string {
  if (!Number.isInteger(n)) {
    return `${n.toFixed(1)} сета`;
  }
  const rounded = Math.round(n);
  const abs = Math.abs(rounded);
  const last2 = abs % 100;
  const last = abs % 10;
  if (last2 >= 11 && last2 <= 14) return `${rounded} сетов`;
  if (last === 1) return `${rounded} сет`;
  if (last >= 2 && last <= 4) return `${rounded} сета`;
  return `${rounded} сетов`;
}

/** Формат тоннажа: `Math.round(kg)` + ru-RU разделитель тысяч + единица из предпочтений. */
export function formatVolumeKg(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return `${Math.round(value).toLocaleString('ru-RU')} ${unit === 'lb' ? 'lb' : 'кг'}`;
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
