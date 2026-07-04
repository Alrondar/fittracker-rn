import { create } from 'zustand';
import { Exercise, Workout, WorkoutLog } from '../types';

interface AppState {
  isAuthenticated: boolean;
  userId: string | null;
  setAuth: (userId: string | null) => void;

  workouts: Workout[];
  setWorkouts: (workouts: Workout[]) => void;

  logs: Record<string, WorkoutLog[]>;
  setLogs: (exerciseId: string, logs: WorkoutLog[]) => void;
  updateLog: (exerciseId: string, setNumber: number, field: 'weight_kg' | 'reps', value: number) => void;

  alternativesCache: Record<string, Exercise[]>;
  setAlternatives: (exerciseId: string, alternatives: Exercise[]) => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  userId: null,
  setAuth: (userId) => set({ isAuthenticated: !!userId, userId }),

  workouts: [],
  setWorkouts: (workouts) => set({ workouts }),

  logs: {},
  setLogs: (exerciseId, logs) => 
    set((state) => ({ 
      logs: { ...state.logs, [exerciseId]: logs } 
    })),
  updateLog: (exerciseId, setNumber, field, value) =>
    set((state) => {
      const currentLogs = state.logs[exerciseId] || [];
      const idx = currentLogs.findIndex(l => l.set_number === setNumber);
      let updatedLogs;
      
      if (idx >= 0) {
        updatedLogs = [...currentLogs];
        updatedLogs[idx] = { ...updatedLogs[idx], [field]: value };
      } else {
        const newLog: WorkoutLog = { set_number: setNumber, weight_kg: 0, reps: 0, [field]: value };
        updatedLogs = [...currentLogs, newLog];
      }
      
      return { 
        logs: { ...state.logs, [exerciseId]: updatedLogs } 
      };
    }),

  alternativesCache: {},
  setAlternatives: (exerciseId, alternatives) =>
    set((state) => ({
      alternativesCache: { ...state.alternativesCache, [exerciseId]: alternatives }
    })),
}));