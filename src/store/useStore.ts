import { create } from 'zustand';

/**
 * Глобальный UI-стейт (CLAUDE.md: Zustand — ТОЛЬКО для UI-стейта).
 *
 * ✅ Здесь живут только данные авторизации.
 * ❌ Серверные данные (workouts / logs / alternativesCache) УБРАНЫ —
 *    они принадлежат React Query (списки, CRUD) либо локальному state/ref
 *    экранов и хуков: useWorkoutSession хранит подходы в exercises.sets,
 *    кэш альтернатив — в alternativesCacheRef.
 */
interface AppState {
  isAuthenticated: boolean;
  userId: string | null;
  setAuth: (userId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  userId: null,
  setAuth: (userId) => set({ isAuthenticated: !!userId, userId }),
}));