// src/utils/workoutSections.ts
// Построение списка дней: секции (фаза × неделя), порядок внутри секции и счётчик
// прогресса. Чистая функция без стилей и без доступа к базе — её используют и сетевой
// путь (workoutsService), и путь из снимка программы, чтобы список офлайн выглядел
// ровно так же, как онлайн. Один владелец логики группировки.
import type { WorkoutsData } from '../services/workoutsService';

/**
 * Секции (фаза × неделя) и прогресс — чистая функция, которую использует и путь
 * чтения из снимка программы: список дней без сети должен выглядеть ровно так же,
 * как с сетью, а не иметь вторую логику группировки.
 */
export type WorkoutListRow = {
  id: string;
  name: string;
  phase_number: number | null;
  week_number: number | null;
  day_index: number | null;
  finished_at: string | null;
  skipped_at?: string | null;
};

export type ActiveProgramLite = {
  programId: string;
  name: string;
  currentPhase: number;
  currentWeek: number;
  currentDay: number;
  phases: { phase_number: number; name: string; phase_type: string }[];
};

export function buildWorkoutsData(
  active: ActiveProgramLite | null,
  workouts: WorkoutListRow[]
): WorkoutsData {
  if (!active) {
    return { activeProgram: null, sections: [], progress: { completed: 0, total: 0 } };
  }

  const phaseMap = new Map(active.phases.map((phase) => [phase.phase_number, phase]));
  const groups = new Map<string, WorkoutListRow[]>();
  workouts.forEach((workout) => {
    const key = `${workout.phase_number ?? 1}-${workout.week_number ?? 1}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(workout);
    else groups.set(key, [workout]);
  });

  const sections = Array.from(groups.entries())
    .map(([key, bucket]) => {
      const [phaseNumber, weekNumber] = key.split('-').map(Number);
      const phase = phaseMap.get(phaseNumber);
      // Порядок внутри секции задаёт здесь, а не запрос: у пути из снимка того же
      // `order()` нет, а список дней обязан совпадать с сетевым.
      const data = [...bucket].sort(
        (a, b) => (a.day_index ?? 0) - (b.day_index ?? 0) || a.name.localeCompare(b.name, 'ru')
      );
      return {
        key,
        phaseNumber,
        phaseName: phase?.name || `Фаза ${phaseNumber}`,
        phaseType: phase?.phase_type || 'custom',
        weekNumber,
        data,
      };
    })
    .sort((a, b) => a.phaseNumber - b.phaseNumber || a.weekNumber - b.weekNumber);

  // FIT-7: пропуск (skipped_at заполнен) выполненным не считается.
  const completed = workouts.filter((w) => w.finished_at && !w.skipped_at).length;

  return {
    activeProgram: active,
    sections,
    progress: { completed, total: workouts.length },
  };
}
