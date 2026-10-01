// src/utils/perf.ts
// Лёгкий перф-логгер для замеров TTI и детекции фризов.
// WEB-BUG-11 / WEB-CTR-6 (в main перенесено 01.10, PERF-8): раньше флаги были
// захардкожены в `true`, а guard вида `if (!__DEV__ && !FREEZE_IN_RELEASE)` при
// `FREEZE_IN_RELEASE = true` не срабатывает никогда — логгер и `setInterval`
// 50 мс с `console.log` ехали и в релизной сборке. Источник истины один: `__DEV__`.
import { useEffect } from 'react';

/** Замеры живут только в dev-сборке: в релизе — нулевой оверхед. */
const ENABLED = __DEV__;

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
  // eslint-disable-next-line no-console -- dev-only перф-логгер (выключается ENABLED=false)
  console.log(`[PERF] ${label ?? from}: ${Math.round(now() - start)} ms`);
}

/**
 * PERF-8: завершить замер на кадре ПОСЛЕ коммита — два rAF гарантируют, что
 * React уже отрендерил и поставил на экран обновлённое состояние (metrics =
 * «действие → пиксель», а не «действие → начало рендера»).
 */
export function perfPaint(from: string, label?: string): void {
  if (!ENABLED) return;
  if (marks.get(from) == null) return;
  requestAnimationFrame(() => requestAnimationFrame(() => perfSince(from, label)));
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
        // eslint-disable-next-line no-console -- dev-only детектор фризов
        console.log(`[FREEZE] JS-поток занят ~${Math.round(blocked + 50)} ms`);
      }
      lastTick = now;
    }, 50);
    return () => clearInterval(timer);
  }, [thresholdMs]);
}
