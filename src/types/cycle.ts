export type CycleEventType =
  'menstruation_start' | 'menstruation_end' | 'ovulation_start' | 'ovulation_end';

// CYC-2 (29.09): 'delayed' — за пределами ожидаемого начала следующего цикла
// (средняя длина + grace). Не фаза в физиологическом смысле: «данных нет,
// вероятна задержка» — движок по ней hold веса НЕ применяет.
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'delayed';

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
