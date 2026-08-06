// src/utils/perf.ts
// Лёгкий перф-логгер для замеров TTI и детекции фризов.
// ENABLED=false перед релизом для нулевого оверхеда.
import { useEffect } from 'react';

const ENABLED = true; // ← false перед релизом

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const marks = new Map<string, number>();

/** Фиксирует временную метку. */
export function perfMark(name: string): void {
  if (!ENABLED) return;
  marks.set(name, now());
}

/** Логирует время с момента метки `from`. */
export function perfSince(from: string, label?: string): void {
  if (!ENABLED) return;
  const start = marks.get(from);
  if (start == null) return;
  console.log(`[PERF] ${label ?? from}: ${Math.round(now() - start)} ms`);
}

/**
 * Детектор блокировок JS-потока (только dev).
 * Если JS занят дольше порога — колбэк setInterval опаздывает, логируем.
 */
export function useFreezeDetector(thresholdMs = 100): void {
  useEffect(() => {
    if (!__DEV__) return;
    let lastTick = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const blocked = now - lastTick - 50;
      if (blocked > thresholdMs) {
        console.log(`[FREEZE] JS-поток занят ~${Math.round(blocked + 50)} ms`);
      }
      lastTick = now;
    }, 50);
    return () => clearInterval(timer);
  }, [thresholdMs]);
}