// Общее для всех частей таймера: формат времени, фаза и контекст провайдера.
import { createContext, useContext } from 'react';

// Формат:mm:ss (часы показываются только когда они есть).
export const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export type TimerPhase = 'running' | 'paused' | 'idle';

export interface WorkoutTimerContextValue {
  seconds: number;
  formatted: string;
  running: boolean;
  phase: TimerPhase;
  expanded: boolean;
  toggle: () => void;
  toggleExpand: () => void;
}

export const WorkoutTimerContext = createContext<WorkoutTimerContextValue | null>(null);

export function useWorkoutTimerCtx(): WorkoutTimerContextValue {
  const ctx = useContext(WorkoutTimerContext);
  if (!ctx) {
    throw new Error('WorkoutTimer* components must be used within WorkoutTimerProvider');
  }
  return ctx;
}
