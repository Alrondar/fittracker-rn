export type Difficulty = 'easy' | 'moderate' | 'hard' | 'max';

export type SetFeedbackPatch = Partial<Pick<SetData, 'rpe' | 'rir' | 'difficulty' | 'isWarmup' | 'estimatedReps'>>;

export interface SetData {
  weight: string;
  reps: string;
  rpe?: number | null;
  rir?: number | null;
  difficulty?: Difficulty | null;
  /**
   * ENG-13: флаг разминочного подхода. Разминочные сеты исключаются из расчёта
   * прогрессии (не влияют на оценку усталости и базовый вес рекомендации).
   * При toggle on на последнем сете — автоматически добавляется новый рабочий сет.
   */
  isWarmup?: boolean;
  // FEAT-1.1: данные из последней тренировки для подсказки прогрессии
  previousWeight?: number | null;
  previousReps?: number | null;
  previousRpe?: number | null;
  /** ENG-13: Estimated reps for incomplete set (user estimate or projected) */
  estimatedReps?: number | null;
}

// PR6: per-exercise pain state из pain_events (для prefill в PainSheet + visual affordance).
export interface ExercisePainState {
  painLevel: number; // 0–3
  painType: string | null; // PainType как string (чтобы не зависеть от painService)
  bodyPart: string | null;
  stopExercise: boolean;
  notes: string | null;
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
  // PR6: pain state из pain_events (null = не отмечено в этой тренировке)
  painState?: ExercisePainState | null;
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
  /** ENG-5: тип связи для бейджа (↗ прогрессия / ↘ упрощение / вариант). */
  relation_type?: 'variation' | 'alternative' | 'regression' | 'progression' | null;
}
// Display mode для карточек упражнений в тренировке
export type WorkoutCardDisplayMode = 'training' | 'balanced' | 'learn';

// COACH-3: acceptance/rejection feedback для рекомендаций прогрессии.
// Зеркалит типы из recommendationFeedbackService для UI-layer без прямой зависимости.
export type RecommendationDecision = 'accepted' | 'rejected' | 'changed';

/** Пользовательская причина отклонения (ROADMAP C2, фиксированный набор). */
export type UserRejectionReason =
  | 'tired'
  | 'too_heavy'
  | 'pain'
  | 'want_easier'
  | 'other';