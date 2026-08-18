// src/hooks/workout/useWorkoutSession.types.ts
// Внутренние типы join-структур для useWorkoutSession (ARCH-6)

export interface SessionExerciseRow {
  id: string;
  name: string;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  technique: string | null;
  settings: string | null;
  benefits: string | null;
  risks: string | null;
  media_url: string | null;
}

export interface SessionWERow {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  rest_seconds: number | null;
  intensity: string | null;
  target_reps_range: string | null;
}

export interface SessionWorkoutRow {
  name: string;
  program_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  workout_exercises: SessionWERow[] | null;
}

// FEAT-1.1: тип для вложенного select последних логов
export interface RecentLog {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  set_number: number | null;
  workout_exercises:
    | { exercise_id: string }
    | { exercise_id: string }[]
    | null;
}