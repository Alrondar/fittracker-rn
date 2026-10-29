export type Difficulty = 'easy' | 'moderate' | 'hard' | 'max';

// P1.1: Политики прогрессии
export type ProgressionPolicy = 'linear' | 'double_progression' | 'greyskull' | 'time_based';

export type SetFeedbackPatch = Partial<
  Pick<SetData, 'rpe' | 'rir' | 'difficulty' | 'isWarmup' | 'estimatedReps'>
>;

export interface SetData {
  weight: string;
  reps: string;
  reps_left?: string; // P0.2: для unilateral-упражнений
  reps_right?: string; // P0.2: для unilateral-упражнений
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
  /** Фича 2: Целевой RPE для упражнения (1-10). Если задан, прогрессия учитывает не только повторы, но и субъективную сложность. */
  target_rpe?: number | null;
  // PR6: pain state из pain_events (null = не отмечено в этой тренировке)
  painState?: ExercisePainState | null;
  /** UX-3a (I-5): all-time max вес (кг) по упражнению — для живого PR-момента.
   *  null/undefined = данные ещё не догружены (PR не триггерится). */
  personalBest?: number | null;
  /** P1.1: Политика прогрессии (linear, double_progression, greyskull, time_based) */
  progression_policy?: ProgressionPolicy;
  /**
   * ADD-BELOW (16.10): блок добавлен человеком из поиска в этой сессии, а не
   * пришёл из плана. Только локальный флаг: у строки есть workout_exercise_id,
   * по нему и удаляем. Даёт карточке кнопку «Убрать».
   */
  isAddedHere?: boolean;
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
  /**
   * Позиция 9-2: до трёх коротких причин, почему движок поставил эту замену
   * выше остальных. Пусто, когда объяснять нечем (например, связи не совпали).
   */
  reasons?: string[];
  /**
   * ADD-BELOW: id связанных упражнений из каталога. Нужны, чтобы блок,
   * добавленный из поиска, сразу умел показывать свои замены, а не получал их
   * только после перезахода на экран.
   */
  alternatives?: string[];
}
// Display mode для карточек упражнений в тренировке
export type WorkoutCardDisplayMode = 'training' | 'balanced' | 'learn';
