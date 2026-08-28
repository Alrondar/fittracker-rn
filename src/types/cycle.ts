export type CycleEventType = 'menstruation_start' | 'menstruation_end' | 'ovulation_start' | 'ovulation_end';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleEvent {
  id: string;
  user_id: string;
  event_type: CycleEventType;
  event_date: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface CycleSettings {
  user_id: string;
  luteal_length_days: number;
}

export interface CalculatedCyclePhase {
  phase: CyclePhase;
  dayNumber: number; // День цикла (1-based)
  startDate: Date;
  endDate: Date;
  isEstimated: boolean; // true если овуляция рассчитана автоматически
}