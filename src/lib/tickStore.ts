// src/lib/tickStore.ts
// FZ-1/FZ-6 (аудит 28.09): микростор для тиков таймеров.
// Тик (1 Гц полезный, 4 Гц опрос) больше не живёт в state экрана — иначе
// каждую секунду перерендеривался весь workout-дерево. Пишем в стор,
// подписываются только leaf-компоненты через useSyncExternalStore
// (RestDial, RestChip, WarmupBlock).
export type TickStore<T> = {
  get: () => T;
  set: (next: T, equals?: (a: T, b: T) => boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createTickStore<T>(initial: T): TickStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (next, equals) => {
      if (equals ? equals(state, next) : state === next) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
