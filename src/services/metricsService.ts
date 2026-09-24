import { supabase } from '../lib/supabase';
import { BodyMetric } from '../types/metrics';
import { todayKey, toDateKey } from '../utils/dateKey';

/**
 * FD-10: привести profiles.current_weight_kg в соответствие с замером, у которого
 * наибольшая metric_date (при ничьей за одну дату — последний по created_at).
 * Вызывается после create/delete, чтобы бэкфил за прошлую дату не затирал вес.
 */
async function syncCurrentWeight(userId: string): Promise<void> {
  const { data } = await supabase
    .from('body_metrics')
    .select('weight_kg')
    .eq('user_id', userId)
    .not('weight_kg', 'is', null)
    .order('metric_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return;

  await supabase
    .from('profiles')
    .update({ current_weight_kg: data.weight_kg, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

export const metricsService = {
  // Получить все замеры пользователя (отсортированные по дате)
  async getUserMetrics(userId: string): Promise<BodyMetric[]> {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('metric_date', { ascending: false })
      // FD-10: детерминированный тай-брейк за одну дату — metrics[0]/[1] стабильны.
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Получить последний замер (для расчёта КБЖУ)
  async getLatestMetric(userId: string): Promise<BodyMetric | null> {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('metric_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Добавить новый замер
  async createMetric(userId: string, metric: Partial<BodyMetric>): Promise<BodyMetric> {
    const { data, error } = await supabase
      .from('body_metrics')
      .insert({
        user_id: userId,
        metric_date: metric.metric_date || todayKey(),
        weight_kg: metric.weight_kg,
        shoulder_cm: metric.shoulder_cm,
        chest_cm: metric.chest_cm,
        waist_cm: metric.waist_cm,
        abdomen_cm: metric.abdomen_cm,
        hips_cm: metric.hips_cm,
        neck_cm: metric.neck_cm,
        biceps_left_cm: metric.biceps_left_cm,
        biceps_right_cm: metric.biceps_right_cm,
        forearm_left_cm: metric.forearm_left_cm,
        forearm_right_cm: metric.forearm_right_cm,
        thigh_left_cm: metric.thigh_left_cm,
        thigh_right_cm: metric.thigh_right_cm,
        thigh_cm: metric.thigh_cm,
        calf_left_cm: metric.calf_left_cm,
        calf_right_cm: metric.calf_right_cm,
        arm_cm: metric.arm_cm,
        photo_url: metric.photo_url,
        notes: metric.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // FD-10: profiles.current_weight_kg = вес ЗАМЕРА С ПОСЛЕДНЕЙ ДАТОЙ, а не
    // только что вставленной строки — иначе бэкфил за прошлую дату затирал
    // актуальный вес (используется в расчёте КБЖУ).
    await syncCurrentWeight(userId);

    return data;
  },

  // Обновить замер
  async updateMetric(metricId: string, updates: Partial<BodyMetric>): Promise<void> {
    const { error } = await supabase.from('body_metrics').update(updates).eq('id', metricId);

    if (error) throw error;
  },

  // Удалить замер
  async deleteMetric(userId: string, metricId: string): Promise<void> {
    const { error } = await supabase.from('body_metrics').delete().eq('id', metricId);

    if (error) throw error;

    await syncCurrentWeight(userId);
  },

  // Получить замеры за период
  async getMetricsByPeriod(
    userId: string,
    period: 'week' | 'month' | '3months' | 'year'
  ): Promise<BodyMetric[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('metric_date', toDateKey(startDate))
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Рассчитать изменение между двумя замерами
  calculateChange(
    latest: number | null,
    previous: number | null
  ): { value: number; percent: number } | null {
    if (latest === null || previous === null || previous === 0) return null;
    const value = latest - previous;
    const percent = (value / previous) * 100;
    return { value, percent };
  },
};
