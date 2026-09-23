// src/utils/workoutsList.ts
// DA-P2-8: хелперы списка тренировок (вынесены из app/(tabs)/workouts.tsx).
import { withAlpha } from '../constants/theme';
import type { ActiveProgram } from '../services/workoutsService';
import type { ForecastDifficulty } from './workoutForecast';

export type WorkoutStatus = 'completed' | 'skipped' | 'next' | 'in_progress' | 'upcoming';
export type FilterMode = 'upcoming' | 'all' | 'this_week';

export function getWorkoutStatus(
  w: {
    skipped_at?: string | null;
    finished_at?: string | null;
    started_at?: string | null;
    phase_number: number;
    week_number: number;
    day_index: number;
  },
  activeProgram: ActiveProgram | null
): WorkoutStatus {
  // UX-5 Feature 2: пропуск — отдельный статус (skipped_at заполнен)
  if (w.skipped_at) return 'skipped';
  if (w.finished_at) return 'completed';
  if (
    activeProgram &&
    w.phase_number === activeProgram.currentPhase &&
    w.week_number === activeProgram.currentWeek &&
    w.day_index === activeProgram.currentDay
  ) {
    return 'next';
  }
  if (w.started_at) return 'in_progress';
  return 'upcoming';
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} мин`;
}

// Фича 7: цветовые хелперы для L1-прогноз-бейджа.
export function forecastDifficultyColor(d: ForecastDifficulty, colors: any): string {
  if (d === 'hard') return colors.warning;
  if (d === 'easy') return colors.success;
  return colors.textSecondary;
}
export function forecastDifficultyBorderColor(d: ForecastDifficulty, colors: any): string {
  return withAlpha(forecastDifficultyColor(d, colors), 0.53);
}
export function forecastDifficultyBg(d: ForecastDifficulty, colors: any): string {
  return withAlpha(forecastDifficultyColor(d, colors), 0.1);
}
