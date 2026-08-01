import { supabase } from '../lib/supabase';
import { BodyMetric } from '../types/metrics';

export const metricsService = {
  // Получить все замеры пользователя (отсортированные по дате)
  async getUserMetrics(userId: string): Promise<BodyMetric[]> {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('metric_date', { ascending: false });

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
        metric_date: metric.metric_date || new Date().toISOString().split('T')[0],
        weight_kg: metric.weight_kg,
        waist_cm: metric.waist_cm,
        chest_cm: metric.chest_cm,
        hips_cm: metric.hips_cm,
        arm_cm: metric.arm_cm,
        thigh_cm: metric.thigh_cm,
        neck_cm: metric.neck_cm,
        photo_url: metric.photo_url,
        notes: metric.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Обновляем profiles.current_weight_kg для совместимости с расчётом КБЖУ
    if (metric.weight_kg) {
      await supabase
        .from('profiles')
        .update({ current_weight_kg: metric.weight_kg, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    return data;
  },

  // Обновить замер
  async updateMetric(metricId: string, updates: Partial<BodyMetric>): Promise<void> {
    const { error } = await supabase
      .from('body_metrics')
      .update(updates)
      .eq('id', metricId);

    if (error) throw error;
  },

  // Удалить замер
  async deleteMetric(metricId: string): Promise<void> {
    const { error } = await supabase
      .from('body_metrics')
      .delete()
      .eq('id', metricId);

    if (error) throw error;
  },

  // Получить замеры за период
  async getMetricsByPeriod(userId: string, period: 'week' | 'month' | '3months' | 'year'): Promise<BodyMetric[]> {
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
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Рассчитать изменение между двумя замерами
  calculateChange(latest: number | null, previous: number | null): { value: number; percent: number } | null {
    if (latest === null || previous === null || previous === 0) return null;
    const value = latest - previous;
    const percent = (value / previous) * 100;
    return { value, percent };
  },
};