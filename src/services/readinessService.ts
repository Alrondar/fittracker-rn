// src/services/readinessService.ts
// FEAT-1.8: daily readiness check-in. UI не ходит в supabase напрямую.
import { supabase } from '../lib/supabase';

export interface ReadinessInput {
  sleepHours: number | null;
  sleepQuality: number | null; // 1–5 (5 — отлично)
  fatigue: number | null; // 1–5 (1 — свежий)
  soreness: number | null; // 1–5 (1 — нет боли)
  stress: number | null; // 1–5 (1 — спокойно)
  readiness: number | null; // 1–5, вычисляется в UI
}

export const readinessService = {
  /** Есть ли уже запись за сегодня. */
  async getToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_readiness')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  /** Insert или update за сегодня (не зависит от наличия unique-констрейнта). */
  async upsertToday(userId: string, input: ReadinessInput): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      sleep_hours: input.sleepHours,
      sleep_quality: input.sleepQuality,
      fatigue: input.fatigue,
      soreness: input.soreness,
      stress: input.stress,
      readiness: input.readiness,
    };
    const { data: existing } = await supabase
      .from('daily_readiness')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('daily_readiness')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('daily_readiness')
        .insert({ user_id: userId, date: today, ...payload });
      if (error) throw error;
    }
  },
};