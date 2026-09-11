// src/utils/programMuscleLoad.ts
//
// Детерминированная агрегация плановой нагрузки на мышцы из структуры программы.
// Используется для визуализации покрытия мышц в Program Detail.
//
// Модель (внутренняя, НЕ медицинская истина):
//   - primary мышца получает 100% вклада упражнения
//   - secondary мышца получает 50% вклада (косвенная нагрузка)
//   - Результат: средневзвешенные плановые сеты/неделю по всем фазам программы.

import type { Slug } from '../types/muscleMap';
import { getSlugsForMuscle } from '../constants/muscleMapSlugs';

export type ProgramMuscleEntry = {
  slug: Slug;
  name: string;
  setsPerWeek: number;
};

// Упрощённый тип для фазы программы (достаточно для агрегации)
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

/**
 * Агрегирует нагрузку на мышцы из фаз программы.
 * Возвращает массив ProgramMuscleEntry, отсортированный по setsPerWeek DESC.
 */
export function calculateProgramMuscleLoad(phases: readonly PhaseLike[]): ProgramMuscleEntry[] {
  const muscleData = new Map<Slug, { name: string; weightedSets: number }>();
  let totalWeeks = 0;

  for (const phase of phases) {
    const phaseWeeks = phase.weeks ?? phase.duration_weeks ?? 1;
    totalWeeks += phaseWeeks;

    for (const day of phase.days ?? []) {
      for (const ex of day.exercises ?? []) {
        const setsRaw = ex.sets;
        const sets = typeof setsRaw === 'string' ? parseInt(setsRaw, 10) || 1 : (setsRaw ?? 1);

        const processMuscles = (muscles: string[] | null, coefficient: number) => {
          if (!muscles) return;
          for (const muscleName of muscles) {
            const slugs = getSlugsForMuscle(muscleName);
            const allSlugs = [...slugs.front, ...slugs.back];
            for (const slug of allSlugs) {
              const existing = muscleData.get(slug) || { name: muscleName, weightedSets: 0 };
              existing.weightedSets += sets * coefficient * phaseWeeks;
              muscleData.set(slug, existing);
            }
          }
        };

        processMuscles(ex.primary_muscles ?? null, 1.0);
        processMuscles(ex.secondary_muscles ?? null, 0.5);
      }
    }
  }

  if (totalWeeks === 0) totalWeeks = 1;

  return Array.from(muscleData.entries())
    .map(([slug, data]) => ({
      slug,
      name: data.name,
      setsPerWeek: Math.round((data.weightedSets / totalWeeks) * 10) / 10,
    }))
    .filter((m) => m.setsPerWeek > 0)
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);
}
