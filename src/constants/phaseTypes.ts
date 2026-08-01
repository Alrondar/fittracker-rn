import type { ComponentType } from 'react';
import {
  Repeat,
  Dumbbell,
  Zap,
  BatteryCharging,
  Sparkles,
} from 'lucide-react-native';

// ============================================================================
// ТИПЫ ФАЗ / МЕЗОЦИКЛОВ (единый источник)
// ============================================================================

export type PhaseType = 'hypertrophy' | 'strength' | 'power' | 'deload' | 'custom';

// Ключ цвета в теме — разрешается в render через colors[colorKey] (без хардкода)
export type PhaseColorKey = 'primary' | 'error' | 'warning' | 'success' | 'textSecondary';

export interface PhaseTypeMeta {
  value: PhaseType;
  label: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  colorKey: PhaseColorKey;
  description: string; // подсказка в редакторе фаз
}

export const PHASE_TYPES: PhaseTypeMeta[] = [
  {
    value: 'hypertrophy',
    label: 'Гипертрофия',
    icon: Repeat,
    colorKey: 'primary',
    description: 'Объёмная работа: 3–4 подхода × 8–12 повторений, умеренный вес',
  },
  {
    value: 'strength',
    label: 'Сила',
    icon: Dumbbell,
    colorKey: 'error',
    description: 'Силовая работа: 4–5 подходов × 3–6 повторений, тяжёлый вес',
  },
  {
    value: 'power',
    label: 'Мощность',
    icon: Zap,
    colorKey: 'warning',
    description: 'Взрывная работа: 3–5 подходов × 1–3 повторения, максимальная мощность',
  },
  {
    value: 'deload',
    label: 'Дилоуд',
    icon: BatteryCharging,
    colorKey: 'success',
    description: 'Разгрузка: 2–3 подхода × 8–10 повторений, 50–60% веса — восстановление',
  },
  {
    value: 'custom',
    label: 'Произвольная',
    icon: Sparkles,
    colorKey: 'textSecondary',
    description: 'Произвольная фаза с вашими параметрами',
  },
];

const DEFAULT_PHASE_META: PhaseTypeMeta = PHASE_TYPES[PHASE_TYPES.length - 1]; // custom

// ============================================================================
// ХЕЛПЕРЫ
// ============================================================================

export function getPhaseMeta(type: string | null | undefined): PhaseTypeMeta {
  return PHASE_TYPES.find(p => p.value === type) ?? DEFAULT_PHASE_META;
}

export function getPhaseLabel(type: string | null | undefined): string {
  return getPhaseMeta(type).label;
}

export function getPhaseIcon(type: string | null | undefined) {
  return getPhaseMeta(type).icon;
}

/** Цвет фазы из темы (без хардкода): getPhaseColor(phase.phase_type, colors) */
export function getPhaseColor(
  type: string | null | undefined,
  colors: Record<PhaseColorKey, string>,
): string {
  const meta = getPhaseMeta(type);
  return colors[meta.colorKey] ?? colors.primary;
}
// ============================================================================
