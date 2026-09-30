import { create } from 'zustand';

/**
 * Глобальный UI-стейт (CLAUDE.md: Zustand — ТОЛЬКО для UI-стейта).
 *
 * ✅ Здесь живут только данные авторизации.
 * ❌ Серверные данные (workouts / logs / alternativesCache) УБРАНЫ —
 *    они принадлежат React Query (списки, CRUD) либо локальному state/ref
 *    экранов и хуков: useWorkoutSession хранит подходы в exercises.sets,
 *    кэш альтернатив — в alternativesCacheRef, ExerciseSlider — в своём useState.
 */
interface AppState {
  isAuthenticated: boolean;
  userId: string | null;
  setAuth: (userId: string | null) => void;
  /**
   * Онбординг: свежезарегистрированный пользователь после входа ведётся не в
   * /(tabs), а в анкету /onboarding. Ставится ТОЛЬКО в login.tsx при signUp,
   * снимается экраном анкеты (сохранил или пропустил). Несёрверные данные —
   * UI-стейт, живёт здесь (CLAUDE.md §2); в памяти, не персистится:
   * рестарт приложения до прохождения анкеты = обычный вход в (tabs).
   */
  justRegistered: boolean;
  setJustRegistered: (value: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  userId: null,
  setAuth: (userId) => set({ isAuthenticated: !!userId, userId }),
  justRegistered: false,
  setJustRegistered: (value) => set({ justRegistered: value }),
}));
