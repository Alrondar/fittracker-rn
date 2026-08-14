// src/services/painService.ts
// FEAT-1.9: флаг боли во время тренировки + замыкание на систему травм.
import { supabase } from '../lib/supabase';

export type PainType = 'sharp' | 'dull' | 'pulling' | 'joint' | 'muscle';

export interface PainEventInput {
  userId: string;
  workoutId: string;
  exerciseId: string;
  painLevel: number; // 0–3
  painType: PainType | null;
  bodyPart: string | null;
  stopExercise: boolean;
  notes?: string | null;
}

export const painService = {
  /** Запись события боли (pain_events) — вход для AI-фильтров (ROADMAP 3.3). */
  async logPainEvent(input: PainEventInput): Promise<void> {
    const { error } = await supabase.from('pain_events').insert({
      user_id: input.userId,
      workout_id: input.workoutId,
      exercise_id: input.exerciseId,
      pain_level: input.painLevel,
      pain_type: input.painType,
      body_part: input.bodyPart,
      stop_exercise: input.stopExercise,
      notes: input.notes ?? null,
      occurred_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  /**
   * Временная осторожность в профиле травм (user_injuries) —
   * useInjuryWarnings подхватит её в следующих тренировках.
   */
  async addCautionInjury(
    userId: string,
    bodyPart: string,
    severity: 'low' | 'medium' | 'high',
    notes: string | null,
  ): Promise<void> {
    const { error } = await supabase.from('user_injuries').insert({
      user_id: userId,
      body_part: bodyPart,
      injury_type: 'pain', // валидный InjuryType из constants/injuries
      severity,
      status: 'active',
      notes: notes ?? 'Добавлено через флаг боли (FEAT-1.9)',
    });
    if (error) throw error;
  },
};