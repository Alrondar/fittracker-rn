// src/services/painService.ts
// FEAT-1.9 + PR6 (Scope 2): флаг боли во время тренировки + замыкание на систему травм.
// PR6: upsert-семантика (один pain event на упражнение на тренировку на пользователя),
// чтение events для prefill, delete для «Боль прошла».
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

/** Структура, возвращаемая из pain_events — для prefill в PainSheet. */
export interface PainEvent {
  id: string;
  exercise_id: string; // PR6: для маппинга в painState per exercise
  pain_level: number;
  pain_type: PainType | null;
  body_part: string | null;
  stop_exercise: boolean;
  notes: string | null;
  occurred_at: string;
}

export const painService = {
  /**
   * PR6: Получить все pain events для текущей тренировки.
   * Фильтр по workout_id; user_id — через RLS.
   */
  async getPainEventsForWorkout(workoutId: string): Promise<PainEvent[]> {
    const { data, error } = await supabase
      .from('pain_events')
      .select(
        'id, exercise_id, pain_level, pain_type, body_part, stop_exercise, notes, occurred_at'
      )
      .eq('workout_id', workoutId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as PainEvent[];
  },

  /**
   * PR6: Upsert события боли.
   * Использует UNIQUE constraint (user_id, workout_id, exercise_id).
   * Повторное сохранение обновляет существующую запись, не создаёт дубль.
   */
  async upsertPainEvent(input: PainEventInput): Promise<void> {
    const { error } = await supabase.from('pain_events').upsert(
      {
        user_id: input.userId,
        workout_id: input.workoutId,
        exercise_id: input.exerciseId,
        pain_level: input.painLevel,
        pain_type: input.painType,
        body_part: input.bodyPart,
        stop_exercise: input.stopExercise,
        notes: input.notes ?? null,
        occurred_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,workout_id,exercise_id',
        ignoreDuplicates: false,
      }
    );
    if (error) throw error;
  },

  /**
   * PR6: Удалить pain event для упражнения в тренировке («Боль прошла»).
   * Фильтр по трём полям — защита от случайного удаления чужих записей.
   */
  async deletePainEvent(userId: string, workoutId: string, exerciseId: string): Promise<void> {
    const { error } = await supabase
      .from('pain_events')
      .delete()
      .eq('user_id', userId)
      .eq('workout_id', workoutId)
      .eq('exercise_id', exerciseId);

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
    notes: string | null
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
  /**
   * Обновляет exercise_id в pain_events при временной замене упражнения.
   * Критично для сохранения контекста безопасности (PRODUCT.md §8):
   * предотвращает исчезновение индикатора боли и отключение safety-downgrade
   * в progression engine после замены упражнения.
   */
  async updatePainEventExerciseId(
    userId: string,
    workoutId: string,
    oldExerciseId: string,
    newExerciseId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('pain_events')
      .update({ exercise_id: newExerciseId })
      .eq('user_id', userId)
      .eq('workout_id', workoutId)
      .eq('exercise_id', oldExerciseId);

    if (error) throw error;
  },

  /**
   * Фича 4: получить все pain events в диапазоне дат (ISO-строки).
   * Используется хуком usePainTrend для построения тренда боли по зонам.
   */
  async getPainEventsInRange(userId: string, fromIso: string, toIso: string): Promise<PainEvent[]> {
    const { data, error } = await supabase
      .from('pain_events')
      .select(
        'id, exercise_id, pain_level, pain_type, body_part, stop_exercise, notes, occurred_at'
      )
      .eq('user_id', userId)
      .gte('occurred_at', fromIso)
      .lte('occurred_at', toIso)
      .order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PainEvent[];
  },

  /**
   * AUDIT-6: количество pain events за сегодня (для чипа «⚠ Боль сегодня»
   * в StatusCard). Информационный сигнал, не блокирует тренировку.
   */
  async getPainEventsToday(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('pain_events')
      .select('id')
      .eq('user_id', userId)
      .gte('occurred_at', `${today}T00:00:00+00:00`);
    if (error) throw error;
    return (data ?? []).length;
  },
};
