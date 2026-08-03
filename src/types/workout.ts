/**
 * Типы тренировки (единственный источник типов упражнений для UI).
 * ARCH-7 закрыт 01.08.2026: types/index.ts удалён как мёртвый (0 импортов).
 * Все потребители (ExerciseCard, ExerciseSlider, useWorkoutSession, useInjuryWarnings)
 * импортируют ExerciseData/AlternativeExercise/SetData из этого файла.
 */

export interface SetData {
  weight: string;
  reps: string;
}

export interface ExerciseData {
  id: string;
  workout_exercise_id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
  benefits: string;
  risks: string;
  injuries: string[];
  alternatives: string[];
  media_url: string | null;
  target_sets: number;
  rest_seconds: number;
  intensity: string;
  sets: SetData[];
  reps_range?: string;
}

export interface AlternativeExercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string;
  equipment: string[];
  settings: string;
  benefits: string;
  risks: string;
  injuries: string[];
  media_url: string | null;
  reps_range?: string;
}