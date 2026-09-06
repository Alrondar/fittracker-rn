// src/utils/workoutForecast.ts
// Фича 7: прогноз сложности следующей тренировки.
// Детерминированный, без LLM, без выдуманных весов.
// Forecast = сумма последних реальных объёмов для каждого упражнения,
// которое будет в следующей тренировке (workout_logs за последние 4 недели,
// is_warmup=false). Сравнение со средним объёмом тренировки за тот же период.
// PRODUCT.md §3.3 (user control), §14 (честный fallback при нехватке данных).

export type ForecastDifficulty = 'easy' | 'normal' | 'hard' | 'unknown';

export interface ForecastExerciseInput {
  exerciseId: string;
  /**
   * Массив объёмов (sets × reps × weight) этого упражнения за последние 4 недели.
   * Одна запись = одна завершённая тренировка, на которой это упражнение выполнялось.
   * Пустой массив = упражнение никогда не делалось пользователем.
   */
  recentVolumes: number[];
}

export interface ForecastInput {
  /** Упражнения следующей тренировки (программный план). */
  exercises: ForecastExerciseInput[];
  /**
   * Суммарные объёмы всех тренировок пользователя за последние 4 недели
   * (по одной цифре на завершённую тренировку). Используется как baseline
   * для классификации сложности.
   */
  recentWorkoutVolumes: number[];
}

export interface ForecastExerciseResult {
  exerciseId: string;
  avgVolume: number; // 0, если нет истории
  sessionCount: number;
}

export interface WorkoutForecastResult {
  forecastVolume: number;
  avgWorkoutVolume: number;
  /** forecast / avg; null при отсутствии baseline. */
  ratio: number | null;
  difficulty: ForecastDifficulty;
  perExercise: ForecastExerciseResult[];
  /** Короткое объяснение уровня (для UI one-liner). */
  explanation: string;
  /** true, если у пользователя < 3 завершённых тренировок за окно — прогноз ненадёжный. */
  insufficientData: boolean;
  /** true, если для какого-то упражнения из плана нет истории. */
  missingHistory: boolean;
}

const MIN_BASELINE_WORKOUTS = 3;
const EASY_THRESHOLD = 0.85;
const HARD_THRESHOLD = 1.15;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateWorkoutForecast(input: ForecastInput): WorkoutForecastResult {
  const perExercise: ForecastExerciseResult[] = input.exercises.map((ex) => {
    const avg = mean(ex.recentVolumes);
    return {
      exerciseId: ex.exerciseId,
      avgVolume: avg,
      sessionCount: ex.recentVolumes.length,
    };
  });

  const forecastVolume = perExercise.reduce((sum, e) => sum + e.avgVolume, 0);
  const avgWorkoutVolume = mean(input.recentWorkoutVolumes);
  const insufficientData = input.recentWorkoutVolumes.length < MIN_BASELINE_WORKOUTS;
  const missingHistory = perExercise.some((e) => e.sessionCount === 0);

  let ratio: number | null = null;
  if (!insufficientData && avgWorkoutVolume > 0) {
    ratio = forecastVolume / avgWorkoutVolume;
  }

  let difficulty: ForecastDifficulty = 'unknown';
  let explanation = 'Недостаточно данных для прогноза';
  if (ratio != null) {
    if (ratio < EASY_THRESHOLD) {
      difficulty = 'easy';
      explanation = 'Ожидается легче обычной тренировки';
    } else if (ratio > HARD_THRESHOLD) {
      difficulty = 'hard';
      explanation = 'Ожидается тяжелее обычной тренировки';
    } else {
      difficulty = 'normal';
      explanation = 'Обычная нагрузка по плану';
    }
  }

  return {
    forecastVolume,
    avgWorkoutVolume,
    ratio,
    difficulty,
    perExercise,
    explanation,
    insufficientData,
    missingHistory,
  };
}
