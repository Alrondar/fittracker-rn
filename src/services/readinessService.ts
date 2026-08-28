// src/services/readinessService.ts
// FEAT-1.8: daily readiness check-in. UI не ходит в supabase напрямую.
// P0 Вариант B: добавлена авто-калькуляция readiness и getRecoveryTrend.
import { supabase } from '../lib/supabase';
import { calculateReadinessFromDetails } from '../utils/readiness';

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

  /**
   * ENG-3: значение readiness за сегодня (1-5) или null, если запись не сделана.
   * null означает «данные отсутствуют» — readiness не должен менять рекомендацию
   * (PRODUCT.md §7: отсутствие check-in не блокирует и не переписывает программу).
   */
  async getTodayReadiness(userId: string): Promise<number | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_readiness')
      .select('readiness')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    if (error) throw error;
    return data?.readiness ?? null;
  },

  /** Insert или update за сегодня (не зависит от наличия unique-констрейнта). */
  async upsertToday(userId: string, input: ReadinessInput): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // P0 Вариант B: авто-расчёт readiness, если введены детали
    // Если пользователь ввёл детали — авто-score перезаписывает manual (если manual не задан явно)
    const hasDetails = input.sleepHours !== null || input.sleepQuality !== null || 
                       input.stress !== null || input.soreness !== null;
    
    let finalReadiness = input.readiness ?? null;
    if (hasDetails && finalReadiness === null) {
      finalReadiness = calculateReadinessFromDetails(
        input.sleepHours ?? null,
        input.sleepQuality ?? null,
        input.stress ?? null,
        input.soreness ?? null
      );
    }

    const payload = {
      sleep_hours: input.sleepHours,
      sleep_quality: input.sleepQuality,
      fatigue: input.fatigue,
      soreness: input.soreness,
      stress: input.stress,
      readiness: finalReadiness,
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

  /**
   * P0 Вариант B: тренд восстановления за N дней для L3 (metrics.tsx).
   * Возвращает массивы значений + средние для инсайтов.
   */
  async getRecoveryTrend(userId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_readiness')
      .select('date, sleep_hours, sleep_quality, stress, readiness')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    const sleepHours = data.map(d => d.sleep_hours).filter((v): v is number => v !== null);
    const stress = data.map(d => d.stress).filter((v): v is number => v !== null);
    
    return {
      sleepHours: data.map(d => ({ date: d.date, value: d.sleep_hours })),
      stress: data.map(d => ({ date: d.date, value: d.stress })),
      avgSleepHours: sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : 0,
      avgStress: stress.length ? stress.reduce((a, b) => a + b, 0) / stress.length : 0,
    };
  },
};