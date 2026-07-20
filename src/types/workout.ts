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
  media_url: string | null; // ✅ НОВОЕ
  target_sets: number;
  rest_seconds: number;
  intensity: string;
  sets: SetData[];
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
  media_url: string | null; // ✅ НОВОЕ
}