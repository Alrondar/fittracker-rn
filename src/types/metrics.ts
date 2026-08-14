// src/types/metrics.ts
// FEAT-2.2: расширенный набор замеров (плечи/живот/бицепсы/предплечья/икры)
// + группы для формы и чипов-тумблеров графиков.

export type MetricGroup = 'body' | 'arms' | 'legs';

export interface BodyMetric {
  id: string;
  user_id: string;
  metric_date: string;
  weight_kg: number | null;
  shoulder_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hips_cm: number | null;
  neck_cm: number | null;
  biceps_left_cm: number | null;
  biceps_right_cm: number | null;
  forearm_left_cm: number | null;
  forearm_right_cm: number | null;
  thigh_cm: number | null;
  calf_left_cm: number | null;
  calf_right_cm: number | null;
  /** legacy: старые записи; в UI не выводится */
  arm_cm: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface MetricFormData {
  metric_date: string;
  weight_kg: string;
  shoulder_cm: string;
  chest_cm: string;
  waist_cm: string;
  abdomen_cm: string;
  hips_cm: string;
  neck_cm: string;
  biceps_left_cm: string;
  biceps_right_cm: string;
  forearm_left_cm: string;
  forearm_right_cm: string;
  thigh_cm: string;
  calf_left_cm: string;
  calf_right_cm: string;
  arm_cm: string;
  notes: string;
}

export type MetricPeriod = 'week' | 'month' | '3months' | 'year' | 'all';

export const METRIC_GROUPS: Record<MetricGroup, string> = {
  body: 'Тело',
  arms: 'Руки',
  legs: 'Ноги',
};

export const METRIC_FIELDS = [
  { key: 'weight_kg', label: 'Вес', unit: 'кг', group: 'body' },
  { key: 'shoulder_cm', label: 'Плечи', unit: 'см', group: 'body' },
  { key: 'chest_cm', label: 'Грудь', unit: 'см', group: 'body' },
  { key: 'waist_cm', label: 'Талия', unit: 'см', group: 'body' },
  { key: 'abdomen_cm', label: 'Живот', unit: 'см', group: 'body' },
  { key: 'hips_cm', label: 'Бёдра', unit: 'см', group: 'body' },
  { key: 'neck_cm', label: 'Шея', unit: 'см', group: 'body' },
  { key: 'biceps_left_cm', label: 'Бицепс левый', unit: 'см', group: 'arms' },
  { key: 'biceps_right_cm', label: 'Бицепс правый', unit: 'см', group: 'arms' },
  { key: 'forearm_left_cm', label: 'Предплечье левое', unit: 'см', group: 'arms' },
  { key: 'forearm_right_cm', label: 'Предплечье правое', unit: 'см', group: 'arms' },
  { key: 'thigh_cm', label: 'Бедро', unit: 'см', group: 'legs' },
  { key: 'calf_left_cm', label: 'Икра левая', unit: 'см', group: 'legs' },
  { key: 'calf_right_cm', label: 'Икра правая', unit: 'см', group: 'legs' },
] as const;

export type MetricKey = (typeof METRIC_FIELDS)[number]['key'];