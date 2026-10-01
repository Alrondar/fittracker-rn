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

/**
 * CYC-3 (29.09): 'YYYY-MM-DD' → ЛОКАЛЬНЫЙ Date (полдень, чтобы datetime-field
 * не уезжал через границу при форматировании). `new Date('YYYY-MM-DD')` парсит
 * строку как UTC-полдень — в западных таймзонах показ даты отстаёт на сутки
 * (данные при этом верные: сохраняется сам ключ).
 */
export function fromDateKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!m) return new Date(key);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}
