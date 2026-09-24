// src/utils/dateKey.ts
// FD-5: единый локальный ключ календарной даты 'YYYY-MM-DD'.
//
// Почему не `new Date().toISOString().split('T')[0]`: toISOString переводит в UTC,
// и для пользователя не по UTC поздним вечером / ранним утром UTC-дата опережает или
// отстаёт от локальной на сутки → check-in «сегодня», тренды и окна недели разъезжаются.
// Kolонки `date`/`metric_date` в БД — это календарные даты без таймзоны, поэтому и
// запись, и сравнение должны использовать ЛОКАЛЬНЫЕ компоненты (как painTrend/weeklySummary).

/** Локальная дата → 'YYYY-MM-DD'. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Локальная дата «сегодня» → 'YYYY-MM-DD'. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * ISO-таймстемп из БД (timestamptz, обычно в UTC) → локальный ключ даты.
 * null/пусто → null. Использовать вместо `iso.split('T')[0]`, который даёт UTC-день.
 */
export function toDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toDateKey(d);
}
