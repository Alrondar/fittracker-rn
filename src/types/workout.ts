/**
 * Типы тренировки (единственный источник типов упражнений для UI).
 * ARCH-7 закрыт 01.08.2026: types/index.ts удалён как мёртвый (0 импортов).
 * Все потребители импортируют ExerciseData/AlternativeExercise/SetData из этого файла.
 */

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'max';

export type SetFeedbackPatch = Partial<Pick<SetData, 'rpe' | 'rir' | 'difficulty'>>;

export interface SetData {
  weight: string;
  reps: string;
  rpe?: number | null;
  rir?: number | null;
  difficulty?: Difficulty | null;
  // FEAT-1.1: данные из последней тренировки для подсказки прогрессии
  previousWeight?: number | null;
  previousReps?: number | null;
  previousRpe?: number | null;
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