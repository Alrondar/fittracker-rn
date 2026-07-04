export interface Exercise {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  technique: string;
  benefits: string;
  risks: string;
  injuries: string[];
  equipment: string[];
  settings: string;
  alternatives: string[];
  media_url: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  rest_seconds: number;
  exercises?: Exercise;
}

export interface SetLog {
  id?: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at?: string;
}

export interface WorkoutLog {
  set_number: number;
  weight_kg: number;
  reps: number;
}