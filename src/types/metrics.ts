export interface BodyMetric {
  id: string;
  user_id: string;
  metric_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface MetricFormData {
  metric_date: string;
  weight_kg: string;
  waist_cm: string;
  chest_cm: string;
  hips_cm: string;
  arm_cm: string;
  thigh_cm: string;
  neck_cm: string;
  notes: string;
}

export type MetricPeriod = 'week' | 'month' | '3months' | 'year' | 'all';

export const METRIC_FIELDS = [
  { key: 'weight_kg', label: 'Вес', unit: 'кг', icon: 'Weight' },
  { key: 'waist_cm', label: 'Талия', unit: 'см', icon: 'Circle' },
  { key: 'chest_cm', label: 'Грудь', unit: 'см', icon: 'Circle' },
  { key: 'hips_cm', label: 'Бёдра', unit: 'см', icon: 'Circle' },
  { key: 'arm_cm', label: 'Рука', unit: 'см', icon: 'Circle' },
  { key: 'thigh_cm', label: 'Бедро', unit: 'см', icon: 'Circle' },
  { key: 'neck_cm', label: 'Шея', unit: 'см', icon: 'Circle' },
] as const;