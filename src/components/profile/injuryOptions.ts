import { BODY_PART_COLORS, SEVERITY_COLORS } from '../../constants/semanticColors';

export interface BodyPartOption {
  value: string;
  label: string;
  color: string;
}

export interface InjuryTypeOption {
  value: string;
  label: string;
}

export const BODY_PARTS: BodyPartOption[] = [
  { value: 'shoulder', label: 'Плечо', color: BODY_PART_COLORS.shoulder },
  { value: 'elbow', label: 'Локоть', color: BODY_PART_COLORS.elbow },
  { value: 'wrist', label: 'Запястье', color: BODY_PART_COLORS.wrist },
  { value: 'back', label: 'Спина', color: BODY_PART_COLORS.back },
  { value: 'neck', label: 'Шея', color: BODY_PART_COLORS.neck },
  { value: 'hip', label: 'Бедро', color: BODY_PART_COLORS.hip },
  { value: 'knee', label: 'Колено', color: BODY_PART_COLORS.knee },
  { value: 'ankle', label: 'Голеностоп', color: BODY_PART_COLORS.ankle },
];

export const INJURY_TYPES: InjuryTypeOption[] = [
  { value: 'strain', label: 'Растяжение' },
  { value: 'sprain', label: 'Вывих' },
  { value: 'pain', label: 'Боль' },
  { value: 'inflammation', label: 'Воспаление' },
  { value: 'fracture', label: 'Перелом' },
  { value: 'other', label: 'Другое' },
];

export const SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export function getBodyPartLabel(value: string): string {
  return BODY_PARTS.find((bp) => bp.value === value)?.label || value;
}

export function getBodyPartColor(value: string, fallback: string): string {
  return BODY_PARTS.find((bp) => bp.value === value)?.color || fallback;
}

export function getInjuryTypeLabel(value: string): string {
  return INJURY_TYPES.find((it) => it.value === value)?.label || value;
}

export function getSeverityColor(severity: string, fallback: string): string {
  switch (severity) {
    case 'low':
      return SEVERITY_COLORS.low;
    case 'medium':
      return SEVERITY_COLORS.medium;
    case 'high':
      return SEVERITY_COLORS.high;
    default:
      return fallback;
  }
}

export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'low':
      return 'Низкая';
    case 'medium':
      return 'Средняя';
    case 'high':
      return 'Высокая';
    default:
      return severity;
  }
}