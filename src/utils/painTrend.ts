// src/utils/painTrend.ts
// Фича 4: тренд боли по зонам тела. Чистая функция, без React/Supabase.
//
// Группирует pain events по body_part и по неделям (ISO-неделя, понедельник).
// Зона считается "хронической", если боль зафиксирована в ≥2 разных неделях
// из последних N недель (по умолчанию 4). Это сигнал, что проблема не
// эпизодическая, а устойчивая, и требует внимания пользователя.
//
// Не ставит медицинских диагнозов — это observation, а не диагноз
// (PRODUCT.md §14, §8).

import type { PainEvent } from '../services/painService';

export interface ChronicPainZone {
  /** Исходный key из pain_events.body_part (например "knee", "shoulder"). */
  bodyPart: string;
  /** Сколько разных недель из окна содержат события в этой зоне (≥2). */
  weeks: number;
  /** ISO-строка последнего события в зоне. */
  lastAt: string;
  /** Всего событий в зоне за окно. */
  eventCount: number;
}

export interface WeekBucket {
  /** Понедельник недели (ISO), YYYY-MM-DD. */
  weekStart: string;
  /** Локализованная метка вида "26 авг — 1 сен". */
  label: string;
  /** Количество событий по каждой зоне тела в этой неделе. */
  eventsByPart: Record<string, number>;
  /** Всего событий в неделе (сумма eventsByPart). */
  total: number;
}

export interface PainTrendResult {
  /** Только зоны с ≥2 неделями боли, отсортированы по weeks desc. */
  chronicZones: ChronicPainZone[];
  /** Все недели в окне (включая пустые) — для визуализации. */
  weeks: WeekBucket[];
}

/** Понедельник для заданной даты (ISO 8601). */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function shortLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function buildWeekBuckets(weeksBack: number, today: Date): WeekBucket[] {
  const todayMonday = getMonday(today);
  const result: WeekBucket[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const monday = new Date(todayMonday);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    result.push({
      weekStart: fmtIsoDate(monday),
      label: `${shortLabel(monday, 'ru-RU')} — ${shortLabel(sunday, 'ru-RU')}`,
      eventsByPart: {},
      total: 0,
    });
  }
  return result;
}

export function calculatePainTrend(
  events: PainEvent[],
  weeksBack: number = 4,
  today: Date = new Date()
): PainTrendResult {
  const weeks = buildWeekBuckets(weeksBack, today);
  const windowStart = new Date(weeks[0].weekStart + 'T00:00:00Z');
  const windowEnd = new Date(weeks[weeks.length - 1].weekStart + 'T00:00:00Z');
  windowEnd.setDate(windowEnd.getDate() + 7);

  const inWindow = events.filter((e) => {
    if (!e.body_part) return false;
    const t = new Date(e.occurred_at);
    return !isNaN(t.getTime()) && t >= windowStart && t < windowEnd;
  });

  const partWeeks = new Map<string, Set<string>>();
  const partCount = new Map<string, number>();
  const partLastAt = new Map<string, string>();

  for (const e of inWindow) {
    const bp = e.body_part!;
    const weekStart = fmtIsoDate(getMonday(new Date(e.occurred_at)));
    let weekSet = partWeeks.get(bp);
    if (!weekSet) {
      weekSet = new Set();
      partWeeks.set(bp, weekSet);
    }
    weekSet.add(weekStart);
    partCount.set(bp, (partCount.get(bp) ?? 0) + 1);
    const last = partLastAt.get(bp);
    if (!last || e.occurred_at > last) {
      partLastAt.set(bp, e.occurred_at);
    }
  }

  for (const e of inWindow) {
    const bp = e.body_part!;
    const weekStart = fmtIsoDate(getMonday(new Date(e.occurred_at)));
    const bucket = weeks.find((w) => w.weekStart === weekStart);
    if (bucket) {
      bucket.eventsByPart[bp] = (bucket.eventsByPart[bp] ?? 0) + 1;
      bucket.total += 1;
    }
  }

  const chronicZones: ChronicPainZone[] = [];
  for (const [bp, weekSet] of partWeeks) {
    if (weekSet.size >= 2) {
      chronicZones.push({
        bodyPart: bp,
        weeks: weekSet.size,
        lastAt: partLastAt.get(bp) ?? '',
        eventCount: partCount.get(bp) ?? 0,
      });
    }
  }
  chronicZones.sort((a, b) => b.weeks - a.weeks || b.eventCount - a.eventCount);

  return { chronicZones, weeks };
}
