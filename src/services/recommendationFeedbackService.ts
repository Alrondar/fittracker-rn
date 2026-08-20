// src/services/recommendationFeedbackService.ts
// COACH-3: acceptance/rejection feedback для рекомендаций прогрессии.
// Единственное место supabase.from('recommendation_feedback') (CLAUDE.md §2).
// Upsert по (user_id, workout_id, exercise_id, set_number) — последнее решение
// по сету побеждает (сет можно очистить и решение повторится).
import { supabase } from '../lib/supabase';

export type RecommendationDecision = 'accepted' | 'rejected' | 'changed';

/** Пользовательская причина отклонения (ROADMAP C2, фиксированный набор). */
export type UserRejectionReason =
  | 'tired'
  | 'too_heavy'
  | 'pain'
  | 'want_easier'
  | 'other';

export interface RecommendationFeedbackInput {
  userId: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number; // 1-indexed
  decision: RecommendationDecision;
  /** Пользовательская причина отклонения (только при decision='rejected'). */
  userReasonCode: UserRejectionReason | null;
  /** Engine action на момент решения (increase/hold/decrease). */
  engineAction: string;
  /** Engine reason code (machine-readable, ENG-2). */
  engineReasonCode: string;
  /** Предложенный вес (кг) из engine. */
  suggestedWeight: number | null;
  /** Предложенные повторы из engine. */
  suggestedReps: number | null;
  /** Фактический вес, записанный в сет (null если rejected). */
  appliedWeight: number | null;
}

export const recommendationFeedbackService = {
  /**
   * COACH-3: тихая запись решения по рекомендации.
   * Upsert: при повторном решении для того же (user, workout, exercise, set)
   * предыдущая запись обновляется.
   */
  async submitFeedback(input: RecommendationFeedbackInput): Promise<void> {
    const { error } = await supabase.from('recommendation_feedback').upsert(
      {
        user_id: input.userId,
        workout_id: input.workoutId,
        exercise_id: input.exerciseId,
        set_number: input.setNumber,
        decision: input.decision,
        user_reason_code: input.userReasonCode,
        engine_action: input.engineAction,
        engine_reason_code: input.engineReasonCode,
        suggested_weight: input.suggestedWeight,
        suggested_reps: input.suggestedReps,
        applied_weight: input.appliedWeight,
      },
      {
        onConflict: 'user_id,workout_id,exercise_id,set_number',
        ignoreDuplicates: false,
      },
    );
    if (error) throw error;
  },
};
